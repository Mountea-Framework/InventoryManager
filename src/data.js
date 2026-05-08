// Architect Editor — Fixture data
// Item shape matches the canonical Mountea Inventory schema.

// Bitflag enum (mirrors EInventoryItemFlags from C++ side)
window.ITEM_FLAGS = [
  { bit: 1 << 0, key: 'tradeable',  label: 'Tradeable',  tip: 'Item can be traded between inventories.' },
  { bit: 1 << 1, key: 'stackable',  label: 'Stackable',  tip: 'Item can stack with others of the same type.' },
  { bit: 1 << 2, key: 'craftable',  label: 'Craftable',  tip: 'Item can be used in crafting recipes.' },
  { bit: 1 << 3, key: 'dropable',   label: 'Dropable',   tip: 'Item can be dropped into the world.' },
  { bit: 1 << 4, key: 'consumable', label: 'Consumable', tip: 'Item can be consumed for an effect.' },
  { bit: 1 << 5, key: 'questItem',  label: 'Quest Item', tip: 'Item is required for a quest.' },
  { bit: 1 << 6, key: 'unique',     label: 'Unique',     tip: 'Item is unique and can be only once in Inventory.' },
  { bit: 1 << 7, key: 'durable',    label: 'Durable',    tip: 'Item has durability and can degrade.' },
];

// helpers — bitmask <-> object
window.flagsToBits = (obj) =>
  window.ITEM_FLAGS.reduce((m, f) => m | (obj?.[f.key] ? f.bit : 0), 0);
window.bitsToFlags = (bits) =>
  Object.fromEntries(window.ITEM_FLAGS.map(f => [f.key, !!(bits & f.bit)]));
window.flagsLabels = (bits) =>
  window.ITEM_FLAGS.filter(f => bits & f.bit).map(f => f.label);

const F = (...keys) => {
  let b = 0;
  for (const k of keys) {
    const def = window.ITEM_FLAGS.find(f => f.key === k);
    if (def) b |= def.bit;
  }
  return b;
};

// Stable, fake GUIDs for fixtures
const guid = (a, b, c, d, e) =>
  `${a.padEnd(8, '0')}-${b.padEnd(4, '0')}-${c.padEnd(4, '0')}-${d.padEnd(4, '0')}-${e.padEnd(12, '0')}`;

// Pre-defined item actions catalog (player-facing verbs an item supports)
window.ITEM_ACTIONS = [
  { key: 'Drop',      icon: 'export', tip: 'Drop the item into the world.' },
  { key: 'Pickup',    icon: 'plus',   tip: 'Pick the item up from the world.' },
  { key: 'Use',       icon: 'play',   tip: 'Generic activation.' },
  { key: 'Consume',   icon: 'drop',   tip: 'Consume the item for an effect.' },
  { key: 'Equip',     icon: 'shield', tip: 'Equip into a matching slot.' },
  { key: 'Unequip',   icon: 'minus',  tip: 'Unequip and return to inventory.' },
  { key: 'Learn',     icon: 'sparkle',tip: 'Learn a recipe / skill from the item.' },
  { key: 'Read',      icon: 'eye',    tip: 'Open the item\u2019s readable content.' },
  { key: 'Inspect',   icon: 'info',   tip: 'Open detailed inspection panel.' },
  { key: 'Split',     icon: 'branch', tip: 'Split a stack.' },
  { key: 'Combine',   icon: 'layers', tip: 'Combine matching items into a stack.' },
  { key: 'Repair',    icon: 'history',tip: 'Repair durability at a station.' },
  { key: 'Disassemble', icon: 'cog',  tip: 'Break down into components.' },
  { key: 'Sell',      icon: 'export', tip: 'Sell at a vendor.' },
  { key: 'Discard',   icon: 'trash',  tip: 'Permanently destroy.' },
];

