// Architect Editor — data utilities (no fixture data; all records live in IndexedDB via store.js)

/** Bitflag enum (mirrors EInventoryItemFlags from C++ side) */
export const ITEM_FLAGS = [
  { bit: 1 << 0, key: 'tradeable',  label: 'Tradeable',  tip: 'Item can be traded between inventories.' },
  { bit: 1 << 1, key: 'stackable',  label: 'Stackable',  tip: 'Item can stack with others of the same type.' },
  { bit: 1 << 2, key: 'craftable',  label: 'Craftable',  tip: 'Item can be used in crafting recipes.' },
  { bit: 1 << 3, key: 'dropable',   label: 'Dropable',   tip: 'Item can be dropped into the world.' },
  { bit: 1 << 4, key: 'consumable', label: 'Consumable', tip: 'Item can be consumed for an effect.' },
  { bit: 1 << 5, key: 'questItem',  label: 'Quest Item', tip: 'Item is required for a quest.' },
  { bit: 1 << 6, key: 'unique',     label: 'Unique',     tip: 'Item is unique and can be only once in Inventory.' },
  { bit: 1 << 7, key: 'durable',    label: 'Durable',    tip: 'Item has durability and can degrade.' },
];

export const flagsToBits = (obj) =>
  ITEM_FLAGS.reduce((m, f) => m | (obj?.[f.key] ? f.bit : 0), 0);

export const bitsToFlags = (bits) =>
  Object.fromEntries(ITEM_FLAGS.map(f => [f.key, !!(bits & f.bit)]));

export const flagsLabels = (bits) =>
  ITEM_FLAGS.filter(f => bits & f.bit).map(f => f.label);

export const ITEM_ACTIONS = [
  { key: 'Drop',        icon: 'export',  tip: 'Drop the item into the world.' },
  { key: 'Pickup',      icon: 'plus',    tip: 'Pick the item up from the world.' },
  { key: 'Use',         icon: 'play',    tip: 'Generic activation.' },
  { key: 'Consume',     icon: 'drop',    tip: 'Consume the item for an effect.' },
  { key: 'Equip',       icon: 'shield',  tip: 'Equip into a matching slot.' },
  { key: 'Unequip',     icon: 'minus',   tip: 'Unequip and return to inventory.' },
  { key: 'Learn',       icon: 'sparkle', tip: 'Learn a recipe / skill from the item.' },
  { key: 'Read',        icon: 'eye',     tip: 'Open the item\'s readable content.' },
  { key: 'Inspect',     icon: 'info',    tip: 'Open detailed inspection panel.' },
  { key: 'Split',       icon: 'branch',  tip: 'Split a stack.' },
  { key: 'Combine',     icon: 'layers',  tip: 'Combine matching items into a stack.' },
  { key: 'Repair',      icon: 'history', tip: 'Repair durability at a station.' },
  { key: 'Disassemble', icon: 'cog',     tip: 'Break down into components.' },
  { key: 'Sell',        icon: 'export',  tip: 'Sell at a vendor.' },
  { key: 'Discard',     icon: 'trash',   tip: 'Permanently destroy.' },
];

/**
 * Returns the empty in-memory DATA shape used before IndexedDB is loaded.
 * @returns {{ items: object, loadouts: any[], recipes: object, allItems: any[], itemById: object, itemByName: object }}
 */
export const createEmptyData = () => ({
  items:      {},
  loadouts:   [],
  recipes:    {},
  allItems:   [],
  itemById:   {},
  itemByName: {},
});
