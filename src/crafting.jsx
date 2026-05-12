import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  cn, Icon, Button, Select, Tooltip,
  Thumb, SidebarItem, LeftPanel, CollapsibleAside,
  Section, IconBtn,
  ContentSkeleton, EmptyState, DeleteConfirmDialog,
} from './ui.jsx';
import { Dialog, DialogContent } from './command.jsx';
import { DATA, saveRecipe, loadData, deleteRecipe, duplicateRecipe, exportEntityAsJson } from './store.js';
import { useTaxonomy, useAutoSave } from './hooks.jsx';
import { FormRenderer } from './form-renderer.jsx';
import { createRecipeSchema, createRecipeDraft } from './form-schemas.js';
import { EntityCreateSheet } from './entity-sheet.jsx';
import {
  ContextMenu, ContextMenuContent, ContextMenuGroup, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from '@/components/ui/context-menu';

/* ============================================================
   Type definitions
   ============================================================ */
/**
 * @typedef {{ ref: string, qty: number, icon: string, tone: number }} Ingredient
 * @typedef {{ id: string, title: string, required: boolean, ingredients: Ingredient[] }} RecipeGroup
 * @typedef {{ guid: string, name: string, tier: string, result: object, successChance: number, qtyMin: number, qtyMax: number, reqs: { level: number, station: string, duration: string }, groups: RecipeGroup[] }} Recipe
 */

/* ============================================================
   IntStepper — compact number stepper
   ============================================================ */
/**
 * @param {{ value: number, onChange?: (v: number) => void, warn?: boolean }} props
 */
function IntStepper({ value, onChange, warn }) {
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);

  const clamp  = (n) => Math.max(1, Math.min(9999, Math.floor(n || 1)));
  const bump   = (d) => { const next = clamp((parseInt(v, 10) || 0) + d); setV(next); onChange?.(next); };
  const commit = (raw) => { const clamped = clamp(parseInt(raw, 10)); setV(clamped); onChange?.(clamped); };

  return (
    <div className="inline-flex h-8 items-stretch overflow-hidden rounded-md border border-input bg-transparent shadow-sm">
      <button onClick={() => bump(-1)} className="flex w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">−</button>
      <input
        type="number" min={1} max={9999} value={v}
        onChange={e => setV(e.target.value)}
        onBlur={e => commit(e.target.value)}
        className={cn(
          'w-12 border-x border-border bg-transparent text-center font-mono text-xs outline-none',
          warn ? 'text-amber-400' : 'text-foreground',
        )}
      />
      <button onClick={() => bump(1)} className="flex w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">+</button>
    </div>
  );
}

/* ============================================================
   IngredientPickerModal — searchable material item picker
   ============================================================ */
/**
 * @param {{ open: boolean, onOpenChange: (v: boolean) => void, onAdd: (ing: Ingredient) => void }} props
 */