const mkItem = (o) => ({
  guid: o.guid,
  displayName: o.displayName,
  category: o.category,
  subCategory: o.subCategory,
  rarity: o.rarity,
  flags: o.flags ?? 0,
  maxQuantity: o.maxQuantity ?? 1,
  maxStackSize: o.maxStackSize ?? 1,
  tags: o.tags || [],
  spawnActor: { path: o.spawnActor || '' },
  description: { short: o.short || '', long: o.long || '' },
  visuals: {
    thumbnail: { path: o.thumbnail || '' },
    cover:     { path: o.cover || '' },
    mesh:      { path: o.mesh || '' },
  },
  durability: {
    enabled: o.durabilityEnabled ?? false,
    max: o.durabilityMax ?? 100,
    base: o.durabilityBase ?? 100,
    penalization: o.durabilityPenalization ?? 0.1,
    priceCoefficient: o.durabilityPriceCoeff ?? 0.5,
  },
  economy: {
    enabled: o.economyEnabled ?? true,
    basePrice: o.basePrice ?? 0,
    sellCoefficient: o.sellCoefficient ?? 0.75,
  },
  weight: {
    enabled: o.weightEnabled ?? true,
    value: o.weightValue ?? 0,
  },
  attachmentSlots: o.attachmentSlots || [],
  specialAffects: o.specialAffects || [],
  itemActions: o.itemActions || [],

  // UI-only adornments (kept off the canonical schema)
  _ui: { icon: o.icon || 'cube', thumbTone: o.thumbTone ?? 0, slot: o.slot || null },
});

