import { useState, useEffect, useRef, useCallback } from 'react';
import { loadData } from './store.js';
import { normalizeTaxonomy } from './tags.js';

export const TAX_KEY = 'arch.taxonomy.v1';

/** @type {import('./settings.jsx').Taxonomy} */
export const DEFAULT_TAXONOMY = {
  categories: [
    { id: 'cat-weapons',     title: 'Weapons',     icon: 'sword',    tags: ['Mountea_Inventory.Category.Weapons'],     subcategories: [
      { id: 'sub-energy',    title: 'Energy Rifle',    tags: ['Mountea_Inventory.Category.Weapons.Firearm.Rifle'] },
      { id: 'sub-precision', title: 'Precision Rifle', tags: ['Mountea_Inventory.Category.Weapons.Firearm.Sniper'] },
      { id: 'sub-pistol',    title: 'Pistol',          tags: ['Mountea_Inventory.Category.Weapons.Firearm.Pistol'] },
    ]},
    { id: 'cat-consumables', title: 'Consumables', icon: 'beaker',   tags: ['Mountea_Inventory.Category.Consumables'], subcategories: [
      { id: 'sub-injector', title: 'Injector', tags: ['Mountea_Inventory.Category.Consumables.Potion.Stamina'] },
      { id: 'sub-medical',  title: 'Medical',  tags: ['Mountea_Inventory.Category.Consumables.Potion.Health'] },
    ]},
    { id: 'cat-materials',   title: 'Materials',   icon: 'cube',     tags: ['Mountea_Inventory.Category.Materials'],   subcategories: [
      { id: 'sub-metal',   title: 'Metal',   tags: ['Mountea_Inventory.Category.Materials.Ore.Metal'] },
      { id: 'sub-hide',    title: 'Hide',    tags: ['Mountea_Inventory.Category.Materials.Cloth.Leather'] },
      { id: 'sub-reagent', title: 'Reagent', tags: ['Mountea_Inventory.Category.Materials.Magic.Essence'] },
    ]},
    { id: 'cat-armor',       title: 'Armor',       icon: 'shield',   tags: ['Mountea_Inventory.Category.Armors'],      subcategories: [
      { id: 'sub-chest', title: 'Chest', tags: ['Mountea_Inventory.Category.Armors.Chest.Medium'] },
      { id: 'sub-head',  title: 'Head',  tags: ['Mountea_Inventory.Category.Armors.Head.Medium'] },
    ]},
    { id: 'cat-containers',  title: 'Containers',  icon: 'backpack', tags: ['Mountea_Inventory.Category.Containers'],  subcategories: [
      { id: 'sub-backpack', title: 'Backpack',    tags: ['Mountea_Inventory.Category.Containers.Backpack'] },
      { id: 'sub-medbag',   title: 'Medical Bag', tags: ['Mountea_Inventory.Category.Containers.Medical'] },
    ]},
  ],
  rarities: [
    { id: 'rar-common',    title: 'Common',    tags: ['Mountea_Inventory.Rarity.Common'],    color: '#9ca3af' },
    { id: 'rar-uncommon',  title: 'Uncommon',  tags: ['Mountea_Inventory.Rarity.Uncommon'],  color: '#22c55e' },
    { id: 'rar-rare',      title: 'Rare',      tags: ['Mountea_Inventory.Rarity.Rare'],      color: '#3b82f6' },
    { id: 'rar-epic',      title: 'Epic',      tags: ['Mountea_Inventory.Rarity.Epic'],      color: '#a855f7' },
    { id: 'rar-legendary', title: 'Legendary', tags: ['Mountea_Inventory.Rarity.Legendary'], color: '#f59e0b' },
  ],
  itemActions: [
    { id: 'ia-drop',        key: 'Drop',        icon: 'export',  tip: 'Drop the item into the world.' },
    { id: 'ia-pickup',      key: 'Pickup',      icon: 'plus',    tip: 'Pick the item up from the world.' },
    { id: 'ia-use',         key: 'Use',         icon: 'play',    tip: 'Generic activation.' },
    { id: 'ia-consume',     key: 'Consume',     icon: 'drop',    tip: 'Consume the item for an effect.' },
    { id: 'ia-equip',       key: 'Equip',       icon: 'shield',  tip: 'Equip into a matching slot.' },
    { id: 'ia-unequip',     key: 'Unequip',     icon: 'minus',   tip: 'Unequip and return to inventory.' },
    { id: 'ia-learn',       key: 'Learn',       icon: 'sparkle', tip: 'Learn a recipe or skill from the item.' },
    { id: 'ia-read',        key: 'Read',        icon: 'eye',     tip: "Open the item's readable content." },
    { id: 'ia-inspect',     key: 'Inspect',     icon: 'info',    tip: 'Open detailed inspection panel.' },
    { id: 'ia-split',       key: 'Split',       icon: 'branch',  tip: 'Split a stack.' },
    { id: 'ia-combine',     key: 'Combine',     icon: 'layers',  tip: 'Combine matching items into a stack.' },
    { id: 'ia-repair',      key: 'Repair',      icon: 'history', tip: 'Repair durability at a station.' },
    { id: 'ia-disassemble', key: 'Disassemble', icon: 'cog',     tip: 'Break down into components.' },
    { id: 'ia-sell',        key: 'Sell',        icon: 'export',  tip: 'Sell at a vendor.' },
    { id: 'ia-discard',     key: 'Discard',     icon: 'trash',   tip: 'Permanently destroy.' },
  ],
  attachmentSlots: [
    { id: 'as-head',      name: 'Head',      tags: ['Mountea_Inventory.AttachmentSlots.Head'] },
    { id: 'as-primary',   name: 'Primary',   tags: ['Mountea_Inventory.AttachmentSlots.Right_Hand'] },
    { id: 'as-secondary', name: 'Secondary', tags: ['Mountea_Inventory.AttachmentSlots.Left_Hand'] },
    { id: 'as-back',      name: 'Back',      tags: ['Mountea_Inventory.AttachmentSlots.Back.Item'] },
    { id: 'as-chest',     name: 'Chest',     tags: ['Mountea_Inventory.AttachmentSlots.Chest'] },
    { id: 'as-accessory', name: 'Accessory', tags: ['Mountea_Inventory.AttachmentSlots.Trinket'] },
  ],
  craftingStations: [
    { id: 'cs-workbench',   name: 'Workbench',     icon: 'cog',     tag: 'Mountea_Inventory.Crafting.Engineer' },
    { id: 'cs-forge',       name: 'Forge',         icon: 'hammer',  tag: 'Mountea_Inventory.Crafting.Blacksmith' },
    { id: 'cs-dragonforge', name: 'Dragonforge',   icon: 'hammer',  tag: 'Mountea_Inventory.Crafting.Armorer' },
    { id: 'cs-alchemy',     name: 'Alchemy Bench', icon: 'beaker',  tag: 'Mountea_Inventory.Crafting.Alchemist' },
    { id: 'cs-shadow',      name: 'Shadow Altar',  icon: 'sparkle', tag: 'Mountea_Inventory.Crafting.Enchanter' },
    { id: 'cs-loom',        name: 'Loom',          icon: 'layers',  tag: 'Mountea_Inventory.Crafting.Cooking' },
    { id: 'cs-arcane',      name: 'Arcane Table',  icon: 'sparkle', tag: 'Mountea_Inventory.Crafting.Enchanter' },
  ],
  specialAffects: [],
};

