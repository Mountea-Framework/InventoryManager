import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from './i18n.js';
import { cn, Icon, Button, Input, Label, Select, Tag } from './ui.jsx';
import {
  Dialog, DialogContent, Command, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator,
} from './command.jsx';
import { useTaxonomy, TAX_KEY } from './hooks.jsx';
import { exportAllData, bulkImport } from './store.js';

/* ============================================================
   Type definitions
   ============================================================ */
/**
 * @typedef {{ id: string, title: string, icon?: string, tags: string[], subcategories: Subcategory[] }} Category
 * @typedef {{ id: string, title: string, tags: string[] }} Subcategory
 * @typedef {{ id: string, title: string, tags: string[], color: string }} Rarity
 * @typedef {{ id: string, key: string, icon: string, tip: string }} ItemAction
 * @typedef {{ id: string, name: string, tags: string[] }} AttachmentSlot
 * @typedef {{ id: string, name: string, icon?: string, tag: string }} CraftingStation
 * @typedef {{ categories: Category[], rarities: Rarity[], itemActions: ItemAction[], attachmentSlots: AttachmentSlot[], craftingStations: CraftingStation[] }} Taxonomy
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
 * @param {{ trail: string[], onBack: () => void, onClose: () => void, right?: React.ReactNode }} props
 */
function PageHeader({ trail, onBack, onClose, right }) {
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
        {trail.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Icon name="chevRight" size={12} className="text-muted-foreground/60"/>}
            <span className={i === trail.length - 1 ? 'text-foreground' : 'text-muted-foreground'}>{item}</span>
          </React.Fragment>
        ))}
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

