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

import { newGuid } from './utils.js';

/** @typedef {'text'|'textarea'|'number'|'select'|'switch'|'flags'|'tags'|'string-list'|'file'|'chip-multi'|'range'|'item-list'|'group-list'|'slot-map'|'readonly'} FieldType */

/**
 * @typedef {Object} SelectOption
 * @property {string} value
 * @property {string} label
 */

/**
 * @typedef {Object} FieldSchema
 * @property {string}      id             - dot-notation path into the record (e.g. "durability.max")
 * @property {string}      label          - human-readable field label
 * @property {FieldType}   type           - UI component to use
 * @property {boolean}     [required]     - validation: field must be non-empty
 * @property {boolean}     [disabled]     - non-editable (grey out, not readonly display)
 * @property {string}      [hint]         - helper text shown below the field
 * @property {SelectOption[]} [options]   - static options for select/chip-multi
 * @property {string}      [source]       - dynamic options from taxonomy key (e.g. 'taxonomy.categories')
 * @property {string}      [dependsOn]    - field id; re-filter options when this field changes
 * @property {string}      [accept]       - file picker: accepted MIME types or extensions
 * @property {string}      [placeholder]
 * @property {number}      [min]
 * @property {number}      [max]
 * @property {number}      [step]
 * @property {string}      [unit]         - display unit label (e.g. 'kg', 's')
 * @property {*}           [clearValue]   - value assigned when section editCondition becomes false (overrides type default)
 */

/**
 * @typedef {Object} SectionSchema
 * @property {string}        id              - unique section identifier
 * @property {string}        title           - section heading
 * @property {string}        [icon]          - icon name from ui.jsx Icon registry
 * @property {boolean}       [compact]       - render rows without borders (compact Section)
 * @property {string}        [editCondition] - dot-path into draft; all fields except the controlling field are disabled when falsy
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

/**
 * Factory — returns a localised ItemSchema. Pass the `t` function from useTranslation().
 * @param {Function} t
 * @returns {FormSchema}
 */
