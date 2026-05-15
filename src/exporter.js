import JSZip from 'jszip';
import db from './db.js';
import { SCHEMA_VERSION } from './db.js';
import { DATA } from './store.js';
import { TAX_KEY } from './hooks.jsx';

// ── Taxonomy helpers ─────────────────────────────────────────────────────────

function extractItemTaxonomy(item, tax) {
  const catObj = tax.categories?.find(c => c.title === item.category);
  const categories = catObj ? [{
    ...catObj,
    subcategories: catObj.subcategories?.filter(s => s.title === item.subCategory) ?? [],
  }] : [];

  const rarObj = tax.rarities?.find(r => r.title === item.rarity);
  const rarities = rarObj ? [rarObj] : [];

  const actionVals = item.itemActions ?? [];
  const itemActions = (tax.itemActions ?? []).filter(a =>
    actionVals.includes(a.key) || actionVals.includes(a.id)
  );

  const slotTags = item.attachmentSlots ?? [];
  const attachmentSlots = (tax.attachmentSlots ?? []).filter(s =>
    slotTags.some(tag => s.tags?.includes(tag))
  );

  return { categories, rarities, itemActions, attachmentSlots, craftingStations: [] };
}

function mergeTaxonomies(taxList) {
  if (!taxList.length) {
    return { categories: [], rarities: [], itemActions: [], attachmentSlots: [], craftingStations: [] };
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

  return {
    categories:       [...catMap.values()],
    rarities:         dedup(taxList.flatMap(t => t.rarities)),
    itemActions:      dedup(taxList.flatMap(t => t.itemActions)),
    attachmentSlots:  dedup(taxList.flatMap(t => t.attachmentSlots)),
    craftingStations: dedup(taxList.flatMap(t => t.craftingStations)),
  };
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
  const write = (name, arr) => { if (arr?.length) folder.file(name, JSON.stringify(arr, null, 2)); };
  write('categories.json',       taxonomy.categories);
  write('rarities.json',         taxonomy.rarities);
  write('item-actions.json',     taxonomy.itemActions);
  write('attachment-slots.json', taxonomy.attachmentSlots);
  write('crafting-stations.json', taxonomy.craftingStations);
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

// ── Public API ───────────────────────────────────────────────────────────────

export async function exportItem(item, tax) {
  const zip = new JSZip();
  zip.file('item.json', JSON.stringify(item, null, 2));

  const files = await collectItemFiles(item);
  const assets = zip.folder('assets');
  files.forEach(({ path, blob }) => assets.file(path, blob));

  addTaxonomyToFolder(zip.folder('taxonomy'), extractItemTaxonomy(item, tax));

  await downloadZip(zip, `${item.displayName}.mnteaitem`);
}

export async function exportLoadout(loadout, tax) {
  const zip = new JSZip();
  zip.file('loadout.json', JSON.stringify(loadout, null, 2));

  const itemNames = new Set([
    ...(loadout.items ?? []).map(i => i.ref).filter(Boolean),
    ...Object.values(loadout.slots ?? {}).filter(Boolean),
  ]);
  const items        = [...itemNames].map(n => DATA.itemByName[n]).filter(Boolean);
  const itemsFolder  = zip.folder('items');
  const assetsFolder = zip.folder('assets');

  const taxSubsets = [];
  for (const it of items) {
    itemsFolder.file(`${it.displayName}.json`, JSON.stringify(it, null, 2));
    const files = await collectItemFiles(it);
    files.forEach(({ path, blob }) => assetsFolder.file(path, blob));
    taxSubsets.push(extractItemTaxonomy(it, tax));
  }

  addTaxonomyToFolder(zip.folder('taxonomy'), mergeTaxonomies(taxSubsets));

  await downloadZip(zip, `${loadout.name}.mntealoadout`);
}

export async function exportRecipe(recipe, tax) {
  const zip = new JSZip();
  zip.file('recipe.json', JSON.stringify(recipe, null, 2));

  const itemNames = new Set();
  if (recipe.result?.itemRef) itemNames.add(recipe.result.itemRef);
  (recipe.groups ?? []).forEach(g =>
    (g.ingredients ?? []).forEach(ing => { if (ing.ref) itemNames.add(ing.ref); })
  );
  const items        = [...itemNames].map(n => DATA.itemByName[n]).filter(Boolean);
  const itemsFolder  = zip.folder('items');
  const assetsFolder = zip.folder('assets');

  const taxSubsets = [];
  for (const it of items) {
    itemsFolder.file(`${it.displayName}.json`, JSON.stringify(it, null, 2));
    const files = await collectItemFiles(it);
    files.forEach(({ path, blob }) => assetsFolder.file(path, blob));
    taxSubsets.push(extractItemTaxonomy(it, tax));
  }

  const merged = mergeTaxonomies(taxSubsets);

  const stationName = recipe.reqs?.station;
  if (stationName && stationName !== 'None') {
    const stationObj = tax.craftingStations?.find(s => s.name === stationName || s.tag === stationName);
    if (stationObj) merged.craftingStations = [stationObj];
  }

  addTaxonomyToFolder(zip.folder('taxonomy'), merged);

  await downloadZip(zip, `${recipe.name}.mntearecipe`);
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

  items.forEach(item      => itemsFolder.file(`${item.guid}.json`,     JSON.stringify(item,    null, 2)));
  loadouts.forEach(loadout => loadoutsFolder.file(`${loadout.guid}.json`, JSON.stringify(loadout, null, 2)));
  recipes.forEach(recipe   => craftingFolder.file(`${recipe.guid}.json`,  JSON.stringify(recipe,  null, 2)));

  for (const record of files) {
    if (record.blob) assetsFolder.file(record.key, record.blob);
  }

  const taxonomy = JSON.parse(localStorage.getItem(TAX_KEY) || 'null');
  if (taxonomy) zip.file('taxonomy.json', JSON.stringify(taxonomy, null, 2));

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
