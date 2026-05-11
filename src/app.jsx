import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  cn, Icon, Button, Input, Separator, Tooltip, TooltipProvider,
} from './ui.jsx';
import { ItemsScreen }   from './items.jsx';
import { LoadoutsScreen } from './loadouts.jsx';
import { CraftingScreen } from './crafting.jsx';
import { SettingsCommand } from './settings.jsx';
import { loadData } from './store.js';

function TopBar({ screen, setScreen, globalSearch, setGlobalSearch, openSettings }) {
  const { t } = useTranslation();
  const tabs = [
    { id: 'items',    label: t('nav.inventory'), tip: t('nav.inventoryTip') },
    { id: 'loadouts', label: t('nav.loadouts'),  tip: t('nav.loadoutsTip') },
    { id: 'crafting', label: t('nav.crafting'),  tip: t('nav.craftingTip') },
  ];
  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Brand mark */}
      <div className="flex items-center gap-2.5">
        <div className="leading-tight">
          <div className="text-sm font-semibold">{t('app.brand')}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('app.brandSub')}</div>
        </div>
      </div>

      <Separator orientation="vertical" className="mx-2 h-6"/>

      {/* Tabs (pill style on muted) */}
      <nav className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
        {tabs.map(tab => (
          <Tooltip key={tab.id} content={tab.tip}>
            <button
              onClick={() => setScreen(tab.id)}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium",
                "ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                screen === tab.id
                  ? "bg-background text-foreground shadow"
                  : "hover:text-foreground/80",
              )}
            >
              {tab.label}
            </button>
          </Tooltip>
        ))}
      </nav>

      <div className="flex-1"/>

      {/* Search */}
      <div className="relative w-[280px]">
        <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"/>
        <Input
          placeholder={t('app.searchPlaceholder')}
          value={globalSearch}
          onChange={e => setGlobalSearch(e.target.value)}
          className="pl-8 pr-12"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <Tooltip content={t('app.saveWorkspace')}>
        <Button variant="ghost" size="icon-sm" icon="save"/>
      </Tooltip>
      <Tooltip content={t('app.exportData')}>
        <Button variant="ghost" size="icon-sm" icon="export"/>
      </Tooltip>
      <Tooltip content={t('app.settingsTip')}>
        <Button variant="ghost" size="icon-sm" icon="cog" onClick={openSettings}/>
      </Tooltip>
    </header>
  );
}

function StatusBar({ counts }) {
  const { t } = useTranslation();
  return (
    <footer className="flex h-7 items-center gap-4 border-t border-border bg-muted/30 px-3 font-mono text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"/>
        {t('app.statusSynced')}
      </span>
      <span>{t('app.statusBranch')} <span className="text-foreground/80">{t('app.statusMain')}</span></span>
      <span>{t('app.statusRefs')} <span className="text-foreground/80">{counts.items} {t('app.statusItems')} · {counts.loadouts} {t('app.statusLoadouts')} · {counts.recipes} {t('app.statusRecipes')}</span></span>
      <div className="flex-1"/>
      <span>{t('app.statusSchema')} <span className="text-foreground/80">v2.6.0</span></span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500"/>
        3 {t('app.statusUnresolved')}
      </span>
      <span>LN 1, COL 1</span>
    </footer>
  );
}

function App() {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState(() => localStorage.getItem('arch.screen') || 'items');
  const [globalSearch, setGlobalSearch] = useState('');
  useEffect(() => { loadData().then(() => setReady(true)); }, []);

  useEffect(() => { localStorage.setItem('arch.screen', screen); }, [screen]);

  useEffect(() => {
    if (localStorage.getItem('arch.aside-migrated-v1')) return;
    ['aside-items', 'aside-loadouts', 'aside-crafting'].forEach(k => localStorage.removeItem(k));
    localStorage.setItem('arch.aside-migrated-v1', '1');
  }, []);

  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === ',') { e.preventDefault(); setSettingsOpen(o => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ScreenComp = screen === 'items' ? ItemsScreen
    : screen === 'loadouts' ? LoadoutsScreen
    : CraftingScreen;

  return (
    <TooltipProvider>
      <div data-screen-label={screen} className="flex h-screen flex-col bg-background text-foreground">
        <TopBar screen={screen} setScreen={setScreen} globalSearch={globalSearch} setGlobalSearch={setGlobalSearch} openSettings={() => setSettingsOpen(true)}/>
        <div key={screen} className="screen-enter flex min-h-0 flex-1">
          <ScreenComp search={globalSearch} loading={!ready}/>
        </div>
        <SettingsCommand
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      </div>
    </TooltipProvider>
  );
}

export default App;
