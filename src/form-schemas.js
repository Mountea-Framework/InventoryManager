/**
 * Declarative form schema definitions for Item, CraftingRecipe, and Loadout.
 *
 * Each schema describes the sections and fields needed to create or edit a record.
 * Field types map directly to UI components:
 *
 *  text          →  <TextField>
 *  textarea      →  <Textarea>
 *  number        →  <Input type="number">  (min/max/step supported)
 *  select        →  <Select>               (options: static array, or source: 'taxonomy.*')
 *  switch        →  <Switch>
 *  flags         →  <FlagsPicker>          (ITEM_FLAGS bitmask; item schema only)
 *  tags          →  <StringListField>      (free-form tag list)
 *  string-list   →  <StringListField>      (generic ordered string list)
 *  file          →  <FilePicker>           (accept: mime or extension filter)
 *  chip-multi    →  <ItemActionsPicker>    (multi-select chips; item schema only)
 *  range         →  <RangeField>           (min/max/step/unit)
 *  item-list     →  inline sub-form list   (loadout composition rows)
 *  group-list    →  ingredient group list  (recipe groups + ingredient rows)
 *  slot-map      →  slot→item mapping grid (loadout slot inspector)
 *  readonly      →  plain text display     (non-editable, e.g. guid)
 */

/** @typedef {'text'|'textarea'|'number'|'select'|'switch'|'flags'|'tags'|'string-list'|'file'|'chip-multi'|'range'|'item-list'|'group-list'|'slot-map'|'readonly'} FieldType */

/**
 * @typedef {Object} SelectOption
 * @property {string} value
 * @property {string} label
 */

/**
 * @typedef {Object} FieldSchema
 * @property {string}      id          - dot-notation path into the record (e.g. "durability.max")
 * @property {string}      label       - human-readable field label
 * @property {FieldType}   type        - UI component to use
 * @property {boolean}     [required]  - validation: field must be non-empty
 * @property {boolean}     [disabled]  - non-editable (grey out, not readonly display)
 * @property {string}      [hint]      - helper text shown below the field
 * @property {SelectOption[]} [options] - static options for select/chip-multi
 * @property {string}      [source]    - dynamic options from taxonomy key (e.g. 'taxonomy.categories')
 * @property {string}      [dependsOn] - field id; re-filter options when this field changes
 * @property {string}      [accept]    - file picker: accepted MIME types or extensions
 * @property {string}      [placeholder]
 * @property {number}      [min]
 * @property {number}      [max]
 * @property {number}      [step]
 * @property {string}      [unit]      - display unit label (e.g. 'kg', 's')
 */

/**
 * @typedef {Object} SectionSchema
 * @property {string}        id       - unique section identifier
 * @property {string}        title    - section heading
 * @property {string}        [icon]   - icon name from ui.jsx Icon registry
 * @property {boolean}       [compact] - render rows without borders (compact Section)
 * @property {FieldSchema[]} fields
 */

/**
 * @typedef {Object} FormSchema
 * @property {string}          id       - 'item' | 'recipe' | 'loadout'
 * @property {string}          title    - dialog / page heading
 * @property {string}          icon     - icon for the form
 * @property {SectionSchema[]} sections
 */

/* ------------------------------------------------------------------ */
/*  ITEM FORM SCHEMA                                                    */
/* ------------------------------------------------------------------ */

