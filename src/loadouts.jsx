import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  cn, Icon, Button, Select, Label, Switch, Tooltip,
  Thumb, SidebarItem, ScreenLayout, ElementsSidebar, InspectorSidebar, IconBtn,
  Section, Row, TextField, Tag,
  ContentSkeleton, EmptyState, DeleteConfirmDialog, EntityHeader, EntityContextMenu,
} from './ui.jsx';
import { Dialog, DialogContent } from './command.jsx';
import { DATA, saveLoadout, loadData, deleteLoadout, duplicateLoadout } from './store.js';
import { exportLoadout } from './exporter.js';
import { importLoadouts } from './importer.js';
import { useTaxonomy, useAutoSave, useEntityActions } from './hooks.jsx';
import { setPath } from './utils.js';
import { FormRenderer } from './form-renderer.jsx';
import { createLoadoutSchema, createLoadoutDraft } from './form-schemas.js';
import { EntityCreateSheet } from './entity-sheet.jsx';

/* ============================================================
   Type definitions
   ============================================================ */
/**
 * @typedef {{ ref: string, qty: number, durability: number|null, autoEquip: boolean, slot: string|null }} LoadoutItem
 * @typedef {{ guid: string, name: string, desc: string, tagline: string, items: LoadoutItem[], slots: Object.<string,string|null> }} Loadout
 */

/* ============================================================
   LoadoutItemModal — create / edit a single loadout item entry
   ============================================================ */
/**
 * @param {{ open: boolean, onOpenChange: (v: boolean) => void, item: LoadoutItem|null, onSave: (item: LoadoutItem) => void, taxonomy: object }} props
 */
