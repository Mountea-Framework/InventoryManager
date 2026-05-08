// Items screen — Mountea Inventory item template editor
const { useState: useStateItems } = React;

// shorten guid for sidebar display
const shortGuid = (g) => g ? g.slice(0, 8) + '…' : '';

// Bitflag picker — chip grid backed by an integer bitmask
function FlagsPicker({ value, onChange }) {
  const flags = window.bitsToFlags(value || 0);
  const toggle = (key) => {
    const next = { ...flags, [key]: !flags[key] };
    onChange?.(window.flagsToBits(next));
  };
  // map flag keys to a representative icon
  const flagIcon = {
    tradeable: 'export', stackable: 'layers', craftable: 'hammer', dropable: 'arrowRight',
    consumable: 'drop', questItem: 'tag', unique: 'sparkle', durable: 'history',
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {window.ITEM_FLAGS.map(f => {
          const on = !!flags[f.key];
          return (
            <button key={f.key} type="button" onClick={() => toggle(f.key)} title={f.tip}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors",
                on
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border bg-card/40 text-muted-foreground hover:bg-accent/40 hover:text-foreground",
              )}>
              <Icon name={flagIcon[f.key] || 'tag'} size={12} className={on ? "text-primary" : ""}/>
              <span className="text-xs flex-1 truncate">{f.label}</span>
              <span className="font-mono text-[9.5px] opacity-60">1&lt;&lt;{Math.log2(f.bit)}</span>
              {on && <Icon name="check" size={11} className="text-primary"/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Item Actions picker — multi-select chips from window.ITEM_ACTIONS catalog
function ItemActionsPicker({ value = [], onChange }) {
  const enabled = new Set(value);
  const toggle = (key) => {
    const next = enabled.has(key)
      ? value.filter(k => k !== key)
      // preserve catalog order so the array reads predictably
      : window.ITEM_ACTIONS.filter(a => enabled.has(a.key) || a.key === key).map(a => a.key);
    onChange?.(next);
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1.5">
        {window.ITEM_ACTIONS.map(a => {
          const on = enabled.has(a.key);
          return (
            <button key={a.key} type="button" onClick={() => toggle(a.key)} title={a.tip}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors",
                on
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border bg-card/40 text-muted-foreground hover:bg-accent/40 hover:text-foreground",
              )}>
              <Icon name={a.icon} size={12} className={on ? "text-primary" : ""}/>
              <span className="text-xs flex-1 truncate">{a.key}</span>
              {on && <Icon name="check" size={11} className="text-primary"/>}
            </button>
          );
        })}
      </div>
      {value.length > 0 && (
        <div className="rounded-md border border-border/60 bg-card/40 p-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Enabled actions (in order)</div>
          <div className="flex flex-wrap gap-1.5">
            {value.map(k => (
              <span key={k} className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10.5px] text-primary">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable list editor for tags / attachment slots / special affects
function StringListField({ values = [], onChange, placeholder = 'add entry', mono = true }) {  const [draft, setDraft] = useStateItems('');
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
            "inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5",
            mono ? "font-mono text-[10.5px]" : "text-xs",
          )}>
            {v}
            <button onClick={() => remove(i)} className="opacity-60 hover:opacity-100"><Icon name="x" size={10}/></button>
          </span>
        ))}
        {values.length === 0 && <span className="text-xs text-muted-foreground italic">empty</span>}
      </div>
      <div className="flex gap-1.5">
        <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          className={cn("h-8 text-xs", mono && "font-mono")}/>
        <Button size="sm" variant="outline" onClick={add} icon="plus"/>
      </div>
    </div>
  );
}

// Sidebar item — pulls from new schema
function ItemTreeNode({ category, items, expanded, setExpanded, selected, setSelected, search }) {
  const isOpen = expanded[category] !== false;
  const filteredItems = search
    ? items.filter(i => (i.displayName + ' ' + i.guid + ' ' + (i.tags||[]).join(' ')).toLowerCase().includes(search.toLowerCase()))
    : items;
  if (search && filteredItems.length === 0) return null;
  const catIcon = { Weapons: 'sword', Consumables: 'beaker', Materials: 'cube', Armor: 'shield', Containers: 'backpack' }[category] || 'folder';

  return (
    <div className="mb-1">
      <button onClick={() => setExpanded({ ...expanded, [category]: !isOpen })}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors">
        <Icon name={isOpen ? 'chevDown' : 'chevRight'} size={11}/>
        <Icon name={catIcon} size={13}/>
        <span className="flex-1 text-left">{category}</span>
        <span className="font-mono text-[10px] text-muted-foreground/70">{items.length}</span>
      </button>
      {isOpen && filteredItems.map(item => {
        const isSel = selected === item.guid;
        const dotCls = item.rarity === 'Legendary' ? 'bg-amber-400'
          : item.rarity === 'Epic' ? 'bg-fuchsia-400'
          : item.rarity === 'Rare' ? 'bg-sky-400'
          : 'bg-muted-foreground/40';
        return (
          <SidebarItem key={item.guid} selected={isSel} onClick={() => setSelected(item.guid)} className="text-sm">
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotCls)}/>
            <div className="min-w-0 flex-1">
              <div className="truncate">{item.displayName}</div>
              <div className="font-mono text-[10px] text-muted-foreground truncate">{shortGuid(item.guid)}</div>
            </div>
          </SidebarItem>
        );
      })}
    </div>
  );
}

function ItemsScreen({ search: globalSearch, tweaks }) {
  const firstGuid = window.DATA.allItems[0]?.guid;
  const [selected, setSelected] = useStateItems(firstGuid);
  const [expanded, setExpanded] = useStateItems({ Weapons: true, Consumables: false, Materials: false, Armor: false, Containers: false });
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
        searchPlaceholder="Filter items…">
        {Object.entries(window.DATA.items).map(([cat, arr]) => (
          <ItemTreeNode key={cat} category={cat} items={arr}
            expanded={expanded} setExpanded={setExpanded}
            selected={selected} setSelected={setSelected}
            search={search}/>
        ))}
      </LeftPanel>

      <main className="flex-1 min-w-0 overflow-auto">
        {item ? <ItemEditor key={item.guid} item={item}/> : (
          <div className="p-10 text-sm text-muted-foreground">Select an item template</div>
        )}
      </main>

      {showInspector && item && (
        <CollapsibleAside storageKey="aside-inspector" width={340}>
          <ItemInspector item={item}/>
        </CollapsibleAside>
      )}
    </>
  );
}

