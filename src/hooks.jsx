import { useState, useEffect, useRef, useCallback } from 'react';
import { loadData } from './store.js';

export const TAX_KEY = 'arch.taxonomy.v1';

/** @type {import('./settings.jsx').Taxonomy} */
export const DEFAULT_TAXONOMY = {
  categories: [
    { id: 'cat-weapons',     title: 'Weapons',     icon: 'sword',    tags: ['Item.Weapon'],     subcategories: [
      { id: 'sub-energy',    title: 'Energy Rifle',    tags: ['Item.Weapon.Energy'] },
      { id: 'sub-precision', title: 'Precision Rifle', tags: ['Item.Weapon.Precision'] },
      { id: 'sub-pistol',    title: 'Pistol',          tags: ['Item.Weapon.Kinetic', 'Item.Sidearm'] },
    ]},
    { id: 'cat-consumables', title: 'Consumables', icon: 'beaker',   tags: ['Item.Consumable'], subcategories: [
      { id: 'sub-injector', title: 'Injector', tags: ['Item.Consumable.Injector'] },
      { id: 'sub-medical',  title: 'Medical',  tags: ['Item.Consumable.Medical'] },
    ]},
    { id: 'cat-materials',   title: 'Materials',   icon: 'cube',     tags: ['Item.Material'],   subcategories: [
      { id: 'sub-metal',   title: 'Metal',   tags: ['Item.Material.Metal'] },
      { id: 'sub-hide',    title: 'Hide',    tags: ['Item.Material.Hide'] },
      { id: 'sub-reagent', title: 'Reagent', tags: ['Item.Material.Reagent'] },
    ]},
    { id: 'cat-armor',       title: 'Armor',       icon: 'shield',   tags: ['Item.Armor'],      subcategories: [
      { id: 'sub-chest', title: 'Chest', tags: ['Item.Armor.Chest'] },
      { id: 'sub-head',  title: 'Head',  tags: ['Item.Armor.Head'] },
    ]},
    { id: 'cat-containers',  title: 'Containers',  icon: 'backpack', tags: ['Item.Container'],  subcategories: [
      { id: 'sub-backpack', title: 'Backpack',    tags: ['Item.Container.Backpack'] },
      { id: 'sub-medbag',   title: 'Medical Bag', tags: ['Item.Container.Medical'] },
    ]},
  ],
  rarities: [
    { id: 'rar-common',    title: 'Common',    tags: ['Rarity.Common'],    color: '#9ca3af' },
    { id: 'rar-uncommon',  title: 'Uncommon',  tags: ['Rarity.Uncommon'],  color: '#22c55e' },
    { id: 'rar-rare',      title: 'Rare',      tags: ['Rarity.Rare'],      color: '#3b82f6' },
    { id: 'rar-epic',      title: 'Epic',      tags: ['Rarity.Epic'],      color: '#a855f7' },
    { id: 'rar-legendary', title: 'Legendary', tags: ['Rarity.Legendary'], color: '#f59e0b' },
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
    { id: 'as-head',      name: 'Head',      tags: ['Slot.Head'] },
    { id: 'as-primary',   name: 'Primary',   tags: ['Slot.Primary'] },
    { id: 'as-secondary', name: 'Secondary', tags: ['Slot.Secondary'] },
    { id: 'as-back',      name: 'Back',      tags: ['Slot.Back'] },
    { id: 'as-chest',     name: 'Chest',     tags: ['Slot.Chest'] },
    { id: 'as-accessory', name: 'Accessory', tags: ['Slot.Accessory'] },
  ],
  craftingStations: [
    { id: 'cs-workbench',   name: 'Workbench',     icon: 'cog',     tag: 'Station.Workbench' },
    { id: 'cs-forge',       name: 'Forge',         icon: 'hammer',  tag: 'Station.Forge' },
    { id: 'cs-dragonforge', name: 'Dragonforge',   icon: 'hammer',  tag: 'Station.Dragonforge' },
    { id: 'cs-alchemy',     name: 'Alchemy Bench', icon: 'beaker',  tag: 'Station.AlchemyBench' },
    { id: 'cs-shadow',      name: 'Shadow Altar',  icon: 'sparkle', tag: 'Station.ShadowAltar' },
    { id: 'cs-loom',        name: 'Loom',          icon: 'layers',  tag: 'Station.Loom' },
    { id: 'cs-arcane',      name: 'Arcane Table',  icon: 'sparkle', tag: 'Station.ArcaneTable' },
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
      return {
        ...DEFAULT_TAXONOMY,
        ...stored,
        categories:       stored.categories       ? mergeIcon(stored.categories,       DEFAULT_TAXONOMY.categories)       : DEFAULT_TAXONOMY.categories,
        itemActions:      stored.itemActions      ?? DEFAULT_TAXONOMY.itemActions,
        attachmentSlots:  stored.attachmentSlots  ?? DEFAULT_TAXONOMY.attachmentSlots,
        craftingStations: stored.craftingStations ? mergeIcon(stored.craftingStations, DEFAULT_TAXONOMY.craftingStations) : DEFAULT_TAXONOMY.craftingStations,
        specialAffects:   stored.specialAffects   ?? DEFAULT_TAXONOMY.specialAffects,
      };
    }
  } catch {}
  return DEFAULT_TAXONOMY;
}

export const useTaxonomy = () => {
  const [tax, setTaxState] = useState(() => {
    if (!cachedTax) cachedTax = readTaxFromStorage();
    return cachedTax;
  });

  const setTax = useCallback((value) => {
    const next = typeof value === 'function' ? value(cachedTax) : value;
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
