import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from './i18n.js';
import { cn, Icon, Button, Input, Select, Tag, Section, Row } from './ui.jsx';
import { FlagsPicker, ItemActionsPicker } from './form-renderer.jsx';
import {
  Dialog, DialogContent, Command, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator,
} from './command.jsx';
import JSZip from 'jszip';
import { useTaxonomy, TAX_KEY } from './hooks.jsx';
import { bulkImport, saveFile } from './store.js';
import { exportWorkspace } from './exporter.js';

/* ============================================================
   Type definitions
   ============================================================ */
/**
 * @typedef {{ id: string, title: string, icon?: string, tags: string[], subcategories: Subcategory[] }} Category
 * @typedef {{ id: string, title: string, tags: string[] }} Subcategory
 * @typedef {{ id: string, title: string, tags: string[], color: string }} Rarity
 * @typedef {{ id: string, key: string, icon: string, tip: string, flags?: number }} ItemAction
 * @typedef {{ id: string, name: string, tags: string[] }} AttachmentSlot
 * @typedef {{ id: string, name: string, icon?: string, tag: string }} CraftingStation
 * @typedef {{ id: string, name: string, tag: string }} SpecialAffect
 * @typedef {{ categories: Category[], rarities: Rarity[], itemActions: ItemAction[], attachmentSlots: AttachmentSlot[], craftingStations: CraftingStation[], specialAffects: SpecialAffect[] }} Taxonomy
 */

/* ============================================================
   Constants
   ============================================================ */
const LANGUAGES = ['English', 'Čeština', 'Deutsch', 'Français', 'Español', '日本語'];

const RARITY_SWATCHES = [
  '#9ca3af', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#eab308',
];

/** @param {string} prefix @returns {string} */
const newId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

/* ============================================================
   Shared sub-components
   ============================================================ */
/**
 * @param {{ trail: string[], onBack: () => void, onClose: () => void, onNavigate?: (i: number) => void, right?: React.ReactNode }} props
 */
function PageHeader({ trail, onBack, onClose, onNavigate, right }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
      <button
        onClick={onBack}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        title={t('settings.back')}
      >
        <Icon name="chevLeft" size={14}/>
      </button>
      <div className="flex flex-1 items-center gap-1.5 text-sm font-medium">
        {trail.map((item, i) => {
          const isLast = i === trail.length - 1;
          return (
            <React.Fragment key={i}>
              {i > 0 && <Icon name="chevRight" size={12} className="text-muted-foreground/60"/>}
              {isLast || !onNavigate ? (
                <span className={isLast ? 'text-foreground' : 'text-muted-foreground'}>{item}</span>
              ) : (
                <button
                  onClick={() => onNavigate(i)}
                  className="text-muted-foreground hover:text-foreground hover:underline transition-colors"
                >
                  {item}
                </button>
              )}
            </React.Fragment>
          );
        })}
      </div>
      {right}
      <button
        onClick={onClose}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        title={t('settings.close')}
      >
        <Icon name="x" size={14}/>
      </button>
    </div>
  );
}

/** @param {{ hint?: React.ReactNode }} props */
function Footer({ hint }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5 font-mono">
        {hint || (
          <>
            <kbd className="rounded border border-border bg-background px-1">↑</kbd>
            <kbd className="rounded border border-border bg-background px-1">↓</kbd>
            {t('settings.navHint')}
            <span className="mx-1">·</span>
            <kbd className="rounded border border-border bg-background px-1">⏎</kbd> {t('settings.selectHint')}
            <span className="mx-1">·</span>
            <kbd className="rounded border border-border bg-background px-1">esc</kbd> {t('settings.closeHint')}
          </>
        )}
      </span>
    </div>
  );
}

/**
 * @param {{ value: string[], onChange: (v: string[]) => void, placeholder?: string }} props
 */
const TagsField = ({ value = [], onChange, placeholder }) => {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('settings.tagPlaceholder');
  const [draft, setDraft] = useState('');
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
  const commit = () => {
    const v = draft.trim().replace(/,$/, '');
    if (!v || value.includes(v)) return;
    onChange([...value, v]);
    setDraft('');
  };
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 shadow-sm focus-within:ring-1 focus-within:ring-ring">
      {value.map((t, i) => (
        <Tag key={i} onRemove={() => remove(i)}>{t}</Tag>
      ))}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
          else if (e.key === 'Backspace' && !draft && value.length) remove(value.length - 1);
        }}
        onBlur={commit}
        placeholder={value.length ? '' : resolvedPlaceholder}
        className="min-w-[120px] flex-1 bg-transparent py-1 font-mono text-xs outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
};


/* ============================================================
   TaxListPage / TaxEditPage shells
   ============================================================ */
/**
 * @param {{ trail: string[], onBack: () => void, onClose: () => void, onNavigate?: (i: number) => void, placeholder: string, heading: string, onAdd: () => void, addLabel: string, children: React.ReactNode }} props
 */
function TaxListPage({ trail, onBack, onClose, onNavigate, placeholder, heading, onAdd, addLabel, children }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col">
      <PageHeader trail={trail} onBack={onBack} onClose={onClose} onNavigate={onNavigate}/>
      <Command className="flex-1 h-auto min-h-0">
        <CommandInput placeholder={placeholder}/>
        <CommandList className="flex-1 max-h-none">
          <CommandEmpty>{t('settings.noResults')}</CommandEmpty>
          <CommandGroup heading={heading}>
            {children}
          </CommandGroup>
        </CommandList>
      </Command>
      <div className="border-t border-border">
        <button
          onClick={onAdd}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Icon name="plus" size={14}/>
          {addLabel}
        </button>
      </div>
      <Footer/>
    </div>
  );
}

