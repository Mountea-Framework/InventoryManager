import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const randomHex = (len) => Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
const guid = () => `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${randomHex(3)}-${randomHex(12)}`;

const FLAG = {
  tradeable: 1 << 0,
  stackable: 1 << 1,
  craftable: 1 << 2,
  dropable: 1 << 3,
  consumable: 1 << 4,
  questItem: 1 << 5,
  unique: 1 << 6,
  durable: 1 << 7,
};

const itemByName = new Map();

const mkItem = ({
  displayName, category, subCategory, rarity,
  tags = [], flags = 0, maxQuantity = 1, maxStackSize = 1,
  basePrice = 0, weight = 0, itemActions = ['Inspect'],
  short = '', long = '', icon = 'cube', tone = 0,
  durabilityEnabled = false, durabilityMax = 100, durabilityBase = 100,
}) => {
  const it = {
    guid: guid(),
    displayName,
    category,
    subCategory,
    rarity,
    flags,
    maxQuantity,
    maxStackSize,
    tags,
    spawnActor: { path: '' },
    description: { short, long },
    visuals: {
      thumbnail: { path: '' },
      cover: { path: '' },
      mesh: { path: '' },
    },
    durability: {
      enabled: durabilityEnabled,
      max: durabilityMax,
      base: durabilityBase,
      penalization: 0.1,
      priceCoefficient: 0.6,
    },
    economy: { enabled: true, basePrice, sellCoefficient: 0.7 },
    weight: { enabled: true, value: weight },
    attachmentSlots: [],
    specialAffects: [],
    itemActions,
    _ui: { icon, thumbTone: tone, slot: null },
  };

  itemByName.set(displayName, it);
  return it;
};