/**
 * Reads and writes the full taxonomy from localStorage.
 * Migration guard ensures new fields appear for existing installations.
 * @returns {[import('./settings.jsx').Taxonomy, React.Dispatch<React.SetStateAction<import('./settings.jsx').Taxonomy>>]}
 */
const mergeIcon = (storedList, defaultList) =>
  storedList.map(item => {
    const def = defaultList.find(d => d.id === item.id);
    return (def?.icon && !item.icon) ? { ...item, icon: def.icon } : item;
  });

// Module-level shared state so all useTaxonomy() instances stay in sync
// when one (e.g. Settings) writes while another (e.g. Items) is mounted.
const taxListeners = new Set();
let cachedTax = null;

function readTaxFromStorage() {
  try {
    const raw = localStorage.getItem(TAX_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      return normalizeTaxonomy({
        ...DEFAULT_TAXONOMY,
        ...stored,
        categories:       stored.categories       ? mergeIcon(stored.categories,       DEFAULT_TAXONOMY.categories)       : DEFAULT_TAXONOMY.categories,
        itemActions:      stored.itemActions      ?? DEFAULT_TAXONOMY.itemActions,
        attachmentSlots:  stored.attachmentSlots  ?? DEFAULT_TAXONOMY.attachmentSlots,
        craftingStations: stored.craftingStations ? mergeIcon(stored.craftingStations, DEFAULT_TAXONOMY.craftingStations) : DEFAULT_TAXONOMY.craftingStations,
        specialAffects:   stored.specialAffects   ?? DEFAULT_TAXONOMY.specialAffects,
      });
    }
  } catch {}
  return normalizeTaxonomy(DEFAULT_TAXONOMY);
}

export const useTaxonomy = () => {
  const [tax, setTaxState] = useState(() => {
    if (!cachedTax) cachedTax = readTaxFromStorage();
    return cachedTax;
  });

  const setTax = useCallback((value) => {
    const nextRaw = typeof value === 'function' ? value(cachedTax) : value;
    const next = normalizeTaxonomy(nextRaw);
    cachedTax = next;
    try { localStorage.setItem(TAX_KEY, JSON.stringify(next)); } catch {}
    taxListeners.forEach(l => l(next));
  }, []);

  useEffect(() => {
    taxListeners.add(setTaxState);
    return () => taxListeners.delete(setTaxState);
  }, []);

  return [tax, setTax];
};

export function useEntityActions({ deleteEntity, afterDelete }) {
  const [tick,         setTick]         = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleDeleteRequest = (entity) => setDeleteTarget(entity);
  const handleDeleteConfirm = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    await deleteEntity(target.guid);
    await loadData();
    afterDelete(target.guid);
  };
  const onSaved = () => setTick(t => t + 1);

  return { tick, deleteTarget, setDeleteTarget, handleDeleteRequest, handleDeleteConfirm, onSaved };
}

export const useAutoSave = (draft, saveFn, delay = 1000, onSaved) => {
  const [status, setStatus] = useState('idle');
  const timerRef   = useRef(null);
  const savedTimer = useRef(null);
  const isMounted  = useRef(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    setStatus('dirty');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus('saving');
      await saveFn(draft);
      await loadData();
      setStatus('saved');
      onSavedRef.current?.();
      savedTimer.current = setTimeout(() => setStatus('idle'), 2000);
    }, delay);
    return () => clearTimeout(timerRef.current);
  }, [draft]);

  useEffect(() => () => { clearTimeout(timerRef.current); clearTimeout(savedTimer.current); }, []);

  return status;
};
