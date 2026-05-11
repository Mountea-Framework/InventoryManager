import db from './db.js';
import { createEmptyData } from './data.js';

/** In-memory DATA cache — populated by loadData(), mutated by save/delete helpers. */
export const DATA = createEmptyData();

const rebuildLookups = () => {
  DATA.allItems   = Object.values(DATA.items).flat();
  DATA.itemById   = Object.fromEntries(DATA.allItems.map(i => [i.guid,        i]));
  DATA.itemByName = Object.fromEntries(DATA.allItems.map(i => [i.displayName, i]));
};

// ── Initial load ────────────────────────────────────────────────────────────

/** Read all records from IndexedDB into DATA. Call once at app startup. */
export const loadData = async () => {
  const [items, loadouts, recipes] = await Promise.all([
    db.items.toArray(),
    db.loadouts.toArray(),
    db.recipes.toArray(),
  ]);
  DATA.items = {};
  items.forEach(item => { (DATA.items[item.category] ??= []).push(item); });
  DATA.loadouts = loadouts;
  DATA.recipes  = {};
  recipes.forEach(r => { (DATA.recipes[r.family] ??= []).push(r); });
  rebuildLookups();
};

// ── Per-entity persistence ───────────────────────────────────────────────────

export const saveItem      = (item)    => db.items.put(item);
export const deleteItem    = (guid)    => db.items.delete(guid);
export const saveLoadout   = (loadout) => db.loadouts.put(loadout);
export const deleteLoadout = (id)      => db.loadouts.delete(id);
export const saveRecipe    = (recipe)  => db.recipes.put(recipe);
export const deleteRecipe  = (id)      => db.recipes.delete(id);

// ── Bulk export / import ─────────────────────────────────────────────────────

/** Return all rows as plain arrays, ready for JSON serialisation. */
export const exportAllData = async () => {
  const [items, loadouts, recipes] = await Promise.all([
    db.items.toArray(),
    db.loadouts.toArray(),
    db.recipes.toArray(),
  ]);
  return { items, loadouts, recipes };
};

/**
 * Replace all rows in a transaction, then refresh the in-memory cache.
 * @param {{ items?: object[], loadouts?: object[], recipes?: object[] }} payload
 */
export const bulkImport = async ({ items = [], loadouts = [], recipes = [] }) => {
  await db.transaction('rw', db.items, db.loadouts, db.recipes, async () => {
    await db.items.clear();
    await db.loadouts.clear();
    await db.recipes.clear();
    if (items.length)    await db.items.bulkPut(items);
    if (loadouts.length) await db.loadouts.bulkPut(loadouts);
    if (recipes.length)  await db.recipes.bulkPut(recipes);
  });
  await loadData();
};

// ── Binary file storage ──────────────────────────────────────────────────────

/**
 * Persist a Blob under a namespaced key.
 * @param {string} key
 * @param {Blob} blob
 * @returns {Promise<string>} the key
 */
export const saveFile = async (key, blob) => {
  await db.files.put({ key, blob, name: blob.name ?? key, type: blob.type });
  return key;
};

/**
 * Returns an object URL for a stored blob, or null if the key has no record.
 * Caller is responsible for calling URL.revokeObjectURL() when done.
 * @param {string|null|undefined} key
 * @returns {Promise<string|null>}
 */
export const getFileURL = async (key) => {
  if (!key) return null;
  const record = await db.files.get(key);
  return record ? URL.createObjectURL(record.blob) : null;
};

/** @param {string} key */
export const deleteFile = (key) => db.files.delete(key);
