// shadcn-style UI primitives (Tailwind classes mirror the official source)
const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ---------- cn() utility (mirrors shadcn's clsx+tailwind-merge helper) ---------- */
const cn = (...args) =>
  args.flat(Infinity).filter(Boolean).join(' ');

/* ---------- Icons (lucide-react look, 1.5 stroke) ---------- */
const Icon = ({ name, size = 16, className = '' }) => {
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
    folderOpen: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3V7Zm0 2h18l-2 8a2 2 0 0 1-2 1.5H5a2 2 0 0 1-2-2V9Z"/>,
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
    target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></>,
    drop: <path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12Z"/>,
    bolt: <path d="m13 3-9 12h7l-1 6 9-12h-7l1-6Z"/>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></>,
    warn: <><path d="M10.3 3.7 2.4 17.2A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.8L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17v.01"/></>,
    play: <path d="M7 4v16l13-8L7 4Z"/>,
    filter: <path d="M3 5h18l-7 9v6l-4-2v-4L3 5Z"/>,
    more: <><circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none"/></>,
    pin: <path d="M12 3v8l5 3v2H7v-2l5-3V3m-2 0h4"/>,
    branch: <><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="9" r="2"/><path d="M6 7v10M6 14a6 6 0 0 0 6-6c0-2 3-1 5-1"/></>,
    folderPlus: <><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/><path d="M12 11v4M10 13h4"/></>,
    open: <><path d="M15 3h6v6"/><path d="M21 3 12 12"/><path d="M9 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></>,
    save: <><path d="M5 3h11l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M7 3v6h9V3M7 21v-7h10v7"/></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 8h0M11 12h1v5h1"/></>,
    dup: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    arrowRight: <path d="M5 12h14m0 0-5-5m5 5-5 5"/>,
    dragHandle: <><circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5M3 18l9 5 9-5"/></>,
    minus: <path d="M5 12h14"/>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
};

/* ---------- Button (shadcn variants) ---------- */
const buttonBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium " +
  "transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring " +
  "disabled:pointer-events-none disabled:opacity-50";

const Button = React.forwardRef(({ children, variant = 'default', size = 'default', icon, full, className = '', ...rest }, ref) => {
  const variants = {
    default:     "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    secondary:   "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
    outline:     "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
    ghost:       "hover:bg-accent hover:text-accent-foreground",
    link:        "text-primary underline-offset-4 hover:underline",
  };
  const sizes = {
    default: "h-9 px-4 py-2",
    sm:      "h-8 rounded-md px-3 text-xs",
    lg:      "h-10 rounded-md px-8",
    icon:    "h-9 w-9",
    'icon-sm': "h-7 w-7",
  };
  // shadcn-style: render as icon-only when no children
  const inferredSize = !children && icon ? (size === 'sm' ? 'icon-sm' : 'icon') : size;
  return (
    <button ref={ref} className={cn(buttonBase, variants[variant], sizes[inferredSize], full && 'w-full', className)} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16}/>}
      {children}
    </button>
  );
});

/* ---------- Input ---------- */
const Input = React.forwardRef(({ className = '', type = 'text', ...rest }, ref) => (
  <input ref={ref} type={type}
    className={cn(
      "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm",
      "transition-colors placeholder:text-muted-foreground",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...rest}/>
));

/* ---------- Textarea ---------- */
const Textarea = React.forwardRef(({ className = '', ...rest }, ref) => (
  <textarea ref={ref}
    className={cn(
      "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
      "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...rest}/>
));

/* ---------- Label ---------- */
const Label = ({ className = '', children, ...rest }) => (
  <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...rest}>
    {children}
  </label>
);

/* ---------- Select (native, styled to look like shadcn select trigger) ---------- */
const Select = ({ value, onChange, options = [], className = '', placeholder }) => (
  <div className="relative">
    <select
      value={value} onChange={e => onChange?.(e.target.value)}
      className={cn(
        "h-9 w-full appearance-none rounded-md border border-input bg-transparent text-foreground",
        "px-3 pr-8 py-2 text-sm shadow-sm",
        "focus:outline-none focus:ring-1 focus:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[&>option]:bg-popover [&>option]:text-popover-foreground",
        className,
      )}
    >
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
    <Icon name="chevDown" size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50"/>
  </div>
);

/* ---------- Card ---------- */
const Card = ({ className = '', children }) => (
  <div className={cn("rounded-xl border bg-card text-card-foreground shadow", className)}>{children}</div>
);
const CardHeader = ({ className = '', children }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>
);
const CardTitle = ({ className = '', children }) => (
  <div className={cn("font-semibold leading-none tracking-tight", className)}>{children}</div>
);
const CardDescription = ({ className = '', children }) => (
  <div className={cn("text-sm text-muted-foreground", className)}>{children}</div>
);
const CardContent = ({ className = '', children }) => (
  <div className={cn("p-6 pt-0", className)}>{children}</div>
);
const CardFooter = ({ className = '', children }) => (
  <div className={cn("flex items-center p-6 pt-0", className)}>{children}</div>
);

/* ---------- Section (borderless; subtle header divider only) ---------- */
const Section = ({ title, icon, right, children, defaultOpen = true, compact = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-lg border border-border/50 bg-card/40">
      <div className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none" onClick={() => setOpen(!open)}>
        <Icon name={open ? 'chevDown' : 'chevRight'} size={14} className="text-muted-foreground"/>
        {icon && <Icon name={icon} size={14} className="text-muted-foreground"/>}
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">{title}</span>
        {right && <span onClick={e => e.stopPropagation()}>{right}</span>}
      </div>
      {open && <div className={cn(compact ? "px-4 pb-3" : "px-4 pb-4")}>{children}</div>}
    </section>
  );
};

/* ---------- Switch (shadcn-style toggle) ---------- */
const Switch = ({ checked, onCheckedChange, className = '' }) => (
  <button
    role="switch" aria-checked={!!checked}
    onClick={() => onCheckedChange?.(!checked)}
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm",
      "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      checked ? "bg-primary" : "bg-input",
      className,
    )}>
    <span
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
        checked ? "translate-x-4" : "translate-x-0",
      )}/>
  </button>
);
// Backwards-compat alias used by existing call sites
const Toggle = ({ on, onChange }) => <Switch checked={on} onCheckedChange={onChange}/>;

