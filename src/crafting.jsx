// Crafting screen — shadcn restyle
const { useState: useStateCft } = React;

function IntStepper({ value, warn }) {
  const [v, setV] = useStateCft(value);
  React.useEffect(() => { setV(value); }, [value]);
  const clamp = (n) => Math.max(1, Math.min(9999, Math.floor(n || 1)));
  const bump = (d) => setV((x) => clamp((parseInt(x, 10) || 0) + d));
  return (
    <div className="inline-flex h-8 items-stretch overflow-hidden rounded-md border border-input bg-transparent shadow-sm">
      <button onClick={() => bump(-1)} className="flex w-7 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">−</button>
      <input type="number" min={1} max={9999} value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={(e) => setV(clamp(parseInt(e.target.value, 10)))}
        className={cn("w-12 border-x border-border bg-transparent text-center font-mono text-xs outline-none",
          warn ? "text-amber-400" : "text-foreground")}/>
      <button onClick={() => bump(1)} className="flex w-7 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">+</button>
    </div>
  );
}

function CraftingScreen({ search: globalSearch, tweaks = {} }) {
  const [selected, setSelected] = useStateCft('RECIPE_SMITH_042');
  const [browserSearch, setBrowserSearch] = useStateCft('');
  const allRecipes = Object.values(window.DATA.recipes).flat();
  const recipe = allRecipes.find(r => r.id === selected);
  const search = (browserSearch || globalSearch || '').toLowerCase();
  const showInspector = tweaks.showInspector !== false;

  return (
    <>
      <LeftPanel
        title="Recipe Templates"
        headerActions={<IconBtn icon="plus" title="New recipe"/>}
        search={browserSearch} setSearch={setBrowserSearch}
        searchPlaceholder="Filter recipes…">
        {Object.entries(window.DATA.recipes).map(([family, recipes]) => {
          const icon = family === 'Smithing' ? 'hammer' : 'beaker';
          const filtered = search ? recipes.filter(r => (r.name + ' ' + r.id).toLowerCase().includes(search)) : recipes;
          if (filtered.length === 0) return null;
          return (
            <div key={family} className="mb-1">
              <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Icon name={icon} size={12}/>
                <span className="flex-1">{family}</span>
                <span className="font-mono text-[10px] text-muted-foreground/70">{filtered.length}</span>
              </div>
              {filtered.map(r => {
                const sel = r.id === selected;
                return (
                  <SidebarItem key={r.id} selected={sel} onClick={() => setSelected(r.id)}>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{r.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground truncate">{r.id}</div>
                    </div>
                  </SidebarItem>
                );
              })}
            </div>
          );
        })}
      </LeftPanel>

      <main className="flex-1 min-w-0 overflow-auto">
        {recipe && <RecipeEditor recipe={recipe}/>}
      </main>

      {showInspector && recipe && (
        <CollapsibleAside storageKey="aside-inspector" width={340}>
          <RecipeInspector recipe={recipe}/>
        </CollapsibleAside>
      )}
    </>
  );
}

function RecipeInspector({ recipe }) {
  const ings = recipe.groups.flatMap(g => g.ingredients);
  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Output</div>
        <div className="flex items-center gap-2.5 rounded-md border border-border bg-card p-2.5">
          <Thumb size={32} tone={recipe.result.tone} icon={recipe.result.icon}/>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{recipe.result.display}</div>
            <div className="font-mono text-[10px] text-muted-foreground truncate">{recipe.result.itemRef}</div>
          </div>
          <span className="font-mono text-xs text-primary">×{recipe.qtyMin}</span>
        </div>
      </div>

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Stats</div>
        <div className="space-y-1.5 rounded-md border border-border/50 bg-card/40 p-3 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Success Chance</span><span className="font-mono">{recipe.successChance}%</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-mono">{recipe.reqs.duration}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Station</span><span className="font-mono">{recipe.reqs.station}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Ingredients</span><span className="font-mono">{ings.length}</span></div>
        </div>
      </div>

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Ingredient Tally</div>
        <div className="space-y-1">
          {ings.map((ing, i) => {
            const match = window.DATA.allItems.find(it => it.name === ing.ref);
            return (
              <div key={i} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50">
                <Thumb size={20} tone={match?.thumbTone ?? ing.tone} icon={match?.icon || ing.icon}/>
                <span className="font-mono text-[11px] flex-1 truncate">{ing.ref}</span>
                <span className="font-mono text-[11px] text-primary">×{ing.qty}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RecipeEditor({ recipe }) {
  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-6 py-4">
        <div className="flex items-start gap-4">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground shrink-0">
            <Icon name="hammer" size={22}/>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">{recipe.name}</h1>
            <div className="font-mono text-xs text-muted-foreground mt-1">id: {recipe.id.toLowerCase()}</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <Section title="Resulting Item" icon="cube">
          <Row label="Base Template" hint="Reference to an Item Template">
            <div className="flex items-center gap-2.5 rounded-md border border-input bg-transparent p-1.5 pr-3">
              <Thumb size={28} tone={recipe.result.tone} icon={recipe.result.icon}/>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs">{recipe.result.itemRef}</div>
                <div className="text-[10.5px] text-muted-foreground">{recipe.result.display}</div>
              </div>
              <IconBtn icon="open" title="Open item"/>
            </div>
          </Row>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <Row label="Success Chance"><TextField value={`${recipe.successChance}%`} mono/></Row>
            <Row label="Quantity Min / Max"><TextField value={String(recipe.qtyMin)} mono/></Row>
          </div>
        </Section>

        <Section title="Global Requirements" icon="info">
          <CraftingStationRow recipe={recipe}/>
          <DurationSliderRow recipe={recipe}/>
        </Section>

        {recipe.groups.map((g) => (
          <Section key={g.id} title={g.title + (g.oneOf ? ' (one of)' : '')} icon={g.required ? 'tag' : 'sparkle'}
            right={<Button icon="plus" size="sm" variant="ghost">Add Ingredient</Button>}>
            <div className="space-y-1.5">
              {g.ingredients.map((ing, ii) => {
                const match = window.DATA.allItems.find(i => i.name === ing.ref);
                return (
                  <div key={ii} className="grid grid-cols-[36px_1fr_120px_32px] items-center gap-3 rounded-lg border border-border bg-card p-2.5">
                    <Thumb size={32} tone={match?.thumbTone ?? ing.tone} icon={match?.icon || ing.icon}/>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">REF_ID</div>
                      <div className="font-mono text-xs">{ing.ref}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Amount</div>
                      <IntStepper value={ing.qty} warn={!match}/>
                    </div>
                    <IconBtn icon="trash" tone="danger"/>
                  </div>
                );
              })}
            </div>
          </Section>
        ))}

        <Section title="Dependency Flow" icon="branch">
          <DependencyDiagram recipe={recipe}/>
        </Section>

        <Section title="Output Metadata" icon="tag" defaultOpen={false} compact>
          <Row label="Applied Tags">
            <div className="flex flex-wrap gap-1.5">
              <Tag tone="rare">crafted</Tag>
              <Tag tone="quest">masterwork</Tag>
              <Tag>durable</Tag>
            </div>
          </Row>
          <Row label="Inherit From Base"><Toggle on={true} onChange={() => {}}/></Row>
          <Row label="Override Rarity"><Select value="Inherit" options={['Inherit','Common','Uncommon','Rare','Epic','Legendary']}/></Row>
        </Section>
      </div>
    </div>
  );
}

function CraftingStationRow({ recipe }) {
  const [v, setV] = useStateCft(recipe.reqs.station);
  React.useEffect(() => { setV(recipe.reqs.station); }, [recipe.id]);
  const stations = ['None', 'Workbench', 'Forge', 'Dragonforge', 'Alchemy Bench', 'Shadow Altar', 'Loom', 'Arcane Table'];
  return (
    <div className="grid grid-cols-[24px_180px_1fr] items-center gap-3 py-2">
      <Icon name="folder" size={14} className="text-muted-foreground"/>
      <span className="text-sm text-foreground/90">Crafting Place Required</span>
      <div className="max-w-[260px]"><Select value={v} onChange={setV} options={stations}/></div>
    </div>
  );
}

function DurationSliderRow({ recipe }) {
  const initial = parseInt(recipe.reqs.duration, 10) || 60;
  const [v, setV] = useStateCft(initial);
  React.useEffect(() => { setV(parseInt(recipe.reqs.duration, 10) || 60); }, [recipe.id]);
  const min = 1, max = 100;
  const pct = ((v - min) / (max - min)) * 100;
  return (
    <div className="grid grid-cols-[24px_180px_1fr_80px] items-center gap-3 py-2">
      <Icon name="history" size={14} className="text-muted-foreground"/>
      <span className="text-sm text-foreground/90">Craft Duration</span>
      <div className="relative h-5 flex items-center">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }}/>
        </div>
        <input type="range" min={min} max={max} value={v}
          onChange={e => setV(+e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer m-0"/>
        <div className="absolute h-4 w-4 rounded-full bg-background border-2 border-primary shadow pointer-events-none top-1/2 -translate-y-1/2"
          style={{ left: `calc(${pct}% - 8px)` }}/>
      </div>
      <span className="font-mono text-xs text-right">{v}s</span>
    </div>
  );
}

function DependencyDiagram({ recipe }) {
  const ings = recipe.groups.flatMap(g => g.ingredients);
  const nodeH = 28, nodeW = 180, gap = 12;
  const total = ings.length;
  const height = Math.max(total * (nodeH + gap) + 20, 180);
  return (
    <div className="rounded-md border border-border bg-card/50 p-4 overflow-auto">
      <svg width="100%" height={height} viewBox={`0 0 640 ${height}`} className="block">
        <defs>
          <marker id="arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="hsl(var(--primary))"/>
          </marker>
        </defs>
        {ings.map((ing, i) => {
          const y = 20 + i * (nodeH + gap);
          return (
            <g key={i}>
              <rect x="10" y={y} width={nodeW} height={nodeH} rx="5"
                fill="hsl(var(--muted))" stroke="hsl(var(--border))"/>
              <text x="20" y={y + 17} fill="hsl(var(--foreground))" fontSize="11" fontFamily="JetBrains Mono">
                {ing.ref.length > 22 ? ing.ref.slice(0, 21) + '…' : ing.ref}
              </text>
              <text x={nodeW} y={y + 17} textAnchor="end" dx="-10"
                fill="hsl(var(--primary))" fontSize="11" fontFamily="JetBrains Mono">×{ing.qty}</text>
              <path d={`M ${10 + nodeW} ${y + nodeH/2} C ${10 + nodeW + 60} ${y + nodeH/2}, 310 ${height/2}, 340 ${height/2}`}
                fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1" markerEnd={i === ings.length - 1 ? "url(#arr2)" : ""}/>
            </g>
          );
        })}
        <g>
          <rect x="330" y={height/2 - 18} width="120" height="36" rx="6"
            fill="hsl(var(--secondary))" stroke="hsl(var(--primary))" strokeOpacity="0.5"/>
          <text x="390" y={height/2 - 2} textAnchor="middle" fill="hsl(var(--primary))" fontSize="10" fontFamily="JetBrains Mono" letterSpacing="1">RECIPE</text>
          <text x="390" y={height/2 + 12} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="11" fontFamily="JetBrains Mono">{recipe.id.split('_').pop()}</text>
        </g>
        <path d={`M 450 ${height/2} L 490 ${height/2}`} stroke="hsl(var(--muted-foreground))" strokeWidth="1" markerEnd="url(#arr2)"/>
        <g>
          <rect x="490" y={height/2 - 22} width="140" height="44" rx="6" fill="hsl(var(--muted))" stroke="hsl(var(--border))"/>
          <text x="500" y={height/2 - 5} fill="hsl(var(--muted-foreground))" fontSize="9" fontFamily="JetBrains Mono" letterSpacing="1">OUTPUT</text>
          <text x="500" y={height/2 + 10} fill="hsl(var(--foreground))" fontSize="11" fontFamily="JetBrains Mono">
            {recipe.result.itemRef.length > 18 ? recipe.result.itemRef.slice(0,17)+'…' : recipe.result.itemRef}
          </text>
          <text x="622" y={height/2 + 10} textAnchor="end" fill="hsl(var(--primary))" fontSize="11" fontFamily="JetBrains Mono">×{recipe.qtyMin}</text>
        </g>
      </svg>
    </div>
  );
}

window.CraftingScreen = CraftingScreen;
