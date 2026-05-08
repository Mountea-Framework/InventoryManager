// Settings command palette with sub-pages (shadcn cmdk pattern)
// Root page → Categories / Rarities sub-pages → individual edit forms
const { useState: useStateSet, useEffect: useEffectSet, useMemo: useMemoSet, useRef: useRefSet } = React;

/* ---------- Taxonomy persistence ---------- */
const TAX_KEY = 'arch.taxonomy.v1';

const DEFAULT_TAXONOMY = {
  categories: [
    { id: 'cat-weapons',     title: 'Weapons',     tags: ['Item.Weapon'],     subcategories: [
      { id: 'sub-energy',    title: 'Energy Rifle',    tags: ['Item.Weapon.Energy'] },
      { id: 'sub-precision', title: 'Precision Rifle', tags: ['Item.Weapon.Precision'] },
      { id: 'sub-pistol',    title: 'Pistol',          tags: ['Item.Weapon.Kinetic', 'Item.Sidearm'] },
    ]},
    { id: 'cat-consumables', title: 'Consumables', tags: ['Item.Consumable'], subcategories: [
      { id: 'sub-injector', title: 'Injector', tags: ['Item.Consumable.Injector'] },
      { id: 'sub-medical',  title: 'Medical',  tags: ['Item.Consumable.Medical'] },
    ]},
    { id: 'cat-materials',   title: 'Materials',   tags: ['Item.Material'],   subcategories: [
      { id: 'sub-metal',   title: 'Metal',   tags: ['Item.Material.Metal'] },
      { id: 'sub-hide',    title: 'Hide',    tags: ['Item.Material.Hide'] },
      { id: 'sub-reagent', title: 'Reagent', tags: ['Item.Material.Reagent'] },
    ]},
    { id: 'cat-armor',       title: 'Armor',       tags: ['Item.Armor'],      subcategories: [
      { id: 'sub-chest', title: 'Chest', tags: ['Item.Armor.Chest'] },
      { id: 'sub-head',  title: 'Head',  tags: ['Item.Armor.Head'] },
    ]},
    { id: 'cat-containers',  title: 'Containers',  tags: ['Item.Container'],  subcategories: [
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
};

const useTaxonomy = () => {
  const [tax, setTax] = useStateSet(() => {
    try {
      const raw = localStorage.getItem(TAX_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_TAXONOMY;
  });
  useEffectSet(() => {
    try { localStorage.setItem(TAX_KEY, JSON.stringify(tax)); } catch {}
  }, [tax]);
  return [tax, setTax];
};

const newId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

/* ---------- Page-stack helpers ---------- */
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
    <span className="font-mono">schema v2.6.0</span>
  </div>
);

/* ---------- Tags editor (chip input) ---------- */
const TagsField = ({ value = [], onChange, placeholder = 'Add tag and press Enter…' }) => {
  const [draft, setDraft] = useStateSet('');
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));
  const commit = () => {
    const v = draft.trim().replace(/,$/, '');
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setDraft('');
  };
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 shadow-sm focus-within:ring-1 focus-within:ring-ring">
      {value.map((t, i) => (
        <Tag key={i} tone="rare" onRemove={() => remove(i)}>{t}</Tag>
      ))}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
          else if (e.key === 'Backspace' && !draft && value.length) { remove(value.length - 1); }
        }}
        onBlur={commit}
        placeholder={value.length ? '' : placeholder}
        className="flex-1 min-w-[120px] bg-transparent py-1 text-xs font-mono outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
};