window.DATA = {
  items: {
    Weapons: [
      mkItem({
        guid: guid('itm','wpn','0008','plas','ma01superheat'),
        displayName: 'Superheated Plasma Rifle',
        category: 'Weapons', subCategory: 'Energy Rifle',
        rarity: 'Legendary',
        flags: F('tradeable','craftable','dropable','durable','unique'),
        maxQuantity: 1, maxStackSize: 1,
        tags: ['Item.Weapon', 'Item.Weapon.Energy', 'Item.TwoHanded'],
        spawnActor: '/Game/Blueprints/Weapons/BP_PlasmaRifle.BP_PlasmaRifle_C',
        short: 'Overcharged variant with thermal containment coils.',
        long: 'A bleeding-edge prototype issued to elite shock units. Sustained fire will overheat the barrel assembly.',
        thumbnail: '/Game/UI/Textures/T_PlasmaRifle_Thumb.T_PlasmaRifle_Thumb',
        cover:     '/Game/UI/Textures/T_PlasmaRifle_Cover.T_PlasmaRifle_Cover',
        mesh:      '/Game/Meshes/Weapons/SK_PlasmaRifle.SK_PlasmaRifle',
        durabilityEnabled: true, durabilityMax: 840, durabilityBase: 840,
        durabilityPenalization: 0.12, durabilityPriceCoeff: 0.55,
        economyEnabled: true, basePrice: 18200, sellCoefficient: 0.6,
        weightEnabled: true, weightValue: 7.4,
        attachmentSlots: ['Slot.Optic', 'Slot.Barrel', 'Slot.Magazine'],
        specialAffects: ['/Game/Blueprints/Affects/BP_OverheatEffect.BP_OverheatEffect_C'],
        itemActions: ['Pickup', 'Drop', 'Equip', 'Unequip', 'Inspect', 'Repair', 'Sell'],
        icon: 'sword', thumbTone: 2, slot: 'Primary',
      }),
      mkItem({
        guid: guid('itm','wpn','0014','scou','tsnipermk2'),
        displayName: 'Scout Sniper MK2',
        category: 'Weapons', subCategory: 'Precision Rifle',
        rarity: 'Epic',
        flags: F('tradeable','craftable','dropable','durable'),
        maxQuantity: 1, maxStackSize: 1,
        tags: ['Item.Weapon', 'Item.Weapon.Kinetic', 'Item.TwoHanded'],
        spawnActor: '/Game/Blueprints/Weapons/BP_ScoutSniper.BP_ScoutSniper_C',
        short: 'Long-range marksman rifle with integrated optics.',
        thumbnail: '/Game/UI/Textures/T_ScoutSniper_Thumb.T_ScoutSniper_Thumb',
        mesh: '/Game/Meshes/Weapons/SK_ScoutSniper.SK_ScoutSniper',
        durabilityEnabled: true, durabilityMax: 720, durabilityBase: 720,
        basePrice: 9400, sellCoefficient: 0.7,
        weightValue: 5.1,
        attachmentSlots: ['Slot.Optic', 'Slot.Magazine'],
        icon: 'target', thumbTone: 0, slot: 'Primary',
        itemActions: ['Pickup', 'Drop', 'Equip', 'Unequip', 'Inspect', 'Repair', 'Sell'],
      }),
      mkItem({
        guid: guid('itm','wpn','0021','kine','ticsidearm'),
        displayName: 'Kinetic Sidearm',
        category: 'Weapons', subCategory: 'Pistol',
        rarity: 'Rare',
        flags: F('tradeable','craftable','dropable','durable'),
        tags: ['Item.Weapon', 'Item.Weapon.Kinetic', 'Item.Sidearm'],
        spawnActor: '/Game/Blueprints/Weapons/BP_Sidearm.BP_Sidearm_C',
        short: 'Standard-issue sidearm.',
        mesh: '/Game/Meshes/Weapons/SK_Sidearm.SK_Sidearm',
        durabilityEnabled: true, durabilityMax: 480, durabilityBase: 480,
        basePrice: 2100, weightValue: 1.2,
        icon: 'target', thumbTone: 1, slot: 'Secondary',
        itemActions: ['Pickup', 'Drop', 'Equip', 'Unequip', 'Inspect', 'Repair', 'Sell'],
      }),
    ],
    Consumables: [
      mkItem({
        guid: guid('itm','con','0102','stim','injector'),
        displayName: 'Combat Stimulant',
        category: 'Consumables', subCategory: 'Injector',
        rarity: 'Uncommon',
        flags: F('tradeable','stackable','consumable','dropable'),
        maxQuantity: 10, maxStackSize: 10,
        tags: ['Item.Consumable', 'Item.Medical'],
        short: 'Brief stat boost; metabolizes within 30 seconds.',
        basePrice: 120, weightValue: 0.1,
        icon: 'drop', thumbTone: 3,
        itemActions: ['Pickup', 'Drop', 'Use', 'Consume', 'Split', 'Combine', 'Discard'],
      }),
      mkItem({
        guid: guid('itm','con','0118','nani','tepatch'),
        displayName: 'Nanite Repair Patch',
        category: 'Consumables', subCategory: 'Medical',
        rarity: 'Rare',
        flags: F('tradeable','stackable','consumable','dropable'),
        maxQuantity: 5, maxStackSize: 5,
        tags: ['Item.Consumable', 'Item.Medical'],
        basePrice: 340, weightValue: 0.2,
        icon: 'drop', thumbTone: 3,
        itemActions: ['Pickup', 'Drop', 'Use', 'Consume', 'Split', 'Combine', 'Discard'],
      }),
    ],
    Materials: [
      mkItem({
        guid: guid('itm','mat','0201','refi','nedobsidian'),
        displayName: 'Refined Obsidian Steel',
        category: 'Materials', subCategory: 'Metal',
        rarity: 'Uncommon',
        flags: F('tradeable','stackable','craftable','dropable'),
        maxQuantity: 99, maxStackSize: 99,
        tags: ['Item.Material', 'Item.Material.Metal'],
        basePrice: 45, weightValue: 0.5,
        icon: 'cube', thumbTone: 4,
        itemActions: ['Pickup', 'Drop', 'Split', 'Combine', 'Sell'],
      }),
      mkItem({
        guid: guid('itm','mat','0207','anci','entbronze'),
        displayName: 'Ancient Bronze Leather',
        category: 'Materials', subCategory: 'Hide',
        rarity: 'Rare',
        flags: F('tradeable','stackable','craftable','dropable'),
        maxQuantity: 99, maxStackSize: 99,
        tags: ['Item.Material', 'Item.Material.Hide'],
        basePrice: 90, weightValue: 0.3,
        icon: 'cube', thumbTone: 4,
        itemActions: ['Pickup', 'Drop', 'Split', 'Combine', 'Sell'],
      }),
      mkItem({
        guid: guid('itm','mat','0213','ethe','realcrystal'),
        displayName: 'Ethereal Crystal Dust',
        category: 'Materials', subCategory: 'Reagent',
        rarity: 'Epic',
        flags: F('tradeable','stackable','craftable','dropable'),
        maxQuantity: 99, maxStackSize: 99,
        tags: ['Item.Material', 'Item.Material.Reagent'],
        basePrice: 220, weightValue: 0.05,
        icon: 'sparkle', thumbTone: 2,
        itemActions: ['Pickup', 'Drop', 'Split', 'Combine', 'Sell'],
      }),
    ],
    Armor: [
      mkItem({
        guid: guid('itm','arm','0041','heav','yplatechest'),
        displayName: 'Heavy Plate Chest',
        category: 'Armor', subCategory: 'Chest',
        rarity: 'Epic',
        flags: F('tradeable','dropable','durable'),
        tags: ['Item.Armor', 'Item.Armor.Heavy'],
        durabilityEnabled: true, durabilityMax: 1200, durabilityBase: 1200,
        basePrice: 5400, weightValue: 12.0,
        attachmentSlots: ['Slot.Plate', 'Slot.Enchantment'],
        icon: 'shield', thumbTone: 1, slot: 'Chest',
        itemActions: ['Pickup', 'Drop', 'Equip', 'Unequip', 'Inspect', 'Repair', 'Disassemble', 'Sell'],
      }),
      mkItem({
        guid: guid('itm','arm','0053','ligh','thelmrecon'),
        displayName: 'Recon Light Helm',
        category: 'Armor', subCategory: 'Head',
        rarity: 'Rare',
        flags: F('tradeable','dropable','durable'),
        tags: ['Item.Armor', 'Item.Armor.Light'],
        durabilityEnabled: true, durabilityMax: 600, durabilityBase: 600,
        basePrice: 1800, weightValue: 1.8,
        icon: 'helmet', thumbTone: 0, slot: 'Head',
        itemActions: ['Pickup', 'Drop', 'Equip', 'Unequip', 'Inspect', 'Repair', 'Sell'],
      }),
    ],
    Containers: [
      mkItem({
        guid: guid('itm','cnt','0301','larg','erucksack'),
        displayName: 'Expedition Rucksack',
        category: 'Containers', subCategory: 'Backpack',
        rarity: 'Rare',
        flags: F('tradeable','dropable'),
        tags: ['Item.Container'],
        basePrice: 1200, weightValue: 2.2,
        icon: 'backpack', thumbTone: 4, slot: 'Back',
        itemActions: ['Pickup', 'Drop', 'Equip', 'Unequip', 'Inspect', 'Sell'],
      }),
      mkItem({
        guid: guid('itm','cnt','0315','advm','edkitpack'),
        displayName: 'Advanced Medkit Pack',
        category: 'Containers', subCategory: 'Medical Bag',
        rarity: 'Epic',
        flags: F('tradeable','stackable','dropable'),
        maxQuantity: 5, maxStackSize: 5,
        tags: ['Item.Container', 'Item.Medical'],
        basePrice: 2200, weightValue: 1.0,
        icon: 'backpack', thumbTone: 3,
        itemActions: ['Pickup', 'Drop', 'Use', 'Inspect', 'Sell'],
      }),
    ],
  },

  loadouts: [
    { id: 'LDT_001', name: 'Endgame Warrior', version: 'v2.4',
      desc: 'Optimized for high-tier raiding and max physical resistance.',
      tagline: 'High-tier raid kit',
      items: [
        { ref: 'Heavy Plate Chest',   qty: 1, durability: 1.0, autoEquip: true,  slot: 'Chest' },
        { ref: 'Expedition Rucksack', qty: 1, durability: null, autoEquip: true,  slot: 'Back' },
        { ref: 'Advanced Medkit Pack', qty: 5, durability: 0.8, autoEquip: false, slot: null },
        { ref: 'Superheated Plasma Rifle', qty: 1, durability: 1.0, autoEquip: true, slot: 'Primary' },
        { ref: 'Kinetic Sidearm',     qty: 1, durability: 0.9, autoEquip: true, slot: 'Secondary' },
      ],
      slots: { Head: null, Primary: 'Superheated Plasma Rifle', Secondary: 'Kinetic Sidearm', Back: 'Expedition Rucksack', Chest: 'Heavy Plate Chest' },
    },
    { id: 'LDT_002', name: 'Starter Kit', version: 'v1.0',
      desc: 'Default spawn equipment for tier 0 players.', tagline: 'Tier 0 spawn',
      items: [
        { ref: 'Kinetic Sidearm',  qty: 1, durability: 1.0, autoEquip: true, slot: 'Primary' },
        { ref: 'Combat Stimulant', qty: 3, durability: null, autoEquip: false, slot: null },
      ],
      slots: { Primary: 'Kinetic Sidearm' },
    },
    { id: 'LDT_003', name: 'Stealth Operative', version: 'v1.6',
      desc: 'Focus on noise reduction and light armor sets.', tagline: 'Low-noise profile',
      items: [
        { ref: 'Recon Light Helm',  qty: 1, durability: 1.0, autoEquip: true, slot: 'Head' },
        { ref: 'Scout Sniper MK2',  qty: 1, durability: 0.95, autoEquip: true, slot: 'Primary' },
        { ref: 'Kinetic Sidearm',   qty: 1, durability: 1.0, autoEquip: false, slot: 'Secondary' },
      ],
      slots: { Head: 'Recon Light Helm', Primary: 'Scout Sniper MK2', Secondary: 'Kinetic Sidearm' },
    },
    { id: 'LDT_004', name: 'Testing: Naked Run', version: 'v0.2',
      desc: 'Minimal viable items for balance testing.', tagline: 'QA baseline',
      items: [{ ref: 'Combat Stimulant', qty: 1, durability: null, autoEquip: false, slot: null }],
      slots: {},
    },
  ],

  recipes: {
    Smithing: [
      { id: 'RECIPE_SMITH_042', name: 'Greatsword of Ash', tier: 'Tier 4',
        result: { itemRef: 'base_greatsword_t4', display: 'Masterwork Grade', icon: 'sword', tone: 0 },
        successChance: 85, qtyMin: 1, qtyMax: 1,
        reqs: { level: 46, station: 'Dragonforge', duration: '126s' },
        groups: [
          { id: 'g1', title: 'Primary Components', required: true,
            ingredients: [
              { ref: 'Refined Obsidian Steel', qty: 12, icon: 'cube', tone: 4 },
              { ref: 'Ancient Bronze Leather', qty: 4,  icon: 'cube', tone: 4 },
            ]},
        ],
      },
      { id: 'RECIPE_SMITH_019', name: 'Damascus Dagger', tier: 'Tier 2',
        result: { itemRef: 'base_dagger_t2', display: 'Fine Grade', icon: 'sword', tone: 1 },
        successChance: 92, qtyMin: 1, qtyMax: 1,
        reqs: { level: 22, station: 'Forge', duration: '48s' },
        groups: [{ id: 'g1', title: 'Primary Components', required: true,
          ingredients: [{ ref: 'Refined Obsidian Steel', qty: 5, icon: 'cube', tone: 4 }] }],
      },
      { id: 'RECIPE_SMITH_008', name: 'Plate Gauntlets', tier: 'Tier 3',
        result: { itemRef: 'base_gauntlets_t3', display: 'Reinforced', icon: 'shield', tone: 1 },
        successChance: 88, qtyMin: 1, qtyMax: 1,
        reqs: { level: 34, station: 'Forge', duration: '72s' },
        groups: [{ id: 'g1', title: 'Primary Components', required: true,
          ingredients: [
            { ref: 'Refined Obsidian Steel', qty: 8, icon: 'cube', tone: 4 },
            { ref: 'Ancient Bronze Leather', qty: 2, icon: 'cube', tone: 4 },
          ] }],
      },
    ],
    Alchemy: [
      { id: 'RECIPE_ALCH_132', name: 'Etheric Draught', tier: 'Essence',
        result: { itemRef: 'potion_etheric', display: 'Greater Vial', icon: 'beaker', tone: 2 },
        successChance: 74, qtyMin: 2, qtyMax: 4,
        reqs: { level: 28, station: 'Alchemy Bench', duration: '34s' },
        groups: [{ id: 'g1', title: 'Primary Components', required: true,
          ingredients: [
            { ref: 'Ethereal Crystal Dust', qty: 3, icon: 'sparkle', tone: 2 },
            { ref: 'pure_water', qty: 1, icon: 'drop', tone: 3 },
          ] }],
      },
      { id: 'RECIPE_ALCH_155', name: 'Vial of Wrath', tier: 'Corrupt',
        result: { itemRef: 'potion_wrath', display: 'Unstable', icon: 'beaker', tone: 1 },
        successChance: 58, qtyMin: 1, qtyMax: 2,
        reqs: { level: 41, station: 'Shadow Altar', duration: '90s' },
        groups: [{ id: 'g1', title: 'Primary Components', required: true,
          ingredients: [{ ref: 'Ethereal Crystal Dust', qty: 5, icon: 'sparkle', tone: 2 }] }],
      },
    ],
  },
};

// helpers: flat lookup (keyed by guid; legacy `id` alias kept for downstream code)
window.DATA.allItems = Object.values(window.DATA.items).flat().map(it => ({
  ...it,
  id: it.guid,                        // legacy id → guid
  name: it.displayName,               // legacy display name shortcut
}));
window.DATA.itemById = Object.fromEntries(window.DATA.allItems.map(i => [i.guid, i]));
window.DATA.itemByName = Object.fromEntries(window.DATA.allItems.map(i => [i.displayName, i]));
