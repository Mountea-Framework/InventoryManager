[![Documentation](https://img.shields.io/badge/documentation-github?style=flat&logo=GitHub&labelColor=5a5a5a&color=98c510)](https://github.com/Mountea-Framework/InventoryManager/wiki)
[![license](https://img.shields.io/badge/license-MIT-99c711?labelColor=555555&style=flat&link=https://github.com/Mountea-Framework/InventoryManager/blob/master/LICENSE)](https://github.com/Mountea-Framework/InventoryManager/blob/master/LICENSE)
[![YouTube](https://img.shields.io/badge/YouTube-Subscribe-red?style=flat&logo=youtube)](https://www.youtube.com/@mounteaframework)
[![Discord](https://badgen.net/discord/online-members/2vXWEEN?label=&logoColor=ffffff&color=7389D8&icon=discord)](https://discord.com/invite/2vXWEEN)
[![Discord](https://badgen.net/discord/members/2vXWEEN?label=&logo=discord&logoColor=ffffff&color=7389D8&icon=discord)](https://discord.com/invite/2vXWEEN)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/1fd7e368d04e485086aceae2d2d0350d)](https://app.codacy.com/gh/Mountea-Framework/InventoryManager/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

# Mountea Inventour

> Mountea Inventour is a visual content workspace for game teams.
> It helps designers, writers, and producers shape inventory items, loadouts, and crafting rules in one shared place.

> This app is designed to work seamlessly with `Mountea Advanced Inventory & Equipment`.
> However, the design is engine and solution agnostic, and we would love to see teams use it for their games no matter which game engine they choose.

> **Try it out**
> 
> Explore the web app experience and workflow below.
> <p align="center" width="100%">
>   <img width="90%" src="https://placehold.co/1400x780/1f2937/e5e7eb?text=Mountea+Inventory+Manager+-+Workspace+Preview" alt="Mountea Inventour hero placeholder preview">
> </p>

---

## Who Is It For
> Mountea Inventour is built for game teams that want cleaner content workflows.
>
> It is a strong fit for:
> - Narrative and systems designers defining item behavior
> - Content teams preparing balanced loadouts for characters or roles
> - Economy and progression designers building crafting outcomes
> - Production teams who need portable data between collaborators

---

## How It Works
> The project is organized as a workspace with three content areas:
> - Inventory for item templates
> - Loadouts for spawn or equipment presets
> - Crafting for recipe and requirement rules
>
> Teams can define content, review it together, and export it in structured packs.
> This keeps design decisions in one source of truth instead of scattered docs.

---

## What Teams Can Do Here
> - Create and manage item templates with clear identity, visuals, and gameplay values
> - Build loadouts that define what a character starts with
> - Author crafting recipes with stations, ingredients, and outputs
> - Manage shared taxonomy settings like categories, rarities, slots, and actions
> - Import and export individual entities or whole workspaces for handoff
> - Work in English or Czech in a responsive desktop and mobile-friendly UI

> **Workspace previews**
> <p align="center" width="100%">
>   <img width="45%" src="https://placehold.co/900x540/111827/f9fafb?text=Inventory+Screen+Placeholder" alt="Inventory screen placeholder">
>   <img width="45%" src="https://placehold.co/900x540/0f172a/f8fafc?text=Loadouts+Screen+Placeholder" alt="Loadouts screen placeholder">
> </p>
> <p align="center" width="100%">
>   <img width="45%" src="https://placehold.co/900x540/1e293b/f1f5f9?text=Crafting+Screen+Placeholder" alt="Crafting screen placeholder">
>   <img width="45%" src="https://placehold.co/900x540/334155/f8fafc?text=Settings+Taxonomy+Placeholder" alt="Settings taxonomy placeholder">
> </p>

---

## Data Portability
The manager is designed for practical handoff between teammates and projects.

### File Guide - What Each Export Means
- `.mnteaitem` - one item template
- `.mnteaitems` - many item templates in one package
- `.mntealoadout` - one loadout preset
- `.mntealoadouts` - many loadout presets in one package
- `.mntearecipe` - one crafting recipe
- `.mntearecipes` - many crafting recipes in one package
- `.mnteainventory` - a full workspace snapshot

### Package Structure
#### .mnteaitem
```text
.mnteaitem
└── item.json
└── 📁assets
    └── <thumbnail-or-cover-file>
    └── <other-linked-asset>
└── 📁taxonomy
    └── categories.json
    └── rarities.json
    └── item-actions.json
    └── attachment-slots.json
    └── crafting-stations.json
```
- `item.json` - item data
- `assets/` - visuals used by that item, when available
- `taxonomy/` - shared definitions needed for context

#### .mnteaitems
```text
.mnteaitems
└── <item-guid-1>.mnteaitem
└── <item-guid-2>.mnteaitem
└── ...
```
- One package containing many single-item packages

#### .mntealoadout
```text
.mntealoadout
└── loadout.json
└── 📁items
    └── <item-display-name-1>.json
    └── <item-display-name-2>.json
└── 📁assets
    └── <asset-file-1>
    └── <asset-file-2>
└── 📁taxonomy
    └── categories.json
    └── rarities.json
    └── item-actions.json
    └── attachment-slots.json
    └── crafting-stations.json
```
- `loadout.json` - loadout setup
- `items/` - referenced item templates used by that loadout
- `assets/` - visuals for included items
- `taxonomy/` - shared definitions used by those entries

#### .mntealoadouts
```text
.mntealoadouts
└── <loadout-guid-1>.mntealoadout
└── <loadout-guid-2>.mntealoadout
└── ...
```
- One package containing many single-loadout packages

#### .mntearecipe
```text
.mntearecipe
└── recipe.json
└── 📁items
    └── <item-display-name-1>.json
    └── <item-display-name-2>.json
└── 📁assets
    └── <asset-file-1>
    └── <asset-file-2>
└── 📁taxonomy
    └── categories.json
    └── rarities.json
    └── item-actions.json
    └── attachment-slots.json
    └── crafting-stations.json
```
- `recipe.json` - recipe setup
- `items/` - referenced templates for ingredients and output
- `assets/` - visuals for included items
- `taxonomy/` - shared definitions used by those entries

#### .mntearecipes
```text
.mntearecipes
└── <recipe-guid-1>.mntearecipe
└── <recipe-guid-2>.mntearecipe
└── ...
```
- One package containing many single-recipe packages

#### .mnteainventory
```text
.mnteainventory
└── 📁items
    └── <item-guid-1>.json
    └── <item-guid-2>.json
└── 📁loadouts
    └── <loadout-guid-1>.json
    └── <loadout-guid-2>.json
└── 📁crafting
    └── <recipe-guid-1>.json
    └── <recipe-guid-2>.json
└── 📁assets
    └── <asset-path-1>
    └── <asset-path-2>
└── taxonomy.json
└── manifest.json
```
- `items/` - all item templates
- `loadouts/` - all loadout templates
- `crafting/` - all recipe templates
- `assets/` - stored visuals and files
- `taxonomy.json` - full shared setup values
- `manifest.json` - export date and content counts

### How Export Works
- You choose one entry, a group, or the full workspace.
- The app builds a package that includes the selected content and its related files.
- You download the package.

### How Import Works
- You select one or more package files.
- The app checks the package before adding it to your workspace.
- Related entries are imported together so links stay connected.
- Your workspace refreshes and the content is ready to edit.

These formats support collaboration and archiving without forcing teams into one machine or one session.

---

## How To Support
> If Mountea Inventour is useful for your team, you can support it by:
> - Starring the repository and sharing it
> - Reporting issues and proposing improvements
> - Joining Discord for discussion: https://discord.com/invite/2vXWEEN
> - Following project updates on YouTube: https://www.youtube.com/@mounteaframework

---

## Contributing
> Contributions are welcome.
> See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License
> This project is licensed under the MIT License.
> See [LICENSE](LICENSE) for details.