const items = [
  // Weapons (4)
  mkItem({
    displayName: 'Silver Wolf Blade', category: 'Weapons', subCategory: 'Swords', rarity: 'Rare',
    tags: ['Item.Weapon.Sword', 'World.Witcher'],
    flags: FLAG.tradeable | FLAG.dropable | FLAG.durable,
    basePrice: 680, weight: 3.7, icon: 'sword', tone: 2,
    itemActions: ['Equip', 'Unequip', 'Inspect', 'Repair', 'Sell', 'Drop'],
    durabilityEnabled: true, durabilityMax: 140, durabilityBase: 132,
    short: 'A silvered blade tuned for cursed foes.',
    long: 'Forged in Novigrad style with a narrow fuller and moon-silver edge.'
  }),
  mkItem({
    displayName: 'Moonveil Replica', category: 'Weapons', subCategory: 'Swords', rarity: 'Epic',
    tags: ['Item.Weapon.Katana', 'World.EldenRing'],
    flags: FLAG.tradeable | FLAG.dropable | FLAG.durable | FLAG.unique,
    basePrice: 1500, weight: 4.2, icon: 'sword', tone: 6,
    itemActions: ['Equip', 'Unequip', 'Inspect', 'Repair', 'Sell', 'Drop'],
    durabilityEnabled: true, durabilityMax: 180, durabilityBase: 180,
    short: 'A moonlit katana imitation with arcane residue.',
    long: 'Not the original, but the draw is still clean enough to split armor joints.'
  }),
  mkItem({
    displayName: 'Lothric Knight Spear', category: 'Weapons', subCategory: 'Polearms', rarity: 'Uncommon',
    tags: ['Item.Weapon.Spear', 'World.DarkSouls3'],
    flags: FLAG.tradeable | FLAG.dropable | FLAG.durable,
    basePrice: 540, weight: 4.8, icon: 'sword', tone: 3,
    itemActions: ['Equip', 'Unequip', 'Inspect', 'Repair', 'Sell', 'Drop'],
    durabilityEnabled: true, durabilityMax: 120, durabilityBase: 112,
    short: 'A disciplined thrusting spear from Lothric drill lines.',
  }),
  mkItem({
    displayName: 'Gravelord Greatsword', category: 'Weapons', subCategory: 'Greatswords', rarity: 'Legendary',
    tags: ['Item.Weapon.Greatsword', 'World.DarkSouls3'],
    flags: FLAG.tradeable | FLAG.dropable | FLAG.durable | FLAG.unique,
    basePrice: 2200, weight: 9.1, icon: 'sword', tone: 8,
    itemActions: ['Equip', 'Unequip', 'Inspect', 'Repair', 'Sell', 'Drop'],
    durabilityEnabled: true, durabilityMax: 220, durabilityBase: 220,
    short: 'A heavy relic that hums with grave-cold intent.',
  }),

  // Consumables (3)
  mkItem({
    displayName: 'Swallow Flask', category: 'Consumables', subCategory: 'Potions', rarity: 'Common',
    tags: ['Item.Consumable.Potion', 'World.Witcher'],
    flags: FLAG.tradeable | FLAG.stackable | FLAG.dropable | FLAG.consumable | FLAG.craftable,
    maxQuantity: 50, maxStackSize: 10, basePrice: 90, weight: 0.4, icon: 'beaker', tone: 1,
    itemActions: ['Consume', 'Inspect', 'Sell', 'Drop'],
    short: 'Gradual vitality recovery over time.',
  }),
  mkItem({
    displayName: 'Estus Fragment Tonic', category: 'Consumables', subCategory: 'Potions', rarity: 'Rare',
    tags: ['Item.Consumable.Tonic', 'World.DarkSouls3'],
    flags: FLAG.tradeable | FLAG.stackable | FLAG.dropable | FLAG.consumable | FLAG.craftable,
    maxQuantity: 20, maxStackSize: 5, basePrice: 240, weight: 0.5, icon: 'drop', tone: 4,
    itemActions: ['Consume', 'Inspect', 'Sell', 'Drop'],
    short: 'A fortified draught for harsh duels.',
  }),
  mkItem({
    displayName: 'Warming Stone', category: 'Consumables', subCategory: 'Bombs', rarity: 'Uncommon',
    tags: ['Item.Consumable.Utility', 'World.EldenRing'],
    flags: FLAG.tradeable | FLAG.stackable | FLAG.dropable | FLAG.consumable | FLAG.craftable,
    maxQuantity: 30, maxStackSize: 10, basePrice: 180, weight: 0.3, icon: 'sparkle', tone: 5,
    itemActions: ['Use', 'Inspect', 'Sell', 'Drop'],
    short: 'Creates a brief warm aura that steadies recovery.',
  }),

  // Materials (4)
  mkItem({
    displayName: 'Titanite Shard', category: 'Materials', subCategory: 'Metals', rarity: 'Common',
    tags: ['Item.Material.Metal', 'World.DarkSouls3'],
    flags: FLAG.tradeable | FLAG.stackable | FLAG.dropable | FLAG.craftable,
    maxQuantity: 999, maxStackSize: 99, basePrice: 40, weight: 0.1, icon: 'cube', tone: 2,
    itemActions: ['Inspect', 'Sell', 'Drop'],
  }),
  mkItem({
    displayName: 'Somber Smithing Stone [2]', category: 'Materials', subCategory: 'Metals', rarity: 'Rare',
    tags: ['Item.Material.Stone', 'World.EldenRing'],
    flags: FLAG.tradeable | FLAG.stackable | FLAG.dropable | FLAG.craftable,
    maxQuantity: 999, maxStackSize: 99, basePrice: 120, weight: 0.15, icon: 'cube', tone: 7,
    itemActions: ['Inspect', 'Sell', 'Drop'],
  }),
  mkItem({
    displayName: 'Drowner Brain', category: 'Materials', subCategory: 'Organic', rarity: 'Uncommon',
    tags: ['Item.Material.Organic', 'World.Witcher'],
    flags: FLAG.tradeable | FLAG.stackable | FLAG.dropable | FLAG.craftable,
    maxQuantity: 200, maxStackSize: 20, basePrice: 65, weight: 0.2, icon: 'cube', tone: 3,
    itemActions: ['Inspect', 'Sell', 'Drop'],
  }),
  mkItem({
    displayName: 'Rowa Fruit', category: 'Materials', subCategory: 'Plants', rarity: 'Common',
    tags: ['Item.Material.Plant', 'World.EldenRing'],
    flags: FLAG.tradeable | FLAG.stackable | FLAG.dropable | FLAG.craftable,
    maxQuantity: 999, maxStackSize: 99, basePrice: 18, weight: 0.05, icon: 'leaf', tone: 1,
    itemActions: ['Inspect', 'Sell', 'Drop'],
  }),

  // Armor (2)
  mkItem({
    displayName: 'Kaer Morhen Jacket', category: 'Armor', subCategory: 'Chest', rarity: 'Rare',
    tags: ['Item.Armor.Chest', 'World.Witcher'],
    flags: FLAG.tradeable | FLAG.dropable | FLAG.durable,
    basePrice: 900, weight: 6.2, icon: 'shield', tone: 2,
    itemActions: ['Equip', 'Unequip', 'Inspect', 'Repair', 'Sell', 'Drop'],
    durabilityEnabled: true, durabilityMax: 160, durabilityBase: 145,
  }),
  mkItem({
    displayName: 'Raging Wolf Helm', category: 'Armor', subCategory: 'Head', rarity: 'Epic',
    tags: ['Item.Armor.Helm', 'World.EldenRing'],
    flags: FLAG.tradeable | FLAG.dropable | FLAG.durable,
    basePrice: 1250, weight: 4.3, icon: 'shield', tone: 6,
    itemActions: ['Equip', 'Unequip', 'Inspect', 'Repair', 'Sell', 'Drop'],
    durabilityEnabled: true, durabilityMax: 175, durabilityBase: 170,
  }),

  // Containers (1)
  mkItem({
    displayName: 'Hunter Satchel', category: 'Containers', subCategory: 'Backpacks', rarity: 'Uncommon',
    tags: ['Item.Container.Bag'],
    flags: FLAG.tradeable | FLAG.dropable,
    basePrice: 220, weight: 1.1, icon: 'backpack', tone: 4,
    itemActions: ['Inspect', 'Sell', 'Drop'],
  }),
];

