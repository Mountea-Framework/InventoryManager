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

// Sample data draws loosely on monster-hunting and Nordic-frontier fantasy —
// original names throughout, no franchise-specific terms.
const items = [
  // Weapons (2) — 1 craftable
  mkItem({
    displayName: 'Silvered Hunter\'s Blade', category: 'Weapons', subCategory: 'Swords', rarity: 'Rare',
    tags: ['Item.Weapon.Sword'],
    flags: FLAG.tradeable | FLAG.dropable | FLAG.durable | FLAG.craftable,
    basePrice: 620, weight: 3.4, icon: 'sword', tone: 2,
    itemActions: ['Equip', 'Unequip', 'Inspect', 'Repair', 'Sell', 'Drop'],
    durabilityEnabled: true, durabilityMax: 135, durabilityBase: 128,
    short: 'A silvered blade kept honed for creatures that shrug off plain steel.',
    long: 'The edge is narrow and the fuller deep, drawn from an old hunter\'s-guild pattern. Monster blood does not linger on the metal.',
  }),
  mkItem({
    displayName: 'Frostforged Waraxe', category: 'Weapons', subCategory: 'Axes', rarity: 'Uncommon',
    tags: ['Item.Weapon.Axe'],
    flags: FLAG.tradeable | FLAG.dropable | FLAG.durable,
    basePrice: 410, weight: 5.6, icon: 'axe', tone: 5,
    itemActions: ['Equip', 'Unequip', 'Inspect', 'Repair', 'Sell', 'Drop'],
    durabilityEnabled: true, durabilityMax: 150, durabilityBase: 140,
    short: 'A single-bladed axe tempered in mountain snowmelt.',
    long: 'Favoured by hold guards for its balance in one hand and its bite through hide and mail alike.',
  }),

  // Armor (2) — 1 craftable
  mkItem({
    displayName: 'Runed Steel Helm', category: 'Armor', subCategory: 'Head', rarity: 'Rare',
    tags: ['Item.Armor.Helm'],
    flags: FLAG.tradeable | FLAG.dropable | FLAG.durable | FLAG.craftable,
    basePrice: 560, weight: 2.1, icon: 'shield', tone: 6,
    itemActions: ['Equip', 'Unequip', 'Inspect', 'Repair', 'Sell', 'Drop'],
    durabilityEnabled: true, durabilityMax: 130, durabilityBase: 130,
    short: 'Steel helm etched with warding runes along the brow.',
    long: 'The runes dull an impact rather than turn it, letting the wearer keep their footing.',
  }),
  mkItem({
    displayName: 'Oiled Leather Jerkin', category: 'Armor', subCategory: 'Chest', rarity: 'Uncommon',
    tags: ['Item.Armor.Chest'],
    flags: FLAG.tradeable | FLAG.dropable | FLAG.durable,
    basePrice: 320, weight: 2.8, icon: 'shield', tone: 3,
    itemActions: ['Equip', 'Unequip', 'Inspect', 'Repair', 'Sell', 'Drop'],
    durabilityEnabled: true, durabilityMax: 110, durabilityBase: 100,
    short: 'Supple leather worked with oils to shrug off rain and shallow cuts.',
  }),

  // Consumables (3) — all craftable
  mkItem({
    displayName: 'Vitality Draught', category: 'Consumables', subCategory: 'Potions', rarity: 'Common',
    tags: ['Item.Consumable.Potion'],
    flags: FLAG.tradeable | FLAG.stackable | FLAG.dropable | FLAG.consumable | FLAG.craftable,
    maxQuantity: 50, maxStackSize: 10, basePrice: 70, weight: 0.4, icon: 'beaker', tone: 1,
    itemActions: ['Consume', 'Inspect', 'Sell', 'Drop'],
    short: 'A gradual restorative brewed from marsh herbs and old remedies.',
  }),
  mkItem({
    displayName: 'Cleansing Bomb', category: 'Consumables', subCategory: 'Bombs', rarity: 'Uncommon',
    tags: ['Item.Consumable.Bomb'],
    flags: FLAG.tradeable | FLAG.stackable | FLAG.dropable | FLAG.consumable | FLAG.craftable,
    maxQuantity: 25, maxStackSize: 8, basePrice: 150, weight: 0.35, icon: 'sparkle', tone: 4,
    itemActions: ['Use', 'Inspect', 'Sell', 'Drop'],
    short: 'Shatters into a caustic mist that scours poison and rot from the air.',
  }),
  mkItem({
    displayName: 'Warm Spiced Mead', category: 'Consumables', subCategory: 'Food', rarity: 'Common',
    tags: ['Item.Consumable.Food'],
    flags: FLAG.tradeable | FLAG.stackable | FLAG.dropable | FLAG.consumable | FLAG.craftable,
    maxQuantity: 40, maxStackSize: 10, basePrice: 45, weight: 0.5, icon: 'drop', tone: 7,
    itemActions: ['Consume', 'Inspect', 'Sell', 'Drop'],
    short: 'Honeyed mead warmed with spice — steadies nerves against the cold.',
  }),

  // Materials (5) — raw, none craftable themselves
  mkItem({
    displayName: 'Pure Silver Ingot', category: 'Materials', subCategory: 'Metal', rarity: 'Common',
    tags: ['Item.Material.Metal'],
    flags: FLAG.tradeable | FLAG.stackable | FLAG.dropable,
    maxQuantity: 999, maxStackSize: 99, basePrice: 35, weight: 0.12, icon: 'cube', tone: 2,
    itemActions: ['Inspect', 'Sell', 'Drop'],
  }),
  mkItem({
    displayName: 'Riming Salts', category: 'Materials', subCategory: 'Reagent', rarity: 'Uncommon',
    tags: ['Item.Material.Reagent'],
    flags: FLAG.tradeable | FLAG.stackable | FLAG.dropable,
    maxQuantity: 300, maxStackSize: 50, basePrice: 55, weight: 0.08, icon: 'sparkle', tone: 8,
    itemActions: ['Inspect', 'Sell', 'Drop'],
    short: 'Crystalline salts that stay cold to the touch long after gathering.',
  }),
  mkItem({
    displayName: 'Bog Ichor', category: 'Materials', subCategory: 'Organic', rarity: 'Uncommon',
    tags: ['Item.Material.Organic'],
    flags: FLAG.tradeable | FLAG.stackable | FLAG.dropable,
    maxQuantity: 200, maxStackSize: 20, basePrice: 48, weight: 0.2, icon: 'drop', tone: 3,
    itemActions: ['Inspect', 'Sell', 'Drop'],
    short: 'Thick fluid drawn from marsh-dwelling things; useful once purified.',
  }),
  mkItem({
    displayName: 'Marshthorn Petals', category: 'Materials', subCategory: 'Plants', rarity: 'Common',
    tags: ['Item.Material.Plant'],
    flags: FLAG.tradeable | FLAG.stackable | FLAG.dropable,
    maxQuantity: 999, maxStackSize: 99, basePrice: 14, weight: 0.03, icon: 'leaf', tone: 1,
    itemActions: ['Inspect', 'Sell', 'Drop'],
    short: 'Petals from a thorned marsh bloom, prized by alchemists for their bitterness.',
  }),
  mkItem({
    displayName: 'Wild Honeycomb', category: 'Materials', subCategory: 'Provisions', rarity: 'Common',
    tags: ['Item.Material.Provisions'],
    flags: FLAG.tradeable | FLAG.stackable | FLAG.dropable,
    maxQuantity: 200, maxStackSize: 50, basePrice: 22, weight: 0.15, icon: 'cube', tone: 6,
    itemActions: ['Inspect', 'Sell', 'Drop'],
    short: 'Comb robbed from a wild hive, still heavy with honey.',
  }),

  // Containers (1)
  mkItem({
    displayName: 'Traveler\'s Satchel', category: 'Containers', subCategory: 'Backpack', rarity: 'Uncommon',
    tags: ['Item.Container.Bag'],
    flags: FLAG.tradeable | FLAG.dropable,
    basePrice: 180, weight: 1.0, icon: 'backpack', tone: 4,
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
    name: 'Player - Wandering Hunter',
    tagline: 'Silvered steel, light leathers, and a satchel of remedies',
    desc: 'Starting loadout for a wandering monster hunter — balanced offense, light protection, and alchemy on the go.',
    entries: [
      { ref: i('Silvered Hunter\'s Blade'), qty: 1, durability: 0.95, autoEquip: true, slot: 'Primary' },
      { ref: i('Oiled Leather Jerkin'), qty: 1, durability: 0.9, autoEquip: true, slot: 'Chest' },
      { ref: i('Traveler\'s Satchel'), qty: 1, autoEquip: true, slot: 'Back' },
      { ref: i('Vitality Draught'), qty: 3, autoEquip: false },
      { ref: i('Cleansing Bomb'), qty: 2, autoEquip: false },
      { ref: i('Riming Salts'), qty: 2, autoEquip: false },
    ],
  }),
  mkLoadout({
    name: 'NPC - Frosthold Guard',
    tagline: 'Nordic steel and a rune-warded helm against the cold',
    desc: 'A hold guard outfitted with a snow-tempered axe and rune-etched steel for long watches on the wall.',
    entries: [
      { ref: i('Frostforged Waraxe'), qty: 1, durability: 0.88, autoEquip: true, slot: 'Primary' },
      { ref: i('Runed Steel Helm'), qty: 1, durability: 0.93, autoEquip: true, slot: 'Head' },
      { ref: i('Warm Spiced Mead'), qty: 2, autoEquip: false },
      { ref: i('Pure Silver Ingot'), qty: 4, autoEquip: false },
    ],
    dropOnDeath: 'All items',
  }),
];