export const createItemSchema = (t) => ({
  id: 'item',
  title: t('items.formTitle'),
  icon: 'cube',
  sections: [

    {
      id: 'identity',
      title: t('items.sectionIdentity'),
      icon: 'tag',
      fields: [
        {
          id: 'displayName',
          label: t('items.fieldDisplayName'),
          type: 'text',
          required: true,
          placeholder: t('items.placeholderDisplayName'),
        },
        {
          id: 'category',
          label: t('items.fieldCategory'),
          type: 'select',
          required: true,
          source: 'taxonomy.categories',
          placeholder: t('items.placeholderCategory'),
        },
        {
          id: 'subCategory',
          label: t('items.fieldSubCategory'),
          type: 'select',
          source: 'taxonomy.categories',
          dependsOn: 'category',
          placeholder: t('items.placeholderSubCategory'),
          tooltip: t('items.tipSubCategory'),
        },
        {
          id: 'rarity',
          label: t('items.fieldRarity'),
          type: 'select',
          required: true,
          source: 'taxonomy.rarities',
          placeholder: t('items.placeholderRarity'),
        },
      ],
    },

    {
      id: 'description',
      title: t('items.sectionDescription'),
      icon: 'eye',
      fields: [
        {
          id: 'description.short',
          label: t('items.fieldShortDesc'),
          type: 'text',
          placeholder: t('items.placeholderShortDesc'),
          tooltip: t('items.tipShortDesc'),
        },
        {
          id: 'description.long',
          label: t('items.fieldLongDesc'),
          type: 'textarea',
          placeholder: t('items.placeholderLongDesc'),
        },
      ],
    },

    {
      id: 'flags',
      title: t('items.sectionFlagsAndLimits'),
      icon: 'layers',
      fields: [
        {
          id: 'flags',
          label: t('items.fieldFlags'),
          type: 'flags',
          tooltip: t('items.tipFlags'),
        },
        {
          id: 'maxQuantity',
          label: t('items.fieldMaxQuantity'),
          type: 'number',
          min: 1,
          max: 9999,
          step: 1,
          tooltip: t('items.tipMaxQuantity'),
        },
        {
          id: 'maxStackSize',
          label: t('items.fieldMaxStackSize'),
          type: 'number',
          min: 1,
          max: 9999,
          step: 1,
          tooltip: t('items.tipMaxStackSize'),
        },
      ],
    },

    {
      id: 'visuals',
      title: t('items.sectionVisuals'),
      icon: 'eye',
      fields: [
        {
          id: 'visuals.thumbnail.path',
          label: t('items.fieldThumbnail'),
          type: 'file',
          accept: 'image/*',
          placeholder: t('items.placeholderThumbnail'),
          tooltip: t('items.tipThumbnail'),
        },
        {
          id: 'visuals.cover.path',
          label: t('items.fieldCover'),
          type: 'file',
          accept: 'image/*',
          placeholder: t('items.placeholderCover'),
          tooltip: t('items.tipCover'),
        },
        {
          id: 'visuals.mesh.path',
          label: t('items.fieldMesh'),
          type: 'file',
          accept: '.fbx,.obj,.gltf,.glb,.uasset',
          placeholder: t('items.placeholderMesh'),
          tooltip: t('items.tipMesh'),
        },
      ],
    },

    {
      id: 'spawn',
      title: t('items.sectionSpawn'),
      icon: 'bolt',
      compact: true,
      fields: [
        {
          id: 'spawnActor.path',
          label: t('items.fieldSpawnActorPath'),
          type: 'text',
          placeholder: t('items.placeholderSpawnActorPath'),
          tooltip: t('items.tipSpawnActorPath'),
        },
      ],
    },

    {
      id: 'durability',
      title: t('items.sectionDurability'),
      icon: 'history',
      compact: true,
      editCondition: 'durability.enabled',
      fields: [
        {
          id: 'durability.enabled',
          label: t('items.fieldEnableDurability'),
          type: 'switch',
          tooltip: t('items.tipEnableDurability'),
        },
        {
          id: 'durability.max',
          label: t('items.fieldMaxDurability'),
          type: 'number',
          min: 1,
          max: 100000,
          step: 1,
        },
        {
          id: 'durability.base',
          label: t('items.fieldBaseDurability'),
          type: 'number',
          min: 0,
          max: 100000,
          step: 1,
          tooltip: t('items.tipBaseDurability'),
        },
        {
          id: 'durability.penalization',
          label: t('items.fieldStatPenalization'),
          type: 'number',
          min: 0,
          max: 1,
          step: 0.01,
          tooltip: t('items.tipStatPenalization'),
        },
        {
          id: 'durability.priceCoefficient',
          label: t('items.fieldPriceCoefficient'),
          type: 'number',
          min: 0,
          max: 1,
          step: 0.01,
          tooltip: t('items.tipPriceCoefficient'),
        },
      ],
    },

    {
      id: 'economy',
      title: t('items.sectionEconomy'),
      icon: 'export',
      compact: true,
      editCondition: 'economy.enabled',
      fields: [
        {
          id: 'economy.enabled',
          label: t('items.fieldEnableEconomy'),
          type: 'switch',
        },
        {
          id: 'economy.basePrice',
          label: t('items.fieldBasePrice'),
          type: 'number',
          min: 0,
          step: 1,
          unit: 'gp',
        },
        {
          id: 'economy.sellCoefficient',
          label: t('items.fieldSellCoefficient'),
          type: 'number',
          min: 0,
          max: 1,
          step: 0.01,
          tooltip: t('items.tipSellCoefficient'),
        },
      ],
    },

    {
      id: 'weight',
      title: t('items.sectionWeight'),
      icon: 'layers',
      compact: true,
      editCondition: 'weight.enabled',
      fields: [
        {
          id: 'weight.enabled',
          label: t('items.fieldEnableWeight'),
          type: 'switch',
        },
        {
          id: 'weight.value',
          label: t('items.fieldWeight'),
          type: 'number',
          min: 0,
          step: 0.01,
          unit: 'kg',
        },
      ],
    },

    {
      id: 'tags',
      title: t('items.sectionTags'),
      icon: 'tag',
      fields: [
        {
          id: 'tags',
          label: t('items.fieldGameplayTags'),
          type: 'tags',
          placeholder: t('items.placeholderGameplayTags'),
          tooltip: t('items.tipGameplayTags'),
        },
      ],
    },

    {
      id: 'attachment',
      title: t('items.sectionAttachmentSlots'),
      icon: 'link',
      fields: [
        {
          id: 'attachmentSlots',
          label: t('items.fieldAttachmentSlots'),
          type: 'tags',
          placeholder: t('items.placeholderAttachmentSlot'),
          tooltip: t('items.tipAttachmentSlots'),
        },
      ],
    },

    {
      id: 'specialAffects',
      title: t('items.sectionSpecialAffects'),
      icon: 'sparkle',
      fields: [
        {
          id: 'specialAffects',
          label: t('items.fieldSpecialAffects'),
          type: 'chip-multi',
          source: 'taxonomy.specialAffects',
          tooltip: t('items.tipSpecialAffects'),
        },
      ],
    },

    {
      id: 'itemActions',
      title: t('items.sectionItemActions'),
      icon: 'play',
      fields: [
        {
          id: 'itemActions',
          label: t('items.fieldItemActions'),
          type: 'chip-multi',
          source: 'taxonomy.itemActions',
          tooltip: t('items.tipItemActions'),
        },
      ],
    },

  ],
});

