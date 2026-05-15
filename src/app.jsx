import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  cn, Icon, Button, Input, Separator, Tooltip, TooltipProvider,
} from './ui.jsx';
import { ItemsScreen }   from './items.jsx';
import { LoadoutsScreen } from './loadouts.jsx';
import { CraftingScreen } from './crafting.jsx';
import { SettingsCommand } from './settings.jsx';
import { loadData, exportAllData } from './store.js';
import { TAX_KEY } from './hooks.jsx';
import { SCHEMA_VERSION } from './db.js';

function TopBar({ globalSearch, setGlobalSearch, openSettings, onSaveWorkspace }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const screen = pathname.startsWith('/loadouts') ? 'loadouts'
    : pathname.startsWith('/crafting') ? 'crafting'
    : 'items';

  const tabs = [
    { id: 'items',    path: '/inventory', label: t('nav.inventory'), tip: t('nav.inventoryTip') },
    { id: 'loadouts', path: '/loadouts',  label: t('nav.loadouts'),  tip: t('nav.loadoutsTip') },
    { id: 'crafting', path: '/crafting',  label: t('nav.crafting'),  tip: t('nav.craftingTip') },
  ];

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center gap-2.5">
        <div className="leading-tight">
          <div className="text-sm font-semibold">{t('app.brand')}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('app.brandSub')}</div>
        </div>
      </div>

      <Separator orientation="vertical" className="mx-2 h-6"/>

      <nav className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
        {tabs.map(tab => (
          <Tooltip key={tab.id} content={tab.tip}>
            <button
              onClick={() => navigate(tab.path)}
              className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium',
                'ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                screen === tab.id
                  ? 'bg-background text-foreground shadow'
                  : 'hover:text-foreground/80',
              )}
            >
              {tab.label}
            </button>
          </Tooltip>
        ))}
      </nav>

      <div className="flex-1"/>

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
        <Button variant="ghost" size="icon-sm" icon="save" onClick={onSaveWorkspace}/>
      </Tooltip>
      <Tooltip content={t('app.exportData')}>
        <Button variant="ghost" size="icon-sm" icon="export" disabled/>
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
      <span>{t('app.statusSchema')} <span className="text-foreground/80">{SCHEMA_VERSION}</span></span>
    </footer>
  );
}

function App() {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [screenClass, setScreenClass] = useState('screen-idle');
  const sectionFromPath = (path) => {
    if (path.startsWith('/loadouts')) return 'loadouts';
    if (path.startsWith('/crafting')) return 'crafting';
    return 'inventory';
  };

  useEffect(() => { loadData().then(() => setReady(true)); }, []);

  useEffect(() => {
    if (localStorage.getItem('arch.aside-migrated-v1')) return;
    ['aside-items', 'aside-loadouts', 'aside-crafting'].forEach(k => localStorage.removeItem(k));
    localStorage.setItem('arch.aside-migrated-v1', '1');
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === ',') { e.preventDefault(); setSettingsOpen(o => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (location.pathname === displayLocation.pathname) return;
    const nextSection = sectionFromPath(location.pathname);
    const currentSection = sectionFromPath(displayLocation.pathname);
    if (nextSection === currentSection) {
      setDisplayLocation(location);
      setScreenClass('screen-idle');
      return;
    }
    setScreenClass('screen-exit');
    const exitTimer = setTimeout(() => {
      setDisplayLocation(location);
      setScreenClass('screen-enter');
    }, 160);
    const enterTimer = setTimeout(() => {
      setScreenClass('screen-idle');
    }, 320);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(enterTimer);
    };
  }, [location, displayLocation]);

  const saveWorkspace = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify({
        ...data,
        taxonomy: JSON.parse(localStorage.getItem(TAX_KEY) || 'null'),
      }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'mountea-workspace.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { console.error(e); }
  };

  const screenProps = { search: globalSearch, loading: !ready };

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-background text-foreground">
        <TopBar globalSearch={globalSearch} setGlobalSearch={setGlobalSearch} openSettings={() => setSettingsOpen(true)} onSaveWorkspace={saveWorkspace}/>
        <div className="flex min-h-0 flex-1">
          <div className={cn('flex min-h-0 flex-1', screenClass)}>
            <Routes location={displayLocation}>
              <Route path="/inventory"      element={<ItemsScreen   {...screenProps}/>}/>
              <Route path="/inventory/:guid" element={<ItemsScreen   {...screenProps}/>}/>
              <Route path="/loadouts"        element={<LoadoutsScreen {...screenProps}/>}/>
              <Route path="/loadouts/:guid"  element={<LoadoutsScreen {...screenProps}/>}/>
              <Route path="/crafting"        element={<CraftingScreen {...screenProps}/>}/>
              <Route path="/crafting/:guid"  element={<CraftingScreen {...screenProps}/>}/>
              <Route path="*"               element={<Navigate to="/inventory" replace/>}/>
            </Routes>
          </div>
        </div>
        <SettingsCommand open={settingsOpen} onOpenChange={setSettingsOpen}/>
      </div>
    </TooltipProvider>
  );
}

export default App;