const mkRecipe = ({ name, family, resultName, qtyMin, qtyMax, successChance, level, station, duration, groups }) => ({
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
  groups: groups.map((g) => ({
    id: guid(),
    title: g.title,
    required: g.required ?? true,
    oneOf: g.oneOf ?? false,
    ingredients: g.ingredients.map((x) => ({
      ref: { guid: i(x.ref).guid, displayName: x.ref },
      qty: x.qty,
      icon: i(x.ref)._ui.icon,
      tone: i(x.ref)._ui.thumbTone,
    })),
  })),
});

const recipes = [
  mkRecipe({
    name: 'Forge: Silvered Hunter\'s Blade', family: 'Smithing', resultName: 'Silvered Hunter\'s Blade',
    qtyMin: 1, qtyMax: 1, successChance: 90, level: 8, station: 'Forge', duration: 75,
    groups: [
      {
        title: 'Blade Core', required: true,
        ingredients: [{ ref: 'Pure Silver Ingot', qty: 2 }],
      },
      {
        // Multiple options: either catalyst tempers the blade.
        title: 'Tempering Catalyst', required: true, oneOf: true,
        ingredients: [
          { ref: 'Riming Salts', qty: 1 },
          { ref: 'Bog Ichor', qty: 2 },
        ],
      },
    ],
  }),
  mkRecipe({
    name: 'Rune-Etch: Runed Steel Helm', family: 'Smithing', resultName: 'Runed Steel Helm',
    qtyMin: 1, qtyMax: 1, successChance: 85, level: 7, station: 'Forge', duration: 60,
    groups: [
      {
        title: 'Core Ingredients', required: true,
        ingredients: [
          { ref: 'Pure Silver Ingot', qty: 1 },
          { ref: 'Riming Salts', qty: 2 },
        ],
      },
    ],
  }),
  mkRecipe({
    name: 'Brew: Vitality Draught', family: 'Alchemy', resultName: 'Vitality Draught',
    qtyMin: 1, qtyMax: 2, successChance: 94, level: 4, station: 'Alchemy Bench', duration: 35,
    groups: [
      {
        title: 'Core Ingredients', required: true,
        ingredients: [
          { ref: 'Marshthorn Petals', qty: 2 },
          { ref: 'Bog Ichor', qty: 1 },
        ],
      },
    ],
  }),
  mkRecipe({
    name: 'Distill: Cleansing Bomb', family: 'Alchemy', resultName: 'Cleansing Bomb',
    qtyMin: 1, qtyMax: 1, successChance: 88, level: 6, station: 'Alchemy Bench', duration: 50,
    groups: [
      {
        title: 'Core Ingredients', required: true,
        ingredients: [
          { ref: 'Vitality Draught', qty: 1 },
          { ref: 'Riming Salts', qty: 1 },
        ],
      },
    ],
  }),
  mkRecipe({
    name: 'Cook: Warm Spiced Mead', family: 'General', resultName: 'Warm Spiced Mead',
    qtyMin: 2, qtyMax: 3, successChance: 96, level: 2, station: 'Cookfire', duration: 20,
    groups: [
      {
        title: 'Core Ingredients', required: true,
        ingredients: [
          { ref: 'Wild Honeycomb', qty: 1 },
          { ref: 'Marshthorn Petals', qty: 1 },
        ],
      },
    ],
  }),
];