/**
 * @param {{ trail: string[], onBack: () => void, onClose: () => void, onNavigate?: (i: number) => void, onDelete: () => void, onSave: () => void, isDirty: boolean, children: React.ReactNode }} props
 */
function TaxEditPage({ trail, onBack, onClose, onNavigate, onDelete, onSave, isDirty, children }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        trail={trail} onBack={onBack} onClose={onClose} onNavigate={onNavigate}
        right={onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Icon name="trash" size={13}/> {t('settings.delete')}
          </Button>
        )}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {children}
      </div>
      <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2">
        <span className="text-[11px] text-muted-foreground">
          {isDirty ? `● ${t('settings.unsavedChanges')}` : ''}
        </span>
        <Button size="sm" onClick={onSave}>{t('settings.save')}</Button>
      </div>
    </div>
  );
}

/* ============================================================
   SettingsCommand — page router
   ============================================================ */
/**
 * @param {{ open: boolean, onOpenChange: (v: boolean) => void }} props
 */
export function SettingsCommand({ open, onOpenChange }) {
  const { t } = useTranslation();
  const [stack, setStack] = useState([{ type: 'root' }]);
  const page  = stack[stack.length - 1];
  const push  = (p) => setStack(s => [...s, p]);
  const pop   = () => setStack(s => s.length > 1 ? s.slice(0, -1) : s);
  const close = () => onOpenChange(false);

  const [tax, setTax] = useTaxonomy();

  useEffect(() => { if (open) setStack([{ type: 'root' }]); }, [open]);

  const trail = useMemo(() => {
    const parts = [t('settings.panelTitle')];
    for (let i = 1; i < stack.length; i++) {
      const p = stack[i];
      if (p.type === 'categories')        parts.push(t('settings.categories'));
      else if (p.type === 'category')     parts.push(tax.categories.find(c => c.id === p.id)?.title || t('settings.categories'));
      else if (p.type === 'subcategory')  parts.push(tax.categories.find(c => c.id === p.catId)?.subcategories.find(s => s.id === p.id)?.title || t('settings.subcategories'));
      else if (p.type === 'rarities')     parts.push(t('settings.rarities'));
      else if (p.type === 'rarity')       parts.push(tax.rarities.find(r => r.id === p.id)?.title || t('settings.rarities'));
      else if (p.type === 'itemActions')      parts.push(t('settings.itemActions'));
      else if (p.type === 'itemAction')       parts.push(tax.itemActions.find(a => a.id === p.id)?.key || t('settings.itemActions'));
      else if (p.type === 'attachmentSlots')  parts.push(t('settings.attachmentSlots'));
      else if (p.type === 'attachmentSlot')   parts.push(tax.attachmentSlots.find(s => s.id === p.id)?.name || t('settings.attachmentSlots'));
      else if (p.type === 'craftingStations') parts.push(t('settings.craftingStations'));
      else if (p.type === 'craftingStation')  parts.push(tax.craftingStations.find(s => s.id === p.id)?.name || t('settings.craftingStations'));
      else if (p.type === 'specialAffects')   parts.push(t('settings.specialAffects'));
      else if (p.type === 'specialAffect')    parts.push((tax.specialAffects ?? []).find(a => a.id === p.id)?.name || t('settings.specialAffects'));
    }
    return parts;
  }, [stack, tax, t]);

  const navigateTo = (i) => setStack(s => s.slice(0, i + 1));
  const shared = { trail, onBack: pop, onClose: close, onNavigate: navigateTo, tax, setTax, push };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[620px] w-[92vw] max-w-[900px] flex-col overflow-hidden p-0 [&>button]:hidden">
        {page.type === 'root'              && <RootPage push={push} close={close}/>}
        {page.type === 'categories'        && <CategoriesPage      {...shared}/>}
        {page.type === 'category'          && <CategoryEditPage    {...shared} categoryId={page.id} initialData={page.defaults}/>}
        {page.type === 'subcategory'       && <SubcategoryEditPage {...shared} categoryId={page.catId} subcategoryId={page.id}/>}
        {page.type === 'rarities'          && <RaritiesPage        {...shared}/>}
        {page.type === 'rarity'            && <RarityEditPage      {...shared} rarityId={page.id} initialData={page.defaults}/>}
        {page.type === 'itemActions'       && <ItemActionsPage     {...shared}/>}
        {page.type === 'itemAction'        && <ItemActionEditPage  {...shared} actionId={page.id} initialData={page.defaults}/>}
        {page.type === 'attachmentSlots'   && <AttachmentSlotsPage    {...shared}/>}
        {page.type === 'attachmentSlot'    && <AttachmentSlotEditPage {...shared} slotId={page.id} initialData={page.defaults}/>}
        {page.type === 'craftingStations'  && <CraftingStationsPage   {...shared}/>}
        {page.type === 'craftingStation'   && <CraftingStationEditPage {...shared} stationId={page.id} initialData={page.defaults}/>}
        {page.type === 'specialAffects'    && <SpecialAffectsPage      {...shared}/>}
        {page.type === 'specialAffect'     && <SpecialAffectEditPage   {...shared} affectId={page.id} initialData={page.defaults}/>}
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   Root page
   ============================================================ */
const LANG_CODES = { 'English': 'en', 'Čeština': 'cs' };

function RootPage({ push, close }) {
  const { t } = useTranslation();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const setTheme = (mode) => {
    if (mode === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    setIsDark(mode === 'dark');
    try { localStorage.setItem('arch.theme', mode); } catch {}
  };

  const exportAll = async () => {
    await exportWorkspace().catch(console.error);
    close();
  };

  const importAll = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.mnteainventory,application/json';
    input.onchange = async () => {
      const f = input.files?.[0]; if (!f) return;
      try {
        if (f.name.endsWith('.mnteainventory')) {
          const zip = await JSZip.loadAsync(f);
          const readJson = async (path) => {
            const zf = zip.file(path); return zf ? JSON.parse(await zf.async('text')) : null;
          };
          const taxonomy = await readJson('taxonomy.json');
          if (taxonomy) localStorage.setItem(TAX_KEY, JSON.stringify(taxonomy));
          const items    = await Promise.all(Object.values(zip.folder('items').files).filter(zf => !zf.dir).map(zf => zf.async('text').then(JSON.parse)));
          const loadouts = await Promise.all(Object.values(zip.folder('loadouts').files).filter(zf => !zf.dir).map(zf => zf.async('text').then(JSON.parse)));
          const recipes  = await Promise.all(Object.values(zip.folder('crafting').files).filter(zf => !zf.dir).map(zf => zf.async('text').then(JSON.parse)));
          const assetsFolder = zip.folder('assets');
          if (assetsFolder) {
            await Promise.all(
              Object.values(assetsFolder.files)
                .filter(zf => !zf.dir)
                .map(async (zf) => {
                  const blob = await zf.async('blob');
                  const key = zf.name.replace(/^assets\//, '');
                  await saveFile(key, blob);
                })
            );
          }
          await bulkImport({ items, loadouts, recipes });
        } else {
          const data = JSON.parse(await f.text());
          if (data.taxonomy) localStorage.setItem(TAX_KEY, JSON.stringify(data.taxonomy));
          await bulkImport({ items: data.items ?? [], loadouts: data.loadouts ?? [], recipes: data.recipes ?? [] });
        }
        location.reload();
      } catch (e) { alert(t('settings.importFailed') + ' ' + e.message); }
    };
    input.click();
  };

  const currentLang = Object.keys(LANG_CODES).find(k => LANG_CODES[k] === (localStorage.getItem('arch.lang') || 'en')) ?? 'English';

  return (
    <Command>
      <CommandInput placeholder={t('settings.searchPlaceholder')}/>
      <CommandList className="flex-1 max-h-none">
        <CommandEmpty>{t('settings.noMatch')}</CommandEmpty>

        <CommandGroup heading={t('settings.visuals')}>
          <CommandItem
            value="dark mode theme appearance"
            icon="eye"
            shortcut={isDark ? 'On' : 'Off'}
            onSelect={() => setTheme(isDark ? 'light' : 'dark')}
          >{t('settings.darkMode')}</CommandItem>

          <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <Icon name="flag" size={16} className="shrink-0 text-muted-foreground"/>
            <span className="flex-1 text-sm text-foreground/90">{t('settings.language')}</span>
            <div className="w-36">
              <Select
                value={currentLang}
                onChange={v => {
                  const code = LANG_CODES[v] ?? 'en';
                  localStorage.setItem('arch.lang', code);
                  i18n.changeLanguage(code);
                }}
                options={LANGUAGES.filter(l => l in LANG_CODES).map(l => ({ value: l, label: l }))}
              />
            </div>
          </div>
        </CommandGroup>

        <CommandSeparator/>

        <CommandGroup heading={t('settings.data')}>
          <CommandItem value="export all workspace json" icon="export" onSelect={exportAll}>{t('settings.exportAll')}</CommandItem>
          <CommandItem value="import workspace json"     icon="open"   onSelect={importAll}>{t('settings.import')}</CommandItem>
        </CommandGroup>

        <CommandSeparator/>

        <CommandGroup heading={t('settings.config')}>
          <CommandItem value="categories taxonomy subcategories" icon="folder"  shortcut="→" onSelect={() => push({ type: 'categories' })}>{t('settings.categories')}</CommandItem>
          <CommandItem value="rarities tiers colours"            icon="sparkle" shortcut="→" onSelect={() => push({ type: 'rarities' })}>{t('settings.rarities')}</CommandItem>
          <CommandItem value="item actions verbs player"         icon="cog"     shortcut="→" onSelect={() => push({ type: 'itemActions' })}>{t('settings.itemActions')}</CommandItem>
          <CommandItem value="attachment slots equipment"        icon="link"    shortcut="→" onSelect={() => push({ type: 'attachmentSlots' })}>{t('settings.attachmentSlots')}</CommandItem>
          <CommandItem value="crafting stations workbench forge" icon="hammer"  shortcut="→" onSelect={() => push({ type: 'craftingStations' })}>{t('settings.craftingStations')}</CommandItem>
          <CommandItem value="special affects blueprints effects" icon="sparkle" shortcut="→" onSelect={() => push({ type: 'specialAffects' })}>{t('settings.specialAffects')}</CommandItem>
        </CommandGroup>

        <CommandSeparator/>

        <CommandGroup heading={t('settings.link')}>
          <CommandItem value="help documentation guide"  icon="info"    shortcut="↗" onSelect={() => window.open('https://mountea.tools/docs', '_blank')}>{t('settings.help')}</CommandItem>
          <CommandItem value="support us donate sponsor" icon="sparkle" shortcut="↗" onSelect={() => window.open('https://mountea.tools/support', '_blank')}>{t('settings.supportUs')}</CommandItem>
        </CommandGroup>
      </CommandList>
      <Footer/>
    </Command>
  );
}

/* ============================================================
   Categories
   ============================================================ */
function CategoriesPage({ trail, onBack, onClose, onNavigate, tax, push }) {
  const { t } = useTranslation();
  const addCategory = () => {
    const id = newId('cat');
    push({ type: 'category', id, defaults: { id, title: 'New Category', tags: [], subcategories: [] } });
  };
  return (
    <TaxListPage
      trail={trail} onBack={onBack} onClose={onClose} onNavigate={onNavigate}
      placeholder={t('settings.searchCategories')}
      heading={`${tax.categories.length} ${t('settings.categories').toLowerCase()}`}
      onAdd={addCategory} addLabel={t('settings.newCategory')}
    >
      {tax.categories.map(c => (
        <CommandItem
          key={c.id}
          value={`${c.title} ${c.tags.join(' ')} ${c.subcategories.map(s => s.title).join(' ')}`}
          icon={c.icon || 'folder'}
          shortcut={`${c.subcategories.length} sub`}
          onSelect={() => push({ type: 'category', id: c.id })}
        >{c.title}</CommandItem>
      ))}
    </TaxListPage>
  );
}

function useTaxonomyEdit({ id, collection, tax, setTax, onBack, validate, blank = null }) {
  const items = tax[collection] ?? [];
  const source = items.find(x => x.id === id) ?? blank ?? null;
  const isNew = !items.some(x => x.id === id);
  const [draft, setDraft] = useState(source ?? {});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setDraft(source ?? {});
    setErrors({});
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch) => setDraft(d => {
    const next = { ...d, ...patch };
    setErrors(validate(next));
    return next;
  });

  const isDirty = isNew || JSON.stringify(draft) !== JSON.stringify(source);

  const handleSave = () => {
    const errs = validate(draft);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setTax(prev => ({
      ...prev,
      [collection]: isNew
        ? [...(prev[collection] ?? []), draft]
        : (prev[collection] ?? []).map(x => x.id === id ? draft : x),
    }));
  };

  const remove = (confirmMsg) => {
    if (!confirm(confirmMsg)) return;
    setTax(prev => ({ ...prev, [collection]: (prev[collection] ?? []).filter(x => x.id !== id) }));
    onBack();
  };

  return { source, isNew, draft, errors, update, isDirty, handleSave, remove };
}

function CategoryEditPage({ trail, onBack, onClose, onNavigate, categoryId, tax, setTax, push, initialData = null }) {
  const { t } = useTranslation();

  const validate = (d) => {
    const errs = {};
    if (!d.title?.trim()) errs.title = t('settings.valRequired');
    else if (tax.categories.some(c => c.id !== categoryId && c.title.trim().toLowerCase() === d.title.trim().toLowerCase()))
      errs.title = t('settings.valUnique');
    if (!d.tags?.length) errs.tags = t('settings.valAtLeastOneTag');
    return errs;
  };

  const { source, isNew, draft, errors, update, isDirty, handleSave, remove } = useTaxonomyEdit({
    id: categoryId, collection: 'categories', tax, setTax, onBack, validate, blank: initialData,
  });

  if (!draft) return null;

  const addSub = () => {
    const id = newId('sub');
    // Save current draft first, then add subcategory
    const updatedCat = { ...draft, subcategories: [...(draft.subcategories ?? []), { id, title: 'New Subcategory', tags: [] }] };
    setTax({ ...tax, categories: tax.categories.map(c => c.id === categoryId ? updatedCat : c) });
    push({ type: 'subcategory', catId: categoryId, id });
  };

  return (
    <TaxEditPage
      trail={trail} onBack={onBack} onClose={onClose} onNavigate={onNavigate}
      onDelete={() => remove(`${t('settings.deleteCategory')} "${source?.title}"?`)}
      onSave={handleSave} isDirty={isDirty}
    >
      <Section title="Identity" icon="tag">
        <Row label={t('settings.title')}>
          <Input
            value={draft.title}
            onChange={e => update({ title: e.target.value })}
            autoFocus
            className={cn(errors.title ? 'border-destructive' : '')}
          />
          {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
        </Row>
        <Row label={t('settings.icon')} hint={t('settings.iconDesc')}>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card/40 text-muted-foreground">
              <Icon name={draft.icon || 'folder'} size={16}/>
            </div>
            <Input value={draft.icon || ''} onChange={e => update({ icon: e.target.value })} className="flex-1 font-mono text-xs" placeholder="folder"/>
          </div>
        </Row>
      </Section>
      <Section title="Defaults" icon="cog">
        <Row label={t('settings.tags')} hint={t('settings.tagsDesc')} stack>
          <TagsField
            value={draft.tags}
            onChange={tags => update({ tags })}
          />
          {errors.tags && <p className="mt-1 text-xs text-destructive">{errors.tags}</p>}
        </Row>
        <Row label={t('settings.defaultFlags')} hint={t('settings.defaultFlagsDesc')} stack>
          <FlagsPicker value={draft.defaultFlags ?? 0} onChange={v => update({ defaultFlags: v })}/>
        </Row>
        <Row label={t('settings.defaultItemActions')} hint={t('settings.defaultItemActionsDesc')} stack>
          <ItemActionsPicker value={draft.defaultItemActions ?? []} onChange={v => update({ defaultItemActions: v })} taxonomy={tax}/>
        </Row>
      </Section>
      <Section title="Subcategories" icon="folderOpen">
        <Row label={t('settings.subcategories')} hint={`${(draft.subcategories ?? []).length} ${t('settings.subcategoriesDefined')}`} stack>
          <div className="rounded-md border border-border bg-card/40">
            {(draft.subcategories ?? []).length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">{t('settings.noSubcategories')}</div>
            )}
            {(draft.subcategories ?? []).map((s, i) => (
              <button
                key={s.id}
                onClick={() => push({ type: 'subcategory', catId: categoryId, id: s.id })}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                  i > 0 && 'border-t border-border/60',
                )}
              >
                <Icon name="folderOpen" size={14} className="text-muted-foreground"/>
                <span className="flex-1">{s.title}</span>
                <span className="font-mono text-[10.5px] text-muted-foreground">{s.tags.length} {s.tags.length === 1 ? t('settings.tags').replace(/s$/, '') : t('settings.tags').toLowerCase()}</span>
                <Icon name="chevRight" size={12} className="text-muted-foreground"/>
              </button>
            ))}
          </div>
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={addSub} disabled={isNew} title={isNew ? t('settings.saveCategoryFirst') : undefined}>
              <Icon name="plus" size={13}/> {t('settings.addSubcategory')}
            </Button>
          </div>
        </Row>
      </Section>
    </TaxEditPage>
  );
}

