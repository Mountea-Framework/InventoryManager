import Dexie from 'dexie';

const db = new Dexie('InventoryManager');

db.version(1).stores({
  items:    'guid, category, displayName',
  loadouts: 'id, name',
  recipes:  'id, name, family',
  files:    'key',
});

// Version 2: unified guid (UUID v4) as primary key for all entity types
db.version(2).stores({
  items:    'guid, category, displayName',
  loadouts: 'guid, name',
  recipes:  'guid, name, family',
  files:    'key',
});

export const SCHEMA_VERSION = 'v2';

export default db;
