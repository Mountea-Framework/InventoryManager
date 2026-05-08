// Crafting screen — shadcn restyle
const { useState: useStateCft, useMemo: useMemoeCft, useEffect: useEffectCft } = React;

/* ============================================================
   Type definitions
   ============================================================ */
/**
 * @typedef {{ ref: string, qty: number, icon: string, tone: number }} Ingredient
 * @typedef {{ id: string, title: string, required: boolean, ingredients: Ingredient[] }} RecipeGroup
 * @typedef {{ id: string, name: string, tier: string, result: object, successChance: number, qtyMin: number, qtyMax: number, reqs: { level: number, station: string, duration: string }, groups: RecipeGroup[] }} Recipe
 */

/* ============================================================
   IntStepper — compact number stepper with optional onChange callback
   ============================================================ */
/**
 * @param {{ value: number, onChange?: (v: number) => void, warn?: boolean }} props
 */
function IntStepper({ value, onChange, warn }) {
  const [v, setV] = useStateCft(value);
  useEffectCft(() => { setV(value); }, [value]);

  const clamp  = (n) => Math.max(1, Math.min(9999, Math.floor(n || 1)));
  const bump   = (d) => {
    const next = clamp((parseInt(v, 10) || 0) + d);
    setV(next);
    onChange?.(next);
  };
  const commit = (raw) => {
    const clamped = clamp(parseInt(raw, 10));
    setV(clamped);
    onChange?.(clamped);
  };

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
   CraftingStationRow — station selector sourced from taxonomy
   ============================================================ */
/**
 * @param {{ value: string, onChange: (v: string) => void, taxonomy: object }} props
 */
function CraftingStationRow({ value, onChange, taxonomy }) {
  const stationOptions = [
    { value: 'None', label: 'None' },
    ...(taxonomy.craftingStations ?? []).map(s => ({ value: s.name, label: s.name })),
  ];
  return (
    <div className="grid grid-cols-[24px_180px_1fr] items-center gap-3 py-2">
      <Icon name="hammer" size={14} className="text-muted-foreground"/>
      <span className="text-sm text-foreground/90">Crafting Station</span>
      <div className="max-w-[260px]">
        <Select value={value} onChange={onChange} options={stationOptions}/>
      </div>
    </div>
  );
}

/* ============================================================
   DurationSliderRow — craft duration slider
   ============================================================ */
/** @param {{ value: string, onChange: (v: string) => void }} props */
function DurationSliderRow({ value, onChange }) {
  const DURATION_MIN = 1;
  const DURATION_MAX = 600;

  const parsed = parseInt(value, 10) || 60;
  const [v, setV] = useStateCft(parsed);
  useEffectCft(() => { setV(parseInt(value, 10) || 60); }, [value]);

  const pct = ((v - DURATION_MIN) / (DURATION_MAX - DURATION_MIN)) * 100;

  const handleChange = (next) => {
    setV(next);
    onChange?.(`${next}s`);
  };

  return (
    <div className="grid grid-cols-[24px_180px_1fr_80px] items-center gap-3 py-2">
      <Icon name="history" size={14} className="text-muted-foreground"/>
      <span className="text-sm text-foreground/90">Craft Duration</span>
      <div className="relative flex h-5 items-center">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }}/>
        </div>
        <input
          type="range" min={DURATION_MIN} max={DURATION_MAX} value={v}
          onChange={e => handleChange(+e.target.value)}
          className="absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
        />
        <div
          className="pointer-events-none absolute h-4 w-4 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow top-1/2"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
      <span className="text-right font-mono text-xs">{v}s</span>
    </div>
  );
}

/* ============================================================
   IngredientPickerModal — searchable material item picker
   ============================================================ */
/**
 * Modal for selecting a crafting material to add as an ingredient.
 * Filters to items whose tags include any tag starting with 'Item.Material'.
 * @param {{ open: boolean, onOpenChange: (v: boolean) => void, onAdd: (ing: Ingredient) => void }} props
 */