function SubcategoryEditPage({ trail, onBack, onClose, categoryId, subcategoryId, onNavigate, tax, setTax }) {
  const { t } = useTranslation();
  const cat = tax.categories.find(c => c.id === categoryId);
  const source = cat?.subcategories.find(s => s.id === subcategoryId);
  const [draft, setDraft] = useState(source ?? {});

  useEffect(() => {
    setDraft(source ?? {});
  }, [subcategoryId]);

  if (!draft || !source || !cat) return null;

  const update = (patch) => setDraft(d => ({ ...d, ...patch }));

  const isDirty = JSON.stringify(draft) !== JSON.stringify(source);

  const handleSave = () => {
    setTax({
      ...tax,
      categories: tax.categories.map(c =>
        c.id !== categoryId ? c : {
          ...c,
          subcategories: c.subcategories.map(s => s.id === subcategoryId ? draft : s),
        }),
    });
  };

  const remove = () => {
    if (!confirm(`${t('settings.deleteSubcategory')} "${source.title}"?`)) return;
    setTax({
      ...tax,
      categories: tax.categories.map(c =>
        c.id !== categoryId ? c : { ...c, subcategories: c.subcategories.filter(s => s.id !== subcategoryId) }),
    });
    onBack();
  };

  return (
    <TaxEditPage
      trail={trail} onBack={onBack} onClose={onClose} onNavigate={onNavigate} onDelete={remove}
      onSave={handleSave} isDirty={isDirty}
    >
      <Section title="Identity" icon="tag">
        <Row label={t('settings.title')}>
          <Input value={draft.title} onChange={e => update({ title: e.target.value })} autoFocus/>
        </Row>
        <Row label={t('settings.tags')} hint={`${t('settings.inheritedFrom')} ${cat.title} → ${cat.tags.join(', ') || '—'}`} stack>
          <TagsField value={draft.tags} onChange={tags => update({ tags })}/>
        </Row>
      </Section>
      <Section title="Defaults" icon="cog">
        <Row label={t('settings.defaultFlags')} hint={t('settings.defaultFlagsDesc')} stack>
          <FlagsPicker value={draft.defaultFlags ?? 0} onChange={v => update({ defaultFlags: v })}/>
        </Row>
        <Row label={t('settings.defaultItemActions')} hint={t('settings.defaultItemActionsDesc')} stack>
          <ItemActionsPicker value={draft.defaultItemActions ?? []} onChange={v => update({ defaultItemActions: v })} taxonomy={tax}/>
        </Row>
      </Section>
    </TaxEditPage>
  );
}

