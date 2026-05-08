// Loadouts screen — shadcn restyle
const { useState: useStateLdt, useEffect: useEffectLdt } = React;

/* ============================================================
   Type definitions
   ============================================================ */
/**
 * @typedef {{ ref: string, qty: number, durability: number|null, autoEquip: boolean, slot: string|null }} LoadoutItem
 * @typedef {{ id: string, name: string, version: string, desc: string, tagline: string, items: LoadoutItem[], slots: Object.<string,string|null> }} Loadout
 */

/* ============================================================
   Constants
   ============================================================ */
const DROP_ON_DEATH_OPTIONS = ['None', 'Equipped only', 'All items'];

/* ============================================================
   LoadoutItemModal — create / edit a single loadout item entry
   ============================================================ */
/**
 * Dialog for adding or editing a single item entry within a loadout.
 * Pass item=null for create mode; pass an existing LoadoutItem for edit mode.
 * @param {{ open: boolean, onOpenChange: (v: boolean) => void, item: LoadoutItem|null, onSave: (item: LoadoutItem) => void, taxonomy: object }} props
 */
function LoadoutItemModal({ open, onOpenChange, item, onSave, taxonomy }) {
  const isEdit = item != null;

  const buildDraft = (src) => ({
    ref:        src?.ref        ?? '',
    qty:        src?.qty        ?? 1,
    durability: src?.durability ?? 1.0,
    autoEquip:  src?.autoEquip  ?? false,
    slot:       src?.slot       ?? null,
  });

  const [draft, setDraft] = useStateLdt(() => buildDraft(item));

  useEffectLdt(() => { setDraft(buildDraft(item)); }, [item]);

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
      <div className="w-full max-w-[92vw] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl sm:w-[480px]">
        {/* Header */}
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{isEdit ? 'Edit Loadout Item' : 'Add Item to Loadout'}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isEdit ? 'Update the quantity, slot, or behaviour for this entry.' : 'Select an item template and configure its spawn properties.'}
          </p>
        </div>

        {/* Body */}
        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Item Template</Label>
            <Select
              value={draft.ref}
              onChange={v => setDraft(d => ({ ...d, ref: v }))}
              options={[{ value: '', label: '— select item —' }, ...window.DATA.allItems.map(it => ({ value: it.displayName, label: it.displayName }))]}
              placeholder="Select item…"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quantity</Label>
              <Input
                type="number" min={1}
                value={String(draft.qty)}
                onChange={e => setDraft(d => ({ ...d, qty: Math.max(1, parseInt(e.target.value) || 1) }))}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Durability <span className="normal-case text-muted-foreground/60">(0–1)</span></Label>
              <Input
                type="number" min={0} max={1} step={0.01}
                value={String(draft.durability)}
                onChange={e => setDraft(d => ({ ...d, durability: Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)) }))}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Auto-Equip on Spawn</Label>
              <Switch checked={draft.autoEquip} onCheckedChange={v => setDraft(d => ({ ...d, autoEquip: v }))}/>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Preferred Slot</Label>
              <Select
                value={draft.slot ?? ''}
                onChange={v => setDraft(d => ({ ...d, slot: v || null }))}
                options={slotOptions}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!canSave}>
            {isEdit ? 'Save Changes' : 'Add to Loadout'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/* ============================================================
   LoadoutsScreen — top-level screen component
   ============================================================ */
/**
 * @param {{ search: string, tweaks: object }} props
 */
function LoadoutsScreen({ search: globalSearch, tweaks }) {
  const [tax] = useTaxonomy();
  const [selected,      setSelected]      = useStateLdt('LDT_001');
  const [browserSearch, setBrowserSearch] = useStateLdt('');
  const loadout = window.DATA.loadouts.find(l => l.id === selected);
  const search  = (browserSearch || globalSearch || '').toLowerCase();
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
        searchPlaceholder="Filter loadouts…"
      >
        {filtered.map(l => {
          const sel = l.id === selected;
          return (
            <SidebarItem key={l.id} selected={sel} onClick={() => setSelected(l.id)} className="block py-2.5">
              <div className="min-w-0 w-full">
                <div className="truncate text-sm font-medium">{l.name}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{l.desc}</div>
                <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                  <span>{l.items.length} items</span>
                  <span className="opacity-50">·</span>
                  <span>{Object.keys(l.slots || {}).length} slots</span>
                </div>
              </div>
            </SidebarItem>
          );
        })}
      </LeftPanel>

      <main className="min-w-0 flex-1 overflow-auto">
        {loadout && <LoadoutEditor key={loadout.id} loadout={loadout} taxonomy={tax}/>}
      </main>

      {showInspector && loadout && (
        <CollapsibleAside storageKey="aside-inspector" width={340}>
          <SlotMapping loadout={loadout} taxonomy={tax}/>
        </CollapsibleAside>
      )}
    </>
  );
}