/** @type {FormSchema} */
export const ITEM_SCHEMA = {
  id: 'item',
  title: 'Item Template',
  icon: 'cube',
  sections: [

    {
      id: 'identity',
      title: 'Identity',
      icon: 'tag',
      fields: [
        {
          id: 'displayName',
          label: 'Display Name',
          type: 'text',
          required: true,
          placeholder: 'e.g. Combat Stimulant',
        },
        {
          id: 'category',
          label: 'Category',
          type: 'select',
          required: true,
          source: 'taxonomy.categories',
          placeholder: 'Select category…',
        },
        {
          id: 'subCategory',
          label: 'Subcategory',
          type: 'select',
          source: 'taxonomy.categories',
          dependsOn: 'category',
          placeholder: 'Select subcategory…',
          tooltip: 'Filtered to the selected category.',
        },
        {
          id: 'rarity',
          label: 'Rarity',
          type: 'select',
          required: true,
          source: 'taxonomy.rarities',
          placeholder: 'Select rarity…',
        },
      ],
    },

    {
      id: 'description',
      title: 'Description',
      icon: 'eye',
      fields: [
        {
          id: 'description.short',
          label: 'Short Description',
          type: 'text',
          placeholder: 'One-line summary shown in tooltips.',
          tooltip: 'Keep under 80 characters.',
        },
        {
          id: 'description.long',
          label: 'Long Description',
          type: 'textarea',
          placeholder: 'Extended flavour text shown in the item inspector…',
        },
      ],
    },

    {
      id: 'flags',
      title: 'Flags & Limits',
      icon: 'layers',
      fields: [
        {
          id: 'flags',
          label: 'Behaviour Flags',
          type: 'flags',
          tooltip: 'Bitmasked. Each flag maps to EInventoryItemFlags on the C++ side.',
        },
        {
          id: 'maxQuantity',
          label: 'Max Quantity',
          type: 'number',
          min: 1,
          max: 9999,
          step: 1,
          tooltip: 'Maximum total copies the player can hold across all stacks.',
        },
        {
          id: 'maxStackSize',
          label: 'Max Stack Size',
          type: 'number',
          min: 1,
          max: 9999,
          step: 1,
          tooltip: 'Maximum units per individual stack slot.',
        },
      ],
    },

    {
      id: 'visuals',
      title: 'Visuals',
      icon: 'eye',
      fields: [
        {
          id: 'visuals.thumbnail.path',
          label: 'Thumbnail',
          type: 'file',
          accept: 'image/*',
          placeholder: 'e.g. T_MyItem_Thumb.png',
          tooltip: 'Small icon used in inventory grid and tooltips.',
        },
        {
          id: 'visuals.cover.path',
          label: 'Cover Image',
          type: 'file',
          accept: 'image/*',
          placeholder: 'e.g. T_MyItem_Cover.png',
          tooltip: 'Large artwork shown in the inspector panel.',
        },
        {
          id: 'visuals.mesh.path',
          label: 'Mesh Asset',
          type: 'file',
          accept: '.fbx,.obj,.gltf,.glb,.uasset',
          placeholder: 'e.g. SK_MyItem.fbx',
          tooltip: 'Static or skeletal mesh used for world-drop and inspect view.',
        },
      ],
    },

    {
      id: 'spawn',
      title: 'Spawn',
      icon: 'bolt',
      compact: true,
      fields: [
        {
          id: 'spawnActor.path',
          label: 'Spawn Actor Path',
          type: 'text',
          placeholder: '/Game/Blueprints/Items/BP_MyItem_C',
          tooltip: 'Full Unreal asset path of the Blueprint Actor to spawn in the world.',
        },
      ],
    },

    {
      id: 'durability',
      title: 'Durability',
      icon: 'history',
      compact: true,
      fields: [
        {
          id: 'durability.enabled',
          label: 'Enable Durability',
          type: 'switch',
          tooltip: 'Requires the Durable flag to be set.',
        },
        {
          id: 'durability.max',
          label: 'Max Durability',
          type: 'number',
          min: 1,
          max: 100000,
          step: 1,
        },
        {
          id: 'durability.base',
          label: 'Base (Starting) Durability',
          type: 'number',
          min: 0,
          max: 100000,
          step: 1,
          tooltip: 'Value at spawn; must be ≤ Max.',
        },
        {
          id: 'durability.penalization',
          label: 'Stat Penalization',
          type: 'number',
          min: 0,
          max: 1,
          step: 0.01,
          tooltip: 'Multiplier applied to stats at zero durability (0 = full penalty, 1 = no effect).',
        },
        {
          id: 'durability.priceCoefficient',
          label: 'Price Coefficient',
          type: 'number',
          min: 0,
          max: 1,
          step: 0.01,
          tooltip: 'Sale price is multiplied by this when durability is at max.',
        },
      ],
    },

    {
      id: 'economy',
      title: 'Economy',
      icon: 'export',
      compact: true,
      fields: [
        {
          id: 'economy.enabled',
          label: 'Enable Economy',
          type: 'switch',
        },
        {
          id: 'economy.basePrice',
          label: 'Base Price',
          type: 'number',
          min: 0,
          step: 1,
          unit: 'gp',
        },
        {
          id: 'economy.sellCoefficient',
          label: 'Sell Coefficient',
          type: 'number',
          min: 0,
          max: 1,
          step: 0.01,
          tooltip: 'Player receives Base Price × this value when selling.',
        },
      ],
    },

    {
      id: 'weight',
      title: 'Weight',
      icon: 'layers',
      compact: true,
      fields: [
        {
          id: 'weight.enabled',
          label: 'Enable Weight',
          type: 'switch',
        },
        {
          id: 'weight.value',
          label: 'Weight',
          type: 'number',
          min: 0,
          step: 0.01,
          unit: 'kg',
        },
      ],
    },

    {
      id: 'tags',
      title: 'Tags',
      icon: 'tag',
      fields: [
        {
          id: 'tags',
          label: 'Gameplay Tags',
          type: 'tags',
          placeholder: 'e.g. Item.Weapon.Energy',
          tooltip: 'Dot-notation Unreal GameplayTags. Used for filtering, slot matching, and crafting ingredient detection.',
        },
      ],
    },

    {
      id: 'attachment',
      title: 'Attachment Slots',
      icon: 'link',
      fields: [
        {
          id: 'attachmentSlots',
          label: 'Attachment Slots',
          type: 'string-list',
          source: 'taxonomy.attachmentSlots',
          placeholder: 'e.g. Slot.Optic',
          tooltip: 'Slots available on this item for attaching other items.',
        },
      ],
    },

    {
      id: 'specialAffects',
      title: 'Special Affects',
      icon: 'sparkle',
      fields: [
        {
          id: 'specialAffects',
          label: 'Special Affect Blueprints',
          type: 'string-list',
          placeholder: '/Game/Blueprints/Affects/BP_MyEffect_C',
          tooltip: 'Full asset paths to Blueprint Affect classes applied when this item is active.',
        },
      ],
    },

    {
      id: 'itemActions',
      title: 'Item Actions',
      icon: 'play',
      fields: [
        {
          id: 'itemActions',
          label: 'Allowed Actions',
          type: 'chip-multi',
          source: 'taxonomy.itemActions',
          tooltip: 'Actions available in the context menu for this item.',
        },
      ],
    },

  ],
};

