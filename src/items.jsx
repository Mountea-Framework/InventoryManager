// Items screen — Mountea Inventory item template editor
const { useState: useStateItems, useMemo: useMemoItems } = React;

/* ============================================================
   Type definitions
   ============================================================ */
/**
 * @typedef {{ guid: string, displayName: string, category: string, subCategory?: string, rarity: string, flags: number, maxQuantity: number, maxStackSize: number, tags: string[], spawnActor: { path: string }, description: { short: string, long: string }, visuals: { thumbnail: { path: string }, cover: { path: string }, mesh: { path: string } }, durability: object, economy: object, weight: object, attachmentSlots: string[], specialAffects: string[], itemActions: string[], _ui?: object }} Item
 */

/* ============================================================
   Utility helpers
   ============================================================ */
/** Truncates a GUID to 8 chars for sidebar display. @param {string} g @returns {string} */
const shortGuid = (g) => g ? g.slice(0, 8) + '…' : '';

/* ============================================================
   FlagsPicker — bitmask chip grid
   ============================================================ */
const FLAG_ICONS = {
  tradeable: 'export', stackable: 'layers', craftable: 'hammer', dropable: 'arrowRight',
  consumable: 'drop',  questItem: 'tag',    unique: 'sparkle',   durable: 'history',
};

/**
 * Toggleable chip grid backed by an integer bitmask.
 * @param {{ value: number, onChange: (v: number) => void }} props
 */
