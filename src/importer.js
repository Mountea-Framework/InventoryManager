import JSZip from 'jszip';
import { DATA, saveItem, saveLoadout, saveRecipe, saveFile, loadData } from './store.js';
import { TAX_KEY } from './hooks.jsx';

// ── Taxonomy helpers ─────────────────────────────────────────────────────────

function getCurrentTaxonomy() {
  try {
    const raw = localStorage.getItem(TAX_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function mergeTaxonomyInto(existing, incoming) {
  const dedup = (existingArr, incomingArr) => {
    if (!incomingArr?.length) return existingArr ?? [];
    const existingIds = new Set((existingArr ?? []).map(x => x.id));
    return [...(existingArr ?? []), ...incomingArr.filter(x => !existingIds.has(x.id))];
  };

  const mergedCategories = [...(existing.categories ?? [])];
  for (const inCat of (incoming.categories ?? [])) {
    const idx = mergedCategories.findIndex(c => c.id === inCat.id);
    if (idx === -1) {
      mergedCategories.push(inCat);
    } else {
      const existingSubs = mergedCategories[idx].subcategories ?? [];
      const existingSubIds = new Set(existingSubs.map(s => s.id));
      mergedCategories[idx] = {
        ...mergedCategories[idx],
        subcategories: [...existingSubs, ...(inCat.subcategories ?? []).filter(s => !existingSubIds.has(s.id))],
      };
    }
  }

  return {
    ...existing,
    categories:       mergedCategories,
    rarities:         dedup(existing.rarities,         incoming.rarities),
    itemActions:      dedup(existing.itemActions,      incoming.itemActions),
    attachmentSlots:  dedup(existing.attachmentSlots,  incoming.attachmentSlots),
    craftingStations: dedup(existing.craftingStations, incoming.craftingStations),
    specialAffects:   existing.specialAffects ?? [],
  };
}

// ── Zip reading helpers ───────────────────────────────────────────────────────

async function readJsonFromZip(zip, path) {
  const file = zip.file(path);
  if (!file) return null;
  return JSON.parse(await file.async('string'));
}

async function readTaxonomyFromZip(zip) {
  const read = async (name) => {
    const f = zip.file(`taxonomy/${name}`);
    if (!f) return [];
    try { return JSON.parse(await f.async('string')); } catch { return []; }
  };
  return {
    categories:       await read('categories.json'),
    rarities:         await read('rarities.json'),
    itemActions:      await read('item-actions.json'),
    attachmentSlots:  await read('attachment-slots.json'),
    craftingStations: await read('crafting-stations.json'),
  };
}

async function readItemsFromZip(zip) {
  const items = [];
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || !path.startsWith('items/') || !path.endsWith('.json')) continue;
    try { items.push(JSON.parse(await entry.async('string'))); } catch {}
  }
  return items;
}

function collectAssetEntries(zip) {
  return Object.entries(zip.files)
    .filter(([path, entry]) => !entry.dir && path.startsWith('assets/'))
    .map(([path, entry]) => ({ key: path.slice('assets/'.length), entry }));
}

async function saveAssets(assetEntries) {
  for (const { key, entry } of assetEntries) {
    const blob = await entry.async('blob');
    await saveFile(key, blob);
  }
}

// Opens a bundle zip (.mnteaitems / .mntealoadouts / .mntearecipes) and returns
// inner zip blobs — one per entity.
async function expandBundle(file) {
  const outer = await JSZip.loadAsync(file);
  const blobs = [];
  for (const entry of Object.values(outer.files)) {
    if (entry.dir) continue;
    try { blobs.push(await entry.async('blob')); } catch {}
  }
  return blobs;
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateItem(item, taxonomy, label) {
  if (!item?.guid) throw new Error(`${label}: missing guid`);

  if (item.category) {
    const cat = taxonomy.categories?.find(c => c.title === item.category);
    if (!cat) throw new Error(`${label}: category "${item.category}" not found in taxonomy`);
    if (item.subCategory) {
      const sub = cat.subcategories?.find(s => s.title === item.subCategory);
      if (!sub) throw new Error(`${label}: subCategory "${item.subCategory}" not found under "${item.category}"`);
    }
  }
  if (item.rarity) {
    const rar = taxonomy.rarities?.find(r => r.title === item.rarity);
    if (!rar) throw new Error(`${label}: rarity "${item.rarity}" not found in taxonomy`);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Import one or more .mnteaitem / .mnteaitems files.
 * Atomic: validates everything before writing anything.
 * @param {File[]} files
 * @returns {Promise<number>} count of imported items
 */
export async function importItems(files) {
  // Expand bundles → flat list of single-entity blobs/files
  const singles = [];
  for (const file of files) {
    if (file.name?.endsWith('.mnteaitems')) {
      singles.push(...await expandBundle(file));
    } else {
      singles.push(file);
    }
  }

  // Phase 1: read all
  const parsed = [];
  for (const blob of singles) {
    const zip   = await JSZip.loadAsync(blob);
    const entity      = await readJsonFromZip(zip, 'item.json');
    const taxonomy    = await readTaxonomyFromZip(zip);
    const assetEntries = collectAssetEntries(zip);
    parsed.push({ entity, taxonomy, assetEntries });
  }

  // Phase 2: validate against merged taxonomy (no writes yet)
  const mergedTax = parsed.reduce(
    (tax, { taxonomy }) => mergeTaxonomyInto(tax, taxonomy),
    getCurrentTaxonomy(),
  );
  for (const { entity } of parsed) {
    validateItem(entity, mergedTax, entity?.displayName ?? 'item');
  }

  // Phase 3: persist taxonomy
  localStorage.setItem(TAX_KEY, JSON.stringify(mergedTax));

  // Phase 4: persist entities + assets
  for (const { entity, assetEntries } of parsed) {
    await saveItem(entity);
    await saveAssets(assetEntries);
  }

  await loadData();
  return parsed.length;
}

/**
 * Import one or more .mntealoadout / .mntealoadouts files.
 * Bundled items are saved first so loadout refs resolve correctly.
 * @param {File[]} files
 * @returns {Promise<number>} count of imported loadouts
 */
export async function importLoadouts(files) {
  const singles = [];
  for (const file of files) {
    if (file.name?.endsWith('.mntealoadouts')) {
      singles.push(...await expandBundle(file));
    } else {
      singles.push(file);
    }
  }

  const parsed = [];
  for (const blob of singles) {
    const zip         = await JSZip.loadAsync(blob);
    const entity      = await readJsonFromZip(zip, 'loadout.json');
    const items       = await readItemsFromZip(zip);
    const taxonomy    = await readTaxonomyFromZip(zip);
    const assetEntries = collectAssetEntries(zip);
    parsed.push({ entity, items, taxonomy, assetEntries });
  }

  const mergedTax = parsed.reduce(
    (tax, { taxonomy }) => mergeTaxonomyInto(tax, taxonomy),
    getCurrentTaxonomy(),
  );

  // All item displayNames available after this import (DB + bundled)
  const availableNames = new Set([
    ...Object.keys(DATA.itemByName),
    ...parsed.flatMap(p => p.items.map(i => i.displayName).filter(Boolean)),
  ]);

  for (const { entity, items } of parsed) {
    if (!entity?.guid) throw new Error('Loadout missing guid');

    for (const item of items) {
      validateItem(item, mergedTax, item?.displayName ?? 'bundled item');
    }

    const refs = [
      ...(entity.items ?? []).map(i => i.ref),
      ...Object.values(entity.slots ?? {}),
    ].filter(Boolean);

    for (const ref of refs) {
      if (!availableNames.has(ref)) {
        throw new Error(`Loadout "${entity.name}": referenced item "${ref}" not found`);
      }
    }
  }

  localStorage.setItem(TAX_KEY, JSON.stringify(mergedTax));

  for (const { entity, items, assetEntries } of parsed) {
    for (const item of items) await saveItem(item);
    await saveLoadout(entity);
    await saveAssets(assetEntries);
  }

  await loadData();
  return parsed.length;
}

/**
 * Import one or more .mntearecipe / .mntearecipes files.
 * @param {File[]} files
 * @returns {Promise<number>} count of imported recipes
 */
export async function importRecipes(files) {
  const singles = [];
  for (const file of files) {
    if (file.name?.endsWith('.mntearecipes')) {
      singles.push(...await expandBundle(file));
    } else {
      singles.push(file);
    }
  }

  const parsed = [];
  for (const blob of singles) {
    const zip         = await JSZip.loadAsync(blob);
    const entity      = await readJsonFromZip(zip, 'recipe.json');
    const items       = await readItemsFromZip(zip);
    const taxonomy    = await readTaxonomyFromZip(zip);
    const assetEntries = collectAssetEntries(zip);
    parsed.push({ entity, items, taxonomy, assetEntries });
  }

  const mergedTax = parsed.reduce(
    (tax, { taxonomy }) => mergeTaxonomyInto(tax, taxonomy),
    getCurrentTaxonomy(),
  );

  const availableNames = new Set([
    ...Object.keys(DATA.itemByName),
    ...parsed.flatMap(p => p.items.map(i => i.displayName).filter(Boolean)),
  ]);

  for (const { entity, items } of parsed) {
    if (!entity?.guid) throw new Error('Recipe missing guid');

    for (const item of items) {
      validateItem(item, mergedTax, item?.displayName ?? 'bundled item');
    }

    const refs = [
      entity.result?.itemRef,
      ...(entity.groups ?? []).flatMap(g => (g.ingredients ?? []).map(i => i.ref)),
    ].filter(Boolean);

    for (const ref of refs) {
      if (!availableNames.has(ref)) {
        throw new Error(`Recipe "${entity.name}": referenced item "${ref}" not found`);
      }
    }
  }

  localStorage.setItem(TAX_KEY, JSON.stringify(mergedTax));

  for (const { entity, items, assetEntries } of parsed) {
    for (const item of items) await saveItem(item);
    await saveRecipe(entity);
    await saveAssets(assetEntries);
  }

  await loadData();
  return parsed.length;
}