/* ------------------------------------------------------------------ */
/*  CRAFTING RECIPE FORM SCHEMA                                         */
/* ------------------------------------------------------------------ */

/** @type {FormSchema} */
export const RECIPE_SCHEMA = {
  id: 'recipe',
  title: 'Crafting Recipe',
  icon: 'hammer',
  sections: [

    {
      id: 'identity',
      title: 'Identity',
      icon: 'tag',
      fields: [
        {
          id: 'name',
          label: 'Recipe Name',
          type: 'text',
          required: true,
          placeholder: 'e.g. Greatsword of Ash',
        },
        {
          id: 'tier',
          label: 'Tier / Grade',
          type: 'text',
          placeholder: 'e.g. Tier 4',
          tooltip: 'Display label for the recipe quality bracket.',
        },
      ],
    },

    {
      id: 'result',
      title: 'Result',
      icon: 'sparkle',
      fields: [
        {
          id: 'result.itemRef',
          label: 'Output Item',
          type: 'select',
          required: true,
          source: 'data.craftableItems',
          placeholder: 'Select craftable item…',
          tooltip: 'Only items with the Craftable flag are shown.',
        },
        {
          id: 'result.display',
          label: 'Quality Label',
          type: 'text',
          placeholder: 'e.g. Masterwork Grade',
          tooltip: 'Short grade descriptor shown next to the result name.',
        },
        {
          id: 'qtyMin',
          label: 'Min Output Qty',
          type: 'number',
          min: 1,
          max: 9999,
          step: 1,
        },
        {
          id: 'qtyMax',
          label: 'Max Output Qty',
          type: 'number',
          min: 1,
          max: 9999,
          step: 1,
          tooltip: 'Random roll between Min and Max on craft success.',
        },
        {
          id: 'successChance',
          label: 'Success Chance',
          type: 'number',
          min: 1,
          max: 100,
          step: 1,
          unit: '%',
        },
      ],
    },

    {
      id: 'requirements',
      title: 'Requirements',
      icon: 'shield',
      compact: true,
      fields: [
        {
          id: 'reqs.level',
          label: 'Required Level',
          type: 'number',
          min: 0,
          max: 999,
          step: 1,
        },
        {
          id: 'reqs.station',
          label: 'Crafting Station',
          type: 'select',
          options: [{ value: 'None', label: 'None' }],
          source: 'taxonomy.craftingStations',
          tooltip: 'Station the player must be at to craft this recipe.',
        },
        {
          id: 'reqs.duration',
          label: 'Craft Duration',
          type: 'range',
          min: 1,
          max: 600,
          step: 1,
          unit: 's',
          tooltip: 'Time in seconds the crafting animation takes.',
        },
      ],
    },

    {
      id: 'ingredients',
      title: 'Ingredient Groups',
      icon: 'list',
      fields: [
        {
          id: 'groups',
          label: 'Groups',
          type: 'group-list',
          tooltip: 'Each group can be marked Required or Optional. Add groups to represent alternative material sets.',
        },
      ],
    },

  ],
};

/* ------------------------------------------------------------------ */
/*  LOADOUT FORM SCHEMA                                                 */
/* ------------------------------------------------------------------ */

const DROP_ON_DEATH_OPTIONS = [
  { value: 'None',          label: 'None' },
  { value: 'Equipped only', label: 'Equipped only' },
  { value: 'All items',     label: 'All items' },
];

