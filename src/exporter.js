import JSZip from 'jszip';
import db from './db.js';
import { SCHEMA_VERSION } from './db.js';
import { DATA } from './store.js';
import { TAX_KEY } from './hooks.jsx';
import { areSameTag, normalizeItemTags, normalizeTaxonomy } from './tags.js';

// ── Taxonomy helpers ─────────────────────────────────────────────────────────

function extractItemTaxonomy(item, tax) {
  const normalizedItem = normalizeItemTags(item);
  const normalizedTax = normalizeTaxonomy(tax);

  const catObj = normalizedTax.categories?.find(c => c.title === normalizedItem.category);
  const categories = catObj ? [{
    ...catObj,
    subcategories: catObj.subcategories?.filter(s => s.title === normalizedItem.subCategory) ?? [],
  }] : [];

  const rarObj = normalizedTax.rarities?.find(r => r.title === normalizedItem.rarity);
  const rarities = rarObj ? [rarObj] : [];

  const actionVals = normalizedItem.itemActions ?? [];
  const itemActions = (normalizedTax.itemActions ?? []).filter(a =>
    actionVals.includes(a.key) || actionVals.includes(a.id)
  );

  const slotTags = normalizedItem.attachmentSlots ?? [];
  const attachmentSlots = (normalizedTax.attachmentSlots ?? []).filter(s =>
    slotTags.some(tag => (s.tags ?? []).some(slotTag => areSameTag(slotTag, tag)))
  );

  return { categories, rarities, itemActions, attachmentSlots, craftingStations: [] };
}

function mergeTaxonomies(taxList) {
  if (!taxList.length) {
    return normalizeTaxonomy({ categories: [], rarities: [], itemActions: [], attachmentSlots: [], craftingStations: [] });
  }

  const dedup = (arr) => {
    const seen = new Set();
    return arr.filter(x => { if (seen.has(x.id)) return false; seen.add(x.id); return true; });
  };

  const catMap = new Map();
  taxList.forEach(t => t.categories.forEach(c => {
    if (!catMap.has(c.id)) {
      catMap.set(c.id, { ...c, subcategories: [...(c.subcategories ?? [])] });
    } else {
      const existing = catMap.get(c.id);
      const subIds = new Set(existing.subcategories.map(s => s.id));
      (c.subcategories ?? []).forEach(s => { if (!subIds.has(s.id)) existing.subcategories.push(s); });
    }
  }));

  return normalizeTaxonomy({
    categories:       [...catMap.values()],
    rarities:         dedup(taxList.flatMap(t => t.rarities)),
    itemActions:      dedup(taxList.flatMap(t => t.itemActions)),
    attachmentSlots:  dedup(taxList.flatMap(t => t.attachmentSlots)),
    craftingStations: dedup(taxList.flatMap(t => t.craftingStations)),
  });
}

// ── File collection ──────────────────────────────────────────────────────────

async function collectItemFiles(item) {
  const keys = [
    item.visuals?.thumbnail?.path,
    item.visuals?.cover?.path,
    item.visuals?.mesh?.path,
  ].filter(Boolean);

  const entries = [];
  for (const key of keys) {
    try {
      const record = await db.files.get(key);
      if (record?.blob) entries.push({ path: key, blob: record.blob });
    } catch {}
  }
  return entries;
}

// ── Zip helpers ──────────────────────────────────────────────────────────────

function addTaxonomyToFolder(folder, taxonomy) {
  const normalized = normalizeTaxonomy(taxonomy);
  const write = (name, arr) => { if (arr?.length) folder.file(name, JSON.stringify(arr, null, 2)); };
  write('categories.json',       normalized.categories);
  write('rarities.json',         normalized.rarities);
  write('item-actions.json',     normalized.itemActions);
  write('attachment-slots.json', normalized.attachmentSlots);
  write('crafting-stations.json', normalized.craftingStations);
}