const i = (name) => {
  const found = itemByName.get(name);
  if (!found) throw new Error(`Unknown item: ${name}`);
  return found;
};

const mkLoadout = ({ name, tagline, desc, entries, dropOnDeath = 'Equipped only' }) => ({
  guid: guid(),
  name,
  tagline,
  desc,
  items: entries.map((e) => ({
    ref: { guid: e.ref.guid, displayName: e.ref.displayName },
    qty: e.qty,
    durability: e.durability ?? 1,
    autoEquip: e.autoEquip ?? false,
    slot: e.slot ?? null,
  })),
  slots: Object.fromEntries(
    entries
      .filter((e) => e.slot)
      .map((e) => [e.slot, { guid: e.ref.guid, displayName: e.ref.displayName }]),
  ),
  behaviour: {
    applyOnSpawn: true,
    randomiseQty: false,
    autoEquipPass: true,
    dropOnDeath,
  },
});

const loadouts = [
  mkLoadout({
    name: 'NPC - Novigrad Monster Hunter',
    tagline: 'Fast blade, light armor, field alchemy',
    desc: 'A witcher-style hunter prepared for cursed contracts and swamp creatures.',
    entries: [
      { ref: i('Silver Wolf Blade'), qty: 1, durability: 0.92, autoEquip: true, slot: 'Primary Weapon' },
      { ref: i('Kaer Morhen Jacket'), qty: 1, durability: 0.87, autoEquip: true, slot: 'Chest' },
      { ref: i('Swallow Flask'), qty: 3, autoEquip: false },
      { ref: i('Drowner Brain'), qty: 2, autoEquip: false },
    ],
  }),
  mkLoadout({
    name: 'NPC - Lothric Spear Sentinel',
    tagline: 'Measured spacing and poise control',
    desc: 'A disciplined guard unit built around thrust pressure and attrition.',
    entries: [
      { ref: i('Lothric Knight Spear'), qty: 1, durability: 0.95, autoEquip: true, slot: 'Primary Weapon' },
      { ref: i('Estus Fragment Tonic'), qty: 2, autoEquip: false },
      { ref: i('Titanite Shard'), qty: 5, autoEquip: false },
      { ref: i('Hunter Satchel'), qty: 1, autoEquip: true, slot: 'Backpack' },
    ],
  }),
  mkLoadout({
    name: 'NPC - Raya Lucaria Duelist',
    tagline: 'Moonlit edge and reactive sustain',
    desc: 'A nimble duelist carrying an arcane replica katana and utility stones.',
    entries: [
      { ref: i('Moonveil Replica'), qty: 1, durability: 1.0, autoEquip: true, slot: 'Primary Weapon' },
      { ref: i('Raging Wolf Helm'), qty: 1, durability: 0.98, autoEquip: true, slot: 'Head' },
      { ref: i('Warming Stone'), qty: 4, autoEquip: false },
      { ref: i('Somber Smithing Stone [2]'), qty: 2, autoEquip: false },
    ],
  }),
  mkLoadout({
    name: 'NPC - Ashen Grave Warden',
    tagline: 'Heavy pressure and relentless stamina',
    desc: 'An elite guardian with punishing weight and battlefield staying power.',
    entries: [
      { ref: i('Gravelord Greatsword'), qty: 1, durability: 0.9, autoEquip: true, slot: 'Primary Weapon' },
      { ref: i('Swallow Flask'), qty: 2, autoEquip: false },
      { ref: i('Titanite Shard'), qty: 8, autoEquip: false },
      { ref: i('Rowa Fruit'), qty: 5, autoEquip: false },
    ],
    dropOnDeath: 'All items',
  }),
];