/* ---------- Badge (shadcn variants) ---------- */
const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default:     "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
    secondary:   "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
    outline:     "text-foreground",
  };
  return (
    <span className={cn(
      "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors",
      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      variants[variant], className,
    )}>{children}</span>
  );
};

/* ---------- Tag (project-specific badge with onRemove) ---------- */
const Tag = ({ children, tone = 'neutral', onRemove }) => {
  const variant = tone === 'rare' || tone === 'quest' ? 'default'
    : tone === 'neutral' ? 'outline' : 'secondary';
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10.5px] font-medium tracking-wide",
      variant === 'default' && "border-transparent bg-primary/15 text-primary-foreground/90",
      variant === 'outline' && "border-border bg-transparent text-foreground/80",
      variant === 'secondary' && "border-transparent bg-secondary text-secondary-foreground",
    )}>
      {children}
      {onRemove && (
        <button onClick={onRemove} className="opacity-60 hover:opacity-100 transition-opacity">
          <Icon name="x" size={10}/>
        </button>
      )}
    </span>
  );
};

/* ---------- Separator ---------- */
const Separator = ({ orientation = 'horizontal', className = '' }) => (
  <div className={cn(
    "shrink-0 bg-border",
    orientation === 'horizontal' ? "h-[1px] w-full" : "h-full w-[1px]",
    className,
  )}/>
);

/* ---------- Tabs (controlled; mimics shadcn TabsList/TabsTrigger structure) ---------- */
const Tabs = ({ value, onValueChange, children, className = '' }) => (
  <div className={className} data-state={value}>
    {React.Children.map(children, child =>
      React.isValidElement(child) ? React.cloneElement(child, { value, onValueChange }) : child)}
  </div>
);
const TabsList = ({ children, value, onValueChange, className = '' }) => (
  <div className={cn(
    "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
    className,
  )}>
    {React.Children.map(children, child =>
      React.isValidElement(child) ? React.cloneElement(child, { value, onValueChange }) : child)}
  </div>
);
const TabsTrigger = ({ children, value: ownValue, value: _v, onValueChange, ...rest }) => {
  // We need both: ownValue (this trigger's id) and current value (selected). React.cloneElement only passes one — workaround via prop name
  const { activeValue, val } = rest;
  const isActive = (rest._activeValue ?? rest.activeValue ?? rest.value) === ownValue;
  // Simpler: read `data-active` from props
  return null;
};

/* ---------- Form-style field row used across editors ---------- */
const Row = ({ label, hint, children, stack = false }) => (
  stack ? (
    <div className="space-y-1.5 py-2">
      <Label className="text-foreground/90">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div>{children}</div>
    </div>
  ) : (
    <div className="grid grid-cols-[180px_1fr] items-center gap-3 py-1.5">
      <div>
        <Label className="text-foreground/90">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
);

/* ---------- Field-prefixed Input (with optional left/right adornments) ---------- */
const TextField = ({ value, onChange, placeholder, mono = false, suffix, prefix, readOnly, className = '' }) => (
  <div className={cn(
    "flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 shadow-sm",
    "focus-within:outline-none focus-within:ring-1 focus-within:ring-ring",
    className,
  )}>
    {prefix && <span className="mr-2 flex text-muted-foreground">{prefix}</span>}
    <input
      value={value ?? ''} onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder} readOnly={readOnly}
      className={cn(
        "flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground",
        mono && "font-mono text-xs",
      )}/>
    {suffix && <span className="ml-2 flex text-muted-foreground">{suffix}</span>}
  </div>
);