/* ------------------------------------------------------------------ */
/*  CRAFTING RECIPE FORM SCHEMA                                         */
/* ------------------------------------------------------------------ */

/**
 * Factory — returns a localised RecipeSchema. Pass the `t` function from useTranslation().
 * @param {Function} t
 * @returns {FormSchema}
 */
export const createRecipeSchema = (t) => ({
  id: 'recipe',
  title: t('crafting.formTitle'),
  icon: 'hammer',
  sections: [

    {
      id: 'identity',
      title: t('crafting.sectionIdentity'),
      icon: 'tag',
      fields: [
        {
          id: 'name',
          label: t('crafting.fieldName'),
          type: 'text',
          required: true,
          placeholder: t('crafting.placeholderName'),
        },
      ],
    },

    {
      id: 'result',
      title: t('crafting.sectionResult'),
      icon: 'sparkle',
      fields: [
        {
          id: 'result.itemRef',
          label: t('crafting.fieldResultItem'),
          type: 'select',
          required: true,
          source: 'data.craftableItems',
          placeholder: t('crafting.placeholderResultItem'),
          tooltip: t('crafting.tipResultItem'),
        },
        {
          id: 'result.display',
          label: t('crafting.fieldQualityLabel'),
          type: 'text',
          placeholder: t('crafting.placeholderQualityLabel'),
          tooltip: t('crafting.tipQualityLabel'),
        },
        {
          id: 'qtyMin',
          label: t('crafting.fieldQtyMin'),
          type: 'number',
          min: 1,
          max: 9999,
          step: 1,
        },
        {
          id: 'qtyMax',
          label: t('crafting.fieldQtyMax'),
          type: 'number',
          min: 1,
          max: 9999,
          step: 1,
          tooltip: t('crafting.tipQtyMax'),
        },
        {
          id: 'successChance',
          label: t('crafting.successChance'),
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
      title: t('crafting.sectionRequirements'),
      icon: 'shield',
      compact: true,
      fields: [
        {
          id: 'reqs.level',
          label: t('crafting.fieldLevel'),
          type: 'number',
          min: 0,
          max: 999,
          step: 1,
        },
        {
          id: 'reqs.station',
          label: t('crafting.station'),
          type: 'select',
          options: [{ value: 'None', label: 'None' }],
          source: 'taxonomy.craftingStations',
          tooltip: t('crafting.tipStation'),
        },
        {
          id: 'reqs.duration',
          label: t('crafting.duration'),
          type: 'range',
          min: 1,
          max: 600,
          step: 1,
          unit: 's',
          tooltip: t('crafting.tipDuration'),
        },
      ],
    },

    {
      id: 'ingredients',
      title: t('crafting.sectionIngredients'),
      icon: 'list',
      fields: [
        {
          id: 'groups',
          label: t('crafting.fieldGroups'),
          type: 'group-list',
          tooltip: t('crafting.tipGroups'),
        },
      ],
    },

  ],
});

/* ------------------------------------------------------------------ */
/*  LOADOUT FORM SCHEMA                                                 */
/* ------------------------------------------------------------------ */

/**
 * Factory — returns a localised LoadoutSchema. Pass the `t` function from useTranslation().
 * @param {Function} t
 * @returns {FormSchema}
 */
export const createLoadoutSchema = (t) => ({
  id: 'loadout',
  title: t('loadouts.formTitle'),
  icon: 'layers',
  sections: [

    {
      id: 'identity',
      title: t('loadouts.sectionIdentity'),
      icon: 'tag',
      fields: [
        {
          id: 'name',
          label: t('loadouts.fieldName'),
          type: 'text',
          required: true,
          placeholder: t('loadouts.placeholderName'),
        },
        {
          id: 'tagline',
          label: t('loadouts.fieldTagline'),
          type: 'text',
          placeholder: t('loadouts.placeholderTagline'),
          tooltip: t('loadouts.tipTagline'),
        },
        {
          id: 'desc',
          label: t('loadouts.fieldDesc'),
          type: 'textarea',
          placeholder: t('loadouts.placeholderDesc'),
        },
      ],
    },

    {
      id: 'spawnBehaviour',
      title: t('loadouts.sectionSpawnBehaviour'),
      icon: 'bolt',
      compact: true,
      fields: [
        {
          id: 'behaviour.applyOnSpawn',
          label: t('loadouts.fieldApplyOnSpawn'),
          type: 'switch',
          tooltip: t('loadouts.tipApplyOnSpawn'),
        },
        {
          id: 'behaviour.randomiseQty',
          label: t('loadouts.fieldRandomiseQty'),
          type: 'switch',
          tooltip: t('loadouts.tipRandomiseQty'),
        },
        {
          id: 'behaviour.autoEquipPass',
          label: t('loadouts.fieldAutoEquipPass'),
          type: 'switch',
          tooltip: t('loadouts.tipAutoEquipPass'),
        },
        {
          id: 'behaviour.dropOnDeath',
          label: t('loadouts.fieldDropOnDeath'),
          type: 'select',
          options: [
            { value: 'None',          label: t('loadouts.dropOnDeathNone') },
            { value: 'Equipped only', label: t('loadouts.dropOnDeathEquipped') },
            { value: 'All items',     label: t('loadouts.dropOnDeathAll') },
          ],
        },
      ],
    },

    {
      id: 'composition',
      title: t('loadouts.sectionComposition'),
      icon: 'list',
      fields: [
        {
          id: 'items',
          label: t('loadouts.fieldItems'),
          type: 'item-list',
          tooltip: t('loadouts.tipItems'),
        },
      ],
    },

    {
      id: 'slotMapping',
      title: t('loadouts.slotMapping'),
      icon: 'link',
      fields: [
        {
          id: 'slots',
          label: t('loadouts.fieldSlotAssignments'),
          type: 'slot-map',
          source: 'taxonomy.attachmentSlots',
          tooltip: t('loadouts.tipSlotAssignments'),
        },
      ],
    },

  ],
});

/* ------------------------------------------------------------------ */
/*  createDraft — blank starting state for each entity type            */
/* ------------------------------------------------------------------ */


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
  family:        'General',
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