const mkRecipe = ({ name, family, resultName, qtyMin, qtyMax, successChance, level, station, duration, ingredients }) => ({
  guid: guid(),
  name,
  family,
  result: {
    itemRef: i(resultName).guid,
    display: resultName,
    icon: i(resultName)._ui.icon,
    tone: i(resultName)._ui.thumbTone,
  },
  qtyMin,
  qtyMax,
  successChance,
  reqs: { level, station, duration },
  groups: [
    {
      id: guid(),
      title: 'Core Ingredients',
      required: true,
      ingredients: ingredients.map((x) => ({
        ref: { guid: i(x.ref).guid, displayName: x.ref },
        qty: x.qty,
        icon: i(x.ref)._ui.icon,
        tone: i(x.ref)._ui.thumbTone,
      })),
    },
  ],
});

const recipes = [
  mkRecipe({
    name: 'Brew: Swallow Flask', family: 'Alchemy', resultName: 'Swallow Flask',
    qtyMin: 1, qtyMax: 2, successChance: 94, level: 4, station: 'Alchemy Bench', duration: 35,
    ingredients: [
      { ref: 'Drowner Brain', qty: 1 },
      { ref: 'Rowa Fruit', qty: 2 },
    ],
  }),
  mkRecipe({
    name: 'Fortify: Estus Fragment Tonic', family: 'Alchemy', resultName: 'Estus Fragment Tonic',
    qtyMin: 1, qtyMax: 1, successChance: 88, level: 7, station: 'Alchemy Bench', duration: 52,
    ingredients: [
      { ref: 'Swallow Flask', qty: 1 },
      { ref: 'Titanite Shard', qty: 2 },
    ],
  }),
  mkRecipe({
    name: 'Sharpen: Silver Wolf Blade', family: 'Smithing', resultName: 'Silver Wolf Blade',
    qtyMin: 1, qtyMax: 1, successChance: 90, level: 8, station: 'Forge', duration: 75,
    ingredients: [
      { ref: 'Titanite Shard', qty: 3 },
      { ref: 'Somber Smithing Stone [2]', qty: 1 },
    ],
  }),
  mkRecipe({
    name: 'Temper: Lothric Knight Spear', family: 'Smithing', resultName: 'Lothric Knight Spear',
    qtyMin: 1, qtyMax: 1, successChance: 87, level: 6, station: 'Forge', duration: 68,
    ingredients: [
      { ref: 'Titanite Shard', qty: 4 },
      { ref: 'Rowa Fruit', qty: 1 },
    ],
  }),
  mkRecipe({
    name: 'Rite: Warming Stone', family: 'General', resultName: 'Warming Stone',
    qtyMin: 2, qtyMax: 4, successChance: 92, level: 5, station: 'Cookfire', duration: 40,
    ingredients: [
      { ref: 'Rowa Fruit', qty: 3 },
      { ref: 'Drowner Brain', qty: 1 },
    ],
  }),
];

const payload = { items, loadouts, recipes };
const outPath = resolve(process.cwd(), 'scripts', 'sample-workspace.witcher-souls-elden.json');
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const countByCategory = items.reduce((acc, it) => {
  acc[it.category] = (acc[it.category] ?? 0) + 1;
  return acc;
}, {});

console.log(`Wrote ${outPath}`);
console.log('Category counts:', countByCategory);
console.log(`Loadouts: ${loadouts.length}`);
console.log(`Recipes: ${recipes.length}`);