async function downloadZip(zip, filename) {
  const blob = await zip.generateAsync({ type: 'blob' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Internal zip builders (return JSZip, do not download) ────────────────────

async function buildItemZip(item, tax) {
  const zip = new JSZip();
  const normalizedItem = normalizeItemTags(item);
  zip.file('item.json', JSON.stringify(normalizedItem, null, 2));

  const files = await collectItemFiles(normalizedItem);
  const assets = zip.folder('assets');
  files.forEach(({ path, blob }) => assets.file(path, blob));

  addTaxonomyToFolder(zip.folder('taxonomy'), extractItemTaxonomy(normalizedItem, tax));
  return zip;
}

async function buildLoadoutZip(loadout, tax) {
  const zip = new JSZip();
  zip.file('loadout.json', JSON.stringify(loadout, null, 2));

  const itemGuids = new Set([
    ...(loadout.items ?? []).map(i => i.ref?.guid ?? i.ref).filter(Boolean),
    ...Object.values(loadout.slots ?? {}).map(v => v?.guid ?? v).filter(Boolean),
  ]);
  const items        = [...itemGuids].map(g => DATA.itemById[g]).filter(Boolean);
  const itemsFolder  = zip.folder('items');
  const assetsFolder = zip.folder('assets');

  const taxSubsets = [];
  for (const it of items) {
    const normalizedItem = normalizeItemTags(it);
    itemsFolder.file(`${normalizedItem.displayName}.json`, JSON.stringify(normalizedItem, null, 2));
    const files = await collectItemFiles(normalizedItem);
    files.forEach(({ path, blob }) => assetsFolder.file(path, blob));
    taxSubsets.push(extractItemTaxonomy(normalizedItem, tax));
  }

  addTaxonomyToFolder(zip.folder('taxonomy'), mergeTaxonomies(taxSubsets));
  return zip;
}

async function buildRecipeZip(recipe, tax) {
  const zip = new JSZip();
  zip.file('recipe.json', JSON.stringify(recipe, null, 2));

  const itemGuids = new Set();
  if (recipe.result?.itemRef) itemGuids.add(recipe.result.itemRef);
  (recipe.groups ?? []).forEach(grp =>
    (grp.ingredients ?? []).forEach(ing => { const id = ing.ref?.guid ?? ing.ref; if (id) itemGuids.add(id); })
  );
  const items        = [...itemGuids].map(g => DATA.itemById[g]).filter(Boolean);
  const itemsFolder  = zip.folder('items');
  const assetsFolder = zip.folder('assets');

  const taxSubsets = [];
  for (const it of items) {
    const normalizedItem = normalizeItemTags(it);
    itemsFolder.file(`${normalizedItem.displayName}.json`, JSON.stringify(normalizedItem, null, 2));
    const files = await collectItemFiles(normalizedItem);
    files.forEach(({ path, blob }) => assetsFolder.file(path, blob));
    taxSubsets.push(extractItemTaxonomy(normalizedItem, tax));
  }

  const merged = mergeTaxonomies(taxSubsets);

  const stationName = recipe.reqs?.station;
  if (stationName && stationName !== 'None') {
    const stationObj = tax.craftingStations?.find(s => s.name === stationName || s.tag === stationName);
    if (stationObj) merged.craftingStations = [stationObj];
  }

  addTaxonomyToFolder(zip.folder('taxonomy'), merged);
  return zip;
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function exportItem(item, tax) {
  await downloadZip(await buildItemZip(item, tax), `${item.displayName}.mnteaitem`);
}

export async function exportLoadout(loadout, tax) {
  await downloadZip(await buildLoadoutZip(loadout, tax), `${loadout.name}.mntealoadout`);
}

export async function exportRecipe(recipe, tax) {
  await downloadZip(await buildRecipeZip(recipe, tax), `${recipe.name}.mntearecipe`);
}

export async function exportItemsBundle(items, tax) {
  const outer = new JSZip();
  for (const item of items) {
    const blob = await (await buildItemZip(item, tax)).generateAsync({ type: 'blob' });
    outer.file(`${item.guid}.mnteaitem`, blob);
  }
  await downloadZip(outer, 'items.mnteaitems');
}

export async function exportLoadoutsBundle(loadouts, tax) {
  const outer = new JSZip();
  for (const loadout of loadouts) {
    const blob = await (await buildLoadoutZip(loadout, tax)).generateAsync({ type: 'blob' });
    outer.file(`${loadout.guid}.mntealoadout`, blob);
  }
  await downloadZip(outer, 'loadouts.mntealoadouts');
}

export async function exportRecipesBundle(recipes, tax) {
  const outer = new JSZip();
  for (const recipe of recipes) {
    const blob = await (await buildRecipeZip(recipe, tax)).generateAsync({ type: 'blob' });
    outer.file(`${recipe.guid}.mntearecipe`, blob);
  }
  await downloadZip(outer, 'recipes.mntearecipes');
}

/**
 * Export the entire workspace as a single .mnteainventory zip.
 * Includes all items, loadouts, recipes, binary assets, and taxonomy.
 */
export async function exportWorkspace() {
  const zip = new JSZip();

  const [items, loadouts, recipes, files] = await Promise.all([
    db.items.toArray(),
    db.loadouts.toArray(),
    db.recipes.toArray(),
    db.files.toArray(),
  ]);

  const itemsFolder    = zip.folder('items');
  const loadoutsFolder = zip.folder('loadouts');
  const craftingFolder = zip.folder('crafting');
  const assetsFolder   = zip.folder('assets');

  items.forEach(item      => itemsFolder.file(`${item.guid}.json`,     JSON.stringify(normalizeItemTags(item), null, 2)));
  loadouts.forEach(loadout => loadoutsFolder.file(`${loadout.guid}.json`, JSON.stringify(loadout, null, 2)));
  recipes.forEach(recipe   => craftingFolder.file(`${recipe.guid}.json`,  JSON.stringify(recipe,  null, 2)));

  for (const record of files) {
    if (record.blob) assetsFolder.file(record.key, record.blob);
  }

  const taxonomy = JSON.parse(localStorage.getItem(TAX_KEY) || 'null');
  if (taxonomy) zip.file('taxonomy.json', JSON.stringify(normalizeTaxonomy(taxonomy), null, 2));

  zip.file('manifest.json', JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    counts: {
      items:    items.length,
      loadouts: loadouts.length,
      recipes:  recipes.length,
      files:    files.length,
    },
  }, null, 2));

  await downloadZip(zip, 'mountea-workspace.mnteainventory');
}