function ItemEditor({ item }) {
  // Local working copy so users can edit; reset when item changes (handled by `key` on parent)
  const [draft, setDraft] = useStateItems(item);
  const set = (path, val) => setDraft(d => {
    const next = structuredClone(d);
    const keys = path.split('.');
    let cur = next;
    for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
    cur[keys[keys.length - 1]] = val;
    return next;
  });

  const flagLabels = window.flagsLabels(draft.flags || 0);

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-6 py-4">
        <div className="flex items-start gap-4">
          <Thumb size={52} tone={item._ui?.thumbTone} icon={item._ui?.icon}/>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <h1 className="text-lg font-semibold tracking-tight truncate">{draft.displayName}</h1>
              <Badge variant="secondary">{draft.rarity}</Badge>
              <Badge variant="outline">{draft.category}{draft.subCategory ? ` · ${draft.subCategory}` : ''}</Badge>
            </div>
            <div className="font-mono text-xs text-muted-foreground mt-1 truncate">guid: {draft.guid}</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <Section title="Identity" icon="info">
          <Row label="GUID" hint="Stable unique identifier"><TextField value={draft.guid} mono readOnly/></Row>
          <Row label="Display Name" hint="Player-facing name">
            <TextField value={draft.displayName} onChange={v => set('displayName', v)}/>
          </Row>
          <Row label="Category / Subcategory">
            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={draft.category} onChange={v => set('category', v)}
                  options={['Weapons','Consumables','Materials','Armor','Containers']}/>
              </div>
              <div className="flex-1">
                <TextField value={draft.subCategory || ''} onChange={v => set('subCategory', v)} placeholder="Subcategory"/>
              </div>
            </div>
          </Row>
          <Row label="Rarity">
            <Select value={draft.rarity} onChange={v => set('rarity', v)}
              options={['Common','Uncommon','Rare','Epic','Legendary']}/>
          </Row>
          <Row label="Gameplay Tags" hint="GAS-style hierarchical tags (Item.Weapon.Melee)" stack>
            <StringListField values={draft.tags} onChange={v => set('tags', v)} placeholder="Item.Subtype.Detail"/>
          </Row>
        </Section>

        <Section title="Flags" icon="flag" right={
          <span className="font-mono text-[11px] text-muted-foreground">
            bitmask: {draft.flags || 0}
            {flagLabels.length > 0 && <span className="text-foreground/70"> · {flagLabels.join(', ')}</span>}
          </span>
        }>
          <FlagsPicker value={draft.flags || 0} onChange={v => set('flags', v)}/>
        </Section>

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

        <Section title="Economy" icon="drop" right={<Switch checked={draft.economy.enabled} onCheckedChange={v => set('economy.enabled', v)}/>}>
          <Row label="Base Price">
            <TextField value={String(draft.economy.basePrice)} onChange={v => set('economy.basePrice', parseFloat(v) || 0)} mono
              suffix={<span className="text-xs">cr</span>}/>
          </Row>
          <Row label="Sell Coefficient" hint="Multiplier when selling to vendors">
            <TextField value={String(draft.economy.sellCoefficient)} onChange={v => set('economy.sellCoefficient', parseFloat(v) || 0)} mono/>
          </Row>
        </Section>

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

        <Section title="Spawn Actor" icon="cube">
          <Row label="Blueprint Path" hint="Class to spawn when item is dropped into the world" stack>
            <TextField value={draft.spawnActor.path} onChange={v => set('spawnActor.path', v)} mono
              suffix={<Icon name="folderOpen" size={12}/>}/>
          </Row>
        </Section>

        <Section title="Visual Assets" icon="eye">
          <Row label="Thumbnail">
            <TextField value={draft.visuals.thumbnail.path} onChange={v => set('visuals.thumbnail.path', v)} mono
              suffix={<Icon name="folderOpen" size={12}/>}/>
          </Row>
          <Row label="Cover">
            <TextField value={draft.visuals.cover.path} onChange={v => set('visuals.cover.path', v)} mono
              suffix={<Icon name="folderOpen" size={12}/>}/>
          </Row>
          <Row label="Mesh">
            <TextField value={draft.visuals.mesh.path} onChange={v => set('visuals.mesh.path', v)} mono
              suffix={<Icon name="folderOpen" size={12}/>}/>
          </Row>
        </Section>

        <Section title="Description" icon="info">
          <Row label="Short" hint="One-line tooltip" stack>
            <TextField value={draft.description.short} onChange={v => set('description.short', v)}/>
          </Row>
          <Row label="Long" hint="Full lore / detail panel copy" stack>
            <Textarea value={draft.description.long} onChange={e => set('description.long', e.target.value)} rows={4}/>
          </Row>
        </Section>

        <Section title="Attachment Slots" icon="link" defaultOpen={false} compact>
          <StringListField values={draft.attachmentSlots} onChange={v => set('attachmentSlots', v)} placeholder="Slot.Gem"/>
        </Section>

        <Section title="Special Affects" icon="sparkle" defaultOpen={false} compact>
          <StringListField values={draft.specialAffects} onChange={v => set('specialAffects', v)} placeholder="/Game/Blueprints/Affects/BP_…"/>
        </Section>

        <Section title="Item Actions" icon="cog" right={
          <span className="font-mono text-[11px] text-muted-foreground">{(draft.itemActions || []).length} enabled</span>
        }>
          <ItemActionsPicker value={draft.itemActions || []} onChange={v => set('itemActions', v)}/>
        </Section>
      </div>
    </div>
  );
}