/* ---------- FilePicker — TextField + browse button wrapping a hidden file input ---------- */
/**
 * Displays a text field for a file path alongside a folder button that opens a native
 * file picker. Calls onChange with the selected filename (basename only).
 * @param {{ value: string, onChange: (v: string) => void, accept?: string, placeholder?: string, className?: string }} props
 */
const FilePicker = ({ value = '', onChange, accept, placeholder = 'Select file…', className = '' }) => {
  const inputRef = useRef(null);
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onChange?.(file.name);
    e.target.value = '';
  };
  return (
    <div className={cn('flex gap-1.5', className)}>
      <div className={cn(
        'flex flex-1 h-9 items-center rounded-md border border-input bg-transparent px-3 shadow-sm',
        'focus-within:outline-none focus-within:ring-1 focus-within:ring-ring',
      )}>
        <input
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent font-mono text-xs outline-none placeholder:text-muted-foreground"
        />
      </div>
      <Button variant="outline" size="icon" onClick={() => inputRef.current?.click()} title="Browse file">
        <Icon name="folder" size={14}/>
      </Button>
      <input ref={inputRef} type="file" accept={accept} className="sr-only" onChange={handleFileChange}/>
    </div>
  );
};

/* ---------- IconBtn — borderless icon button ---------- */
const IconBtn = ({ icon, onClick, title, tone, size = 'sm' }) => (
  <Button variant="ghost" size={size === 'sm' ? 'icon-sm' : 'icon'}
    onClick={onClick} title={title}
    className={cn(tone === 'danger' && "text-destructive hover:text-destructive hover:bg-destructive/10")}
    icon={icon}/>
);

/* ---------- Thumbnail placeholder ---------- */
const Thumb = ({ tone = 1, size = 36, icon }) => {
  const tones = [
    ['#1a1f26', '#252c35'],
    ['#1d232a', '#2a323c'],
    ['#18202a', '#263040'],
    ['#1f2320', '#2d3530'],
    ['#23201c', '#35302a'],
  ];
  const [a, b] = tones[tone % tones.length];
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground/60"
      style={{
        width: size, height: size,
        background: `repeating-linear-gradient(135deg, ${a} 0 6px, ${b} 6px 12px)`,
      }}>
      {icon && <Icon name={icon} size={Math.round(size * 0.45)}/>}
    </div>
  );
};

/* ---------- SidebarItem — unified left-rail selectable row ---------- */
const SidebarItem = ({ selected, onClick, children, className = '' }) => (
  <button onClick={onClick}
    className={cn(
      "flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left transition-colors",
      selected
        ? "border-l-primary bg-accent text-foreground"
        : "border-l-transparent text-foreground/80 hover:bg-accent/50 hover:text-foreground",
      className,
    )}>
    {children}
  </button>
);

/* ---------- LeftPanel — unified left-rail layout for every screen ---------- */
const LeftPanel = ({ title, headerActions, search, setSearch, searchPlaceholder = 'Filter…', children }) => (
  <aside className="flex w-[300px] shrink-0 flex-col border-r border-border bg-muted/20">
    <div className="border-b border-border p-3 space-y-2">
      <div className="flex items-center gap-1">
        <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-foreground/80">{title}</span>
        {headerActions}
      </div>
      <div className="relative">
        <Icon name="search" size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"/>
        <Input placeholder={searchPlaceholder} value={search ?? ''}
          onChange={e => setSearch?.(e.target.value)} className="h-8 pl-7 text-xs"/>
      </div>
    </div>
    <div className="flex-1 overflow-auto py-2">{children}</div>
  </aside>
);

/* ---------- Collapsible inspector aside ---------- */
const CollapsibleAside = ({ storageKey, width, children }) => {
  const [collapsed, setCollapsed] = React.useState(() => {
    try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
  });
  const toggle = () => {
    setCollapsed(c => {
      const n = !c;
      try { localStorage.setItem(storageKey, n ? '1' : '0'); } catch {}
      return n;
    });
  };
  if (collapsed) {
    return (
      <aside className="flex w-8 shrink-0 justify-center border-l border-border bg-muted/30 pt-3">
        <Button variant="ghost" size="icon-sm" onClick={toggle} title="Expand panel" icon="chevLeft"/>
      </aside>
    );
  }
  return (
    <aside className="relative shrink-0 overflow-auto border-l border-border bg-muted/20" style={{ width }}>
      <button onClick={toggle} title="Collapse panel"
        className="absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground">
        <Icon name="chevRight" size={12}/>
      </button>
      {children}
    </aside>
  );
};

Object.assign(window, {
  cn, Icon,
  Button, Input, Textarea, Label, Select,
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Section, Switch, Toggle, Badge, Tag, Separator,
  Row, TextField, FilePicker, IconBtn, Thumb, CollapsibleAside, SidebarItem, LeftPanel,
});
