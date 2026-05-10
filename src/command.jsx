// shadcn-style Command palette + Dialog primitives
// Mirrors shadcn/ui's <Command> (cmdk) + <Dialog> classnames and structure.
const { useState: useStateCmd, useEffect: useEffectCmd, useRef: useRefCmd, useMemo: useMemoCmd, useCallback: useCallbackCmd } = React;

/* ---------- Dialog ---------- */
// Minimal shadcn-style modal: fixed overlay + centered content w/ animation.
const Dialog = ({ open, onOpenChange, children }) => {
  useEffectCmd(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onOpenChange?.(false); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Overlay */}
      <div
        onClick={() => onOpenChange?.(false)}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0"
        style={{ animation: 'cmdkFade .12s ease-out' }}
      />
      {/* Content wrapper */}
      <div
        className="relative z-50"
        style={{ animation: 'cmdkPop .14s cubic-bezier(.2,.8,.2,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

/* ---------- CommandDialog: Dialog with the cmdk-style chrome baked in ---------- */
const CommandDialog = ({ open, onOpenChange, children, label = 'Command Menu' }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <div
      role="dialog" aria-label={label}
      className="w-[92vw] max-w-[900px] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl"
    >
      <Command>{children}</Command>
    </div>
  </Dialog>
);

/* ---------- Command context (search + selection) ---------- */
const CommandCtx = React.createContext(null);

const Command = ({ children, className = '' }) => {
  const [query, setQuery] = useStateCmd('');
  // Registered items: id -> { value, onSelect, disabled }
  const itemsRef = useRefCmd(new Map());
  const [, force] = useStateCmd(0);
  const rerender = () => force(x => x + 1);

  const register = useCallbackCmd((id, meta) => {
    itemsRef.current.set(id, meta);
    rerender();
    return () => { itemsRef.current.delete(id); rerender(); };
  }, []);

  const visibleIds = useMemoCmd(() => {
    const q = query.trim().toLowerCase();
    const out = [];
    for (const [id, meta] of itemsRef.current.entries()) {
      if (meta.hidden) continue;
      if (!q || meta.value.toLowerCase().includes(q)) out.push(id);
    }
    return out;
  }, [query, itemsRef.current.size, itemsRef.current]);

  const [activeId, setActiveId] = useStateCmd(null);
  useEffectCmd(() => {
    if (!visibleIds.includes(activeId)) setActiveId(visibleIds[0] || null);
  }, [visibleIds.join('|')]);

  const move = (delta) => {
    if (!visibleIds.length) return;
    const i = Math.max(0, visibleIds.indexOf(activeId));
    const next = (i + delta + visibleIds.length) % visibleIds.length;
    setActiveId(visibleIds[next]);
  };
  const trigger = () => {
    const meta = itemsRef.current.get(activeId);
    if (meta && !meta.disabled) meta.onSelect?.();
  };

  return (
    <CommandCtx.Provider value={{ query, setQuery, register, activeId, setActiveId, move, trigger, visibleIds }}>
      <div className={cn("flex h-full w-full flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground", className)}>
        {children}
      </div>
    </CommandCtx.Provider>
  );
};

/* ---------- CommandInput ---------- */
const CommandInput = ({ placeholder = 'Type a command or search…', autoFocus = true }) => {
  const ctx = React.useContext(CommandCtx);
  const ref = useRefCmd(null);
  useEffectCmd(() => { if (autoFocus) ref.current?.focus(); }, []);
  return (
    <div className="flex items-center gap-2 border-b border-border px-3" cmdk-input-wrapper="">
      <Icon name="search" size={16} className="shrink-0 text-muted-foreground"/>
      <input
        ref={ref}
        value={ctx.query}
        onChange={e => ctx.setQuery(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); ctx.move(1); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); ctx.move(-1); }
          else if (e.key === 'Enter') { e.preventDefault(); ctx.trigger(); }
        }}
        placeholder={placeholder}
        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
};

/* ---------- CommandList / Empty / Group / Item / Separator / Shortcut ---------- */
const CommandList = ({ children, className = '' }) => (
  <div className={cn("max-h-[360px] overflow-y-auto overflow-x-hidden p-1", className)}>{children}</div>
);

const CommandEmpty = ({ children = 'No results found.' }) => {
  const ctx = React.useContext(CommandCtx);
  if (ctx.visibleIds.length > 0) return null;
  return <div className="py-6 text-center text-sm text-muted-foreground">{children}</div>;
};

const CommandGroup = ({ heading, children }) => {
  const ctx = React.useContext(CommandCtx);
  // Only render group if it has any visible item
  // We naively render and rely on hidden filtering via item visibility.
  // Count visible children by snapshotting ids the group contains.
  const groupRef = useRefCmd(null);
  const [hasVisible, setHasVisible] = useStateCmd(true);
  useEffectCmd(() => {
    if (!groupRef.current) return;
    const ids = Array.from(groupRef.current.querySelectorAll('[data-cmd-item]')).map(n => n.getAttribute('data-cmd-item'));
    setHasVisible(ids.some(id => ctx.visibleIds.includes(id)));
  });
  return (
    <div ref={groupRef} className={cn("overflow-hidden p-1 text-foreground", !hasVisible && "hidden")}>
      {heading && (
        <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{heading}</div>
      )}
      {children}
    </div>
  );
};

const CommandSeparator = ({ className = '' }) => (
  <div className={cn("-mx-1 h-px bg-border", className)}/>
);

let __cmdItemSeq = 0;
const CommandItem = ({ value, onSelect, children, icon, shortcut, disabled, className = '' }) => {
  const ctx = React.useContext(CommandCtx);
  const id = useMemoCmd(() => `cmd-${++__cmdItemSeq}`, []);
  useEffectCmd(() => {
    return ctx.register(id, { value: typeof value === 'string' ? value : (typeof children === 'string' ? children : id), onSelect, disabled });
  }, [value, onSelect, disabled]);

  const visible = ctx.visibleIds.includes(id);
  if (!visible) return null;
  const active = ctx.activeId === id;
  return (
    <div
      data-cmd-item={id}
      role="option"
      aria-selected={active}
      aria-disabled={disabled || undefined}
      onMouseEnter={() => ctx.setActiveId(id)}
      onClick={() => !disabled && onSelect?.()}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none",
        active ? "bg-accent text-accent-foreground" : "text-foreground/90",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {icon && <Icon name={icon} size={16} className={cn("shrink-0", active ? "text-foreground" : "text-muted-foreground")}/>}
      <span className="flex flex-1 min-w-0 items-center gap-2">{children}</span>
      {shortcut && <CommandShortcut>{shortcut}</CommandShortcut>}
    </div>
  );
};

const CommandShortcut = ({ children, className = '' }) => (
  <span className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}>{children}</span>
);

/* ---------- Animations (injected once) ---------- */
(() => {
  if (document.getElementById('__cmdk_styles')) return;
  const s = document.createElement('style');
  s.id = '__cmdk_styles';
  s.textContent = `
    @keyframes cmdkFade { from { opacity: 0 } to { opacity: 1 } }
    @keyframes cmdkPop { from { opacity: 0; transform: translateY(-6px) scale(.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
  `;
  document.head.appendChild(s);
})();

Object.assign(window, {
  Dialog, CommandDialog,
  Command, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator, CommandShortcut,
});