/* ============================================================
   Rarities
   ============================================================ */
function RaritiesPage({ trail, onBack, onClose, onNavigate, tax, push }) {
  const { t } = useTranslation();
  const addRarity = () => {
    const id = newId('rar');
    push({ type: 'rarity', id, defaults: { id, title: 'New Rarity', tags: [], color: '#9ca3af' } });
  };
  return (
    <TaxListPage
      trail={trail} onBack={onBack} onClose={onClose} onNavigate={onNavigate}
      placeholder={t('settings.searchRarities')}
      heading={`${tax.rarities.length} ${t('settings.rarities').toLowerCase()}`}
      onAdd={addRarity} addLabel={t('settings.newRarity')}
    >
      {tax.rarities.map(r => (
        <CommandItem
          key={r.id}
          value={`${r.title} ${r.tags.join(' ')}`}
          shortcut={r.color}
          onSelect={() => push({ type: 'rarity', id: r.id })}
        >
          <span className="h-3 w-3 shrink-0 rounded-full ring-1 ring-border" style={{ background: r.color }}/>
          <span className="truncate">{r.title}</span>
        </CommandItem>
      ))}
    </TaxListPage>
  );
}

function RarityEditPage({ trail, onBack, onClose, rarityId, onNavigate, tax, setTax, initialData = null }) {
  const { t } = useTranslation();

  const validate = (d) => {
    const errs = {};
    if (!d.title?.trim()) errs.title = t('settings.valRequired');
    else if (tax.rarities.some(r => r.id !== rarityId && r.title.trim().toLowerCase() === d.title.trim().toLowerCase()))
      errs.title = t('settings.valUnique');
    if (!d.tags?.length) errs.tags = t('settings.valAtLeastOneTag');
    return errs;
  };

  const { source, isNew, draft, errors, update, isDirty, handleSave, remove } = useTaxonomyEdit({
    id: rarityId, collection: 'rarities', tax, setTax, onBack, validate, blank: initialData,
  });

  if (!draft) return null;

  return (
    <TaxEditPage trail={trail} onBack={onBack} onClose={onClose} onNavigate={onNavigate}
      onDelete={() => remove(`${t('settings.deleteRarity')} "${source?.title}"?`)}
      onSave={handleSave} isDirty={isDirty}>
      <Section title="Identity" icon="sparkle">
        <Row label={t('settings.title')}>
          <Input
            value={draft.title}
            onChange={e => update({ title: e.target.value })}
            autoFocus
            className={cn(errors.title ? 'border-destructive' : '')}
          />
          {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
        </Row>
        <Row label={t('settings.tags')} stack>
          <TagsField value={draft.tags} onChange={tags => update({ tags })}/>
          {errors.tags && <p className="mt-1 text-xs text-destructive">{errors.tags}</p>}
        </Row>
      </Section>
      <Section title="Colour" icon="eye">
        <Row label={t('settings.colour')} hint={t('settings.colourDesc')} stack>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-md border border-border" style={{ background: draft.color }}/>
            <input type="color" value={draft.color} onChange={e => update({ color: e.target.value })}
              className="h-10 w-14 cursor-pointer rounded-md border border-input bg-transparent"/>
            <input value={draft.color} onChange={e => update({ color: e.target.value })}
              className="h-10 flex-1 rounded-md border border-input bg-transparent px-3 font-mono text-xs uppercase outline-none focus:ring-1 focus:ring-ring text-foreground"/>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {RARITY_SWATCHES.map(c => (
              <button key={c} onClick={() => update({ color: c })} title={c}
                className={cn(
                  'h-6 w-6 rounded-md border transition-transform hover:scale-110',
                  draft.color.toLowerCase() === c.toLowerCase()
                    ? 'border-foreground ring-2 ring-ring ring-offset-2 ring-offset-popover'
                    : 'border-border',
                )}
                style={{ background: c }}/>
            ))}
          </div>
          <div className="mt-2 rounded-md border border-border bg-card/40 p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('settings.preview')}</div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold"
                style={{ borderColor: draft.color, color: draft.color, background: `${draft.color}1a` }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: draft.color }}/>
                {draft.title || 'Rarity'}
              </span>
              <span className="font-mono text-[10.5px] text-muted-foreground">{draft.tags[0] || 'no.tag'}</span>
            </div>
          </div>
        </Row>
      </Section>
    </TaxEditPage>
  );
}

