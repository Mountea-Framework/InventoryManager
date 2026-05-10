import React, { useState, useEffect, useMemo } from 'react';
import { cn, Icon, Button, Input, Label, Select, Tag } from './ui.jsx';
import {
  Dialog, DialogContent, Command, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator,
} from './command.jsx';
import { useTaxonomy, TAX_KEY } from './hooks.jsx';
import { DATA } from './data.js';

/* ============================================================
   Type definitions
   ============================================================ */
/**
 * @typedef {{ id: string, title: string, tags: string[], subcategories: Subcategory[] }} Category
 * @typedef {{ id: string, title: string, tags: string[] }} Subcategory
 * @typedef {{ id: string, title: string, tags: string[], color: string }} Rarity
 * @typedef {{ id: string, key: string, icon: string, tip: string }} ItemAction
 * @typedef {{ id: string, name: string, tags: string[] }} AttachmentSlot
 * @typedef {{ id: string, name: string, tag: string }} CraftingStation
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
const PageHeader = ({ trail, onBack, onClose, right }) => (
  <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
    <button
      onClick={onBack}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
      title="Back"
    >
      <Icon name="chevLeft" size={14}/>
    </button>
    <div className="flex flex-1 items-center gap-1.5 text-sm font-medium">
      {trail.map((t, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Icon name="chevRight" size={12} className="text-muted-foreground/60"/>}
          <span className={i === trail.length - 1 ? 'text-foreground' : 'text-muted-foreground'}>{t}</span>
        </React.Fragment>
      ))}
    </div>
    {right}
    <button
      onClick={onClose}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
      title="Close"
    >
      <Icon name="x" size={14}/>
    </button>
  </div>
);

/** @param {{ hint?: React.ReactNode }} props */
const Footer = ({ hint }) => (
  <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
    <span className="inline-flex items-center gap-1.5 font-mono">
      {hint || (
        <>
          <kbd className="rounded border border-border bg-background px-1">↑</kbd>
          <kbd className="rounded border border-border bg-background px-1">↓</kbd>
          to navigate
          <span className="mx-1">·</span>
          <kbd className="rounded border border-border bg-background px-1">⏎</kbd> to select
          <span className="mx-1">·</span>
          <kbd className="rounded border border-border bg-background px-1">esc</kbd> to close
        </>
      )}
    </span>
  </div>
);

/**
 * @param {{ value: string[], onChange: (v: string[]) => void, placeholder?: string }} props
 */