/* ---------- Form row (label + control), tighter than ui.jsx Row ---------- */
const FRow = ({ label, hint, children }) => (
  <div className="space-y-1.5">
    <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

/* ============================================================
   Settings Command — page router
   ============================================================ */
function SettingsCommand({ open, onOpenChange, screen, setScreen, tweaks, setTweak }) {
  // Page stack: e.g. [{type:'root'}, {type:'categories'}, {type:'category', id:'cat-weapons'}]
  const [stack, setStack] = useStateSet([{ type: 'root' }]);
  const page = stack[stack.length - 1];
  const push = (p) => setStack(s => [...s, p]);
  const pop  = () => setStack(s => s.length > 1 ? s.slice(0, -1) : s);

  // Reset stack when re-opening
  useEffectSet(() => { if (open) setStack([{ type: 'root' }]); }, [open]);

  const close = () => onOpenChange(false);
  const [tax, setTax] = useTaxonomy();

  const trail = useMemoSet(() => {
    const parts = ['Settings'];
    for (let i = 1; i < stack.length; i++) {
      const p = stack[i];
      if (p.type === 'categories') parts.push('Categories');
      else if (p.type === 'category') {
        const c = tax.categories.find(c => c.id === p.id);
        parts.push(c?.title || 'Category');
      }
      else if (p.type === 'subcategory') {
        const c = tax.categories.find(c => c.id === p.catId);
        const s = c?.subcategories.find(s => s.id === p.id);
        parts.push(s?.title || 'Subcategory');
      }
      else if (p.type === 'rarities') parts.push('Rarities');
      else if (p.type === 'rarity') {
        const r = tax.rarities.find(r => r.id === p.id);
        parts.push(r?.title || 'Rarity');
      }
    }
    return parts;
  }, [stack, tax]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div
        role="dialog" aria-label="Settings"
        className="w-[640px] max-w-[92vw] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl"
      >
        {page.type === 'root' && (
          <RootPage
            tweaks={tweaks} setTweak={setTweak}
            screen={screen} setScreen={setScreen}
            push={push} close={close}
          />
        )}
        {page.type === 'categories' && (
          <CategoriesPage
            trail={trail} onBack={pop} onClose={close}
            tax={tax} setTax={setTax} push={push}
          />
        )}
        {page.type === 'category' && (
          <CategoryEditPage
            trail={trail} onBack={pop} onClose={close}
            categoryId={page.id}
            tax={tax} setTax={setTax} push={push}
          />
        )}
        {page.type === 'subcategory' && (
          <SubcategoryEditPage
            trail={trail} onBack={pop} onClose={close}
            categoryId={page.catId} subcategoryId={page.id}
            tax={tax} setTax={setTax}
          />
        )}
        {page.type === 'rarities' && (
          <RaritiesPage
            trail={trail} onBack={pop} onClose={close}
            tax={tax} setTax={setTax} push={push}
          />
        )}
        {page.type === 'rarity' && (
          <RarityEditPage
            trail={trail} onBack={pop} onClose={close}
            rarityId={page.id}
            tax={tax} setTax={setTax}
          />
        )}
      </div>
    </Dialog>
  );
}

/* ============================================================
   Root page — top-level command list
   ============================================================ */
function RootPage({ tweaks, setTweak, screen, setScreen, push, close }) {
  const isDark = document.documentElement.classList.contains('dark');
  const lang = tweaks.language || 'English';
  const langs = ['English', 'Čeština', 'Deutsch', 'Français', 'Español', '日本語'];

  const cycleLang = () => {
    const i = langs.indexOf(lang);
    setTweak('language', langs[(i + 1) % langs.length]);
  };

  const setTheme = (mode) => {
    const root = document.documentElement;
    if (mode === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    try { localStorage.setItem('arch.theme', mode); } catch {}
  };

  const exportAll = () => {
    try {
      const blob = new Blob([JSON.stringify({
        items: window.DATA.allItems,
        loadouts: window.DATA.loadouts,
        recipes: window.DATA.recipes,
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
        const text = await f.text();
        const data = JSON.parse(text);
        if (data.taxonomy) localStorage.setItem(TAX_KEY, JSON.stringify(data.taxonomy));
        if (data.tweaks) localStorage.setItem('arch.tweaks', JSON.stringify(data.tweaks));
        location.reload();
      } catch (e) { alert('Import failed: ' + e.message); }
    };
    input.click();
  };

  return (
    <Command>
      <CommandInput placeholder="Search settings…"/>
      <CommandList>
        <CommandEmpty>No settings match.</CommandEmpty>

        <CommandGroup heading="Visuals">
          <CommandItem
            value="dark mode theme appearance"
            icon="eye"
            shortcut={isDark ? 'On' : 'Off'}
            onSelect={() => setTheme(isDark ? 'light' : 'dark')}
          >Dark Mode</CommandItem>
          <CommandItem
            value={`language locale ${lang}`}
            icon="flag"
            shortcut={lang}
            onSelect={cycleLang}
          >Language</CommandItem>
        </CommandGroup>

        <CommandSeparator/>

        <CommandGroup heading="Data">
          <CommandItem value="export all workspace json" icon="export" onSelect={exportAll}>Export all…</CommandItem>
          <CommandItem value="import workspace json" icon="open" onSelect={importAll}>Import…</CommandItem>
        </CommandGroup>

        <CommandSeparator/>

        <CommandGroup heading="Config">
          <CommandItem value="categories taxonomy subcategories" icon="folder" shortcut="→" onSelect={() => push({ type: 'categories' })}>Categories</CommandItem>
          <CommandItem value="rarities tiers colours" icon="sparkle" shortcut="→" onSelect={() => push({ type: 'rarities' })}>Rarities</CommandItem>
        </CommandGroup>

        <CommandSeparator/>

        <CommandGroup heading="Link">
          <CommandItem value="help documentation guide" icon="info" shortcut="↗" onSelect={() => window.open('https://mountea.tools/docs', '_blank')}>Help</CommandItem>
          <CommandItem value="support us donate sponsor" icon="sparkle" shortcut="↗" onSelect={() => window.open('https://mountea.tools/support', '_blank')}>Support Us</CommandItem>
        </CommandGroup>
      </CommandList>
      <Footer/>
    </Command>
  );
}

/* ============================================================
   Categories list page
   ============================================================ */
function CategoriesPage({ trail, onBack, onClose, tax, setTax, push }) {
  const addCategory = () => {
    const id = newId('cat');
    setTax({ ...tax, categories: [...tax.categories, { id, title: 'New Category', tags: [], subcategories: [] }] });
    push({ type: 'category', id });
  };
  return (
    <div className="flex flex-col">
      <PageHeader trail={trail} onBack={onBack} onClose={onClose}/>
      <Command>
        <CommandInput placeholder="Search categories…"/>
        <CommandList>
          <CommandEmpty>No categories match.</CommandEmpty>
          <CommandGroup heading={`${tax.categories.length} categories`}>
            {tax.categories.map(c => (
              <CommandItem
                key={c.id}
                value={`${c.title} ${c.tags.join(' ')} ${c.subcategories.map(s => s.title).join(' ')}`}
                icon="folder"
                shortcut={`${c.subcategories.length} sub`}
                onSelect={() => push({ type: 'category', id: c.id })}
              >{c.title}</CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator/>
          <CommandGroup>
            <CommandItem value="new category add create" icon="plus" onSelect={addCategory}>New category…</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
      <Footer/>
    </div>
  );
}

/* ============================================================
   Category edit page (form)
   ============================================================ */
function CategoryEditPage({ trail, onBack, onClose, categoryId, tax, setTax, push }) {
  const cat = tax.categories.find(c => c.id === categoryId);
  if (!cat) return null;

  const update = (patch) => {
    setTax({
      ...tax,
      categories: tax.categories.map(c => c.id === categoryId ? { ...c, ...patch } : c),
    });
  };

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
    <div className="flex flex-col">
      <PageHeader
        trail={trail} onBack={onBack} onClose={onClose}
        right={
          <Button variant="ghost" size="sm" onClick={remove} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Icon name="trash" size={13}/> Delete
          </Button>
        }
      />
      <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
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
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                  i > 0 && "border-t border-border/60",
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
      </div>
      <Footer hint={
        <>
          <kbd className="rounded border border-border bg-background px-1">esc</kbd> back
          <span className="mx-1">·</span>
          changes saved automatically
        </>
      }/>
    </div>
  );
}

/* ============================================================
   Subcategory edit page (form)
   ============================================================ */
function SubcategoryEditPage({ trail, onBack, onClose, categoryId, subcategoryId, tax, setTax }) {
  const cat = tax.categories.find(c => c.id === categoryId);
  const sub = cat?.subcategories.find(s => s.id === subcategoryId);
  if (!cat || !sub) return null;

  const update = (patch) => {
    setTax({
      ...tax,
      categories: tax.categories.map(c =>
        c.id !== categoryId ? c : {
          ...c,
          subcategories: c.subcategories.map(s => s.id === subcategoryId ? { ...s, ...patch } : s),
        }),
    });
  };

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
    <div className="flex flex-col">
      <PageHeader
        trail={trail} onBack={onBack} onClose={onClose}
        right={
          <Button variant="ghost" size="sm" onClick={remove} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Icon name="trash" size={13}/> Delete
          </Button>
        }
      />
      <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
        <FRow label="Title">
          <Input value={sub.title} onChange={e => update({ title: e.target.value })} autoFocus/>
        </FRow>
        <FRow label="Tags" hint={`Inherits from ${cat.title} → ${cat.tags.join(', ') || 'no parent tags'}`}>
          <TagsField value={sub.tags} onChange={tags => update({ tags })}/>
        </FRow>
      </div>
      <Footer hint={
        <>
          parent: <span className="text-foreground/80">{cat.title}</span>
          <span className="mx-1">·</span>
          changes saved automatically
        </>
      }/>
    </div>
  );
}

/* ============================================================
   Rarities list page
   ============================================================ */
function RaritiesPage({ trail, onBack, onClose, tax, setTax, push }) {
  const addRarity = () => {
    const id = newId('rar');
    setTax({ ...tax, rarities: [...tax.rarities, { id, title: 'New Rarity', tags: [], color: '#9ca3af' }] });
    push({ type: 'rarity', id });
  };
  return (
    <div className="flex flex-col">
      <PageHeader trail={trail} onBack={onBack} onClose={onClose}/>
      <Command>
        <CommandInput placeholder="Search rarities…"/>
        <CommandList>
          <CommandEmpty>No rarities match.</CommandEmpty>
          <CommandGroup heading={`${tax.rarities.length} rarities`}>
            {tax.rarities.map(r => (
              <CommandItem
                key={r.id}
                value={`${r.title} ${r.tags.join(' ')}`}
                onSelect={() => push({ type: 'rarity', id: r.id })}
              >
                <span
                  className="mr-1 inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-border"
                  style={{ background: r.color }}
                />
                <span className="flex-1">{r.title}</span>
                <span className="ml-auto font-mono text-[10.5px] text-muted-foreground">{r.color}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator/>
          <CommandGroup>
            <CommandItem value="new rarity add create" icon="plus" onSelect={addRarity}>New rarity…</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
      <Footer/>
    </div>
  );
}

/* ============================================================
   Rarity edit page (form)
   ============================================================ */
const RARITY_SWATCHES = [
  '#9ca3af', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#eab308',
];

function RarityEditPage({ trail, onBack, onClose, rarityId, tax, setTax }) {
  const r = tax.rarities.find(r => r.id === rarityId);
  if (!r) return null;

  const update = (patch) => {
    setTax({
      ...tax,
      rarities: tax.rarities.map(x => x.id === rarityId ? { ...x, ...patch } : x),
    });
  };

  const remove = () => {
    if (!confirm(`Delete rarity "${r.title}"?`)) return;
    setTax({ ...tax, rarities: tax.rarities.filter(x => x.id !== rarityId) });
    onBack();
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        trail={trail} onBack={onBack} onClose={onClose}
        right={
          <Button variant="ghost" size="sm" onClick={remove} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Icon name="trash" size={13}/> Delete
          </Button>
        }
      />
      <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
        <FRow label="Title">
          <Input value={r.title} onChange={e => update({ title: e.target.value })} autoFocus/>
        </FRow>
        <FRow label="Tags">
          <TagsField value={r.tags} onChange={tags => update({ tags })}/>
        </FRow>
        <FRow label="Colour" hint="Used for badges, borders, and rarity-themed UI accents.">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 shrink-0 rounded-md border border-border"
              style={{ background: r.color }}
            />
            <input
              type="color"
              value={r.color}
              onChange={e => update({ color: e.target.value })}
              className="h-10 w-14 cursor-pointer rounded-md border border-input bg-transparent"
            />
            <input
              value={r.color}
              onChange={e => update({ color: e.target.value })}
              className="h-10 flex-1 rounded-md border border-input bg-transparent px-3 font-mono text-xs uppercase outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {RARITY_SWATCHES.map(c => (
              <button
                key={c}
                onClick={() => update({ color: c })}
                title={c}
                className={cn(
                  "h-6 w-6 rounded-md border transition-transform hover:scale-110",
                  r.color.toLowerCase() === c.toLowerCase()
                    ? "border-foreground ring-2 ring-ring ring-offset-2 ring-offset-popover"
                    : "border-border"
                )}
                style={{ background: c }}
              />
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
      </div>
      <Footer hint="changes saved automatically"/>
    </div>
  );
}

window.SettingsCommand = SettingsCommand;