/** @type {FormSchema} */
export const LOADOUT_SCHEMA = {
  id: 'loadout',
  title: 'Loadout Template',
  icon: 'layers',
  sections: [

    {
      id: 'identity',
      title: 'Identity',
      icon: 'tag',
      fields: [
        {
          id: 'name',
          label: 'Loadout Name',
          type: 'text',
          required: true,
          placeholder: 'e.g. Endgame Warrior',
        },
        {
          id: 'tagline',
          label: 'Tagline',
          type: 'text',
          placeholder: 'e.g. High-tier raid kit',
          tooltip: 'One-line description shown in list previews.',
        },
        {
          id: 'desc',
          label: 'Description',
          type: 'textarea',
          placeholder: 'Detailed notes about this loadout intended use…',
        },
      ],
    },

    {
      id: 'spawnBehaviour',
      title: 'Spawn Behaviour',
      icon: 'bolt',
      compact: true,
      fields: [
        {
          id: 'behaviour.applyOnSpawn',
          label: 'Apply on Spawn',
          type: 'switch',
          tooltip: 'Equip and add items immediately when the NPC/player spawns.',
        },
        {
          id: 'behaviour.randomiseQty',
          label: 'Randomise Quantity',
          type: 'switch',
          tooltip: 'Roll item quantities within their min/max range at spawn time.',
        },
        {
          id: 'behaviour.autoEquipPass',
          label: 'Auto-Equip Pass',
          type: 'switch',
          tooltip: 'Run an auto-equip pass after all items are added.',
        },
        {
          id: 'behaviour.dropOnDeath',
          label: 'Drop on Death',
          type: 'select',
          options: DROP_ON_DEATH_OPTIONS,
        },
      ],
    },

    {
      id: 'composition',
      title: 'Composition',
      icon: 'list',
      fields: [
        {
          id: 'items',
          label: 'Items',
          type: 'item-list',
          tooltip: 'Each entry defines which item to add, its quantity, starting durability, whether to auto-equip, and an optional preferred slot.',
        },
      ],
    },

    {
      id: 'slotMapping',
      title: 'Slot Mapping',
      icon: 'link',
      fields: [
        {
          id: 'slots',
          label: 'Slot Assignments',
          type: 'slot-map',
          source: 'taxonomy.attachmentSlots',
          tooltip: 'Maps each attachment slot to a specific item in the Composition list.',
        },
      ],
    },

  ],
};

/* ------------------------------------------------------------------ */
/*  Registry — look up schema by form id                               */
/* ------------------------------------------------------------------ */

/** @type {Record<string, FormSchema>} */
export const FORM_SCHEMAS = {
  item:    ITEM_SCHEMA,
  recipe:  RECIPE_SCHEMA,
  loadout: LOADOUT_SCHEMA,
};

/* ------------------------------------------------------------------ */
/*  createDraft — blank starting state for each entity type            */
/* ------------------------------------------------------------------ */

const randomHex = (len) => Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
const newGuid = () => `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-${(8 | (Math.random() * 4 | 0)).toString(16)}${randomHex(3)}-${randomHex(12)}`;

/** @returns {object} blank item draft with a fresh GUID */
export const createItemDraft = () => ({
  guid:         newGuid(),
  displayName:  '',
  category:     '',
  subCategory:  '',
  rarity:       '',
  flags:        0,
  maxQuantity:  1,
  maxStackSize: 1,
  tags:         [],
  spawnActor:   { path: '' },
  description:  { short: '', long: '' },
  visuals: {
    thumbnail: { path: '' },
    cover:     { path: '' },
    mesh:      { path: '' },
  },
  durability:   { enabled: false, max: 100, base: 100, penalization: 0.1, priceCoefficient: 0.5 },
  economy:      { enabled: true,  basePrice: 0, sellCoefficient: 0.75 },
  weight:       { enabled: true,  value: 0 },
  attachmentSlots: [],
  specialAffects:  [],
  itemActions:     [],
  _ui: { icon: 'cube', thumbTone: 0, slot: null },
});

/** @returns {object} blank recipe draft with a fresh GUID */
export const createRecipeDraft = () => ({
  guid:          newGuid(),
  name:          '',
  tier:          '',
  result:        { itemRef: '', display: '' },
  qtyMin:        1,
  qtyMax:        1,
  successChance: 100,
  reqs:          { level: 0, station: 'None', duration: 60 },
  groups:        [],
});

/** @returns {object} blank loadout draft with a fresh GUID */
export const createLoadoutDraft = () => ({
  guid:    newGuid(),
  name:    '',
  tagline: '',
  desc:    '',
  items:   [],
  slots:   {},
  behaviour: {
    applyOnSpawn:  true,
    randomiseQty:  false,
    autoEquipPass: true,
    dropOnDeath:   'Equipped only',
  },
});
