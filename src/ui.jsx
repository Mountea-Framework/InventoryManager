import React, { useState, useRef, forwardRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  Sidebar, SidebarContent, SidebarHeader as ShadcnSidebarHeader,
  SidebarInput, SidebarInset, SidebarProvider, SidebarRail, SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileSidebar } from './contexts/mobile-sidebar-context.jsx';

/* ---------- shadcn component imports ---------- */
import { Button as ShadcnButton } from '@/components/ui/button';
import { Input as ShadcnInput }   from '@/components/ui/input';
import { Label as ShadcnLabel }   from '@/components/ui/label';
import { Switch as ShadcnSwitch } from '@/components/ui/switch';
import {
  Tooltip as TooltipRoot,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  Select as RadixSelect,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton as SkeletonPrim } from '@/components/ui/skeleton';

export { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';

/* ---------- re-exports of shadcn primitives (no changes needed at call sites) ---------- */
export { cn }                      from '@/lib/utils';
export { Input }                   from '@/components/ui/input';
export { Textarea }                from '@/components/ui/textarea';
export { Label }                   from '@/components/ui/label';
export { Switch }                  from '@/components/ui/switch';
export { Badge }                   from '@/components/ui/badge';
export { Separator }               from '@/components/ui/separator';
export { Skeleton }                from '@/components/ui/skeleton';
export { TooltipProvider }         from '@/components/ui/tooltip';
export {
  Select as RadixSelect,
  SelectTrigger, SelectContent, SelectItem, SelectValue, SelectGroup,
} from '@/components/ui/select';

/* ============================================================
   Icon — SVG icon library (inline, no lucide-react dependency in our API layer)
   ============================================================ */
export const Icon = ({ name, size = 16, className = '' }) => {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round',
    className,
  };
  const paths = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    chevDown: <path d="m6 9 6 6 6-6"/>,
    chevRight: <path d="m9 6 6 6-6 6"/>,
    chevLeft: <path d="m15 6-6 6 6 6"/>,
    chevUp: <path d="m6 15 6-6 6 6"/>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/></>,
    cog: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    folder: <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/>,
    cube: <><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z"/><path d="M3 7.5 12 12m0 0 9-4.5M12 12v9"/></>,
    link: <><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>,
    tag: <><path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/></>,
    flag: <path d="M5 21V4m0 0h11l-2 4 2 4H5"/>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    list: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    export: <><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></>,
    check: <path d="m5 12 5 5 9-12"/>,
    x: <path d="M6 6l12 12M18 6 6 18"/>,
    sword: <><path d="m14 4 6 6-8 8-3 1 1-3 8-8-4-4Z"/><path d="m5 19 3-3"/></>,
    shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/>,
    helmet: <path d="M4 14a8 8 0 0 1 16 0v3H4v-3Zm2 3v2h12v-2"/>,
    backpack: <><path d="M6 8a4 4 0 0 1 8 0v0m-4-3v3"/><rect x="4" y="8" width="16" height="13" rx="3"/><path d="M4 14h16M9 17h6"/></>,
    beaker: <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>,
    hammer: <><path d="m15 5 4 4-2 2-4-4 2-2Zm-2 2-9 9 3 3 9-9"/></>,
    sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>,
    drop: <path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12Z"/>,
    bolt: <path d="m13 3-9 12h7l-1 6 9-12h-7l1-6Z"/>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></>,
    warn: <><path d="M10.3 3.7 2.4 17.2A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.8L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17v.01"/></>,
    play: <path d="M7 4v16l13-8L7 4Z"/>,
    filter: <path d="M3 5h18l-7 9v6l-4-2v-4L3 5Z"/>,
    more: <><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none"/></>,
    branch: <><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="9" r="2"/><path d="M6 7v10M6 14a6 6 0 0 0 6-6c0-2 3-1 5-1"/></>,
    folderPlus: <><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/><path d="M12 11v4M10 13h4"/></>,
    save: <><path d="M5 3h11l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M7 3v6h9V3M7 21v-7h10v7"/></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 8h0M11 12h1v5h1"/></>,
    arrowRight: <path d="M5 12h14m0 0-5-5m5 5-5 5"/>,
    dragHandle: <><circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5M3 18l9 5 9-5"/></>,
    minus: <path d="M5 12h14"/>,
    open: <><path d="M15 3h6v6"/><path d="M21 3 12 12"/><path d="M9 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></>,
    dup: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    pin: <path d="M12 3v8l5 3v2H7v-2l5-3V3m-2 0h4"/>,
    target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></>,
    import: <><path d="M12 17v-14m0 0-4 4m4-4 4 4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
};