function LoadoutItemModal({ open, onOpenChange, item, onSave, taxonomy }) {
  const { t } = useTranslation();
  const isEdit = item != null;

  const buildDraft = (src) => ({
    ref:        src?.ref        ?? '',
    qty:        src?.qty        ?? 1,
    durability: src?.durability ?? 1.0,
    autoEquip:  src?.autoEquip  ?? false,
    slot:       src?.slot       ?? null,
  });

  const [draft, setDraft] = useState(() => buildDraft(item));

  React.useEffect(() => { setDraft(buildDraft(item)); }, [item]);

  const slotOptions = [
    { value: '', label: '— none —' },
    ...(taxonomy.attachmentSlots ?? []).map(s => ({ value: s.name, label: s.name })),
  ];

  const canSave = draft.ref.trim() !== '';

  const handleSave = () => {
    if (!canSave) return;
    onSave({ ...draft, qty: Math.max(1, draft.qty), durability: Math.min(1, Math.max(0, draft.durability)) });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[92vw] p-0 sm:w-[480px]">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{isEdit ? t('loadouts.editItemTitle') : t('loadouts.addItemTitle')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isEdit ? t('loadouts.editItemDesc') : t('loadouts.addItemDesc')}
          </p>
        </div>
        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('loadouts.itemTemplate')}</Label>
            <Select
              value={draft.ref}
              onChange={v => setDraft(d => ({ ...d, ref: v }))}
              options={[{ value: '', label: '— select item —' }, ...DATA.allItems.map(it => ({ value: it.displayName, label: it.displayName }))]}
              placeholder={t('loadouts.selectItem')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('loadouts.quantity')}</Label>
              <input
                type="number" min={1}
                value={String(draft.qty)}
                onChange={e => setDraft(d => ({ ...d, qty: Math.max(1, parseInt(e.target.value) || 1) }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 font-mono text-sm shadow-sm outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('loadouts.durability')} <span className="normal-case text-muted-foreground/60">{t('loadouts.durabilityHint')}</span></Label>
              <input
                type="number" min={0} max={1} step={0.01}
                value={String(draft.durability)}
                onChange={e => setDraft(d => ({ ...d, durability: Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)) }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 font-mono text-sm shadow-sm outline-none"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('loadouts.autoEquip')}</Label>
            <Switch checked={draft.autoEquip} onCheckedChange={v => setDraft(d => ({ ...d, autoEquip: v }))}/>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('loadouts.preferredSlot')}</Label>
            <Select
              value={draft.slot ?? ''}
              onChange={v => setDraft(d => ({ ...d, slot: v || null }))}
              options={slotOptions}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t('loadouts.cancel')}</Button>
          <Button size="sm" onClick={handleSave} disabled={!canSave}>
            {isEdit ? t('loadouts.saveChanges') : t('loadouts.addToLoadout')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   LoadoutsScreen — top-level screen component
   ============================================================ */
/**
 * @param {{ search: string }} props
 */
export function LoadoutsScreen({ search: globalSearch, loading }) {
  const { t } = useTranslation();
  const { guid } = useParams();
  const navigate = useNavigate();
  const [tax] = useTaxonomy();
  const [browserSearch, setBrowserSearch] = useState('');
  const [createOpen,    setCreateOpen]    = useState(false);
  const { deleteTarget, setDeleteTarget, handleDeleteRequest, handleDeleteConfirm, onSaved } = useEntityActions({
    deleteEntity: deleteLoadout,
    afterDelete:  (deletedGuid) => { if (guid === deletedGuid) setSelected(DATA.loadouts[0]?.guid ?? null); },
  });

  const selected = guid ?? DATA.loadouts[0]?.guid ?? null;
  const setSelected = (newGuid) => navigate(newGuid ? `/loadouts/${newGuid}` : '/loadouts');
  const loadout = DATA.loadouts.find(l => l.guid === selected);

  useEffect(() => {
    if (!guid && !loading) {
      const first = DATA.loadouts[0]?.guid;
      if (first) navigate(`/loadouts/${first}`, { replace: true });
    }
  }, [guid, loading]);
  const search  = (browserSearch || globalSearch || '').toLowerCase();
  const filtered = search
    ? DATA.loadouts.filter(l => (l.name + ' ' + l.desc + ' ' + l.guid).toLowerCase().includes(search))
    : DATA.loadouts;

  const handleCreateLoadout = async (newLoadout) => {
    await saveLoadout(newLoadout);
    await loadData();
    setSelected(newLoadout.guid);
  };

  const importRef = useRef(null);

  const handleDuplicate = async (entity) => {
    const newGuid = await duplicateLoadout(entity);
    setSelected(newGuid);
  };
  const handleExport = (entity) => exportLoadout(entity, tax);

  const handleImport = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = '';
    if (!files.length) return;
    try {
      await importLoadouts(files);
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
  };

  return (
    <ScreenLayout
      elementsSidebar={
        <ElementsSidebar
          title={t('loadouts.title')}
          headerActions={<>
            <IconBtn icon="export" title={t('common.import')} onClick={() => importRef.current.click()}/>
            <IconBtn icon="import" title={t('common.export')} onClick={() => importRef.current.click()}/>
            <IconBtn icon="plus" title={t('loadouts.newTip')} onClick={() => setCreateOpen(true)}/>
            <input ref={importRef} type="file" accept=".mntealoadout,.mntealoadouts" multiple hidden onChange={handleImport}/>
          </>}
          search={browserSearch} setSearch={setBrowserSearch}
          searchPlaceholder={t('loadouts.filterPlaceholder')}
          loading={loading}
        >
        {filtered.map(l => {
          const sel = l.guid === selected;
          return (
            <EntityContextMenu key={l.guid}
              onDuplicate={() => handleDuplicate(l)}
              onExport={() => handleExport(l)}
              onDelete={() => handleDeleteRequest(l)}
            >
              <SidebarItem selected={sel} onClick={() => setSelected(l.guid)} className="items-start py-2.5">
                <Tooltip content={l.tagline || `${l.items.length} ${t('app.statusItems')}`} side="right">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{l.name}</div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{l.desc}</div>
                    <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                      <span>{l.items.length} {t('app.statusItems')}</span>
                      <span className="opacity-50">·</span>
                      <span>{Object.keys(l.slots || {}).length} {t('loadouts.slotMapping').toLowerCase()}</span>
                    </div>
                  </div>
                </Tooltip>
              </SidebarItem>
            </EntityContextMenu>
          );
        })}
        </ElementsSidebar>
      }
      inspectorSidebar={loadout && (
        <InspectorSidebar>
          <LoadoutInspector loadout={loadout}/>
        </InspectorSidebar>
      )}
    >
      <div className="min-w-0">
        {loading
          ? <ContentSkeleton/>
          : DATA.loadouts.length === 0
            ? <EmptyState icon="layers" title={t('loadouts.empty')} description={t('loadouts.emptyDesc')}>
                <Button size="sm" icon="plus" onClick={() => setCreateOpen(true)}>{t('loadouts.newTip')}</Button>
              </EmptyState>
            : loadout && <LoadoutEditor key={loadout.guid} loadout={loadout} taxonomy={tax} onSaved={onSaved}/>
        }
      </div>

      <EntityCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        schema={createLoadoutSchema(t)}
        createDraft={createLoadoutDraft}
        taxonomy={tax}
        onSave={handleCreateLoadout}
        sectionIds={['identity']}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        name={deleteTarget?.name ?? ''}
        onConfirm={handleDeleteConfirm}
      />
    </ScreenLayout>
  );
}

/* ============================================================
   LoadoutEditor — main editor with local draft state
   ============================================================ */
/**
 * Editable loadout form. Resets when loadout changes (parent uses key={loadout.guid}).
 * @param {{ loadout: Loadout, taxonomy: object }} props
 */
function LoadoutEditor({ loadout, taxonomy, onSaved }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(() => ({
    ...loadout,
    behaviour: loadout.behaviour ?? {
      applyOnSpawn: true,
      randomiseQty: false,
      autoEquipPass: true,
      dropOnDeath: 'Equipped only',
    },
  }));

  const saveStatus = useAutoSave(draft, saveLoadout, 1000, onSaved);

  const [addModalOpen,  setAddModalOpen]  = useState(false);
  const [editModalData, setEditModalData] = useState(null);
  const [dragIdx,       setDragIdx]       = useState(null);
  const [overIdx,       setOverIdx]       = useState(null);

  const set = (path, val) => setDraft(d => {
    const next = structuredClone(d);
    setPath(next, path, val);
    return next;
  });

  const addItem    = (item) => setDraft(d => ({ ...d, items: [...d.items, item] }));
  const updateItem = (idx, item) => setDraft(d => { const items = [...d.items]; items[idx] = item; return { ...d, items }; });
  const removeItem = (idx)  => setDraft(d => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver  = (e, idx) => { e.preventDefault(); if (overIdx !== idx) setOverIdx(idx); };
  const handleDrop      = (e, idx) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== idx) {
      setDraft(d => {
        const items = [...d.items];
        const [moved] = items.splice(dragIdx, 1);
        items.splice(idx, 0, moved);
        return { ...d, items };
      });
    }
    setDragIdx(null);
    setOverIdx(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null); };

  const renderField = (field, value, onChange) => {
    if (field.id === 'items') {
      return (
        <div className="space-y-1.5">
          <div className="grid grid-cols-[28px_minmax(180px,2fr)_88px_minmax(110px,1fr)_72px] items-center gap-2 px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <div/><div>{t('loadouts.colItemRef')}</div><div>{t('loadouts.colQty')}</div><div>{t('loadouts.colSlot')}</div><div/>
          </div>
          {draft.items.map((it, idx) => {
            const src = DATA.itemByName[it.ref];
            return (
              <div
                key={idx}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDrop={e => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'grid grid-cols-[28px_minmax(180px,2fr)_88px_minmax(110px,1fr)_72px] items-center gap-2 rounded-lg border border-border bg-card p-2 transition-opacity',
                  dragIdx === idx && 'opacity-30',
                  overIdx === idx && dragIdx !== idx && 'border-primary/60 bg-primary/5',
                )}
              >
                <div className="flex cursor-grab items-center justify-center text-muted-foreground/60 active:cursor-grabbing">
                  <Icon name="dragHandle" size={14}/>
                </div>
                <div className="flex min-w-0 items-center gap-2.5">
                  <Thumb size={30} tone={src?._ui?.thumbTone ?? 0} icon={src?._ui?.icon || 'cube'}/>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{src?.displayName || it.ref}</div>
                    <div className="truncate font-mono text-[10px] text-muted-foreground">guid: {(src?.guid || '').slice(0, 13)}{src ? '…' : ''}</div>
                  </div>
                </div>
                <div><TextField value={String(it.qty)} mono/></div>
                <div>
                  {it.slot
                    ? <Tag>{it.slot}</Tag>
                    : <span className="text-xs text-muted-foreground">—</span>
                  }
                </div>
                <div className="flex items-center justify-end gap-1">
                  <IconBtn icon="cog" title={t('loadouts.editItemTip')} onClick={() => setEditModalData({ item: it, idx })}/>
                  <IconBtn icon="trash" tone="danger" title={t('loadouts.removeTip')} onClick={() => removeItem(idx)}/>
                </div>
              </div>
            );
          })}
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            <Icon name="plus" size={12}/> {t('loadouts.addToComposition')}
          </button>
        </div>
      );
    }

    if (field.id === 'slots') {
      const slots = taxonomy.attachmentSlots ?? [];
      const itemOptions = [
        { value: '', label: '— none —' },
        ...draft.items.map(it => ({ value: it.ref, label: it.ref })),
      ];
      return (
        <div className="space-y-2">
          {slots.map(s => (
            <div key={s.id} className="grid grid-cols-[130px_1fr] items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <Icon name="link" size={13} className="text-muted-foreground"/>
                <span className="truncate">{s.name}</span>
              </div>
              <Select
                value={(value ?? {})[s.name] ?? ''}
                onChange={v => {
                  const next = { ...(value ?? {}) };
                  if (v) next[s.name] = v;
                  else delete next[s.name];
                  onChange(next);
                }}
                options={itemOptions}
              />
            </div>
          ))}
          {slots.length === 0 && (
            <div className="py-2 text-xs italic text-muted-foreground">{t('loadouts.noSlotsDefined')}</div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div>
      {/* Sticky header */}
      <EntityHeader
        title={draft.name}
        guid={draft.guid}
        saveStatus={saveStatus}
        thumb={
          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
            <Icon name="layers" size={22}/>
          </div>
        }
      />

      <FormRenderer
        schema={createLoadoutSchema(t)}
        draft={draft}
        set={set}
        taxonomy={taxonomy}
        sectionIds={['identity', 'spawnBehaviour', 'composition', 'slotMapping']}
        renderField={renderField}
      />

      <LoadoutItemModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        item={null}
        onSave={addItem}
        taxonomy={taxonomy}
      />
      <LoadoutItemModal
        open={editModalData !== null}
        onOpenChange={open => { if (!open) setEditModalData(null); }}
        item={editModalData?.item ?? null}
        onSave={updated => { if (editModalData) updateItem(editModalData.idx, updated); }}
        taxonomy={taxonomy}
      />
    </div>
  );
}

/* ============================================================
   LoadoutInspector — right-panel JSON preview
   ============================================================ */
/**
 * @param {{ loadout: Loadout }} props
 */
function LoadoutInspector({ loadout }) {
  const { t } = useTranslation();
  const preview = {
    guid:      loadout.guid,
    name:      loadout.name,
    tagline:   loadout.tagline,
    desc:      loadout.desc,
    items:     loadout.items,
    slots:     loadout.slots,
    behaviour: loadout.behaviour,
  };
  return (
    <div className="space-y-5 p-4 pt-4">
      <div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
              <Icon name="layers" size={16}/>
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{loadout.name}</div>
              <div className="truncate font-mono text-[10.5px] text-muted-foreground">{loadout.guid}</div>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{t('items.jsonPreview')}</div>
        <pre className="overflow-x-auto rounded-md border border-border bg-card p-3 font-mono text-[10.5px] leading-relaxed text-foreground/80">{JSON.stringify(preview, null, 2)}</pre>
      </div>
    </div>
  );
}
