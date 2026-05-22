export const TAG_ROOT = 'Mountea_Inventory';
export const TAG_ROOT_PREFIX = `${TAG_ROOT}.`;

function cleanTag(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function toStoredTag(shortOrFull) {
  const tag = cleanTag(shortOrFull);
  if (!tag) return '';
  if (tag.startsWith(TAG_ROOT_PREFIX)) return tag;
  if (tag === TAG_ROOT) return TAG_ROOT;
  return `${TAG_ROOT_PREFIX}${tag.replace(/^\.+/, '')}`;
}

export function toDisplayTag(shortOrFull) {
  const tag = cleanTag(shortOrFull);
  if (!tag) return '';
  return tag.startsWith(TAG_ROOT_PREFIX) ? tag.slice(TAG_ROOT_PREFIX.length) : tag;
}

export function normalizeTagList(tags) {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  const out = [];

  for (const raw of tags) {
    const stored = toStoredTag(raw);
    if (!stored) continue;
    const key = stored.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(stored);
  }

  return out;
}

export function areSameTag(left, right) {
  const l = toStoredTag(left).toLowerCase();
  const r = toStoredTag(right).toLowerCase();
  return !!l && !!r && l === r;
}

const KNOWN_FAMILY_PREFIXES = [
  'AttachmentSlots.',
  'Category.',
  'Crafting.',
  'Input.',
  'InventoryType.',
  'ItemAction.',
  'Rarity.',
  'WidgetState.',
];

export function validateKnownTagFamily(shortOrFull) {
  const short = toDisplayTag(shortOrFull);
  if (!short) return { valid: false, reason: 'empty' };
  const valid = KNOWN_FAMILY_PREFIXES.some(prefix => short.startsWith(prefix));
  return { valid, reason: valid ? 'ok' : 'custom' };
}

export function normalizeItemTags(item) {
  if (!item || typeof item !== 'object') return item;
  return {
    ...item,
    tags: normalizeTagList(item.tags),
    attachmentSlots: normalizeTagList(item.attachmentSlots),
    specialAffects: normalizeTagList(item.specialAffects),
  };
}

function normalizeTaggedGroup(group) {
  return {
    ...group,
    tags: normalizeTagList(group.tags),
  };
}

export function normalizeTaxonomy(taxonomy) {
  if (!taxonomy || typeof taxonomy !== 'object') return taxonomy ?? {};

  return {
    ...taxonomy,
    categories: (taxonomy.categories ?? []).map((category) => ({
      ...normalizeTaggedGroup(category),
      subcategories: (category.subcategories ?? []).map((sub) => normalizeTaggedGroup(sub)),
    })),
    rarities: (taxonomy.rarities ?? []).map((rarity) => normalizeTaggedGroup(rarity)),
    attachmentSlots: (taxonomy.attachmentSlots ?? []).map((slot) => normalizeTaggedGroup(slot)),
    craftingStations: (taxonomy.craftingStations ?? []).map((station) => ({
      ...station,
      tag: toStoredTag(station.tag),
    })),
    specialAffects: (taxonomy.specialAffects ?? []).map((affect) => ({
      ...affect,
      tag: toStoredTag(affect.tag),
    })),
  };
}