/* ============================================================
   Tooltip — convenience wrapper: <Tooltip content="...">child</Tooltip>
   ============================================================ */
export const Tooltip = ({ children, content, side = 'top', delayDuration = 500 }) => (
  <TooltipRoot delayDuration={delayDuration}>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side={side}>{content}</TooltipContent>
  </TooltipRoot>
);

/* ============================================================
   Button — shadcn Button extended with `icon` name prop + `full` width
   ============================================================ */
export const Button = forwardRef(({ children, icon, full, size = 'default', className = '', ...props }, ref) => (
  <ShadcnButton ref={ref} size={size} className={cn(full && 'w-full', className)} {...props}>
    {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16}/>}
    {children}
  </ShadcnButton>
));
Button.displayName = 'Button';

/* ============================================================
   Select — simple {value, onChange, options, placeholder} API
   Backed by shadcn Radix Select; handles empty-string values via sentinel.
   ============================================================ */
const EMPTY_SENTINEL = '__EMPTY__';

export const Select = ({ value, onChange, options = [], className = '', placeholder }) => {
  const hasEmptyOpt = options.some(o => (o.value ?? o) === '');
  const radixValue  = value === '' ? (hasEmptyOpt ? EMPTY_SENTINEL : undefined) : (value || undefined);
  return (
    <RadixSelect value={radixValue} onValueChange={v => onChange?.(v === EMPTY_SENTINEL ? '' : v)}>
      <SelectTrigger className={cn('h-9', className)}>
        <SelectValue placeholder={placeholder ?? ''}/>
      </SelectTrigger>
      <SelectContent>
        {options.map(o => {
          const raw   = String(o.value ?? o);
          const label = String(o.label ?? o);
          return <SelectItem key={raw} value={raw === '' ? EMPTY_SENTINEL : raw}>{label}</SelectItem>;
        })}
      </SelectContent>
    </RadixSelect>
  );
};

/* ============================================================
   Toggle — thin alias over shadcn Switch (existing call sites unchanged)
   ============================================================ */
export const Toggle = ({ on, onChange }) => <ShadcnSwitch checked={on} onCheckedChange={onChange}/>;

/* ============================================================
   Tag — custom chip (not in shadcn)
   ============================================================ */
export const Tag = ({ children, tone = 'neutral', onRemove }) => (
  <span className={cn(
    'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10.5px] font-medium tracking-wide',
    (tone === 'rare' || tone === 'quest') && 'border-transparent bg-primary/15 text-primary-foreground/90',
    tone === 'neutral' && 'border-border bg-transparent text-foreground/80',
    (tone !== 'rare' && tone !== 'quest' && tone !== 'neutral') && 'border-transparent bg-secondary text-secondary-foreground',
  )}>
    {children}
    {onRemove && (
      <button onClick={onRemove} className="opacity-60 hover:opacity-100 transition-opacity">
        <Icon name="x" size={10}/>
      </button>
    )}
  </span>
);

/* ============================================================
   Section — collapsible card section (custom, no shadcn equivalent)
   ============================================================ */
export const Section = ({ title, icon, right, children, defaultOpen = true, compact = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-lg border border-border/50 bg-card/40">
      <div className="flex items-center gap-2 px-3 py-2.5 md:px-4 md:py-3 cursor-pointer select-none" onClick={() => setOpen(!open)}>
        <Icon name={open ? 'chevDown' : 'chevRight'} size={14} className="text-muted-foreground"/>
        {icon && <Icon name={icon} size={14} className="text-muted-foreground"/>}
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">{title}</span>
        {right && <span onClick={e => e.stopPropagation()}>{right}</span>}
      </div>
      {open && <div className={cn(compact ? 'px-3 pb-3 md:px-4' : 'px-3 pb-3 md:px-4 md:pb-4')}>{children}</div>}
    </section>
  );
};

/* ============================================================
   Row — label + control grid row (custom)
   ============================================================ */
