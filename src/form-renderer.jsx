import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  cn, Icon, Button, Input, Select, Switch, Tooltip,
  Section, Row, TextField, Textarea, FilePicker,
} from './ui.jsx';
import { ITEM_FLAGS, ITEM_ACTIONS, bitsToFlags, flagsToBits } from './data.js';
import { getPath } from './utils.js';
import { saveFile } from './store.js';

/**
 * @typedef {import('./form-schemas.js').FieldSchema} FieldSchema
 * @typedef {import('./form-schemas.js').SectionSchema} SectionSchema
 * @typedef {import('./form-schemas.js').FormSchema} FormSchema
 */

/* ============================================================
   Shared form components
   ============================================================ */

const FLAG_ICONS = {
  tradeable: 'export', stackable: 'layers', craftable: 'hammer', dropable: 'arrowRight',
  consumable: 'drop',  questItem: 'tag',    unique: 'sparkle',   durable: 'history',
};

/**
 * Toggleable bitmask chip grid for EInventoryItemFlags.
 * @param {{ value: number, onChange: (v: number) => void }} props
 */
export function FlagsPicker({ value, onChange }) {
  const flags = bitsToFlags(value || 0);
  const toggle = (key) => onChange?.(flagsToBits({ ...flags, [key]: !flags[key] }));
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {ITEM_FLAGS.map(f => {
        const on = !!flags[f.key];
        return (
          <Tooltip key={f.key} content={f.tip}>
            <button type="button" onClick={() => toggle(f.key)}
              className={cn(
                'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors',
                on ? 'border-primary/60 bg-primary/10 text-foreground' : 'border-border bg-card/40 text-muted-foreground hover:bg-accent/40 hover:text-foreground',
              )}>
              <Icon name={FLAG_ICONS[f.key] || 'tag'} size={12} className={on ? 'text-primary' : ''}/>
              <span className="flex-1 truncate text-xs">{f.label}</span>
              <span className="font-mono text-[9.5px] opacity-60">1&lt;&lt;{Math.log2(f.bit)}</span>
              {on && <Icon name="check" size={11} className="text-primary"/>}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

/**
 * Editable chip list with optional datalist autocomplete.
 * @param {{ values: string[], onChange: (v: string[]) => void, placeholder?: string, mono?: boolean, suggestions?: string[] }} props
 */
export function StringListField({ values = [], onChange, placeholder = 'add entry', mono = true, suggestions = [] }) {
  const [draft, setDraft] = useState('');
  const listId = useMemo(() => `sl-${Math.random().toString(36).slice(2, 6)}`, []);

  const remove = (i) => onChange?.(values.filter((_, j) => j !== i));
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange?.([...values, v]);
    setDraft('');
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span key={i} className={cn(
            'inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5',
            mono ? 'font-mono text-[10.5px]' : 'text-xs',
          )}>
            {v}
            <button onClick={() => remove(i)} className="opacity-60 hover:opacity-100"><Icon name="x" size={10}/></button>
          </span>
        ))}
        {values.length === 0 && <span className="text-xs italic text-muted-foreground">empty</span>}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={placeholder}
          list={suggestions.length ? listId : undefined}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          className={cn('h-8 text-xs', mono && 'font-mono')}
        />
        {suggestions.length > 0 && (
          <datalist id={listId}>
            {suggestions.map(s => <option key={s} value={s}/>)}
          </datalist>
        )}
        <Button size="sm" variant="outline" onClick={add} icon="plus"/>
      </div>
    </div>
  );
}

/**
 * Generic multi-select chip grid for string option lists (e.g. attachment slots).
 * Accepts strings or option-like objects ({ value, label }).
 * @param {{ value: string[], onChange: (v: string[]) => void, options: Array<string|{value:string,label?:string}> }} props
 */
function MultiChipField({ value = [], onChange, options = [] }) {
  const normalized = options.map((opt) => {
    if (typeof opt === 'string') return { value: opt, label: opt };
    if (opt && typeof opt === 'object') return { value: opt.value ?? '', label: opt.label ?? String(opt.value ?? '') };
    return { value: '', label: '' };
  }).filter(opt => !!opt.value);

  const selected = new Set(value);
  const toggle = (optValue) => {
    const next = selected.has(optValue) ? value.filter(v => v !== optValue) : [...value, optValue];
    onChange?.(next);
  };
  if (normalized.length === 0)
    return <span className="text-xs italic text-muted-foreground">No options defined in settings.</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {normalized.map(opt => {
        const on = selected.has(opt.value);
        return (
          <button key={opt.value} type="button" onClick={() => toggle(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-mono transition-colors',
              on ? 'border-primary/60 bg-primary/10 text-foreground' : 'border-border bg-card/40 text-muted-foreground hover:bg-accent/40 hover:text-foreground',
            )}>
            {on && <Icon name="check" size={11} className="text-primary"/>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Multi-select action chip grid. Reads available actions from taxonomy (falls back to ITEM_ACTIONS).
 * @param {{ value: string[], onChange: (v: string[]) => void, taxonomy: object }} props
 */
export function ItemActionsPicker({ value = [], onChange, taxonomy }) {
  const catalog = taxonomy?.itemActions ?? ITEM_ACTIONS;
  const enabled = new Set(value);

  const toggle = (key) => {
    const next = enabled.has(key)
      ? value.filter(k => k !== key)
      : catalog.filter(a => enabled.has(a.key) || a.key === key).map(a => a.key);
    onChange?.(next);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {catalog.map(a => {
          const on = enabled.has(a.key);
          return (
            <Tooltip key={a.key} content={a.tip}>
              <button type="button" onClick={() => toggle(a.key)}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors',
                  on ? 'border-primary/60 bg-primary/10 text-foreground' : 'border-border bg-card/40 text-muted-foreground hover:bg-accent/40 hover:text-foreground',
                )}>
                <Icon name={a.icon} size={12} className={on ? 'text-primary' : ''}/>
                <span className="flex-1 truncate text-xs">{a.key}</span>
                {on && <Icon name="check" size={11} className="text-primary"/>}
              </button>
            </Tooltip>
          );
        })}
      </div>
      {value.length > 0 && (
        <div className="rounded-md border border-border/60 bg-card/40 p-2.5">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Enabled actions (in order)</div>
          <div className="flex flex-wrap gap-1.5">
            {value.map(k => (
              <span key={k} className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10.5px] text-primary">{k}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Multi-select chip grid for special affect blueprints defined in taxonomy.
 * @param {{ value: string[], onChange: (v: string[]) => void, taxonomy: object }} props
 */
export function SpecialAffectsPicker({ value = [], onChange, taxonomy }) {
  const catalog = taxonomy?.specialAffects ?? [];
  const enabled = new Set(value);

  const toggle = (tag) => {
    const next = enabled.has(tag) ? value.filter(t => t !== tag) : [...value, tag];
    onChange?.(next);
  };

  if (catalog.length === 0)
    return <span className="text-xs italic text-muted-foreground">No special affects defined. Add them in Settings.</span>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {catalog.map(a => {
          const on = enabled.has(a.tag);
          return (
            <Tooltip key={a.tag} content={a.tag}>
              <button type="button" onClick={() => toggle(a.tag)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors',
                  on ? 'border-primary/60 bg-primary/10 text-foreground' : 'border-border bg-card/40 text-muted-foreground hover:bg-accent/40 hover:text-foreground',
                )}>
                <Icon name="sparkle" size={12} className={on ? 'text-primary' : ''}/>
                <span className="truncate">{a.name}</span>
                {on && <Icon name="check" size={11} className="text-primary"/>}
              </button>
            </Tooltip>
          );
        })}
      </div>
      {value.length > 0 && (
        <div className="rounded-md border border-border/60 bg-card/40 p-2.5">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Active affects</div>
          <div className="flex flex-wrap gap-1.5">
            {value.map(tag => {
              const af = catalog.find(a => a.tag === tag);
              return (
                <span key={tag} className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10.5px] text-primary">
                  {af?.name ?? tag}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Generic range slider for schema-driven forms.
 * @param {{ field: FieldSchema, value: string|number, onChange: (v: string|number) => void }} props
 */
function RangeField({ field, value, onChange }) {
  const min  = field.min ?? 0;
  const max  = field.max ?? 100;
  const unit = field.unit ?? '';
  const [v, setV] = useState(parseInt(value, 10) || min);

  useEffect(() => { setV(parseInt(value, 10) || min); }, [value, min]);

  const pct = Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));

  const handleChange = (next) => {
    setV(next);
    onChange(unit ? `${next}${unit}` : next);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-5 flex-1 items-center">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }}/>
        </div>
        <input
          type="range" min={min} max={max} step={field.step ?? 1} value={v}
          onChange={e => handleChange(+e.target.value)}
          className="absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0"
        />
        <div
          className="pointer-events-none absolute h-4 w-4 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow top-1/2"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
      <span className="shrink-0 text-right font-mono text-xs">{v}{unit}</span>
    </div>
  );
}

/* ============================================================
   Internals
   ============================================================ */

/** Returns the appropriate zero/empty value for a field when its section is disabled. */
function defaultClearValue(type, field) {
  switch (type) {
    case 'number': return field?.min ?? 0;
    case 'switch': return false;
    case 'tags': case 'string-list': case 'chip-multi': return [];
    case 'flags': return 0;
    default: return '';
  }
}

/** Field types that need a stacked (full-width) Row layout. */
const STACK_TYPES = new Set(['textarea', 'flags', 'tags', 'string-list', 'chip-multi', 'file', 'item-list', 'group-list', 'slot-map']);

/**
 * Resolves a field's option list from its static options and/or taxonomy source.
 * @param {FieldSchema} field
 * @param {object} taxonomy
 * @param {object} draft
 * @returns {Array}
 */
function resolveOptions(field, taxonomy, draft) {
  const base = field.options ?? [];
  if (!field.source) return base;

  if (field.source === 'taxonomy.categories') {
    if (field.dependsOn === 'category') {
      const activeCat = (taxonomy?.categories ?? []).find(c => c.title === (draft?.[field.dependsOn] ?? ''));
      return [
        { value: '', label: '— none —' },
        ...(activeCat?.subcategories ?? []).map(s => ({ value: s.title, label: s.title })),
      ];
    }
    return (taxonomy?.categories ?? []).map(c => ({ value: c.title, label: c.title }));
  }
  if (field.source === 'taxonomy.rarities')
    return (taxonomy?.rarities ?? []).map(r => ({ value: r.title, label: r.title }));
  if (field.source === 'taxonomy.craftingStations')
    return [...base, ...(taxonomy?.craftingStations ?? []).map(s => ({ value: s.name, label: s.name }))];
  if (field.source === 'taxonomy.itemActions')
    return taxonomy?.itemActions ?? ITEM_ACTIONS;
  if (field.source === 'taxonomy.attachmentSlots')
    return (taxonomy?.attachmentSlots ?? []).map(s => s.name);
  return base;
}

/**
 * Renders one field based on its schema type.
 * Calls renderField(field, value, onChange) first — return non-null to override.
 * @param {{ field: FieldSchema, draft: object, set: Function, taxonomy: object, renderField?: Function, disabled?: boolean }} props
 */
function FieldRenderer({ field, draft, set, taxonomy, renderField, disabled = false }) {
  const value    = getPath(draft, field.id);
  const onChange = (v) => set(field.id, v);
  const isDisabled = disabled || !!field.disabled;

  if (renderField) {
    const custom = renderField(field, value, onChange);
    if (custom != null) return custom;
  }

  switch (field.type) {
    case 'readonly':
      return <TextField value={value ?? ''} mono readOnly/>;
    case 'text':
      return <TextField value={value ?? ''} onChange={onChange} placeholder={field.placeholder} disabled={isDisabled}/>;
    case 'textarea':
      return <Textarea value={value ?? ''} onChange={e => onChange(e.target.value)} rows={4} placeholder={field.placeholder} disabled={isDisabled}/>;
    case 'number': {
      const suffix = field.unit ? <span className="text-xs">{field.unit}</span> : undefined;
      return (
        <TextField
          value={String(value ?? '')}
          onChange={v => onChange(field.step === 1 ? parseInt(v) || 0 : parseFloat(v) || 0)}
          mono
          suffix={suffix}
          disabled={isDisabled}
        />
      );
    }
    case 'select': {
      const options = resolveOptions(field, taxonomy, draft);
      return <Select value={value ?? ''} onChange={onChange} options={options} placeholder={field.placeholder} disabled={isDisabled}/>;
    }
    case 'switch':
      return <Switch checked={!!value} onCheckedChange={onChange} disabled={isDisabled}/>;
    case 'file':
      return <FilePicker
        value={value ?? ''}
        onChange={onChange}
        onFilePicked={async (file) => { await saveFile(file.name, file); onChange(file.name); }}
        accept={field.accept}
        placeholder={field.placeholder}
        disabled={isDisabled}
      />;
    case 'tags':
      return <StringListField values={value ?? []} onChange={onChange} placeholder={field.placeholder} disabled={isDisabled}/>;
    case 'string-list': {
      const suggestions = field.source ? resolveOptions(field, taxonomy, draft) : [];
      return <StringListField values={value ?? []} onChange={onChange} placeholder={field.placeholder} suggestions={suggestions} disabled={isDisabled}/>;
    }
    case 'flags':
      return <FlagsPicker value={value ?? 0} onChange={onChange} disabled={isDisabled}/>;
    case 'chip-multi':
      if (field.source === 'taxonomy.itemActions')
        return <ItemActionsPicker value={value ?? []} onChange={onChange} taxonomy={taxonomy} disabled={isDisabled}/>;
      if (field.source === 'taxonomy.specialAffects')
        return <SpecialAffectsPicker value={value ?? []} onChange={onChange} taxonomy={taxonomy} disabled={isDisabled}/>;
      if (field.source) {
        const options = resolveOptions(field, taxonomy, draft);
        return <MultiChipField value={value ?? []} onChange={onChange} options={options} disabled={isDisabled}/>;
      }
      return <ItemActionsPicker value={value ?? []} onChange={onChange} taxonomy={taxonomy} disabled={isDisabled}/>;
    case 'range':
      return <RangeField field={field} value={value} onChange={onChange} disabled={isDisabled}/>;
    default:
      return null;
  }
}

/**
 * Renders one schema section as a collapsible <Section> with its fields as <Row>s.
 * If section.editCondition is set, all fields except the controlling field are disabled
 * when the condition path is falsy. On the true→false transition, dependent fields are
 * reset to their type-appropriate clear values.
 * @param {{ section: SectionSchema, draft: object, set: Function, taxonomy: object, renderField?: Function }} props
 */
function SectionRenderer({ section, draft, set, taxonomy, renderField }) {
  const conditionPath = section.editCondition ?? null;
  const conditionMet = conditionPath ? !!getPath(draft, conditionPath) : true;
  const prevRef = useRef(conditionMet);

  useEffect(() => {
    if (prevRef.current && !conditionMet && conditionPath) {
      section.fields.forEach(f => {
        if (f.id === conditionPath) return;
        const cv = f.clearValue !== undefined ? f.clearValue : defaultClearValue(f.type, f);
        set(f.id, cv);
      });
    }
    prevRef.current = conditionMet;
  }, [conditionMet]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Section title={section.title} icon={section.icon} compact={section.compact}>
      {section.fields.map(field => {
        const fieldDisabled = !conditionMet && conditionPath && field.id !== conditionPath;
        return (
          <Row key={field.id} label={field.label} hint={field.hint} tooltip={field.tooltip} stack={STACK_TYPES.has(field.type)}>
            <FieldRenderer field={field} draft={draft} set={set} taxonomy={taxonomy} renderField={renderField} disabled={!!fieldDisabled}/>
          </Row>
        );
      })}
    </Section>
  );
}

/* ============================================================
   FormRenderer — public API
   ============================================================ */

/**
 * Renders a complete form driven by a FormSchema.
 *
 * @param {{
 *   schema: FormSchema,
 *   draft: object,
 *   set: (path: string, val: *) => void,
 *   taxonomy: object,
 *   renderField?: (field: FieldSchema, value: *, onChange: Function) => React.ReactNode|null,
 *   sectionIds?: string[]
 * }} props
 */
export function FormRenderer({ schema, draft, set, taxonomy, renderField, sectionIds }) {
  const sections = sectionIds
    ? schema.sections.filter(s => sectionIds.includes(s.id))
    : schema.sections;

  return (
    <div className="space-y-4 p-3 md:p-6">
      {sections.map(section => (
        <SectionRenderer
          key={section.id}
          section={section}
          draft={draft}
          set={set}
          taxonomy={taxonomy}
          renderField={renderField}
        />
      ))}
    </div>
  );
}
