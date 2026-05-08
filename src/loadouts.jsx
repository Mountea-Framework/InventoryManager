// Loadouts screen — shadcn restyle
const { useState: useStateLdt } = React;

function LoadoutsScreen({ search: globalSearch, tweaks }) {
  const [selected, setSelected] = useStateLdt('LDT_001');
  const [browserSearch, setBrowserSearch] = useStateLdt('');
  const loadout = window.DATA.loadouts.find(l => l.id === selected);
  const search = (browserSearch || globalSearch || '').toLowerCase();
  const filtered = search
    ? window.DATA.loadouts.filter(l => (l.name + ' ' + l.desc + ' ' + l.id).toLowerCase().includes(search))
    : window.DATA.loadouts;
  const showInspector = tweaks.showInspector !== false;

  return (
    <>
      <LeftPanel
        title="Loadout Templates"
        headerActions={<IconBtn icon="plus" title="New loadout"/>}
        search={browserSearch} setSearch={setBrowserSearch}
        searchPlaceholder="Filter loadouts…">
        {filtered.map(l => {
          const sel = l.id === selected;
          return (
            <SidebarItem key={l.id} selected={sel} onClick={() => setSelected(l.id)} className="block py-2.5">
              <div className="min-w-0 w-full">
                <div className="text-sm font-medium truncate">{l.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{l.desc}</div>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-muted-foreground">
                  <span>{l.items.length} items</span>
                  <span className="opacity-50">·</span>
                  <span>{Object.keys(l.slots || {}).length} slots</span>
                </div>
              </div>
            </SidebarItem>
          );
        })}
      </LeftPanel>

      <main className="flex-1 min-w-0 overflow-auto">
        {loadout && <LoadoutEditor loadout={loadout}/>}
      </main>

      {showInspector && loadout && (
        <CollapsibleAside storageKey="aside-inspector" width={340}>
          <SlotMapping loadout={loadout}/>
        </CollapsibleAside>
      )}
    </>
  );
}

function LoadoutEditor({ loadout }) {
  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-6 py-4">
        <div className="flex items-start gap-4">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground shrink-0">
            <Icon name="layers" size={22}/>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">{loadout.name}</h1>
            <div className="font-mono text-xs text-muted-foreground mt-1">id: {loadout.id.toLowerCase()}</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <Section title="Composition" icon="list"
          right={<Button icon="plus" size="sm" variant="ghost">Add Item</Button>}>
          <div className="space-y-1.5">
            <div className="grid grid-cols-[28px_minmax(180px,2fr)_88px_minmax(110px,1fr)_40px] items-center gap-2 px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div></div>
              <div>Item Reference</div>
              <div>Qty</div>
              <div>Preferred Slot</div>
              <div></div>
            </div>
            {loadout.items.map((it, idx) => {
              const src = window.DATA.itemByName[it.ref];
              return (
                <div key={idx} className="grid grid-cols-[28px_minmax(180px,2fr)_88px_minmax(110px,1fr)_40px] items-center gap-2 rounded-lg border border-border bg-card p-2">
                  <div className="flex justify-center text-muted-foreground/60"><Icon name="dragHandle" size={14}/></div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Thumb size={30} tone={src?._ui?.thumbTone ?? 0} icon={src?._ui?.icon || 'cube'}/>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{src?.displayName || it.ref}</div>
                      <div className="font-mono text-[10px] text-muted-foreground truncate">guid: {(src?.guid || '').slice(0, 13)}{src ? '…' : ''}</div>
                    </div>
                  </div>
                  <div><TextField value={String(it.qty)} mono/></div>
                  <div>
                    {it.slot ? <Tag>{it.slot}</Tag> : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                  <div className="flex justify-center">
                    <IconBtn icon="trash" tone="danger" title="Remove"/>
                  </div>
                </div>
              );
            })}
            <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors">
              <Icon name="plus" size={12}/> Add Item to Composition
            </button>
          </div>
        </Section>

        <Section title="Spawn Behaviour" icon="bolt" compact>
          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <Row label="Apply on spawn"><Toggle on={true} onChange={() => {}}/></Row>
              <Row label="Randomise qty"><Toggle on={false} onChange={() => {}}/></Row>
            </div>
            <div>
              <Row label="Auto-equip pass"><Toggle on={true} onChange={() => {}}/></Row>
              <Row label="Drop on death"><Select value="Equipped only" options={['None','Equipped only','All items']}/></Row>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function SlotMapping({ loadout }) {
  const slots = [
    { id: 'Head', icon: 'helmet' },
    { id: 'Primary', icon: 'sword' },
    { id: 'Secondary', icon: 'target' },
    { id: 'Back', icon: 'backpack' },
    { id: 'Chest', icon: 'shield' },
    { id: 'Accessory', icon: 'sparkle' },
  ];
  return (
    <div className="p-4 space-y-3 pt-10">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Slot Mapping</div>
      <div className="space-y-2">
        {slots.map(s => {
          const mapped = loadout.slots?.[s.id];
          const item = mapped ? window.DATA.itemByName[mapped] : null;
          return (
            <div key={s.id} className="grid grid-cols-[100px_1fr] items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-foreground/80">
                <Icon name={s.icon} size={13} className="text-muted-foreground"/>
                <span>{s.id}</span>
              </div>
              <button className={cn(
                "flex h-8 items-center justify-between rounded-md border px-3 text-xs transition-colors",
                item ? "border-border bg-card hover:bg-accent/50" : "border-dashed border-border bg-transparent text-muted-foreground",
              )}>
                <span className="truncate">{item ? item.displayName : 'Empty'}</span>
                <Icon name="chevDown" size={11} className="text-muted-foreground shrink-0"/>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.LoadoutsScreen = LoadoutsScreen;