/* ============================================================
   Item Actions
   ============================================================ */
function ItemActionsPage({ trail, onBack, onClose, onNavigate, tax, push }) {
  const { t } = useTranslation();
  const addAction = () => {
    const id = newId('ia');
    push({ type: 'itemAction', id, defaults: { id, key: 'NewAction', icon: 'tag', tip: '' } });
  };
  return (
    <TaxListPage
      trail={trail} onBack={onBack} onClose={onClose} onNavigate={onNavigate}
      placeholder={t('settings.searchActions')}
      heading={`${tax.itemActions.length} ${t('settings.itemActions').toLowerCase()}`}
      onAdd={addAction} addLabel={t('settings.newAction')}
    >
      {tax.itemActions.map(a => (
        <CommandItem
          key={a.id}
          value={`${a.key} ${a.tip}`}
          icon={a.icon}
          onSelect={() => push({ type: 'itemAction', id: a.id })}
        >
          <span className="flex-1 font-medium">{a.key}</span>
          <span className="max-w-[260px] truncate font-mono text-[10.5px] text-muted-foreground">{a.tip}</span>
        </CommandItem>
      ))}
    </TaxListPage>
  );
}

function ItemActionEditPage({ trail, onBack, onClose, actionId, onNavigate, tax, setTax, initialData = null }) {
  const { t } = useTranslation();

  const validate = (d) => {
    const errs = {};
    if (!d.key?.trim()) errs.key = t('settings.valRequired');
    else if (tax.itemActions.some(a => a.id !== actionId && a.key.trim().toLowerCase() === d.key.trim().toLowerCase()))
      errs.key = t('settings.valUnique');
    return errs;
  };

  const { source, isNew, draft, errors, update, isDirty, handleSave, remove } = useTaxonomyEdit({
    id: actionId, collection: 'itemActions', tax, setTax, onBack, validate, blank: initialData,
  });

  if (!draft) return null;

  return (
    <TaxEditPage trail={trail} onBack={onBack} onClose={onClose} onNavigate={onNavigate}
      onDelete={() => remove(`${t('settings.deleteAction')} "${source?.key}"?`)}
      onSave={handleSave} isDirty={isDirty}>
      <Section title="Identity" icon="tag">
        <Row label={t('settings.actionKey')} hint={t('settings.actionKeyDesc')}>
          <Input
            value={draft.key}
            onChange={e => update({ key: e.target.value })}
            autoFocus
            className={cn(errors.key ? 'border-destructive' : '')}
          />
          {errors.key && <p className="mt-1 text-xs text-destructive">{errors.key}</p>}
        </Row>
        <Row label={t('settings.icon')} hint={t('settings.iconDesc')}>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card/40 text-muted-foreground">
              <Icon name={draft.icon} size={16}/>
            </div>
            <Input value={draft.icon} onChange={e => update({ icon: e.target.value })} className="flex-1 font-mono text-xs"/>
          </div>
        </Row>
        <Row label={t('settings.tooltip')} hint={t('settings.tooltipDesc')}>
          <Input value={draft.tip} onChange={e => update({ tip: e.target.value })}/>
        </Row>
      </Section>
      <Section title="Behaviour" icon="cog">
        <Row label={t('settings.behaviourFlags')} hint={t('settings.behaviourFlagsHint')} stack>
          <FlagsPicker value={draft.flags ?? 0} onChange={v => update({ flags: v })}/>
        </Row>
      </Section>
    </TaxEditPage>
  );
}