/** @param {{ label: string, hint?: string, children: React.ReactNode }} props */
const FRow = ({ label, hint, children }) => (
  <div className="space-y-1.5">
    <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

/* ============================================================
   TaxListPage / TaxEditPage shells
   ============================================================ */
/**
 * @param {{ trail: string[], onBack: () => void, onClose: () => void, placeholder: string, heading: string, onAdd: () => void, addLabel: string, children: React.ReactNode }} props
 */
function TaxListPage({ trail, onBack, onClose, placeholder, heading, onAdd, addLabel, children }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col">
      <PageHeader trail={trail} onBack={onBack} onClose={onClose}/>
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
 * @param {{ trail: string[], onBack: () => void, onClose: () => void, onDelete: () => void, footerHint?: React.ReactNode, children: React.ReactNode }} props
 */
function TaxEditPage({ trail, onBack, onClose, onDelete, footerHint, children }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        trail={trail} onBack={onBack} onClose={onClose}
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
      <Footer hint={footerHint ?? t('settings.savedAuto')}/>
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
    }
    return parts;
  }, [stack, tax, t]);

  const shared = { trail, onBack: pop, onClose: close, tax, setTax, push };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[620px] w-[92vw] max-w-[900px] flex-col overflow-hidden p-0 [&>button]:hidden">
        {page.type === 'root'              && <RootPage push={push} close={close}/>}
        {page.type === 'categories'        && <CategoriesPage      {...shared}/>}
        {page.type === 'category'          && <CategoryEditPage    {...shared} categoryId={page.id}/>}
        {page.type === 'subcategory'       && <SubcategoryEditPage {...shared} categoryId={page.catId} subcategoryId={page.id}/>}
        {page.type === 'rarities'          && <RaritiesPage        {...shared}/>}
        {page.type === 'rarity'            && <RarityEditPage      {...shared} rarityId={page.id}/>}
        {page.type === 'itemActions'       && <ItemActionsPage     {...shared}/>}
        {page.type === 'itemAction'        && <ItemActionEditPage  {...shared} actionId={page.id}/>}
        {page.type === 'attachmentSlots'   && <AttachmentSlotsPage    {...shared}/>}
        {page.type === 'attachmentSlot'    && <AttachmentSlotEditPage {...shared} slotId={page.id}/>}
        {page.type === 'craftingStations'  && <CraftingStationsPage   {...shared}/>}
        {page.type === 'craftingStation'   && <CraftingStationEditPage {...shared} stationId={page.id}/>}
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
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify({
        ...data,
        taxonomy: JSON.parse(localStorage.getItem(TAX_KEY) || 'null'),
      }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'mountea-workspace.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { console.error(e); }
    close();
  };

  const importAll = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/json';
    input.onchange = async () => {
      const f = input.files?.[0]; if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (data.taxonomy) localStorage.setItem(TAX_KEY, JSON.stringify(data.taxonomy));
        await bulkImport({
          items:    data.items    ?? [],
          loadouts: data.loadouts ?? [],
          recipes:  data.recipes  ?? [],
        });
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
                  setTweak('language', v);
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
function CategoriesPage({ trail, onBack, onClose, tax, setTax, push }) {
  const { t } = useTranslation();
  const addCategory = () => {
    const id = newId('cat');
    setTax({ ...tax, categories: [...tax.categories, { id, title: 'New Category', tags: [], subcategories: [] }] });
    push({ type: 'category', id });
  };
  return (
    <TaxListPage
      trail={trail} onBack={onBack} onClose={onClose}
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

function CategoryEditPage({ trail, onBack, onClose, categoryId, tax, setTax, push }) {
  const { t } = useTranslation();
  const cat = tax.categories.find(c => c.id === categoryId);
  if (!cat) return null;

  const update = (patch) =>
    setTax({ ...tax, categories: tax.categories.map(c => c.id === categoryId ? { ...c, ...patch } : c) });

  const remove = () => {
    if (!confirm(`${t('settings.deleteCategory')} "${cat.title}"?`)) return;
    setTax({ ...tax, categories: tax.categories.filter(c => c.id !== categoryId) });
    onBack();
  };

  const addSub = () => {
    const id = newId('sub');
    update({ subcategories: [...cat.subcategories, { id, title: 'New Subcategory', tags: [] }] });
    push({ type: 'subcategory', catId: categoryId, id });
  };

  return (
    <TaxEditPage
      trail={trail} onBack={onBack} onClose={onClose} onDelete={remove}
      footerHint={<><kbd className="rounded border border-border bg-background px-1">esc</kbd> {t('settings.back').toLowerCase()} <span className="mx-1">·</span> {t('settings.savedAuto')}</>}
    >
      <FRow label={t('settings.title')}>
        <Input value={cat.title} onChange={e => update({ title: e.target.value })} autoFocus/>
      </FRow>
      <FRow label={t('settings.icon')} hint={t('settings.iconDesc')}>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card/40 text-muted-foreground">
            <Icon name={cat.icon || 'folder'} size={16}/>
          </div>
          <Input value={cat.icon || ''} onChange={e => update({ icon: e.target.value })} className="flex-1 font-mono text-xs" placeholder="folder"/>
        </div>
      </FRow>
      <FRow label={t('settings.tags')} hint={t('settings.tagsDesc')}>
        <TagsField value={cat.tags} onChange={tags => update({ tags })}/>
      </FRow>
      <FRow label={t('settings.subcategories')} hint={`${cat.subcategories.length} ${t('settings.subcategoriesDefined')}`}>
        <div className="rounded-md border border-border bg-card/40">
          {cat.subcategories.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">{t('settings.noSubcategories')}</div>
          )}
          {cat.subcategories.map((s, i) => (
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
          <Button variant="outline" size="sm" onClick={addSub}>
            <Icon name="plus" size={13}/> {t('settings.addSubcategory')}
          </Button>
        </div>
      </FRow>
    </TaxEditPage>
  );
}

function SubcategoryEditPage({ trail, onBack, onClose, categoryId, subcategoryId, tax, setTax }) {
  const { t } = useTranslation();
  const cat = tax.categories.find(c => c.id === categoryId);
  const sub = cat?.subcategories.find(s => s.id === subcategoryId);
  if (!cat || !sub) return null;

  const update = (patch) =>
    setTax({
      ...tax,
      categories: tax.categories.map(c =>
        c.id !== categoryId ? c : {
          ...c,
          subcategories: c.subcategories.map(s => s.id === subcategoryId ? { ...s, ...patch } : s),
        }),
    });

  const remove = () => {
    if (!confirm(`${t('settings.deleteSubcategory')} "${sub.title}"?`)) return;
    setTax({
      ...tax,
      categories: tax.categories.map(c =>
        c.id !== categoryId ? c : { ...c, subcategories: c.subcategories.filter(s => s.id !== subcategoryId) }),
    });
    onBack();
  };

  return (
    <TaxEditPage
      trail={trail} onBack={onBack} onClose={onClose} onDelete={remove}
      footerHint={<>{t('settings.inheritedFrom').toLowerCase().replace('inherits from', 'parent')}: <span className="text-foreground/80">{cat.title}</span> <span className="mx-1">·</span> {t('settings.savedAuto')}</>}
    >
      <FRow label={t('settings.title')}>
        <Input value={sub.title} onChange={e => update({ title: e.target.value })} autoFocus/>
      </FRow>
      <FRow label={t('settings.tags')} hint={`${t('settings.inheritedFrom')} ${cat.title} → ${cat.tags.join(', ') || '—'}`}>
        <TagsField value={sub.tags} onChange={tags => update({ tags })}/>
      </FRow>
    </TaxEditPage>
  );
}

/* ============================================================
   Rarities
   ============================================================ */
function RaritiesPage({ trail, onBack, onClose, tax, setTax, push }) {
  const { t } = useTranslation();
  const addRarity = () => {
    const id = newId('rar');
    setTax({ ...tax, rarities: [...tax.rarities, { id, title: 'New Rarity', tags: [], color: '#9ca3af' }] });
    push({ type: 'rarity', id });
  };
  return (
    <TaxListPage
      trail={trail} onBack={onBack} onClose={onClose}
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

function RarityEditPage({ trail, onBack, onClose, rarityId, tax, setTax }) {
  const { t } = useTranslation();
  const r = tax.rarities.find(r => r.id === rarityId);
  if (!r) return null;

  const update = (patch) =>
    setTax({ ...tax, rarities: tax.rarities.map(x => x.id === rarityId ? { ...x, ...patch } : x) });

  const remove = () => {
    if (!confirm(`${t('settings.deleteRarity')} "${r.title}"?`)) return;
    setTax({ ...tax, rarities: tax.rarities.filter(x => x.id !== rarityId) });
    onBack();
  };

  return (
    <TaxEditPage trail={trail} onBack={onBack} onClose={onClose} onDelete={remove}>
      <FRow label={t('settings.title')}>
        <Input value={r.title} onChange={e => update({ title: e.target.value })} autoFocus/>
      </FRow>
      <FRow label={t('settings.tags')}>
        <TagsField value={r.tags} onChange={tags => update({ tags })}/>
      </FRow>
      <FRow label={t('settings.colour')} hint={t('settings.colourDesc')}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-md border border-border" style={{ background: r.color }}/>
          <input type="color" value={r.color} onChange={e => update({ color: e.target.value })}
            className="h-10 w-14 cursor-pointer rounded-md border border-input bg-transparent"/>
          <input value={r.color} onChange={e => update({ color: e.target.value })}
            className="h-10 flex-1 rounded-md border border-input bg-transparent px-3 font-mono text-xs uppercase outline-none focus:ring-1 focus:ring-ring text-foreground"/>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {RARITY_SWATCHES.map(c => (
            <button key={c} onClick={() => update({ color: c })} title={c}
              className={cn(
                'h-6 w-6 rounded-md border transition-transform hover:scale-110',
                r.color.toLowerCase() === c.toLowerCase()
                  ? 'border-foreground ring-2 ring-ring ring-offset-2 ring-offset-popover'
                  : 'border-border',
              )}
              style={{ background: c }}/>
          ))}
        </div>
      </FRow>
      <div className="rounded-md border border-border bg-card/40 p-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('settings.preview')}</div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold"
            style={{ borderColor: r.color, color: r.color, background: `${r.color}1a` }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.color }}/>
            {r.title || 'Rarity'}
          </span>
          <span className="font-mono text-[10.5px] text-muted-foreground">{r.tags[0] || 'no.tag'}</span>
        </div>
      </div>
    </TaxEditPage>
  );
}

/* ============================================================
   Item Actions
   ============================================================ */
function ItemActionsPage({ trail, onBack, onClose, tax, setTax, push }) {
  const { t } = useTranslation();
  const addAction = () => {
    const id = newId('ia');
    setTax({ ...tax, itemActions: [...tax.itemActions, { id, key: 'NewAction', icon: 'tag', tip: '' }] });
    push({ type: 'itemAction', id });
  };
  return (
    <TaxListPage
      trail={trail} onBack={onBack} onClose={onClose}
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

function ItemActionEditPage({ trail, onBack, onClose, actionId, tax, setTax }) {
  const { t } = useTranslation();
  const action = tax.itemActions.find(a => a.id === actionId);
  if (!action) return null;

  const update = (patch) =>
    setTax({ ...tax, itemActions: tax.itemActions.map(a => a.id === actionId ? { ...a, ...patch } : a) });

  const remove = () => {
    if (!confirm(`${t('settings.deleteAction')} "${action.key}"?`)) return;
    setTax({ ...tax, itemActions: tax.itemActions.filter(a => a.id !== actionId) });
    onBack();
  };

  return (
    <TaxEditPage trail={trail} onBack={onBack} onClose={onClose} onDelete={remove}>
      <FRow label={t('settings.actionKey')} hint={t('settings.actionKeyDesc')}>
        <Input value={action.key} onChange={e => update({ key: e.target.value })} autoFocus/>
      </FRow>
      <FRow label={t('settings.icon')} hint={t('settings.iconDesc')}>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card/40 text-muted-foreground">
            <Icon name={action.icon} size={16}/>
          </div>
          <Input value={action.icon} onChange={e => update({ icon: e.target.value })} className="flex-1 font-mono text-xs"/>
        </div>
      </FRow>
      <FRow label={t('settings.tooltip')} hint={t('settings.tooltipDesc')}>
        <Input value={action.tip} onChange={e => update({ tip: e.target.value })}/>
      </FRow>
    </TaxEditPage>
  );
}

/* ============================================================
   Attachment Slots
   ============================================================ */
function AttachmentSlotsPage({ trail, onBack, onClose, tax, setTax, push }) {
  const { t } = useTranslation();
  const addSlot = () => {
    const id = newId('as');
    setTax({ ...tax, attachmentSlots: [...tax.attachmentSlots, { id, name: 'New Slot', tags: [] }] });
    push({ type: 'attachmentSlot', id });
  };
  return (
    <TaxListPage
      trail={trail} onBack={onBack} onClose={onClose}
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

function AttachmentSlotEditPage({ trail, onBack, onClose, slotId, tax, setTax }) {
  const { t } = useTranslation();
  const slot = tax.attachmentSlots.find(s => s.id === slotId);
  if (!slot) return null;

  const update = (patch) =>
    setTax({ ...tax, attachmentSlots: tax.attachmentSlots.map(s => s.id === slotId ? { ...s, ...patch } : s) });

  const remove = () => {
    if (!confirm(`${t('settings.deleteSlot')} "${slot.name}"?`)) return;
    setTax({ ...tax, attachmentSlots: tax.attachmentSlots.filter(s => s.id !== slotId) });
    onBack();
  };

  return (
    <TaxEditPage trail={trail} onBack={onBack} onClose={onClose} onDelete={remove}>
      <FRow label={t('settings.slotName')} hint={t('settings.slotNameDesc')}>
        <Input value={slot.name} onChange={e => update({ name: e.target.value })} autoFocus/>
      </FRow>
      <FRow label={t('settings.tags')} hint={t('settings.slotTagsDesc')}>
        <TagsField value={slot.tags} onChange={tags => update({ tags })}/>
      </FRow>
    </TaxEditPage>
  );
}

/* ============================================================
   Crafting Stations
   ============================================================ */
function CraftingStationsPage({ trail, onBack, onClose, tax, setTax, push }) {
  const { t } = useTranslation();
  const addStation = () => {
    const id = newId('cs');
    setTax({ ...tax, craftingStations: [...tax.craftingStations, { id, name: 'New Station', icon: 'cog', tag: 'Station.New' }] });
    push({ type: 'craftingStation', id });
  };
  return (
    <TaxListPage
      trail={trail} onBack={onBack} onClose={onClose}
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

function CraftingStationEditPage({ trail, onBack, onClose, stationId, tax, setTax }) {
  const { t } = useTranslation();
  const station = tax.craftingStations.find(s => s.id === stationId);
  if (!station) return null;

  const update = (patch) =>
    setTax({ ...tax, craftingStations: tax.craftingStations.map(s => s.id === stationId ? { ...s, ...patch } : s) });

  const remove = () => {
    if (!confirm(`${t('settings.deleteStation')} "${station.name}"?`)) return;
    setTax({ ...tax, craftingStations: tax.craftingStations.filter(s => s.id !== stationId) });
    onBack();
  };

  return (
    <TaxEditPage trail={trail} onBack={onBack} onClose={onClose} onDelete={remove}>
      <FRow label={t('settings.stationName')} hint={t('settings.stationNameDesc')}>
        <Input value={station.name} onChange={e => update({ name: e.target.value })} autoFocus/>
      </FRow>
      <FRow label={t('settings.icon')} hint={t('settings.iconDesc')}>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card/40 text-muted-foreground">
            <Icon name={station.icon || 'hammer'} size={16}/>
          </div>
          <Input value={station.icon || ''} onChange={e => update({ icon: e.target.value })} className="flex-1 font-mono text-xs" placeholder="hammer"/>
        </div>
      </FRow>
      <FRow label={t('settings.tags')} hint={t('settings.stationTagDesc')}>
        <Input value={station.tag} onChange={e => update({ tag: e.target.value })} className="font-mono text-xs"/>
      </FRow>
    </TaxEditPage>
  );
}