// Taxonomy subset merged alongside the entities on import — reuses the app's
// default category/rarity/slot/station ids wherever the name already matches
// (Weapons, Armor, Chest, Head, Backpack, Metal, Reagent, Forge, Alchemy
// Bench, Primary, all rarities…) and only adds what's genuinely new.
const taxonomy = {
  categories: [
    { id: 'cat-weapons', subcategories: [
      { id: 'sub-swords', title: 'Swords', tags: ['Item.Weapon.Sword'] },
      { id: 'sub-axes',   title: 'Axes',   tags: ['Item.Weapon.Axe'] },
    ]},
    { id: 'cat-consumables', subcategories: [
      { id: 'sub-potions', title: 'Potions', tags: ['Item.Consumable.Potion'] },
      { id: 'sub-bombs',   title: 'Bombs',   tags: ['Item.Consumable.Bomb'] },
      { id: 'sub-food',    title: 'Food',    tags: ['Item.Consumable.Food'] },
    ]},
    { id: 'cat-materials', subcategories: [
      { id: 'sub-organic',    title: 'Organic',    tags: ['Item.Material.Organic'] },
      { id: 'sub-plants',     title: 'Plants',     tags: ['Item.Material.Plant'] },
      { id: 'sub-provisions', title: 'Provisions', tags: ['Item.Material.Provisions'] },
    ]},
  ],
  craftingStations: [
    { id: 'cs-cookfire', name: 'Cookfire', icon: 'flame', tag: 'Mountea_Inventory.Crafting.Cooking' },
  ],
};

const payload = { items, loadouts, recipes, taxonomy };
// Written into src/ (not scripts/) so the app can bundle it — this is the
// fixture consumed by the "Generate Sample Data" settings action.
const outPath = resolve(process.cwd(), 'src', 'sample-data', 'witcher-skyrim.json');
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const countByCategory = items.reduce((acc, it) => {
  acc[it.category] = (acc[it.category] ?? 0) + 1;
  return acc;
}, {});

const craftableCount = items.filter((it) => it.flags & FLAG.craftable).length;

console.log(`Wrote ${outPath}`);
console.log('Category counts:', countByCategory);
console.log(`Items: ${items.length} (craftable: ${craftableCount})`);
console.log(`Loadouts: ${loadouts.length}`);
console.log(`Recipes: ${recipes.length}`);