function IngredientPickerModal({ open, onOpenChange, onAdd }) {
  const [query, setQuery] = useStateCft('');

  const materials = useMemoeCft(() =>
    window.DATA.allItems.filter(it => it.tags?.some(t => t.startsWith('Item.Material'))),
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
      <div className="w-full max-w-[92vw] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl sm:w-[480px]">
        {/* Header */}
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Add Ingredient</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Showing items tagged as crafting materials (Item.Material.*)</p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Icon name="search" size={14} className="shrink-0 text-muted-foreground"/>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search materials…"
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
              <Icon name="x" size={14}/>
            </button>
          )}
        </div>

        {/* Item list */}
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground">No matching materials found.</div>
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

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border px-4 py-3">
          <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
        </div>
      </div>
    </Dialog>
  );
}

/* ============================================================
   RecipeInspector — right-panel inspector
   ============================================================ */
/** @param {{ recipe: Recipe }} props */
function RecipeInspector({ recipe }) {
  const ings = recipe.groups.flatMap(g => g.ingredients);
  return (
    <div className="space-y-4 p-4">
      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Output</div>
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
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stats</div>
        <div className="space-y-1.5 rounded-md border border-border/50 bg-card/40 p-3 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Success Chance</span><span className="font-mono">{recipe.successChance}%</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-mono">{recipe.reqs.duration}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Station</span><span className="font-mono">{recipe.reqs.station}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Ingredients</span><span className="font-mono">{ings.length}</span></div>
        </div>
      </div>

      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ingredient Tally</div>
        <div className="space-y-1">
          {ings.map((ing, i) => {
            const match = window.DATA.allItems.find(it => it.displayName === ing.ref);
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
 * Editable recipe form. Resets when the selected recipe changes (parent uses key={recipe.id}).
 * @param {{ recipe: Recipe, taxonomy: object }} props
 */
function RecipeEditor({ recipe, taxonomy }) {
  const [draft, setDraft] = useStateCft(recipe);

  const [ingredientModalGroupId, setIngredientModalGroupId] = useStateCft(null);

  const setResult = (patch) => setDraft(d => ({ ...d, result: { ...d.result, ...patch } }));
  const setReqs   = (patch) => setDraft(d => ({ ...d, reqs:   { ...d.reqs,   ...patch } }));

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

  const craftableItems = useMemoeCft(
    () => window.DATA.allItems.filter(it => it.flags & (1 << 2)),
    [],
  );

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
        <div className="flex items-start gap-4">
          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
            <Icon name="hammer" size={22}/>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold tracking-tight">{draft.name}</h1>
            <div className="mt-1 font-mono text-xs text-muted-foreground">id: {draft.id.toLowerCase()}</div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {/* Resulting Item */}
        <Section title="Resulting Item" icon="cube">
          <Row label="Base Template" hint="Craftable item this recipe produces">
            <Select
              value={draft.result.display}
              onChange={v => {
                const item = window.DATA.itemByName[v];
                setResult({ display: v, itemRef: item?.guid || v });
              }}
              options={[
                { value: '', label: '— select craftable item —' },
                ...craftableItems.map(it => ({ value: it.displayName, label: it.displayName })),
              ]}
              placeholder="Select craftable item…"
            />
          </Row>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <Row label="Success Chance">
              <TextField
                value={`${draft.successChance}%`}
                onChange={v => setDraft(d => ({ ...d, successChance: parseInt(v) || 0 }))}
                mono
              />
            </Row>
            <Row label="Quantity Min / Max">
              <TextField
                value={String(draft.qtyMin)}
                onChange={v => setDraft(d => ({ ...d, qtyMin: parseInt(v) || 1 }))}
                mono
              />
            </Row>
          </div>
        </Section>

        {/* Global Requirements */}
        <Section title="Global Requirements" icon="info">
          <CraftingStationRow
            value={draft.reqs.station}
            onChange={v => setReqs({ station: v })}
            taxonomy={taxonomy}
          />
          <DurationSliderRow
            value={draft.reqs.duration}
            onChange={v => setReqs({ duration: v })}
          />
        </Section>

        {/* Ingredient groups */}
        {draft.groups.map(g => (
          <Section
            key={g.id}
            title={g.title + (g.oneOf ? ' (one of)' : '')}
            icon={g.required ? 'tag' : 'sparkle'}
            right={
              <Button icon="plus" size="sm" variant="ghost" onClick={() => setIngredientModalGroupId(g.id)}>
                Add Ingredient
              </Button>
            }
          >
            <div className="space-y-1.5">
              {g.ingredients.map((ing, ii) => {
                const match = window.DATA.allItems.find(it => it.displayName === ing.ref);
                return (
                  <div key={ii} className="grid grid-cols-[36px_1fr_120px_32px] items-center gap-3 rounded-lg border border-border bg-card p-2.5">
                    <Thumb size={32} tone={match?._ui?.thumbTone ?? ing.tone} icon={match?._ui?.icon || ing.icon}/>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">REF_ID</div>
                      <div className="truncate font-mono text-xs">{ing.ref}</div>
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</div>
                      <IntStepper
                        value={ing.qty}
                        warn={!match}
                        onChange={qty => updateIngredientQty(g.id, ii, qty)}
                      />
                    </div>
                    <IconBtn icon="trash" tone="danger" onClick={() => removeIngredient(g.id, ii)}/>
                  </div>
                );
              })}
              {g.ingredients.length === 0 && (
                <div className="py-4 text-center text-xs text-muted-foreground italic">No ingredients yet.</div>
              )}
            </div>
          </Section>
        ))}
      </div>

      {/* Ingredient picker modal — one shared instance, keyed by active group */}
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
 * @param {{ search: string, tweaks: object }} props
 */
function CraftingScreen({ search: globalSearch, tweaks = {} }) {
  const [tax] = useTaxonomy();
  const [selected,      setSelected]      = useStateCft('RECIPE_SMITH_042');
  const [browserSearch, setBrowserSearch] = useStateCft('');
  const allRecipes = Object.values(window.DATA.recipes).flat();
  const recipe     = allRecipes.find(r => r.id === selected);
  const search     = (browserSearch || globalSearch || '').toLowerCase();
  const showInspector = tweaks.showInspector !== false;

  return (
    <>
      <LeftPanel
        title="Recipe Templates"
        headerActions={<IconBtn icon="plus" title="New recipe"/>}
        search={browserSearch} setSearch={setBrowserSearch}
        searchPlaceholder="Filter recipes…"
      >
        {Object.entries(window.DATA.recipes).map(([family, recipes]) => {
          const icon     = family === 'Smithing' ? 'hammer' : 'beaker';
          const filtered = search ? recipes.filter(r => (r.name + ' ' + r.id).toLowerCase().includes(search)) : recipes;
          if (filtered.length === 0) return null;
          return (
            <div key={family} className="mb-1">
              <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Icon name={icon} size={12}/>
                <span className="flex-1">{family}</span>
                <span className="font-mono text-[10px] text-muted-foreground/70">{filtered.length}</span>
              </div>
              {filtered.map(r => (
                <SidebarItem key={r.id} selected={r.id === selected} onClick={() => setSelected(r.id)}>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.name}</div>
                    <div className="truncate font-mono text-[10px] text-muted-foreground">{r.id}</div>
                  </div>
                </SidebarItem>
              ))}
            </div>
          );
        })}
      </LeftPanel>

      <main className="min-w-0 flex-1 overflow-auto">
        {recipe && <RecipeEditor key={recipe.id} recipe={recipe} taxonomy={tax}/>}
      </main>

      {showInspector && recipe && (
        <CollapsibleAside storageKey="aside-inspector" width={340}>
          <RecipeInspector recipe={recipe}/>
        </CollapsibleAside>
      )}
    </>
  );
}

window.CraftingScreen = CraftingScreen;
