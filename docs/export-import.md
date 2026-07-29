# Export & Import — Technical Reference

This document describes every file format produced and consumed by the InventoryManager, the exact ZIP structures, the data flows through the code, and how all the pieces relate to each other.

---

## Overview of file formats

| Extension | Entity | Single / Bundle | Scope |
|---|---|---|---|
| `.mnteaitem` | Item template | single | item JSON + assets + taxonomy subset |
| `.mnteaitems` | Item templates | bundle | outer ZIP of many `.mnteaitem` files |
| `.mntealoadout` | Loadout | single | loadout JSON + bundled items + assets + taxonomy |
| `.mntealoadouts` | Loadouts | bundle | outer ZIP of many `.mntealoadout` files |
| `.mntearecipe` | Crafting recipe | single | recipe JSON + bundled items + assets + taxonomy |
| `.mntearecipes` | Crafting recipes | bundle | outer ZIP of many `.mntearecipe` files |
| `.mnteainventory` | Full workspace | workspace | all entities, all assets, full taxonomy, manifest |

---

## Code files involved

```
src/
  exporter.js     ← all export logic (public API + internal ZIP builders)
  importer.js     ← all import logic (public API + validation + persistence)
  db.js           ← Dexie (IndexedDB) schema; tables: items, loadouts, recipes, files
  store.js        ← in-memory DATA cache; loadData() rebuilds it from Dexie
  hooks.jsx       ← TAX_KEY constant; taxonomy lives in localStorage under this key
```

---

## Taxonomy

Taxonomy is the shared configuration that gives meaning to item fields. It is stored as a single JSON object in `localStorage` under the key defined by `TAX_KEY` (exported from `hooks.jsx`).

### Structure

```jsonc
{
  "categories": [
    {
      "id": "uuid",
      "title": "Weapon",
      "icon": "sword",
      "tags": ["Item.Weapon"],
      "defaultFlags": 0,
      "defaultItemActions": ["Equip"],
      "subcategories": [
        { "id": "uuid", "title": "Melee", "tags": [], "defaultFlags": 0, "defaultItemActions": [] }
      ]
    }
  ],
  "rarities": [
    { "id": "uuid", "title": "Common", "colour": "#9ca3af" }
  ],
  "itemActions": [
    { "id": "uuid", "key": "Equip", "icon": "shield", "tooltip": "Equip item", "flags": 2 }
  ],
  "attachmentSlots": [
    { "id": "uuid", "name": "Primary", "tags": ["Slot.Primary"] }
  ],
  "craftingStations": [
    { "id": "uuid", "name": "Forge", "tag": "Station.Forge" }
  ],
  "specialAffects": [
    { "id": "uuid", "name": "Heal Over Time", "tag": "Effect.HealOverTime" }
  ]
}
```

When exporting a single entity or a bundle, only the **subset** of taxonomy that is actually referenced by that entity (and its bundled dependencies) is included in the ZIP's `taxonomy/` folder. This keeps per-entity exports self-contained while avoiding unnecessary data.

---

## Single-entity export formats

### `.mnteaitem` — Item template

**Produced by:** `exportItem(item, tax)` → `buildItemZip(item, tax)` in `exporter.js`

**ZIP layout:**

```
item.json               ← full item object as stored in IndexedDB
assets/
  <thumbnail path>      ← binary blob (omitted if no file uploaded)
  <cover path>
  <mesh path>
taxonomy/
  categories.json       ← only the category + subcategory used by this item
  rarities.json         ← only the rarity used by this item
  item-actions.json     ← only the actions referenced by itemActions[]
  attachment-slots.json ← only slots whose tags overlap attachmentSlots[]
  crafting-stations.json← always empty for item-only exports
```

**Asset key convention:** asset blobs are stored in Dexie's `files` table keyed by their path string (e.g. `T_MyItem_Thumb.png`). During export, `collectItemFiles(item)` resolves `visuals.thumbnail.path`, `visuals.cover.path`, and `visuals.mesh.path` against this table. Missing files are silently skipped.

**Taxonomy extraction:** `extractItemTaxonomy(item, tax)` filters each taxonomy array to only entries referenced by the item, then trims the category entry to only include the one subcategory actually used.

---

### `.mntealoadout` — Loadout

