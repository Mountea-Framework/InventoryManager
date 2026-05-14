import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Icon, Badge, Button, Tooltip,
  Thumb, SidebarItem, ScreenLayout, ElementsSidebar, InspectorSidebar, IconBtn,
  ContentSkeleton, EmptyState, DeleteConfirmDialog, EntityHeader,
} from './ui.jsx';
import { flagsLabels } from './data.js';
import { DATA, saveItem, loadData, deleteItem, duplicateItem } from './store.js';
import { exportItem } from './exporter.js';
import { useTaxonomy, useAutoSave } from './hooks.jsx';
import { FormRenderer } from './form-renderer.jsx';
import { createItemSchema, createItemDraft } from './form-schemas.js';
import { EntityCreateSheet } from './entity-sheet.jsx';
import {
  ContextMenu, ContextMenuContent, ContextMenuGroup, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from '@/components/ui/context-menu';

/* ============================================================
   Type definitions
   ============================================================ */
/**
 * @typedef {{ guid: string, displayName: string, category: string, subCategory?: string, rarity: string, flags: number, maxQuantity: number, maxStackSize: number, tags: string[], spawnActor: { path: string }, description: { short: string, long: string }, visuals: { thumbnail: { path: string }, cover: { path: string }, mesh: { path: string } }, durability: object, economy: object, weight: object, attachmentSlots: string[], specialAffects: string[], itemActions: string[], _ui?: object }} Item
 */

/** @param {string} g @returns {string} */
const shortGuid = (g) => g ? g.slice(0, 8) + '…' : '';

/**
 * When `category` or `subCategory` changes, merge that taxonomy entry's tags,
 * defaultFlags, and defaultItemActions into the draft (true-wins, additive only).
 * Item-action flags are resolved inline to avoid a second setState cycle.
 */
function applyCategoryDefaults(draft, path, val, taxonomy) {
  let newTags = [];
  let catFlags = 0;
  let catActions = [];

  if (path === 'category') {
    const cat = taxonomy.categories?.find(c => c.title === val);
    newTags    = cat?.tags               ?? [];
    catFlags   = cat?.defaultFlags       ?? 0;
    catActions = cat?.defaultItemActions ?? [];
  } else if (path === 'subCategory') {
    const cat = taxonomy.categories?.find(c => c.title === draft.category);
    const sub = cat?.subcategories?.find(s => s.title === val);
    newTags    = sub?.tags               ?? [];
    catFlags   = sub?.defaultFlags       ?? 0;
    catActions = sub?.defaultItemActions ?? [];
  }

  let result = draft;

  if (newTags.length) {
    const existing = new Set(result.tags ?? []);
    const unique = newTags.filter(t => !existing.has(t));
    if (unique.length) result = { ...result, tags: [...(result.tags ?? []), ...unique] };
  }

  if (catFlags) {
    result = { ...result, flags: (result.flags ?? 0) | catFlags };
  }

  if (catActions.length) {
    const existingSet = new Set(result.itemActions ?? []);
    const toAdd = catActions.filter(k => !existingSet.has(k));
    if (toAdd.length) {
      const actionFlags = (taxonomy.itemActions ?? [])
        .filter(a => toAdd.includes(a.key))
        .reduce((acc, a) => acc | (a.flags ?? 0), 0);
      result = { ...result, itemActions: [...(result.itemActions ?? []), ...toAdd], flags: (result.flags ?? 0) | actionFlags };
    }
  }

  return result;
}

/* ============================================================
   ItemTreeNode — sidebar category row
   ============================================================ */

/**
 * Expandable sidebar entry listing items within a category.
 * @param {{ category: string, items: Item[], expanded: object, setExpanded: Function, selected: string, setSelected: (guid: string) => void, search: string, onDuplicate: Function, onExport: Function, onDeleteRequest: Function }} props
 */
function ItemTreeNode({ category, items, expanded, setExpanded, selected, setSelected, search, icon, onDuplicate, onExport, onDeleteRequest }) {
  const { t } = useTranslation();
  const isOpen = expanded[category] !== false;
  const filteredItems = search
    ? items.filter(i => (i.displayName + ' ' + i.guid + ' ' + (i.tags || []).join(' ')).toLowerCase().includes(search.toLowerCase()))
    : items;
  if (search && filteredItems.length === 0) return null;

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded({ ...expanded, [category]: !isOpen })}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
      >
        <Icon name={isOpen ? 'chevDown' : 'chevRight'} size={11}/>
        <Icon name={icon || 'folder'} size={13}/>
        <span className="flex-1 text-left">{category}</span>
        <span className="font-mono text-[10px] text-muted-foreground/70">{items.length}</span>
      </button>
      {isOpen && filteredItems.map(item => {
        const isSel = selected === item.guid;
        const tip = (
          <span className="flex flex-col gap-0.5">
            <span>{item.description?.short || `${item.rarity} · ${item.category}`}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{item.guid}</span>
          </span>
        );
        return (
          <ContextMenu key={item.guid}>
            <ContextMenuTrigger asChild>
              <SidebarItem selected={isSel} onClick={() => setSelected(item.guid)} className="text-sm">
                <Tooltip content={tip} side="right">
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{item.displayName}</div>
                    <div className="truncate font-mono text-[10px] text-muted-foreground">{shortGuid(item.guid)}</div>
                  </div>
                </Tooltip>
              </SidebarItem>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-44">
              <ContextMenuGroup>
                <ContextMenuItem onClick={() => onDuplicate(item)}>
                  <Icon name="dup" size={14} className="mr-2"/>{t('common.duplicate')}
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onExport(item)}>
                  <Icon name="export" size={14} className="mr-2"/>{t('common.export')}
                </ContextMenuItem>
              </ContextMenuGroup>
              <ContextMenuSeparator/>
              <ContextMenuGroup>
                <ContextMenuItem variant="destructive" onClick={() => onDeleteRequest(item)}>
                  <Icon name="trash" size={14} className="mr-2"/>{t('common.delete')}
                </ContextMenuItem>
              </ContextMenuGroup>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
}

/* ============================================================
   ItemsScreen — top-level screen component
   ============================================================ */
/**
 * @param {{ search: string }} props
 */
export function ItemsScreen({ search: globalSearch, loading }) {
  const { t } = useTranslation();
  const { guid } = useParams();
  const navigate = useNavigate();
  const [tax] = useTaxonomy();
  const [expanded,      setExpanded]      = useState(() =>
    Object.fromEntries(Object.keys(DATA.items).map((cat, i) => [cat, i === 0]))
  );
  const [browserSearch, setBrowserSearch] = useState('');
  const [createOpen,    setCreateOpen]    = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [tick,          setTick]          = useState(0); // eslint-disable-line no-unused-vars

  const selected = guid ?? DATA.allItems[0]?.guid ?? null;
  const setSelected = (newGuid) => navigate(newGuid ? `/inventory/${newGuid}` : '/inventory');

  useEffect(() => {
    if (!guid && !loading) {
      const first = DATA.allItems[0]?.guid;
      if (first) navigate(`/inventory/${first}`, { replace: true });
    }
  }, [guid, loading]);
  const search = browserSearch || globalSearch;
  const item   = DATA.itemById[selected];

  const handleCreateItem = async (newItem) => {
    await saveItem(newItem);
    await loadData();
    navigate(`/inventory/${newItem.guid}`);
  };

  const handleDuplicate = async (entity) => {
    const newGuid = await duplicateItem(entity);
    navigate(`/inventory/${newGuid}`);
  };
  const handleExport        = (entity) => exportItem(entity, tax);
  const handleDeleteRequest = (entity) => setDeleteTarget(entity);
  const handleDeleteConfirm = async () => {
    await deleteItem(deleteTarget.guid);
    await loadData();
    if (guid === deleteTarget.guid) navigate(`/inventory/${DATA.allItems[0]?.guid ?? ''}`);
    setDeleteTarget(null);
  };

  return (
    <ScreenLayout
      elementsSidebar={
        <ElementsSidebar
          title={t('items.title')}
          headerActions={<IconBtn icon="plus" title={t('items.newTip')} onClick={() => setCreateOpen(true)}/>}
          search={browserSearch} setSearch={setBrowserSearch}
          searchPlaceholder={t('items.filterPlaceholder')}
          loading={loading}
        >
          {Object.entries(DATA.items).map(([cat, arr]) => (
            <ItemTreeNode key={cat} category={cat} items={arr}
              expanded={expanded} setExpanded={setExpanded}
              selected={selected} setSelected={setSelected}
              search={search}
              icon={tax.categories.find(c => c.title === cat)?.icon ?? 'folder'}
              onDuplicate={handleDuplicate}
              onExport={handleExport}
              onDeleteRequest={handleDeleteRequest}/>
          ))}
        </ElementsSidebar>
      }
      inspectorSidebar={item && (
        <InspectorSidebar>
          <ItemInspector item={item}/>
        </InspectorSidebar>
      )}
    >
      <div className="min-w-0">
        {loading
          ? <ContentSkeleton/>
          : DATA.allItems.length === 0
            ? <EmptyState icon="cube" title={t('items.empty')} description={t('items.emptyDesc')}>
                <Button size="sm" icon="plus" onClick={() => setCreateOpen(true)}>{t('items.newTip')}</Button>
              </EmptyState>
            : item
              ? <ItemEditor key={item.guid} item={item} taxonomy={tax} onSaved={() => setTick(t => t + 1)}/>
              : <div className="p-10 text-sm text-muted-foreground">{t('items.selectPrompt')}</div>
        }
      </div>

      <EntityCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        schema={createItemSchema(t)}
        createDraft={createItemDraft}
        taxonomy={tax}
        onSave={handleCreateItem}
        sectionIds={['identity', 'description', 'flags']}
        afterSet={(draft, path, val) => applyCategoryDefaults(draft, path, val, tax)}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        name={deleteTarget?.displayName ?? ''}
        onConfirm={handleDeleteConfirm}
      />
    </ScreenLayout>
  );
}

/* ============================================================
   ItemEditor — main editing form
   ============================================================ */
/**
 * Full item template editor with a local draft copy.
 * Resets when the selected item changes (parent uses key={item.guid}).
 * @param {{ item: Item, taxonomy: object }} props
 */
function ItemEditor({ item, taxonomy, onSaved }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(item);
  const saveStatus = useAutoSave(draft, saveItem, 1000, onSaved);

  const set = (path, val) => {
    if (path === 'category') {
      setDraft(d => {
        const base = { ...d, category: val, subCategory: '' };
        return applyCategoryDefaults(base, path, val, taxonomy);
      });
      return;
    }
    if (path === 'itemActions') {
      setDraft(d => {
        const actionFlags = (taxonomy.itemActions ?? [])
          .filter(a => (val ?? []).includes(a.key))
          .reduce((acc, a) => acc | (a.flags ?? 0), 0);
        return { ...d, itemActions: val, flags: d.flags | actionFlags };
      });
      return;
    }
    setDraft(d => {
      const next = structuredClone(d);
      const keys = path.split('.');
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) {
        if (cur[keys[i]] == null) cur[keys[i]] = {};
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = val;
      return applyCategoryDefaults(next, path, val, taxonomy);
    });
  };

  return (
    <div>
      <EntityHeader
        title={draft.displayName}
        guid={draft.guid}
        saveStatus={saveStatus}
        thumb={<Thumb size={52} tone={item._ui?.thumbTone} icon={item._ui?.icon}/>}
        badges={<>
          <Badge variant="secondary">{draft.rarity}</Badge>
          <Badge variant="outline">{draft.category}{draft.subCategory ? ` · ${draft.subCategory}` : ''}</Badge>
        </>}
      />

      <FormRenderer schema={createItemSchema(t)} draft={draft} set={set} taxonomy={taxonomy}/>
    </div>
  );
}

/* ============================================================
   ItemInspector — right-panel inspector
   ============================================================ */
/**
 * Displays flags, cross-references, and a JSON preview for the selected item.
 * @param {{ item: Item }} props
 */
function ItemInspector({ item }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const usedInLoadouts = DATA.loadouts.filter(l => l.items.some(it => it.ref === item.displayName));
  const usedInRecipes  = Object.values(DATA.recipes).flat().filter(r =>
    r.groups.some(g => g.ingredients.some(i => i.ref === item.displayName))
  );

  const preview = {
    guid: item.guid, displayName: item.displayName, category: item.category,
    subCategory: item.subCategory, rarity: item.rarity, flags: item.flags,
    maxQuantity: item.maxQuantity, maxStackSize: item.maxStackSize, tags: item.tags,
    spawnActor: item.spawnActor, description: item.description, visuals: item.visuals,
    durability: item.durability, economy: item.economy, weight: item.weight,
    attachmentSlots: item.attachmentSlots, specialAffects: item.specialAffects,
    itemActions: item.itemActions,
  };

  return (
    <div className="space-y-5 p-4 pt-4">
      <div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <Thumb size={40} tone={item._ui?.thumbTone} icon={item._ui?.icon}/>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{item.displayName}</div>
              <div className="truncate font-mono text-[10.5px] text-muted-foreground">{item.guid}</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{t('items.activeFlags')}</div>
        <div className="flex flex-wrap gap-1.5">
          {flagsLabels(item.flags || 0).map(l => (
            <span key={l} className="inline-flex items-center rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10.5px] text-primary">{l}</span>
          ))}
          {(item.flags || 0) === 0 && <span className="text-xs italic text-muted-foreground">{t('items.noFlags')}</span>}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon name="link" size={11}/> {t('items.referencedIn')}
        </div>
        <div className="space-y-1.5">
          {[
            ...usedInLoadouts.map(l => ({ kind: 'Loadout', name: l.name, guid: l.guid, icon: 'layers' })),
            ...usedInRecipes.map(r => ({ kind: 'Recipe',  name: r.name, guid: r.guid, icon: 'hammer' })),
          ].map((ref, i) => (
            <button
              key={i}
              onClick={() => navigate(`/${ref.kind === 'Loadout' ? 'loadouts' : 'crafting'}/${ref.guid}`)}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-md border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-accent/50"
            >
              <Icon name={ref.icon} size={12} className="text-muted-foreground"/>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{ref.name}</div>
                <div className="truncate font-mono text-[10px] text-muted-foreground">{ref.kind.toLowerCase()} · {ref.guid}</div>
              </div>
              <Icon name="arrowRight" size={12} className="text-muted-foreground"/>
            </button>
          ))}
          {usedInLoadouts.length + usedInRecipes.length === 0 && (
            <div className="text-xs italic text-muted-foreground">{t('items.notReferenced')}</div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{t('items.jsonPreview')}</div>
        <pre className="overflow-x-auto rounded-md border border-border bg-card p-3 font-mono text-[10.5px] leading-relaxed text-foreground/80">{JSON.stringify(preview, null, 2)}</pre>
      </div>
    </div>
  );
}