/* ============================================================
   Attachment Slots
   ============================================================ */
function AttachmentSlotsPage({ trail, onBack, onClose, onNavigate, tax, push }) {
  const { t } = useTranslation();
  const addSlot = () => {
    const id = newId('as');
    push({ type: 'attachmentSlot', id, defaults: { id, name: 'New Slot', tags: [] } });
  };
  return (
    <TaxListPage
      trail={trail} onBack={onBack} onClose={onClose} onNavigate={onNavigate}
      placeholder={t('settings.searchSlots')}
      heading={`${tax.attachmentSlots.length} ${t('settings.attachmentSlots').toLowerCase()}`}
      onAdd={addSlot} addLabel={t('settings.newSlot')}
    >
      {tax.attachmentSlots.map(s => (
        <CommandItem
          key={s.id}
          value={`${s.name} ${s.tags.join(' ')}`}
          icon="link"
          shortcut={`${s.tags.length} tag${s.tags.length === 1 ? '' : 's'}`}
          onSelect={() => push({ type: 'attachmentSlot', id: s.id })}
        >{s.name}</CommandItem>
      ))}
    </TaxListPage>
  );
}

function AttachmentSlotEditPage({ trail, onBack, onClose, slotId, onNavigate, tax, setTax, initialData = null }) {
  const { t } = useTranslation();

  const validate = (d) => {
    const errs = {};
    if (!d.name?.trim()) errs.name = t('settings.valRequired');
    else if (tax.attachmentSlots.some(s => s.id !== slotId && s.name.trim().toLowerCase() === d.name.trim().toLowerCase()))
      errs.name = t('settings.valUnique');
    if (!d.tags?.length) errs.tags = t('settings.valAtLeastOneTag');
    return errs;
  };

  const { source, isNew, draft, errors, update, isDirty, handleSave, remove } = useTaxonomyEdit({
    id: slotId, collection: 'attachmentSlots', tax, setTax, onBack, validate, blank: initialData,
  });

  if (!draft) return null;

  return (
    <TaxEditPage trail={trail} onBack={onBack} onClose={onClose} onNavigate={onNavigate}
      onDelete={() => remove(`${t('settings.deleteSlot')} "${source?.name}"?`)}
      onSave={handleSave} isDirty={isDirty}>
      <Section title="Identity" icon="link">
        <Row label={t('settings.slotName')} hint={t('settings.slotNameDesc')}>
          <Input
            value={draft.name}
            onChange={e => update({ name: e.target.value })}
            autoFocus
            className={cn(errors.name ? 'border-destructive' : '')}
          />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
        </Row>
        <Row label={t('settings.tags')} hint={t('settings.slotTagsDesc')} stack>
          <TagsField value={draft.tags} onChange={tags => update({ tags })}/>
          {errors.tags && <p className="mt-1 text-xs text-destructive">{errors.tags}</p>}
        </Row>
      </Section>
    </TaxEditPage>
  );
}