**Produced by:** `exportLoadout(loadout, tax)` → `buildLoadoutZip(loadout, tax)` in `exporter.js`

**ZIP layout:**

```
loadout.json            ← full loadout object
items/
  <displayName>.json    ← full JSON for every item referenced in composition or slot assignments
assets/
  <all asset paths>     ← blobs for all files from all bundled items
taxonomy/
  categories.json       ← merged union from all bundled items
  rarities.json
  item-actions.json
  attachment-slots.json
  crafting-stations.json← always empty
```

**Item references:** item GUIDs are collected from two sources:
- `loadout.items[].ref.guid` (composition entries — `ref` is an `{ guid, displayName }` object)
- `Object.values(loadout.slots).map(v => v?.guid)` (slot assignment values — also `{ guid, displayName }`)

Each GUID is resolved through `DATA.itemById`. Items not found in the cache are silently dropped.

**Taxonomy merging:** each bundled item's taxonomy subset is extracted via `extractItemTaxonomy`, then all subsets are merged with `mergeTaxonomies` which deduplicates by `id` and merges subcategory arrays for categories that appear more than once.

---

### `.mntearecipe` — Crafting recipe

**Produced by:** `exportRecipe(recipe, tax)` → `buildRecipeZip(recipe, tax)` in `exporter.js`

**ZIP layout:**

```
recipe.json             ← full recipe object
items/
  <displayName>.json    ← the output item + every ingredient item
assets/
  <all asset paths>
taxonomy/
  categories.json
  rarities.json
  item-actions.json
  attachment-slots.json
  crafting-stations.json← includes the station required by this recipe
```