const TagsField = ({ value = [], onChange, placeholder = 'Add tag and press Enter…' }) => {
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
        placeholder={value.length ? '' : placeholder}
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
const TaxListPage = ({ trail, onBack, onClose, placeholder, heading, onAdd, addLabel, children }) => (
  <div className="flex h-full flex-col">
    <PageHeader trail={trail} onBack={onBack} onClose={onClose}/>
    <Command className="flex-1 h-auto min-h-0">
      <CommandInput placeholder={placeholder}/>
      <CommandList className="flex-1 max-h-none">
        <CommandEmpty>No results match.</CommandEmpty>
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

/**
 * @param {{ trail: string[], onBack: () => void, onClose: () => void, onDelete: () => void, footerHint?: React.ReactNode, children: React.ReactNode }} props
 */
const TaxEditPage = ({ trail, onBack, onClose, onDelete, footerHint, children }) => (
  <div className="flex h-full flex-col">
    <PageHeader
      trail={trail} onBack={onBack} onClose={onClose}
      right={onDelete && (
        <Button variant="ghost" size="sm" onClick={onDelete}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Icon name="trash" size={13}/> Delete
        </Button>
      )}
    />
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {children}
    </div>
    <Footer hint={footerHint ?? 'changes saved automatically'}/>
  </div>
);

/* ============================================================
   SettingsCommand — page router
   ============================================================ */
/**
 * @param {{ open: boolean, onOpenChange: (v: boolean) => void, screen: string, setScreen: (s: string) => void, tweaks: object, setTweak: (k: string, v: any) => void }} props
 */
export function SettingsCommand({ open, onOpenChange, screen, setScreen, tweaks, setTweak }) {
  const [stack, setStack] = useState([{ type: 'root' }]);
  const page  = stack[stack.length - 1];
  const push  = (p) => setStack(s => [...s, p]);
  const pop   = () => setStack(s => s.length > 1 ? s.slice(0, -1) : s);
  const close = () => onOpenChange(false);

  const [tax, setTax] = useTaxonomy();

  useEffect(() => { if (open) setStack([{ type: 'root' }]); }, [open]);

  const trail = useMemo(() => {
    const parts = ['Settings'];
    for (let i = 1; i < stack.length; i++) {
      const p = stack[i];
      if (p.type === 'categories')        parts.push('Categories');
      else if (p.type === 'category')     parts.push(tax.categories.find(c => c.id === p.id)?.title || 'Category');
      else if (p.type === 'subcategory')  parts.push(tax.categories.find(c => c.id === p.catId)?.subcategories.find(s => s.id === p.id)?.title || 'Subcategory');
      else if (p.type === 'rarities')     parts.push('Rarities');
      else if (p.type === 'rarity')       parts.push(tax.rarities.find(r => r.id === p.id)?.title || 'Rarity');
      else if (p.type === 'itemActions')      parts.push('Item Actions');
      else if (p.type === 'itemAction')       parts.push(tax.itemActions.find(a => a.id === p.id)?.key || 'Action');
      else if (p.type === 'attachmentSlots')  parts.push('Attachment Slots');
      else if (p.type === 'attachmentSlot')   parts.push(tax.attachmentSlots.find(s => s.id === p.id)?.name || 'Slot');
      else if (p.type === 'craftingStations') parts.push('Crafting Stations');
      else if (p.type === 'craftingStation')  parts.push(tax.craftingStations.find(s => s.id === p.id)?.name || 'Station');
    }
    return parts;
  }, [stack, tax]);

  const shared = { trail, onBack: pop, onClose: close, tax, setTax, push };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[620px] w-[92vw] max-w-[900px] flex-col overflow-hidden p-0 [&>button]:hidden">
        {page.type === 'root'              && <RootPage tweaks={tweaks} setTweak={setTweak} screen={screen} setScreen={setScreen} push={push} close={close}/>}
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
function RootPage({ tweaks, setTweak, screen, setScreen, push, close }) {
  const isDark = document.documentElement.classList.contains('dark');

  const setTheme = (mode) => {
    if (mode === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    try { localStorage.setItem('arch.theme', mode); } catch {}
  };

  const exportAll = () => {
    try {
      const blob = new Blob([JSON.stringify({
        items: DATA.allItems,
        loadouts: DATA.loadouts,
        recipes: DATA.recipes,
        taxonomy: JSON.parse(localStorage.getItem(TAX_KEY) || 'null'),
        tweaks,
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
        if (data.tweaks)   localStorage.setItem('arch.tweaks', JSON.stringify(data.tweaks));
        location.reload();
      } catch (e) { alert('Import failed: ' + e.message); }
    };
    input.click();
  };

  return (
    <Command>
      <CommandInput placeholder="Search settings…"/>
      <CommandList className="flex-1 max-h-none">
        <CommandEmpty>No settings match.</CommandEmpty>

        <CommandGroup heading="Visuals">
          <CommandItem
            value="dark mode theme appearance"
            icon="eye"
            shortcut={isDark ? 'On' : 'Off'}
            onSelect={() => setTheme(isDark ? 'light' : 'dark')}
          >Dark Mode</CommandItem>

          <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <Icon name="flag" size={16} className="shrink-0 text-muted-foreground"/>
            <span className="flex-1 text-sm text-foreground/90">Language</span>
            <div className="w-36">
              <Select
                value={tweaks.language ?? 'English'}
                onChange={v => setTweak('language', v)}
                options={LANGUAGES.map(l => ({ value: l, label: l }))}
              />
            </div>
          </div>
        </CommandGroup>

        <CommandSeparator/>

        <CommandGroup heading="Data">
          <CommandItem value="export all workspace json" icon="export" onSelect={exportAll}>Export all…</CommandItem>
          <CommandItem value="import workspace json"     icon="open"   onSelect={importAll}>Import…</CommandItem>
        </CommandGroup>

        <CommandSeparator/>

        <CommandGroup heading="Config">
          <CommandItem value="categories taxonomy subcategories" icon="folder"  shortcut="→" onSelect={() => push({ type: 'categories' })}>Categories</CommandItem>
          <CommandItem value="rarities tiers colours"            icon="sparkle" shortcut="→" onSelect={() => push({ type: 'rarities' })}>Rarities</CommandItem>
          <CommandItem value="item actions verbs player"         icon="cog"     shortcut="→" onSelect={() => push({ type: 'itemActions' })}>Item Actions</CommandItem>
          <CommandItem value="attachment slots equipment"        icon="link"    shortcut="→" onSelect={() => push({ type: 'attachmentSlots' })}>Attachment Slots</CommandItem>
          <CommandItem value="crafting stations workbench forge" icon="hammer"  shortcut="→" onSelect={() => push({ type: 'craftingStations' })}>Crafting Stations</CommandItem>
        </CommandGroup>

        <CommandSeparator/>

        <CommandGroup heading="Link">
          <CommandItem value="help documentation guide"  icon="info"    shortcut="↗" onSelect={() => window.open('https://mountea.tools/docs', '_blank')}>Help</CommandItem>
          <CommandItem value="support us donate sponsor" icon="sparkle" shortcut="↗" onSelect={() => window.open('https://mountea.tools/support', '_blank')}>Support Us</CommandItem>
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
  const addCategory = () => {
    const id = newId('cat');
    setTax({ ...tax, categories: [...tax.categories, { id, title: 'New Category', tags: [], subcategories: [] }] });
    push({ type: 'category', id });
  };
  return (
    <TaxListPage
      trail={trail} onBack={onBack} onClose={onClose}
      placeholder="Search categories…"
      heading={`${tax.categories.length} categories`}
      onAdd={addCategory} addLabel="New category…"
    >
      {tax.categories.map(c => (
        <CommandItem
          key={c.id}
          value={`${c.title} ${c.tags.join(' ')} ${c.subcategories.map(s => s.title).join(' ')}`}
          icon="folder"
          shortcut={`${c.subcategories.length} sub`}
          onSelect={() => push({ type: 'category', id: c.id })}
        >{c.title}</CommandItem>
      ))}
    </TaxListPage>
  );
}

function CategoryEditPage({ trail, onBack, onClose, categoryId, tax, setTax, push }) {
  const cat = tax.categories.find(c => c.id === categoryId);
  if (!cat) return null;

  const update = (patch) =>
    setTax({ ...tax, categories: tax.categories.map(c => c.id === categoryId ? { ...c, ...patch } : c) });

  const remove = () => {
    if (!confirm(`Delete category "${cat.title}"?`)) return;
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
      footerHint={<><kbd className="rounded border border-border bg-background px-1">esc</kbd> back <span className="mx-1">·</span> changes saved automatically</>}
    >
      <FRow label="Title">
        <Input value={cat.title} onChange={e => update({ title: e.target.value })} autoFocus/>
      </FRow>
      <FRow label="Tags" hint="Gameplay / data tags applied to every item in this category.">
        <TagsField value={cat.tags} onChange={tags => update({ tags })}/>
      </FRow>
      <FRow label="Subcategories" hint={`${cat.subcategories.length} defined · click to edit`}>
        <div className="rounded-md border border-border bg-card/40">
          {cat.subcategories.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">No subcategories yet.</div>
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
              <span className="font-mono text-[10.5px] text-muted-foreground">{s.tags.length} tag{s.tags.length === 1 ? '' : 's'}</span>
              <Icon name="chevRight" size={12} className="text-muted-foreground"/>
            </button>
          ))}
        </div>
        <div className="mt-2">
          <Button variant="outline" size="sm" onClick={addSub}>
            <Icon name="plus" size={13}/> Add subcategory
          </Button>
        </div>
      </FRow>
    </TaxEditPage>
  );
}

function SubcategoryEditPage({ trail, onBack, onClose, categoryId, subcategoryId, tax, setTax }) {
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
    if (!confirm(`Delete subcategory "${sub.title}"?`)) return;
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
      footerHint={<>parent: <span className="text-foreground/80">{cat.title}</span> <span className="mx-1">·</span> changes saved automatically</>}
    >
      <FRow label="Title">
        <Input value={sub.title} onChange={e => update({ title: e.target.value })} autoFocus/>
      </FRow>
      <FRow label="Tags" hint={`Inherits from ${cat.title} → ${cat.tags.join(', ') || 'no parent tags'}`}>
        <TagsField value={sub.tags} onChange={tags => update({ tags })}/>
      </FRow>
    </TaxEditPage>
  );
}

/* ============================================================
   Rarities
   ============================================================ */
function RaritiesPage({ trail, onBack, onClose, tax, setTax, push }) {
  const addRarity = () => {
    const id = newId('rar');
    setTax({ ...tax, rarities: [...tax.rarities, { id, title: 'New Rarity', tags: [], color: '#9ca3af' }] });
    push({ type: 'rarity', id });
  };
  return (
    <TaxListPage
      trail={trail} onBack={onBack} onClose={onClose}
      placeholder="Search rarities…"
      heading={`${tax.rarities.length} rarities`}
      onAdd={addRarity} addLabel="New rarity…"
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
  const r = tax.rarities.find(r => r.id === rarityId);
  if (!r) return null;

  const update = (patch) =>
    setTax({ ...tax, rarities: tax.rarities.map(x => x.id === rarityId ? { ...x, ...patch } : x) });

  const remove = () => {
    if (!confirm(`Delete rarity "${r.title}"?`)) return;
    setTax({ ...tax, rarities: tax.rarities.filter(x => x.id !== rarityId) });
    onBack();
  };

  return (
    <TaxEditPage trail={trail} onBack={onBack} onClose={onClose} onDelete={remove}>
      <FRow label="Title">
        <Input value={r.title} onChange={e => update({ title: e.target.value })} autoFocus/>
      </FRow>
      <FRow label="Tags">
        <TagsField value={r.tags} onChange={tags => update({ tags })}/>
      </FRow>
      <FRow label="Colour" hint="Used for badges, borders, and rarity-themed UI accents.">
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
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Preview</div>
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
  const addAction = () => {
    const id = newId('ia');
    setTax({ ...tax, itemActions: [...tax.itemActions, { id, key: 'NewAction', icon: 'tag', tip: '' }] });
    push({ type: 'itemAction', id });
  };
  return (
    <TaxListPage
      trail={trail} onBack={onBack} onClose={onClose}
      placeholder="Search actions…"
      heading={`${tax.itemActions.length} actions`}
      onAdd={addAction} addLabel="New action…"
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
  const action = tax.itemActions.find(a => a.id === actionId);
  if (!action) return null;

  const update = (patch) =>
    setTax({ ...tax, itemActions: tax.itemActions.map(a => a.id === actionId ? { ...a, ...patch } : a) });

  const remove = () => {
    if (!confirm(`Delete action "${action.key}"?`)) return;
    setTax({ ...tax, itemActions: tax.itemActions.filter(a => a.id !== actionId) });
    onBack();
  };

  return (
    <TaxEditPage trail={trail} onBack={onBack} onClose={onClose} onDelete={remove}>
      <FRow label="Action Key" hint="Programmatic identifier used in game logic (e.g. Equip, Repair).">
        <Input value={action.key} onChange={e => update({ key: e.target.value })} autoFocus/>
      </FRow>
      <FRow label="Icon" hint="Lucide icon name rendered in the item action chip (e.g. shield, trash, eye).">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card/40 text-muted-foreground">
            <Icon name={action.icon} size={16}/>
          </div>
          <Input value={action.icon} onChange={e => update({ icon: e.target.value })} className="flex-1 font-mono text-xs"/>
        </div>
      </FRow>
      <FRow label="Tooltip" hint="Short description shown on hover in the player-facing UI.">
        <Input value={action.tip} onChange={e => update({ tip: e.target.value })}/>
      </FRow>
    </TaxEditPage>
  );
}

/* ============================================================
   Attachment Slots
   ============================================================ */
function AttachmentSlotsPage({ trail, onBack, onClose, tax, setTax, push }) {
  const addSlot = () => {
    const id = newId('as');
    setTax({ ...tax, attachmentSlots: [...tax.attachmentSlots, { id, name: 'New Slot', tags: [] }] });
    push({ type: 'attachmentSlot', id });
  };
  return (
    <TaxListPage
      trail={trail} onBack={onBack} onClose={onClose}
      placeholder="Search slots…"
      heading={`${tax.attachmentSlots.length} slots`}
      onAdd={addSlot} addLabel="New slot…"
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
  const slot = tax.attachmentSlots.find(s => s.id === slotId);
  if (!slot) return null;

  const update = (patch) =>
    setTax({ ...tax, attachmentSlots: tax.attachmentSlots.map(s => s.id === slotId ? { ...s, ...patch } : s) });

  const remove = () => {
    if (!confirm(`Delete slot "${slot.name}"?`)) return;
    setTax({ ...tax, attachmentSlots: tax.attachmentSlots.filter(s => s.id !== slotId) });
    onBack();
  };

  return (
    <TaxEditPage trail={trail} onBack={onBack} onClose={onClose} onDelete={remove}>
      <FRow label="Slot Name" hint="Display name for this equipment slot (e.g. Primary, Head, Accessory).">
        <Input value={slot.name} onChange={e => update({ name: e.target.value })} autoFocus/>
      </FRow>
      <FRow label="Tags" hint="Gameplay tags that identify this slot (e.g. Slot.Primary, Slot.Head).">
        <TagsField value={slot.tags} onChange={tags => update({ tags })}/>
      </FRow>
    </TaxEditPage>
  );
}

/* ============================================================
   Crafting Stations
   ============================================================ */
function CraftingStationsPage({ trail, onBack, onClose, tax, setTax, push }) {
  const addStation = () => {
    const id = newId('cs');
    setTax({ ...tax, craftingStations: [...tax.craftingStations, { id, name: 'New Station', tag: 'Station.New' }] });
    push({ type: 'craftingStation', id });
  };
  return (
    <TaxListPage
      trail={trail} onBack={onBack} onClose={onClose}
      placeholder="Search stations…"
      heading={`${tax.craftingStations.length} stations`}
      onAdd={addStation} addLabel="New station…"
    >
      {tax.craftingStations.map(s => (
        <CommandItem
          key={s.id}
          value={`${s.name} ${s.tag}`}
          icon="hammer"
          shortcut={s.tag}
          onSelect={() => push({ type: 'craftingStation', id: s.id })}
        >{s.name}</CommandItem>
      ))}
    </TaxListPage>
  );
}

function CraftingStationEditPage({ trail, onBack, onClose, stationId, tax, setTax }) {
  const station = tax.craftingStations.find(s => s.id === stationId);
  if (!station) return null;

  const update = (patch) =>
    setTax({ ...tax, craftingStations: tax.craftingStations.map(s => s.id === stationId ? { ...s, ...patch } : s) });

  const remove = () => {
    if (!confirm(`Delete station "${station.name}"?`)) return;
    setTax({ ...tax, craftingStations: tax.craftingStations.filter(s => s.id !== stationId) });
    onBack();
  };

  return (
    <TaxEditPage trail={trail} onBack={onBack} onClose={onClose} onDelete={remove}>
      <FRow label="Station Name" hint="Display name shown in recipe requirements (e.g. Forge, Loom).">
        <Input value={station.name} onChange={e => update({ name: e.target.value })} autoFocus/>
      </FRow>
      <FRow label="Tag" hint="Single gameplay tag identifying this station (e.g. Station.Forge).">
        <Input value={station.tag} onChange={e => update({ tag: e.target.value })} className="font-mono text-xs"/>
      </FRow>
    </TaxEditPage>
  );
}