export const Row = ({ label, hint, tooltip, children, stack = false }) => {
  const labelEl = tooltip ? (
    <Tooltip content={tooltip}>
      <ShadcnLabel className="text-foreground/90">{label}</ShadcnLabel>
    </Tooltip>
  ) : (
    <ShadcnLabel className="text-foreground/90">{label}</ShadcnLabel>
  );
  return stack ? (
    <div className="space-y-1.5 py-2">
      {labelEl}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div>{children}</div>
    </div>
  ) : (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-1 py-1.5">
      <div className="w-full shrink-0 pt-1.5 md:w-[180px] md:pt-0">
        {labelEl}
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="min-w-0 grow basis-full md:basis-[200px]">{children}</div>
    </div>
  );
};

/* ============================================================
   TextField — styled text input with optional prefix/suffix
   ============================================================ */
export const TextField = ({ value, onChange, placeholder, mono = false, suffix, prefix, readOnly, disabled, className = '' }) => (
  <div className={cn(
    'flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 shadow-sm',
    'focus-within:outline-none focus-within:ring-1 focus-within:ring-ring',
    disabled && 'pointer-events-none opacity-50',
    className,
  )}>
    {prefix && <span className="mr-2 flex text-muted-foreground">{prefix}</span>}
    <input
      value={value ?? ''} onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder} readOnly={readOnly} disabled={disabled}
      className={cn(
        'flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground',
        mono && 'font-mono text-xs',
      )}/>
    {suffix && <span className="ml-2 flex text-muted-foreground">{suffix}</span>}
  </div>
);

/* ============================================================
   FilePicker — text field + folder button file picker
   ============================================================ */
export const FilePicker = ({ value = '', onChange, onFilePicked, accept, placeholder, className = '' }) => {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('ui.selectFile');
  const inputRef = useRef(null);
  return (
    <div className={cn('flex gap-1.5', className)}>
      <div className={cn(
        'flex flex-1 h-9 items-center rounded-md border border-input bg-transparent px-3 shadow-sm',
        'focus-within:outline-none focus-within:ring-1 focus-within:ring-ring',
      )}>
        <input
          value={value} onChange={e => onChange?.(e.target.value)}
          placeholder={resolvedPlaceholder}
          className="flex-1 bg-transparent font-mono text-xs outline-none placeholder:text-muted-foreground"
        />
      </div>
      <Button variant="outline" size="icon" onClick={() => inputRef.current?.click()} icon="folder"/>
      <input ref={inputRef} type="file" accept={accept} className="sr-only"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) { onFilePicked ? onFilePicked(f) : onChange?.(f.name); }
          e.target.value = '';
        }}/>
    </div>
  );
};

/* ============================================================
   Thumb — item thumbnail placeholder
   ============================================================ */
export const Thumb = ({ tone = 1, size = 36, icon }) => {
  const tones = [
    ['#1a1f26', '#252c35'], ['#1d232a', '#2a323c'], ['#18202a', '#263040'],
    ['#1f2320', '#2d3530'], ['#23201c', '#35302a'],
  ];
  const [a, b] = tones[tone % tones.length];
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground/60"
      style={{ width: size, height: size, background: `repeating-linear-gradient(135deg, ${a} 0 6px, ${b} 6px 12px)` }}>
      {icon && <Icon name={icon} size={Math.round(size * 0.45)}/>}
    </div>
  );
};

/* ============================================================
   SidebarItem — left-panel row (forwardRef required for Tooltip asChild)
   ============================================================ */
export const SidebarItem = forwardRef(({ selected, onClick, children, className = '', ...props }, ref) => (
  <button ref={ref} onClick={onClick} {...props}
    className={cn(
      'flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left transition-colors',
      selected
        ? 'border-l-primary bg-accent text-foreground'
        : 'border-l-transparent text-foreground/80 hover:bg-accent/50 hover:text-foreground',
      className,
    )}>
    {children}
  </button>
));
SidebarItem.displayName = 'SidebarItem';

/* ============================================================
   SidebarSkeleton — shimmer placeholder for left panel list
   ============================================================ */
function SidebarSkeleton() {
  return (
    <div className="space-y-px px-3 py-2">
      <SkeletonPrim className="mb-3 h-4 w-24"/>
      <SkeletonPrim className="h-9 w-full rounded"/>
      <SkeletonPrim className="h-9 w-[87%] rounded"/>
      <SkeletonPrim className="h-9 w-full rounded"/>
      <SkeletonPrim className="mt-5 mb-3 h-4 w-20"/>
      <SkeletonPrim className="h-9 w-[92%] rounded"/>
      <SkeletonPrim className="h-9 w-full rounded"/>
    </div>
  );
}

