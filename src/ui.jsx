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
import * as LucideIcons from 'lucide-react';

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
   Icon — dynamic Lucide icon lookup with module-level cache
   ============================================================ */
const _ICON_ALIASES = {
  chevDown:   'ChevronDown',
  chevRight:  'ChevronRight',
  chevLeft:   'ChevronLeft',
  chevUp:     'ChevronUp',
  dragHandle: 'GripVertical',
  cube:       'Box',
  warn:       'TriangleAlert',
  bolt:       'Zap',
  drop:       'Droplet',
  export:     'Download',
  import:     'Upload',
  more:       'MoreHorizontal',
  dup:        'Copy',
  open:       'ExternalLink',
  branch:     'GitBranch',
  target:     'Target',
  beaker:     'FlaskConical',
  helmet:     'HardHat',
  sparkle:    'Sparkles',
  cog:        'Settings2',
};

const _iconCache = new Map();

const _resolveIcon = (name) => {
  if (_iconCache.has(name)) return _iconCache.get(name);
  const lucideName = _ICON_ALIASES[name]
    ?? name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
           .replace(/^[a-z]/, c => c.toUpperCase());
  const component = LucideIcons[lucideName] ?? null;
  _iconCache.set(name, component);
  return component;
};

export const Icon = ({ name, size = 16, className = '' }) => {
  const LucideIcon = _resolveIcon(name);
  if (!LucideIcon) return null;
  return <LucideIcon size={size} strokeWidth={1.75} className={className} />;
};

/* ============================================================
   Tooltip — convenience wrapper: <Tooltip content="...">child</Tooltip>
   ============================================================ */
export const Tooltip = ({ children, content, side = 'top', delayDuration = 500 }) => {
  const isMobile = useIsMobile();
  if (isMobile) return children;
  return (
    <TooltipRoot delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </TooltipRoot>
  );
};

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