/* ============================================================
   Crafting Stations
   ============================================================ */
function CraftingStationsPage({ trail, onBack, onClose, onNavigate, tax, push }) {
  const { t } = useTranslation();
  const addStation = () => {
    const id = newId('cs');
    push({ type: 'craftingStation', id, defaults: { id, name: 'New Station', icon: 'cog', tag: 'Station.New' } });
  };
  return (
    <TaxListPage
      trail={trail} onBack={onBack} onClose={onClose} onNavigate={onNavigate}
      placeholder={t('settings.searchStations')}
      heading={`${tax.craftingStations.length} ${t('settings.craftingStations').toLowerCase()}`}
      onAdd={addStation} addLabel={t('settings.newStation')}
    >
      {tax.craftingStations.map(s => (
        <CommandItem
          key={s.id}
          value={`${s.name} ${s.tag}`}
          icon={s.icon || 'hammer'}
          shortcut={s.tag}
          onSelect={() => push({ type: 'craftingStation', id: s.id })}
        >{s.name}</CommandItem>
      ))}
    </TaxListPage>
  );
}

function CraftingStationEditPage({ trail, onBack, onClose, stationId, onNavigate, tax, setTax, initialData = null }) {
  const { t } = useTranslation();

  const validate = (d) => {
    const errs = {};
    if (!d.name?.trim()) errs.name = t('settings.valRequired');
    else if (tax.craftingStations.some(s => s.id !== stationId && s.name.trim().toLowerCase() === d.name.trim().toLowerCase()))
      errs.name = t('settings.valUnique');
    if (!d.tag?.trim()) errs.tag = t('settings.valRequired');
    return errs;
  };

  const { source, isNew, draft, errors, update, isDirty, handleSave, remove } = useTaxonomyEdit({
    id: stationId, collection: 'craftingStations', tax, setTax, onBack, validate, blank: initialData,
  });

  if (!draft) return null;

  return (
    <TaxEditPage trail={trail} onBack={onBack} onClose={onClose} onNavigate={onNavigate}
      onDelete={() => remove(`${t('settings.deleteStation')} "${source?.name}"?`)}
      onSave={handleSave} isDirty={isDirty}>
      <Section title="Identity" icon="hammer">
        <Row label={t('settings.stationName')} hint={t('settings.stationNameDesc')}>
          <Input
            value={draft.name}
            onChange={e => update({ name: e.target.value })}
            autoFocus
            className={cn(errors.name ? 'border-destructive' : '')}
          />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
        </Row>
        <Row label={t('settings.icon')} hint={t('settings.iconDesc')}>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card/40 text-muted-foreground">
              <Icon name={draft.icon || 'hammer'} size={16}/>
            </div>
            <Input value={draft.icon || ''} onChange={e => update({ icon: e.target.value })} className="flex-1 font-mono text-xs" placeholder="hammer"/>
          </div>
        </Row>
        <Row label={t('settings.tags')} hint={t('settings.stationTagDesc')}>
          <Input
            value={draft.tag}
            onChange={e => update({ tag: e.target.value })}
            className={cn('font-mono text-xs', errors.tag ? 'border-destructive' : '')}
          />
          {errors.tag && <p className="mt-1 text-xs text-destructive">{errors.tag}</p>}
        </Row>
      </Section>
    </TaxEditPage>
  );
}