**Item references:** collected from:
- `recipe.result.itemRef` (the output item's GUID — a plain string, resolved via `DATA.itemById`)
- `recipe.groups[].ingredients[].ref.guid` (ingredient refs — `ref` is an `{ guid, displayName }` object, resolved via `DATA.itemById`)

**Station handling:** after merging item taxonomy subsets, the recipe's required station (`recipe.reqs.station`) is looked up by name or tag in `tax.craftingStations` and appended to `merged.craftingStations`. This ensures the receiving system knows which station is needed.

---

## Bundle formats

Bundle files are **outer ZIPs containing multiple inner ZIPs**, one per entity.

| Bundle extension | Inner entry names |
|---|---|
| `.mnteaitems` | `<guid>.mnteaitem` |
| `.mntealoadouts` | `<guid>.mntealoadout` |
| `.mntearecipes` | `<guid>.mntearecipe` |

**Produced by:** `exportItemsBundle`, `exportLoadoutsBundle`, `exportRecipesBundle` in `exporter.js`. Each calls the corresponding single-entity builder in a loop and adds the resulting blob as an entry in an outer `JSZip`.

**Consumed by:** the importer's `expandBundle(file)` helper, which opens the outer ZIP and returns the inner blobs as an array. These blobs are then processed identically to single-entity files.

---

## Workspace format

### `.mnteainventory`

**Produced by:** `exportWorkspace()` in `exporter.js`. This is the only export that reads directly from Dexie rather than from the in-memory `DATA` cache — ensuring the export always reflects the persisted state.

**ZIP layout:**

```
items/
  <guid>.json           ← one file per item (raw Dexie record)
loadouts/
  <guid>.json           ← one file per loadout
crafting/
  <guid>.json           ← one file per recipe
assets/
  <key>                 ← binary blobs from the files table, keyed by their stored path
taxonomy.json           ← complete taxonomy object from localStorage
manifest.json           ← metadata (see below)
```

**manifest.json:**

```jsonc
{
  "schemaVersion": 2,          // value of SCHEMA_VERSION from db.js
  "exportedAt": "ISO-8601",
  "counts": {
    "items": 42,
    "loadouts": 7,
    "recipes": 15,
    "files": 23
  }
}
```

The workspace format is intentionally flat — one JSON file per entity, no taxonomy subdivision — so it can be diffed in version control and partially edited outside the tool.

> **Note:** The workspace importer is not yet implemented. Only single-entity and bundle imports are currently supported.

---

## Import flows

All public import functions follow the same four-phase pattern to keep imports atomic.

### Phase 1 — Expand and read

```
importItems(files)
importLoadouts(files)
importRecipes(files)
```

Each function first calls `expandBundle` on any bundle files to get flat arrays of inner blobs, then opens each blob/file as a JSZip and reads:
- The entity JSON (`item.json` / `loadout.json` / `recipe.json`)
- Bundled item JSONs from `items/*.json` (loadouts and recipes only)
- Taxonomy from `taxonomy/` folder entries
- Asset entry references (not yet loaded as blobs)

### Phase 2 — Validate (no writes)

All reads complete before any writes begin. The taxonomy from all files in the batch is merged together and also merged with the **current** taxonomy from localStorage. This merged taxonomy is used to validate each entity:

**Item validation (`validateItem`):**
- `guid` must be present
- `category` must exist in merged taxonomy
- `subCategory` (if set) must exist under the matched category
- `rarity` must exist in merged taxonomy

**Loadout validation:**
- `guid` must be present
- All bundled items pass `validateItem`
- Every `ref.guid` in `items[]` and every slot value's `.guid` in `slots{}` must exist in `DATA.itemById` or in the bundled items' GUID set

**Recipe validation:**
- `guid` must be present
- All bundled items pass `validateItem`
- `result.itemRef` (plain GUID string) and every ingredient `ref.guid` must exist in `DATA.itemById` or in the bundled items' GUID set

If any validation fails, an error is thrown and nothing is written.

### Phase 3 — Persist taxonomy

The merged taxonomy is written to `localStorage` via `localStorage.setItem(TAX_KEY, ...)`. This happens before entities so that, if entity persistence fails mid-way, the taxonomy is already consistent with what was imported.

### Phase 4 — Persist entities and assets

For each parsed entry:
1. Bundled items are saved first (`saveItem` calls)
2. The primary entity is saved (`saveItem` / `saveLoadout` / `saveRecipe`)
3. Binary assets are written to Dexie's `files` table via `saveFile`

After all entities are persisted, `loadData()` is called once to rebuild the in-memory `DATA` cache and all lookup maps.

---

## Data flow diagram

```
User clicks Export                  User drops file on Import
        │                                      │
        ▼                                      ▼
  exporter.js                          importer.js
  buildXxxZip()                        expandBundle() ──► inner blobs
        │                                      │
        │ reads from:                          │ reads from:
        ├─ store.js DATA (items)               ▼
        ├─ db.js files table (blobs)      JSZip.loadAsync()
        └─ taxonomy (localStorage)             │
        │                               Phase 2: validate
        ▼                                      │
  JSZip.generateAsync()              Phase 3: localStorage.setItem(TAX_KEY)
        │                                      │
  URL.createObjectURL()              Phase 4: db.items/loadouts/recipes/files
        │                                      │
  <a>.click() → browser download         loadData()
                                               │
                                        DATA cache rebuilt
```

---

## Key relationships between files

```
hooks.jsx       exports TAX_KEY
                ↓
exporter.js     reads localStorage[TAX_KEY] for workspace export
importer.js     reads/writes localStorage[TAX_KEY] for taxonomy merge

db.js           defines Dexie schema (items, loadouts, recipes, files tables)
                ↓
store.js        loadData() reads all four tables → populates DATA object
                DATA.itemByName used by importer for ref validation

exporter.js     imports DATA (for itemByName resolution in loadout/recipe exports)
importer.js     imports DATA (for itemByName in validation), saveItem/saveLoadout/saveRecipe/saveFile, loadData
```

---

## Taxonomy subset extraction vs. merge

**On export** — `extractItemTaxonomy(item, tax)` produces a minimal subset:

```
full taxonomy in localStorage
        │
        ▼ filter by item's actual values
  { categories: [1 entry, 1 subcategory], rarities: [1], itemActions: [n], attachmentSlots: [n], craftingStations: [] }
```

Multiple subsets from bundled items are combined via `mergeTaxonomies(taxList)`, which deduplicates by `id` and merges subcategory arrays when the same category appears in multiple subsets.

**On import** — `mergeTaxonomyInto(existing, incoming)` merges the incoming taxonomy into the current localStorage taxonomy:

- New category IDs are appended
- Existing categories receive new subcategory IDs (existing subcategories are never removed)
- New rarities, itemActions, attachmentSlots, craftingStations are appended (no removal)
- `specialAffects` from the current taxonomy is always preserved (not overwritten by incoming)

This means imports are **strictly additive** — they will never remove or overwrite existing taxonomy entries.