function IngredientPickerModal({ open, onOpenChange, onAdd }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const materials = useMemo(() =>
    DATA.allItems.filter(it => it.tags?.some(t => t.startsWith('Item.Material'))),
    [],
  );

  const filtered = query.trim()
    ? materials.filter(it => it.displayName.toLowerCase().includes(query.trim().toLowerCase()))
    : materials;

  const handleAdd = (item) => {
    onAdd({ ref: item.displayName, qty: 1, icon: item._ui?.icon || 'cube', tone: item._ui?.thumbTone ?? 0 });
    onOpenChange(false);
    setQuery('');
  };

  const handleClose = () => { onOpenChange(false); setQuery(''); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-[92vw] p-0 sm:w-[480px]">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{t('crafting.addIngredientTitle')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('crafting.addIngredientDesc')}</p>
        </div>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Icon name="search" size={14} className="shrink-0 text-muted-foreground"/>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('crafting.searchMaterials')}
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
              <Icon name="x" size={14}/>
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground">{t('crafting.noMaterials')}</div>
          )}
          {filtered.map(item => (
            <button
              key={item.guid}
              onClick={() => handleAdd(item)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent"
            >
              <Thumb size={28} tone={item._ui?.thumbTone ?? 0} icon={item._ui?.icon || 'cube'}/>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{item.displayName}</div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {item.category}{item.subCategory ? ` · ${item.subCategory}` : ''}
                </div>
              </div>
              <Icon name="plus" size={14} className="shrink-0 text-muted-foreground"/>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-end border-t border-border px-4 py-3">
          <Button variant="outline" size="sm" onClick={handleClose}>{t('loadouts.cancel')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   RecipeInspector — right-panel inspector
   ============================================================ */
/** @param {{ recipe: Recipe }} props */
function RecipeInspector({ recipe }) {
  const { t } = useTranslation();
  const ings = recipe.groups.flatMap(g => g.ingredients);
  return (
    <div className="space-y-4 p-4">
      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('crafting.output')}</div>
        <div className="flex items-center gap-2.5 rounded-md border border-border bg-card p-2.5">
          <Thumb size={32} tone={recipe.result.tone} icon={recipe.result.icon}/>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{recipe.result.display}</div>
            <div className="truncate font-mono text-[10px] text-muted-foreground">{recipe.result.itemRef}</div>
          </div>
          <span className="font-mono text-xs text-primary">×{recipe.qtyMin}</span>
        </div>
      </div>
      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('crafting.stats')}</div>
        <div className="space-y-1.5 rounded-md border border-border/50 bg-card/40 p-3 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">{t('crafting.successChance')}</span><span className="font-mono">{recipe.successChance}%</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t('crafting.duration')}</span><span className="font-mono">{recipe.reqs.duration}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t('crafting.station')}</span><span className="font-mono">{recipe.reqs.station}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{t('crafting.ingredients')}</span><span className="font-mono">{ings.length}</span></div>
        </div>
      </div>
      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('crafting.ingredientTally')}</div>
        <div className="space-y-1">
          {ings.map((ing, i) => {
            const match = DATA.allItems.find(it => it.displayName === ing.ref);
            return (
              <div key={i} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50">
                <Thumb size={20} tone={match?._ui?.thumbTone ?? ing.tone} icon={match?._ui?.icon || ing.icon}/>
                <span className="flex-1 truncate font-mono text-[11px]">{ing.ref}</span>
                <span className="font-mono text-[11px] text-primary">×{ing.qty}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   RecipeEditor — main editor with local draft state
   ============================================================ */
/**
 * Editable recipe form. Resets when the selected recipe changes (parent uses key={recipe.guid}).
 * @param {{ recipe: Recipe, taxonomy: object }} props
 */
function RecipeEditor({ recipe, taxonomy, onSaved }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(recipe);
  const saveStatus = useAutoSave(draft, saveRecipe, 1000, onSaved);
  const [ingredientModalGroupId, setIngredientModalGroupId] = useState(null);

  const set = (path, val) => setDraft(d => {
    const next = structuredClone(d);
    const keys = path.split('.');
    let cur = next;
    for (let i = 0; i < keys.length - 1; i++) {
      if (cur[keys[i]] == null) cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = val;
    return next;
  });

  const addIngredient = (groupId, ing) =>
    setDraft(d => ({
      ...d,
      groups: d.groups.map(g => g.id !== groupId ? g : { ...g, ingredients: [...g.ingredients, ing] }),
    }));

  const removeIngredient = (groupId, ingIdx) =>
    setDraft(d => ({
      ...d,
      groups: d.groups.map(g => g.id !== groupId ? g : { ...g, ingredients: g.ingredients.filter((_, i) => i !== ingIdx) }),
    }));

  const updateIngredientQty = (groupId, ingIdx, qty) =>
    setDraft(d => ({
      ...d,
      groups: d.groups.map(g => g.id !== groupId ? g : {
        ...g,
        ingredients: g.ingredients.map((ing, i) => i !== ingIdx ? ing : { ...ing, qty }),
      }),
    }));

  const craftableItems = useMemo(
    () => DATA.allItems.filter(it => it.flags & (1 << 2)),
    [],
  );

  const renderField = (field, value, onChange) => {
    if (field.id === 'result.itemRef') {
      return (
        <Select
          value={draft.result?.display ?? ''}
          onChange={v => {
            const item = DATA.itemByName[v];
            set('result.display', v);
            set('result.itemRef', item?.guid || v);
          }}
          options={[
            { value: '', label: '— select craftable item —' },
            ...craftableItems.map(it => ({ value: it.displayName, label: it.displayName })),
          ]}
          placeholder="Select craftable item…"
        />
      );
    }
    return null;
  };

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background px-6 py-4">
        <div className="flex items-start gap-4">
          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
            <Icon name="hammer" size={22}/>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold tracking-tight">{draft.name}</h1>
            <div className="mt-1 flex items-center gap-3">
              <div className="truncate font-mono text-xs text-muted-foreground">guid: {draft.guid}</div>
              {saveStatus === 'saving' && <span className="text-[10px] text-muted-foreground/60">{t('app.saving')}</span>}
              {saveStatus === 'saved'  && <span className="text-[10px] text-emerald-500/80">{t('app.saved')}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Schema-driven sections: identity, result, requirements */}
      <FormRenderer
        schema={createRecipeSchema(t)}
        draft={draft}
        set={set}
        taxonomy={taxonomy}
        sectionIds={['identity', 'result', 'requirements']}
        renderField={renderField}
      />

      {/* Ingredient groups — rendered manually since each group is its own Section */}
      <div className="space-y-4 px-6 pb-6">
        {draft.groups.map(g => (
          <Section
            key={g.id}
            title={g.title + (g.oneOf ? ' (one of)' : '')}
            icon={g.required ? 'tag' : 'sparkle'}
            right={
              <Button icon="plus" size="sm" variant="ghost" onClick={() => setIngredientModalGroupId(g.id)}>
                {t('crafting.addIngredientTitle')}
              </Button>
            }
          >
            <div className="space-y-1.5">
              {g.ingredients.map((ing, ii) => {
                const match = DATA.allItems.find(it => it.displayName === ing.ref);
                return (
                  <div key={ii} className="grid grid-cols-[36px_1fr_120px_32px] items-center gap-3 rounded-lg border border-border bg-card p-2.5">
                    <Thumb size={32} tone={match?._ui?.thumbTone ?? ing.tone} icon={match?._ui?.icon || ing.icon}/>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">REF_ID</div>
                      {/* REF_ID is a technical label, not translated */}
                      <div className="truncate font-mono text-xs">{ing.ref}</div>
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('crafting.amount')}</div>
                      <IntStepper
                        value={ing.qty}
                        warn={!match}
                        onChange={qty => updateIngredientQty(g.id, ii, qty)}
                      />
                    </div>
                    <IconBtn icon="trash" tone="danger" title={t('crafting.removeIngredient')} onClick={() => removeIngredient(g.id, ii)}/>
                  </div>
                );
              })}
              {g.ingredients.length === 0 && (
                <div className="py-4 text-center text-xs italic text-muted-foreground">{t('crafting.noIngredients')}</div>
              )}
            </div>
          </Section>
        ))}
      </div>

      <IngredientPickerModal
        open={ingredientModalGroupId !== null}
        onOpenChange={open => { if (!open) setIngredientModalGroupId(null); }}
        onAdd={ing => { if (ingredientModalGroupId) addIngredient(ingredientModalGroupId, ing); }}
      />
    </div>
  );
}

/* ============================================================
   CraftingScreen — top-level screen component
   ============================================================ */
/**
 * @param {{ search: string }} props
 */
const RECIPE_FAMILY_ICONS = { Smithing: 'hammer', Alchemy: 'beaker' };

export function CraftingScreen({ search: globalSearch, loading }) {
  const { t } = useTranslation();
  const [tax] = useTaxonomy();
  const [selected,      setSelected]      = useState(null);
  const [browserSearch, setBrowserSearch] = useState('');
  const [createOpen,    setCreateOpen]    = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [tick,          setTick]          = useState(0); // eslint-disable-line no-unused-vars
  const allRecipes = Object.values(DATA.recipes).flat();
  const recipe     = allRecipes.find(r => r.guid === selected);
  const search     = (browserSearch || globalSearch || '').toLowerCase();

  const handleCreateRecipe = async (newRecipe) => {
    await saveRecipe(newRecipe);
    await loadData();
    setSelected(newRecipe.guid);
  };

  const handleDuplicate = async (entity) => {
    const newGuid = await duplicateRecipe(entity);
    setSelected(newGuid);
  };
  const handleExport        = (entity) => exportEntityAsJson(entity, `${entity.name}.json`);
  const handleDeleteRequest = (entity) => setDeleteTarget(entity);
  const handleDeleteConfirm = async () => {
    await deleteRecipe(deleteTarget.guid);
    await loadData();
    if (selected === deleteTarget.guid) setSelected(null);
    setDeleteTarget(null);
  };

  return (
    <>
      <LeftPanel
        title={t('crafting.title')}
        headerActions={<IconBtn icon="plus" title={t('crafting.newTip')} onClick={() => setCreateOpen(true)}/>}
        search={browserSearch} setSearch={setBrowserSearch}
        searchPlaceholder={t('crafting.filterPlaceholder')}
        loading={loading}
      >
        {Object.entries(DATA.recipes).map(([family, recipes]) => {
          const icon = RECIPE_FAMILY_ICONS[family] ?? 'hammer';
          const filtered = search ? recipes.filter(r => (r.name + ' ' + r.guid).toLowerCase().includes(search)) : recipes;
          if (filtered.length === 0) return null;
          return (
            <div key={family} className="mb-1">
              <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Icon name={icon} size={12}/>
                <span className="flex-1">{family}</span>
                <span className="font-mono text-[10px] text-muted-foreground/70">{filtered.length}</span>
              </div>
              {filtered.map(r => (
                <ContextMenu key={r.guid}>
                  <ContextMenuTrigger asChild>
                    <SidebarItem selected={r.guid === selected} onClick={() => setSelected(r.guid)}>
                      <Tooltip content={`${r.reqs.station} · ${r.successChance}% success`} side="right">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{r.name}</div>
                          <div className="truncate font-mono text-[10px] text-muted-foreground">{r.guid}</div>
                        </div>
                      </Tooltip>
                    </SidebarItem>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-44">
                    <ContextMenuGroup>
                      <ContextMenuItem onClick={() => handleDuplicate(r)}>
                        <Icon name="dup" size={14} className="mr-2"/>{t('common.duplicate')}
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => handleExport(r)}>
                        <Icon name="export" size={14} className="mr-2"/>{t('common.export')}
                      </ContextMenuItem>
                    </ContextMenuGroup>
                    <ContextMenuSeparator/>
                    <ContextMenuGroup>
                      <ContextMenuItem variant="destructive" onClick={() => handleDeleteRequest(r)}>
                        <Icon name="trash" size={14} className="mr-2"/>{t('common.delete')}
                      </ContextMenuItem>
                    </ContextMenuGroup>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          );
        })}
      </LeftPanel>

      <main className="min-w-0 flex-1 overflow-auto">
        {loading
          ? <ContentSkeleton/>
          : allRecipes.length === 0
            ? <EmptyState icon="beaker" title={t('crafting.empty')} description={t('crafting.emptyDesc')}>
                <Button size="sm" icon="plus" onClick={() => setCreateOpen(true)}>{t('crafting.newTip')}</Button>
              </EmptyState>
            : recipe && <RecipeEditor key={recipe.guid} recipe={recipe} taxonomy={tax} onSaved={() => setTick(t => t + 1)}/>
        }
      </main>

      {recipe && (
        <CollapsibleAside storageKey="aside-inspector" width={340}>
          <RecipeInspector recipe={recipe}/>
        </CollapsibleAside>
      )}

      <EntityCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        schema={createRecipeSchema(t)}
        createDraft={createRecipeDraft}
        taxonomy={tax}
        onSave={handleCreateRecipe}
        sectionIds={['identity']}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        name={deleteTarget?.name ?? ''}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