function FlagsPicker({ value, onChange }) {
  const flags = window.bitsToFlags(value || 0);
  const toggle = (key) => onChange?.(window.flagsToBits({ ...flags, [key]: !flags[key] }));
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {window.ITEM_FLAGS.map(f => {
        const on = !!flags[f.key];
        return (
          <button key={f.key} type="button" onClick={() => toggle(f.key)} title={f.tip}
            className={cn(
              'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors',
              on ? 'border-primary/60 bg-primary/10 text-foreground' : 'border-border bg-card/40 text-muted-foreground hover:bg-accent/40 hover:text-foreground',
            )}>
            <Icon name={FLAG_ICONS[f.key] || 'tag'} size={12} className={on ? 'text-primary' : ''}/>
            <span className="flex-1 truncate text-xs">{f.label}</span>
            <span className="font-mono text-[9.5px] opacity-60">1&lt;&lt;{Math.log2(f.bit)}</span>
            {on && <Icon name="check" size={11} className="text-primary"/>}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   ItemActionsPicker — multi-select chips from taxonomy
   ============================================================ */
/**
 * Chip grid for selecting which item actions are enabled on this item.
 * Reads available actions from taxonomy (falls back to window.ITEM_ACTIONS for fixture data).
 * @param {{ value: string[], onChange: (v: string[]) => void, taxonomy: import('./settings.jsx').Taxonomy }} props
 */
function ItemActionsPicker({ value = [], onChange, taxonomy }) {
  const catalog = taxonomy.itemActions ?? window.ITEM_ACTIONS;
  const enabled = new Set(value);

  const toggle = (key) => {
    const next = enabled.has(key)
      ? value.filter(k => k !== key)
      : catalog.filter(a => enabled.has(a.key) || a.key === key).map(a => a.key);
    onChange?.(next);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1.5">
        {catalog.map(a => {
          const on = enabled.has(a.key);
          return (
            <button key={a.key} type="button" onClick={() => toggle(a.key)} title={a.tip}
              className={cn(
                'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors',
                on ? 'border-primary/60 bg-primary/10 text-foreground' : 'border-border bg-card/40 text-muted-foreground hover:bg-accent/40 hover:text-foreground',
              )}>
              <Icon name={a.icon} size={12} className={on ? 'text-primary' : ''}/>
              <span className="flex-1 truncate text-xs">{a.key}</span>
              {on && <Icon name="check" size={11} className="text-primary"/>}
            </button>
          );
        })}
      </div>
      {value.length > 0 && (
        <div className="rounded-md border border-border/60 bg-card/40 p-2.5">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Enabled actions (in order)</div>
          <div className="flex flex-wrap gap-1.5">
            {value.map(k => (
              <span key={k} className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10.5px] text-primary">{k}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   StringListField — reusable tag / slot / affect editor
   ============================================================ */
/**
 * Editable chip list with an optional browser-native autocomplete datalist.
 * @param {{ values: string[], onChange: (v: string[]) => void, placeholder?: string, mono?: boolean, suggestions?: string[] }} props
 */
function StringListField({ values = [], onChange, placeholder = 'add entry', mono = true, suggestions = [] }) {
  const [draft, setDraft] = useStateItems('');
  const listId = useMemoItems(() => `sl-${Math.random().toString(36).slice(2, 6)}`, []);

  const remove = (i) => onChange?.(values.filter((_, j) => j !== i));
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange?.([...values, v]);
    setDraft('');
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span key={i} className={cn(
            'inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5',
            mono ? 'font-mono text-[10.5px]' : 'text-xs',
          )}>
            {v}
            <button onClick={() => remove(i)} className="opacity-60 hover:opacity-100"><Icon name="x" size={10}/></button>
          </span>
        ))}
        {values.length === 0 && <span className="text-xs italic text-muted-foreground">empty</span>}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={placeholder}
          list={suggestions.length ? listId : undefined}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          className={cn('h-8 text-xs', mono && 'font-mono')}
        />
        {suggestions.length > 0 && (
          <datalist id={listId}>
            {suggestions.map(s => <option key={s} value={s}/>)}
          </datalist>
        )}
        <Button size="sm" variant="outline" onClick={add} icon="plus"/>
      </div>
    </div>
  );
}

/* ============================================================
   ItemTreeNode — sidebar category row
   ============================================================ */
const CATEGORY_ICONS = {
  Weapons: 'sword', Consumables: 'beaker', Materials: 'cube', Armor: 'shield', Containers: 'backpack',
};

/**
 * Expandable sidebar entry listing items within a category.
 * @param {{ category: string, items: Item[], expanded: object, setExpanded: Function, selected: string, setSelected: (guid: string) => void, search: string }} props
 */
function ItemTreeNode({ category, items, expanded, setExpanded, selected, setSelected, search }) {
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
        <Icon name={CATEGORY_ICONS[category] || 'folder'} size={13}/>
        <span className="flex-1 text-left">{category}</span>
        <span className="font-mono text-[10px] text-muted-foreground/70">{items.length}</span>
      </button>
      {isOpen && filteredItems.map(item => {
        const isSel = selected === item.guid;
        return (
          <SidebarItem key={item.guid} selected={isSel} onClick={() => setSelected(item.guid)} className="text-sm">
            <div className="min-w-0 flex-1">
              <div className="truncate">{item.displayName}</div>
              <div className="truncate font-mono text-[10px] text-muted-foreground">{shortGuid(item.guid)}</div>
            </div>
          </SidebarItem>
        );
      })}
    </div>
  );
}

/* ============================================================
   ItemsScreen — top-level screen component
   ============================================================ */
/**
 * @param {{ search: string, tweaks: object }} props
 */
function ItemsScreen({ search: globalSearch, tweaks }) {
  const [tax] = useTaxonomy();
  const firstGuid = window.DATA.allItems[0]?.guid;
  const [selected,     setSelected]     = useStateItems(firstGuid);
  const [expanded,     setExpanded]     = useStateItems({ Weapons: true, Consumables: false, Materials: false, Armor: false, Containers: false });
  const [browserSearch, setBrowserSearch] = useStateItems('');
  const search = browserSearch || globalSearch;
  const item = window.DATA.itemById[selected];
  const showInspector = tweaks.showInspector !== false;

  return (
    <>
      <LeftPanel
        title="Item Templates"
        headerActions={<><IconBtn icon="folderPlus" title="New category"/><IconBtn icon="plus" title="New item"/></>}
        search={browserSearch} setSearch={setBrowserSearch}
        searchPlaceholder="Filter items…"
      >
        {Object.entries(window.DATA.items).map(([cat, arr]) => (
          <ItemTreeNode key={cat} category={cat} items={arr}
            expanded={expanded} setExpanded={setExpanded}
            selected={selected} setSelected={setSelected}
            search={search}/>
        ))}
      </LeftPanel>

      <main className="min-w-0 flex-1 overflow-auto">
        {item
          ? <ItemEditor key={item.guid} item={item} taxonomy={tax}/>
          : <div className="p-10 text-sm text-muted-foreground">Select an item template</div>
        }
      </main>

      {showInspector && item && (
        <CollapsibleAside storageKey="aside-inspector" width={340}>
          <ItemInspector item={item}/>
        </CollapsibleAside>
      )}
    </>
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
function ItemEditor({ item, taxonomy }) {
  const [draft, setDraft] = useStateItems(item);

  /** Deep-sets a dot-path value on the draft. */
  const set = (path, val) => setDraft(d => {
    const next = structuredClone(d);
    const keys = path.split('.');
    let cur = next;
    for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
    cur[keys[keys.length - 1]] = val;
    return next;
  });

  const flagLabels = window.flagsLabels(draft.flags || 0);

  const activeCat  = taxonomy.categories.find(c => c.title === draft.category);
  const subcatOpts = activeCat?.subcategories ?? [];

  const slotSuggestions = (taxonomy.attachmentSlots ?? []).map(s => s.name);

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
        <div className="flex items-start gap-4">
          <Thumb size={52} tone={item._ui?.thumbTone} icon={item._ui?.icon}/>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h1 className="truncate text-lg font-semibold tracking-tight">{draft.displayName}</h1>
              <Badge variant="secondary">{draft.rarity}</Badge>
              <Badge variant="outline">{draft.category}{draft.subCategory ? ` · ${draft.subCategory}` : ''}</Badge>
            </div>
            <div className="mt-1 truncate font-mono text-xs text-muted-foreground">guid: {draft.guid}</div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {/* Identity */}
        <Section title="Identity" icon="info">
          <Row label="GUID" hint="Stable unique identifier">
            <TextField value={draft.guid} mono readOnly/>
          </Row>
          <Row label="Display Name" hint="Player-facing name">
            <TextField value={draft.displayName} onChange={v => set('displayName', v)}/>
          </Row>
          <Row label="Category">
            <Select
              value={draft.category ?? ''}
              onChange={v => setDraft(d => ({ ...d, category: v, subCategory: '' }))}
              options={taxonomy.categories.map(c => ({ value: c.title, label: c.title }))}
              placeholder="Select category…"
            />
          </Row>
          <Row label="Subcategory">
            <Select
              value={draft.subCategory ?? ''}
              onChange={v => set('subCategory', v)}
              options={[{ value: '', label: '— none —' }, ...subcatOpts.map(s => ({ value: s.title, label: s.title }))]}
              placeholder={activeCat ? 'Select subcategory…' : 'Select a category first'}
            />
          </Row>
          <Row label="Rarity">
            <Select
              value={draft.rarity ?? ''}
              onChange={v => set('rarity', v)}
              options={taxonomy.rarities.map(r => ({ value: r.title, label: r.title }))}
              placeholder="Select rarity…"
            />
          </Row>
          <Row label="Gameplay Tags" hint="GAS-style hierarchical tags (Item.Weapon.Melee)" stack>
            <StringListField values={draft.tags} onChange={v => set('tags', v)} placeholder="Item.Subtype.Detail"/>
          </Row>
        </Section>

        {/* Flags */}
        <Section title="Flags" icon="flag" right={
          <span className="font-mono text-[11px] text-muted-foreground">
            bitmask: {draft.flags || 0}
            {flagLabels.length > 0 && <span className="text-foreground/70"> · {flagLabels.join(', ')}</span>}
          </span>
        }>
          <FlagsPicker value={draft.flags || 0} onChange={v => set('flags', v)}/>
        </Section>

        {/* Stacking + Weight */}
        <div className="grid grid-cols-2 gap-4">
          <Section title="Stacking" icon="layers">
            <Row label="Max Quantity" hint="Hard cap in inventory">
              <TextField value={String(draft.maxQuantity)} onChange={v => set('maxQuantity', +v || 0)} mono/>
            </Row>
            <Row label="Max Stack Size" hint="Per-slot stack ceiling">
              <TextField value={String(draft.maxStackSize)} onChange={v => set('maxStackSize', +v || 0)} mono/>
            </Row>
          </Section>

          <Section title="Weight" icon="cube">
            <Row label="Enabled">
              <Switch checked={draft.weight.enabled} onCheckedChange={v => set('weight.enabled', v)}/>
            </Row>
            <Row label="Value (kg)">
              <TextField value={String(draft.weight.value)} onChange={v => set('weight.value', parseFloat(v) || 0)} mono
                suffix={<span className="text-xs">kg</span>}/>
            </Row>
          </Section>
        </div>

        {/* Economy */}
        <Section title="Economy" icon="drop" right={<Switch checked={draft.economy.enabled} onCheckedChange={v => set('economy.enabled', v)}/>}>
          <Row label="Base Price">
            <TextField value={String(draft.economy.basePrice)} onChange={v => set('economy.basePrice', parseFloat(v) || 0)} mono
              suffix={<span className="text-xs">cr</span>}/>
          </Row>
          <Row label="Sell Coefficient" hint="Multiplier when selling to vendors">
            <TextField value={String(draft.economy.sellCoefficient)} onChange={v => set('economy.sellCoefficient', parseFloat(v) || 0)} mono/>
          </Row>
        </Section>

        {/* Durability */}
        <Section title="Durability" icon="history" right={<Switch checked={draft.durability.enabled} onCheckedChange={v => set('durability.enabled', v)}/>}>
          <Row label="Max">
            <TextField value={String(draft.durability.max)} onChange={v => set('durability.max', parseFloat(v) || 0)} mono/>
          </Row>
          <Row label="Base" hint="Starting durability on spawn">
            <TextField value={String(draft.durability.base)} onChange={v => set('durability.base', parseFloat(v) || 0)} mono/>
          </Row>
          <Row label="Penalization" hint="Stat reduction per durability tick lost">
            <TextField value={String(draft.durability.penalization)} onChange={v => set('durability.penalization', parseFloat(v) || 0)} mono/>
          </Row>
          <Row label="Price Coefficient" hint="How sale price scales with current durability">
            <TextField value={String(draft.durability.priceCoefficient)} onChange={v => set('durability.priceCoefficient', parseFloat(v) || 0)} mono/>
          </Row>
        </Section>

        {/* Spawn Actor */}
        <Section title="Spawn Actor" icon="cube">
          <Row label="Actor Name" hint="Blueprint class name spawned when the item enters the world" stack>
            <TextField value={draft.spawnActor.path} onChange={v => set('spawnActor.path', v)} mono
              placeholder="BP_MyItem_C"/>
          </Row>
        </Section>

        {/* Visual Assets */}
        <Section title="Visual Assets" icon="eye">
          <Row label="Thumbnail" stack>
            <FilePicker
              value={draft.visuals.thumbnail.path}
              onChange={v => set('visuals.thumbnail.path', v)}
              accept="image/*"
              placeholder="e.g. T_MyItem_Thumb.png"
            />
          </Row>
          <Row label="Cover" stack>
            <FilePicker
              value={draft.visuals.cover.path}
              onChange={v => set('visuals.cover.path', v)}
              accept="image/*"
              placeholder="e.g. T_MyItem_Cover.png"
            />
          </Row>
          <Row label="Mesh" stack>
            <FilePicker
              value={draft.visuals.mesh.path}
              onChange={v => set('visuals.mesh.path', v)}
              accept=".fbx,.obj,.gltf,.glb,.uasset"
              placeholder="e.g. SK_MyItem.fbx"
            />
          </Row>
        </Section>

        {/* Description */}
        <Section title="Description" icon="info">
          <Row label="Short" hint="One-line tooltip" stack>
            <TextField value={draft.description.short} onChange={v => set('description.short', v)}/>
          </Row>
          <Row label="Long" hint="Full lore / detail panel copy" stack>
            <Textarea value={draft.description.long} onChange={e => set('description.long', e.target.value)} rows={4}/>
          </Row>
        </Section>

        {/* Attachment Slots */}
        <Section title="Attachment Slots" icon="link" defaultOpen={false} compact>
          <StringListField
            values={draft.attachmentSlots}
            onChange={v => set('attachmentSlots', v)}
            placeholder="Slot.Gem"
            suggestions={slotSuggestions}
          />
        </Section>

        {/* Special Affects */}
        <Section title="Special Affects" icon="sparkle" defaultOpen={false} compact>
          <StringListField values={draft.specialAffects} onChange={v => set('specialAffects', v)} placeholder="/Game/Blueprints/Affects/BP_…"/>
        </Section>

        {/* Item Actions */}
        <Section title="Item Actions" icon="cog" right={
          <span className="font-mono text-[11px] text-muted-foreground">{(draft.itemActions || []).length} enabled</span>
        }>
          <ItemActionsPicker value={draft.itemActions || []} onChange={v => set('itemActions', v)} taxonomy={taxonomy}/>
        </Section>
      </div>
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
  const usedInLoadouts = window.DATA.loadouts.filter(l => l.items.some(it => it.ref === item.displayName));
  const usedInRecipes  = Object.values(window.DATA.recipes).flat().filter(r =>
    r.groups.some(g => g.ingredients.some(i => i.ref === item.displayName))
  );

  const preview = {
    guid: item.guid,
    displayName: item.displayName,
    category: item.category,
    subCategory: item.subCategory,
    rarity: item.rarity,
    flags: item.flags,
    maxQuantity: item.maxQuantity,
    maxStackSize: item.maxStackSize,
    tags: item.tags,
    spawnActor: item.spawnActor,
    description: item.description,
    visuals: item.visuals,
    durability: item.durability,
    economy: item.economy,
    weight: item.weight,
    attachmentSlots: item.attachmentSlots,
    specialAffects: item.specialAffects,
  };

  return (
    <div className="space-y-5 p-4 pt-10">
      <div>
        <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Inspector</div>
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
        <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Active Flags</div>
        <div className="flex flex-wrap gap-1.5">
          {window.flagsLabels(item.flags || 0).map(l => (
            <span key={l} className="inline-flex items-center rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10.5px] text-primary">{l}</span>
          ))}
          {(item.flags || 0) === 0 && <span className="text-xs italic text-muted-foreground">No flags set</span>}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon name="link" size={11}/> Referenced In
        </div>
        <div className="space-y-1.5">
          {[
            ...usedInLoadouts.map(l => ({ kind: 'Loadout', name: l.name, id: l.id, icon: 'layers' })),
            ...usedInRecipes.map(r => ({ kind: 'Recipe',  name: r.name, id: r.id, icon: 'hammer' })),
          ].map((ref, i) => (
            <div key={i} className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-card px-3 py-2 transition-colors hover:bg-accent/50">
              <Icon name={ref.icon} size={12} className="text-muted-foreground"/>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{ref.name}</div>
                <div className="truncate font-mono text-[10px] text-muted-foreground">{ref.kind.toLowerCase()} · {ref.id}</div>
              </div>
              <Icon name="arrowRight" size={12} className="text-muted-foreground"/>
            </div>
          ))}
          {usedInLoadouts.length + usedInRecipes.length === 0 && (
            <div className="text-xs italic text-muted-foreground">Not referenced yet.</div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">JSON Preview</div>
        <pre className="overflow-x-auto rounded-md border border-border bg-card p-3 font-mono text-[10.5px] leading-relaxed text-foreground/80">{JSON.stringify(preview, null, 2)}</pre>
      </div>
    </div>
  );
}

window.ItemsScreen = ItemsScreen;