/* ============================================================
   LoadoutEditor — main editor with local draft state
   ============================================================ */
/**
 * Editable loadout form. Resets when loadout changes (parent uses key={loadout.id}).
 * @param {{ loadout: Loadout, taxonomy: object }} props
 */
function LoadoutEditor({ loadout, taxonomy }) {
  const [draft, setDraft] = useStateLdt(() => ({ ...loadout }));

  const [addModalOpen,  setAddModalOpen]  = useStateLdt(false);
  const [editModalData, setEditModalData] = useStateLdt(null); // { item: LoadoutItem, idx: number } | null

  const addItem = (item) => setDraft(d => ({ ...d, items: [...d.items, item] }));

  const updateItem = (idx, item) =>
    setDraft(d => {
      const items = [...d.items];
      items[idx] = item;
      return { ...d, items };
    });

  const removeItem = (idx) => setDraft(d => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
        <div className="flex items-start gap-4">
          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
            <Icon name="layers" size={22}/>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold tracking-tight">{draft.name}</h1>
            <div className="mt-1 font-mono text-xs text-muted-foreground">id: {draft.id.toLowerCase()}</div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {/* Composition */}
        <Section title="Composition" icon="list"
          right={
            <Button icon="plus" size="sm" variant="ghost" onClick={() => setAddModalOpen(true)}>
              Add Item
            </Button>
          }
        >
          <div className="space-y-1.5">
            <div className="grid grid-cols-[28px_minmax(180px,2fr)_88px_minmax(110px,1fr)_72px] items-center gap-2 px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div/>
              <div>Item Reference</div>
              <div>Qty</div>
              <div>Preferred Slot</div>
              <div/>
            </div>

            {draft.items.map((it, idx) => {
              const src = window.DATA.itemByName[it.ref];
              return (
                <div key={idx} className="grid grid-cols-[28px_minmax(180px,2fr)_88px_minmax(110px,1fr)_72px] items-center gap-2 rounded-lg border border-border bg-card p-2">
                  <div className="flex justify-center text-muted-foreground/60">
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
                    <IconBtn icon="cog" title="Edit item" onClick={() => setEditModalData({ item: it, idx })}/>
                    <IconBtn icon="trash" tone="danger" title="Remove" onClick={() => removeItem(idx)}/>
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => setAddModalOpen(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              <Icon name="plus" size={12}/> Add Item to Composition
            </button>
          </div>
        </Section>

        {/* Spawn Behaviour */}
        <Section title="Spawn Behaviour" icon="bolt" compact>
          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <Row label="Apply on spawn"><Toggle on={true} onChange={() => {}}/></Row>
              <Row label="Randomise qty"><Toggle on={false} onChange={() => {}}/></Row>
            </div>
            <div>
              <Row label="Auto-equip pass"><Toggle on={true} onChange={() => {}}/></Row>
              <Row label="Drop on death">
                <Select value="Equipped only" options={DROP_ON_DEATH_OPTIONS}/>
              </Row>
            </div>
          </div>
        </Section>
      </div>

      {/* Modals */}
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
   SlotMapping — inspector aside showing slot assignments
   ============================================================ */
/**
 * Displays the loadout's slot-to-item mapping using attachment slots from taxonomy.
 * @param {{ loadout: Loadout, taxonomy: object }} props
 */
function SlotMapping({ loadout, taxonomy }) {
  const slots = taxonomy.attachmentSlots ?? [];

  return (
    <div className="space-y-3 p-4 pt-10">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Slot Mapping</div>
      <div className="space-y-2">
        {slots.map(s => {
          const mapped = loadout.slots?.[s.name];
          const item   = mapped ? window.DATA.itemByName[mapped] : null;
          return (
            <div key={s.id} className="grid grid-cols-[110px_1fr] items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                <Icon name="link" size={12} className="text-muted-foreground"/>
                <span className="truncate">{s.name}</span>
              </div>
              <button className={cn(
                'flex h-8 items-center justify-between rounded-md border px-3 text-xs transition-colors',
                item ? 'border-border bg-card hover:bg-accent/50' : 'border-dashed border-border bg-transparent text-muted-foreground',
              )}>
                <span className="truncate">{item ? item.displayName : 'Empty'}</span>
                <Icon name="chevDown" size={11} className="shrink-0 text-muted-foreground"/>
              </button>
            </div>
          );
        })}
        {slots.length === 0 && (
          <div className="py-4 text-center text-xs text-muted-foreground">No attachment slots defined. Add them in Settings → Attachment Slots.</div>
        )}
      </div>
    </div>
  );
}

window.LoadoutsScreen = LoadoutsScreen;
