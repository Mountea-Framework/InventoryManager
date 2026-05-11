import Dexie from 'dexie';

const db = new Dexie('InventoryManager');

db.version(1).stores({
  items:    'guid, category, displayName',
  loadouts: 'id, name',
  recipes:  'id, name, family',
  files:    'key',
});

export default db;