/* ============================================================
   Special Affects
   ============================================================ */
function SpecialAffectsPage({ trail, onBack, onClose, onNavigate, tax, push }) {
  const { t } = useTranslation();
  const affects = tax.specialAffects ?? [];
  const addAffect = () => {
    const id = newId('sa');
    push({ type: 'specialAffect', id, defaults: { id, name: 'New Affect', tag: 'Effect.New' } });
  };
  return (
    <TaxListPage
      trail={trail} onBack={onBack} onClose={onClose} onNavigate={onNavigate}
      placeholder={t('settings.searchSpecialAffects')}
      heading={`${affects.length} ${t('settings.specialAffects').toLowerCase()}`}
      onAdd={addAffect} addLabel={t('settings.newSpecialAffect')}
    >
      {affects.map(a => (
        <CommandItem
          key={a.id}
          value={`${a.name} ${a.tag}`}
          icon="sparkle"
          shortcut={a.tag}
          onSelect={() => push({ type: 'specialAffect', id: a.id })}
        >{a.name}</CommandItem>
      ))}
    </TaxListPage>
  );
}

function SpecialAffectEditPage({ trail, onBack, onClose, affectId, onNavigate, tax, setTax, initialData = null }) {
  const { t } = useTranslation();

  const validate = (d) => {
    const errs = {};
    if (!d.name?.trim()) errs.name = t('settings.valRequired');
    else if ((tax.specialAffects ?? []).some(a => a.id !== affectId && a.name.trim().toLowerCase() === d.name.trim().toLowerCase()))
      errs.name = t('settings.valUnique');
    if (!d.tag?.trim()) errs.tag = t('settings.valRequired');
    return errs;
  };

  const { source, isNew, draft, errors, update, isDirty, handleSave, remove } = useTaxonomyEdit({
    id: affectId, collection: 'specialAffects', tax, setTax, onBack, validate, blank: initialData,
  });

  if (!draft) return null;

  return (
    <TaxEditPage trail={trail} onBack={onBack} onClose={onClose} onNavigate={onNavigate}
      onDelete={() => remove(`${t('settings.deleteSpecialAffect')} "${source?.name}"?`)}
      onSave={handleSave} isDirty={isDirty}>
      <Section title="Identity" icon="sparkle">
        <Row label={t('settings.affectName')} hint={t('settings.affectNameDesc')}>
          <Input
            value={draft.name}
            onChange={e => update({ name: e.target.value })}
            autoFocus
            className={cn(errors.name ? 'border-destructive' : '')}
          />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
        </Row>
        <Row label={t('settings.affectTag')} hint={t('settings.affectTagDesc')}>
          <Input
            value={draft.tag}
            onChange={e => update({ tag: e.target.value })}
            className={cn('font-mono text-xs', errors.tag ? 'border-destructive' : '')}
          />
          {errors.tag && <p className="mt-1 text-xs text-destructive">{errors.tag}</p>}
        </Row>
      </Section>
    </TaxEditPage>
  );
}