/* ============================================================
   ContentSkeleton — shimmer placeholder for main editor area
   ============================================================ */
export function ContentSkeleton() {
  return (
    <div className="p-3 md:p-6 max-w-2xl space-y-6">
      <div className="flex items-start gap-4">
        <SkeletonPrim className="h-14 w-14 shrink-0 rounded-lg"/>
        <div className="min-w-0 flex-1 overflow-hidden space-y-2 pt-1">
          <SkeletonPrim className="h-5 w-full max-w-[208px]"/>
          <SkeletonPrim className="h-4 w-full max-w-[320px]"/>
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <SkeletonPrim className="h-3.5 w-24"/>
            <SkeletonPrim className="h-9 w-full"/>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   EmptyState — centred icon + heading + optional description
   ============================================================ */
export function EmptyState({ icon = 'sparkle', title, description, children }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon name={icon} size={22}/>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mx-auto max-w-[240px] text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

/* ============================================================
   EntityHeader — sticky top-of-editor header shared by all screens
   ============================================================ */
/**
 * @param {{
 *   title: string,
 *   guid: string,
 *   saveStatus: 'idle'|'dirty'|'saving'|'saved',
 *   thumb: React.ReactNode,
 *   badges?: React.ReactNode,
 * }} props
 */
export function EntityHeader({ title, guid, saveStatus, thumb, badges }) {
  const { t } = useTranslation();
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3 md:px-6 md:py-5">
      <div className="flex items-start gap-4">
        {thumb}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
            <div className="hidden md:contents">{badges}</div>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <div className="truncate font-mono text-xs text-muted-foreground">
              <span className="hidden md:inline">guid: </span>
              <span>{guid}</span>
            </div>
            {saveStatus === 'saving' && <span className="text-[10px] text-muted-foreground/60">{t('app.saving')}</span>}
            {saveStatus === 'saved'  && <span className="text-[10px] text-emerald-500/80">{t('app.saved')}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ScreenLayout — dual-sidebar layout (left elements + right inspector)
   ============================================================ */

function MobileSidebarWire() {
  const { setToggle } = useMobileSidebar();
  const { toggleSidebar } = useSidebar();
  useEffect(() => { setToggle(toggleSidebar); }, [setToggle, toggleSidebar]);
  return null;
}

export function ScreenLayout({ elementsSidebar, inspectorSidebar, children }) {
  const isMobile = useIsMobile();
  const [leftOpen, setLeftOpen] = useState(() => {
    try { return localStorage.getItem('arch.sidebar.elements') !== 'false'; } catch { return true; }
  });
  const [rightOpen, setRightOpen] = useState(() => {
    try { return localStorage.getItem('arch.sidebar.inspector') === 'true'; } catch { return false; }
  });

  return (
    <SidebarProvider
      open={leftOpen}
      onOpenChange={v => { setLeftOpen(v); try { localStorage.setItem('arch.sidebar.elements', String(v)); } catch {} }}
      style={{ '--sidebar-width': '300px' }}
    >
      <MobileSidebarWire/>
      {elementsSidebar}
      <SidebarInset className="flex min-h-0 flex-col overflow-hidden p-0">
        <SidebarProvider
          open={rightOpen}
          onOpenChange={v => { setRightOpen(v); try { localStorage.setItem('arch.sidebar.inspector', String(v)); } catch {} }}
          style={{ '--sidebar-width': '340px' }}
        >
          <SidebarInset className="min-h-0 overflow-auto">
            {children}
          </SidebarInset>
          {!isMobile && inspectorSidebar}
        </SidebarProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}

/* ============================================================
   ElementsSidebar — left entity list sidebar (shadcn Sidebar)
   ============================================================ */
export function ElementsSidebar({ title, headerActions, mobileHeaderActions, search, setSearch, searchPlaceholder, loading, children }) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const actions = isMobile ? (mobileHeaderActions ?? null) : headerActions;
  return (
    <Sidebar collapsible="icon" side="left">
      <ShadcnSidebarHeader className="border-b border-sidebar-border p-3 gap-1">
        <div className="flex items-center gap-1">
          <span className="flex-1 truncate text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/80 group-data-[state=collapsed]:hidden">{title}</span>
          <div className="group-data-[state=collapsed]:hidden flex items-center gap-1">{actions}</div>
          <SidebarTrigger className="h-7 w-7 shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground"/>
        </div>
        <div className="relative group-data-[state=collapsed]:hidden">
          <Icon name="search" size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <SidebarInput
            placeholder={searchPlaceholder ?? t('ui.filterPlaceholder')}
            value={search ?? ''}
            onChange={e => setSearch?.(e.target.value)}
            className="pl-7 text-xs"
          />
        </div>
      </ShadcnSidebarHeader>
      <SidebarContent className="py-2 group-data-[state=collapsed]:hidden">
        {loading ? <SidebarSkeleton/> : children}
      </SidebarContent>
      <SidebarRail/>
    </Sidebar>
  );
}

/* ============================================================
   InspectorSidebar — right inspector sidebar (shadcn Sidebar)
   ============================================================ */
export function InspectorSidebar({ title, headerActions, children }) {
  const { t } = useTranslation();
  return (
    <Sidebar collapsible="icon" side="right">
      <ShadcnSidebarHeader className="border-b border-sidebar-border p-3 gap-2">
        <div className="flex items-center gap-1">
          <SidebarTrigger className="h-7 w-7 shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground"/>
          <span className="flex-1 truncate text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/80 group-data-[state=collapsed]:hidden">
            {title ?? t('ui.inspector')}
          </span>
          <div className="group-data-[state=collapsed]:hidden">{headerActions}</div>
        </div>
        <div className="h-8 group-data-[state=collapsed]:hidden"/>
      </ShadcnSidebarHeader>
      <SidebarContent className="overflow-y-auto group-data-[state=collapsed]:hidden">
        {children}
      </SidebarContent>
      <SidebarRail/>
    </Sidebar>
  );
}

/* ============================================================
   Card family — lightweight card primitives (shadcn card not installed)
   ============================================================ */
export const Card        = ({ className = '', children }) => <div className={cn('rounded-xl border bg-card text-card-foreground shadow', className)}>{children}</div>;
export const CardHeader  = ({ className = '', children }) => <div className={cn('flex flex-col space-y-1.5 p-6', className)}>{children}</div>;
export const CardTitle   = ({ className = '', children }) => <div className={cn('font-semibold leading-none tracking-tight', className)}>{children}</div>;
export const CardContent = ({ className = '', children }) => <div className={cn('p-6 pt-0', className)}>{children}</div>;
export const CardFooter  = ({ className = '', children }) => <div className={cn('flex items-center p-6 pt-0', className)}>{children}</div>;

/* ============================================================
   DeleteConfirmDialog — shared AlertDialog for destructive deletes
   ============================================================ */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/* ============================================================
   EntityContextMenu — shared right-click menu for entity rows
   ============================================================ */
import {
  ContextMenu, ContextMenuContent, ContextMenuGroup, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from '@/components/ui/context-menu';

export function EntityContextMenu({
  children,
  onDuplicate, canDuplicate = true,
  onExport,    canExport    = true,
  onDelete,    canDelete    = true,
}) {
  const { t } = useTranslation();
  const showDuplicate = canDuplicate && !!onDuplicate;
  const showExport    = canExport    && !!onExport;
  const showDelete    = canDelete    && !!onDelete;
  const hasTopGroup   = showDuplicate || showExport;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        {hasTopGroup && (
          <ContextMenuGroup>
            {showDuplicate && <ContextMenuItem onClick={onDuplicate}><Icon name="dup" size={14} className="mr-2"/>{t('common.duplicate')}</ContextMenuItem>}
            {showExport    && <ContextMenuItem onClick={onExport}><Icon name="import" size={14} className="mr-2"/>{t('common.export')}</ContextMenuItem>}
          </ContextMenuGroup>
        )}
        {hasTopGroup && showDelete && <ContextMenuSeparator/>}
        {showDelete && (
          <ContextMenuGroup>
            <ContextMenuItem variant="destructive" onClick={onDelete}><Icon name="trash" size={14} className="mr-2"/>{t('common.delete')}</ContextMenuItem>
          </ContextMenuGroup>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function DeleteConfirmDialog({ open, onOpenChange, name, onConfirm }) {
  const { t } = useTranslation();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('common.deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('common.deleteConfirmDesc', { name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t('common.delete')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