function ItemInspector({ item }) {
  const usedInLoadouts = window.DATA.loadouts.filter(l => l.items.some(it => it.ref === item.displayName));
  const usedInRecipes = Object.values(window.DATA.recipes).flat().filter(r =>
    r.groups.some(g => g.ingredients.some(i => i.ref === item.displayName))
  );

  // Compact JSON preview matching the canonical schema
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
    <div className="p-4 space-y-5 pt-10">
      <div>
        <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Inspector</div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <Thumb size={40} tone={item._ui?.thumbTone} icon={item._ui?.icon}/>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{item.displayName}</div>
              <div className="font-mono text-[10.5px] text-muted-foreground truncate">{item.guid}</div>
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
          {(item.flags || 0) === 0 && <span className="text-xs text-muted-foreground italic">No flags set</span>}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon name="link" size={11}/> Referenced In
        </div>
        <div className="space-y-1.5">
          {[...usedInLoadouts.map(l => ({ kind: 'Loadout', name: l.name, id: l.id, icon: 'layers' })),
            ...usedInRecipes.map(r => ({ kind: 'Recipe', name: r.name, id: r.id, icon: 'hammer' }))
          ].map((ref, i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-md border border-border bg-card px-3 py-2 hover:bg-accent/50 cursor-pointer transition-colors">
              <Icon name={ref.icon} size={12} className="text-muted-foreground"/>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{ref.name}</div>
                <div className="font-mono text-[10px] text-muted-foreground truncate">{ref.kind.toLowerCase()} · {ref.id}</div>
              </div>
              <Icon name="arrowRight" size={12} className="text-muted-foreground"/>
            </div>
          ))}
          {usedInLoadouts.length + usedInRecipes.length === 0 && (
            <div className="text-xs text-muted-foreground italic">Not referenced yet.</div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">JSON Preview</div>
        <pre className="rounded-md border border-border bg-card p-3 font-mono text-[10.5px] text-foreground/80 overflow-x-auto leading-relaxed">{JSON.stringify(preview, null, 2)}</pre>
      </div>
    </div>
  );
}

window.ItemsScreen = ItemsScreen;
