// Architect Editor — App shell + Screen router (shadcn-styled)
const { useState: useStateApp, useEffect: useEffectApp } = React;

function TopBar({ screen, setScreen, globalSearch, setGlobalSearch, openSettings }) {
  const tabs = [
    { id: 'items',    label: 'Inventory' },
    { id: 'loadouts', label: 'Loadouts' },
    { id: 'crafting', label: 'Crafting' },
  ];
  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Brand mark */}
      <div className="flex items-center gap-2.5">
        <div className="leading-tight">
          <div className="text-sm font-semibold">Mountea</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Inventory</div>
        </div>
      </div>

      <Separator orientation="vertical" className="mx-2 h-6"/>

      {/* shadcn Tabs (pill style on muted) */}
      <nav className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setScreen(t.id)}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium",
              "ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              screen === t.id
                ? "bg-background text-foreground shadow"
                : "hover:text-foreground/80",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex-1"/>

      {/* Search */}
      <div className="relative w-[280px]">
        <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"/>
        <Input
          placeholder="Search templates, tags, refs…"
          value={globalSearch}
          onChange={e => setGlobalSearch(e.target.value)}
          className="pl-8 pr-12"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <Button variant="ghost" size="icon-sm" title="Save workspace" icon="save"/>
      <Button variant="ghost" size="icon-sm" title="Export data" icon="export"/>
      <Button variant="ghost" size="icon-sm" title="Settings (⌘,)" icon="cog" onClick={openSettings}/>
    </header>
  );
}

function StatusBar({ counts }) {
  return (
    <footer className="flex h-7 items-center gap-4 border-t border-border bg-muted/30 px-3 font-mono text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"/>
        workspace synced
      </span>
      <span>branch: <span className="text-foreground/80">main</span></span>
      <span>refs: <span className="text-foreground/80">{counts.items} items · {counts.loadouts} loadouts · {counts.recipes} recipes</span></span>
      <div className="flex-1"/>
      <span>schema: <span className="text-foreground/80">v2.6.0</span></span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500"/>
        3 unresolved refs
      </span>
      <span>LN 1, COL 1</span>
    </footer>
  );
}

function App() {
  const [screen, setScreen] = useStateApp(() => localStorage.getItem('arch.screen') || 'items');
  const [globalSearch, setGlobalSearch] = useStateApp('');
  const [tweaks, setTweaks] = useStateApp(() => {
    try { return JSON.parse(localStorage.getItem('arch.tweaks') || '{}'); } catch { return {}; }
  });

  useEffectApp(() => { localStorage.setItem('arch.screen', screen); }, [screen]);

  // One-time migration: unify the right-inspector collapse state across screens
  useEffectApp(() => {
    if (localStorage.getItem('arch.aside-migrated-v1')) return;
    ['aside-items', 'aside-loadouts', 'aside-crafting'].forEach(k => localStorage.removeItem(k));
    localStorage.setItem('arch.aside-migrated-v1', '1');
  }, []);

  const [settingsOpen, setSettingsOpen] = useStateApp(false);

  // ⌘, / Ctrl+, opens settings; Esc/Enter handled inside palette
  useEffectApp(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === ',') { e.preventDefault(); setSettingsOpen(o => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const [tweaksOpen, setTweaksOpen] = useStateApp(false);
  useEffectApp(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const setTweak = (k, v) => {
    const next = { ...tweaks, [k]: v };
    setTweaks(next);
    localStorage.setItem('arch.tweaks', JSON.stringify(next));
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
  };

  const counts = {
    items: window.DATA.allItems.length,
    loadouts: window.DATA.loadouts.length,
    recipes: Object.values(window.DATA.recipes).flat().length,
  };

  const ScreenComp = screen === 'items' ? window.ItemsScreen
    : screen === 'loadouts' ? window.LoadoutsScreen
    : window.CraftingScreen;

  return (
    <div data-screen-label={screen} className="flex h-screen flex-col bg-background text-foreground">
      <TopBar screen={screen} setScreen={setScreen} globalSearch={globalSearch} setGlobalSearch={setGlobalSearch} openSettings={() => setSettingsOpen(true)}/>
      <div className="flex flex-1 overflow-hidden">
        <ScreenComp search={globalSearch} tweaks={tweaks}/>
      </div>
      <window.SettingsCommand
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        screen={screen} setScreen={setScreen}
        tweaks={tweaks} setTweak={setTweak}
      />
      {tweaksOpen && <TweaksPanel tweaks={tweaks} setTweak={setTweak} close={() => {
        setTweaksOpen(false);
        window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
      }}/>}
    </div>
  );
}

function TweaksPanel({ tweaks, setTweak, close }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider">Tweaks</span>
        <Button variant="ghost" size="icon-sm" onClick={close} icon="x"/>
      </div>
      <div className="space-y-4 p-3">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Density</Label>
          <div className="flex gap-1.5">
            {['compact', 'comfortable'].map(d => {
              const active = (tweaks.density || 'comfortable') === d;
              return (
                <Button key={d} size="sm"
                  variant={active ? 'default' : 'outline'}
                  onClick={() => setTweak('density', d)}>{d}</Button>
              );
            })}
          </div>
        </div>
        <Separator/>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Show inspector</Label>
            <p className="text-xs text-muted-foreground">Right-side panel on Loadouts &amp; Items</p>
          </div>
          <Switch checked={tweaks.showInspector !== false} onCheckedChange={v => setTweak('showInspector', v)}/>
        </div>
      </div>
    </div>
  );
}

window.App = App;
