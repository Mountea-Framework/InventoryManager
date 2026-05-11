import React, { useState, useEffect } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetFooter, SheetClose,
} from './components/ui/sheet.jsx';
import { Button, Icon } from './ui.jsx';
import { FormRenderer } from './form-renderer.jsx';

/**
 * Reusable right-panel Sheet for creating a new entity driven by a FormSchema.
 *
 * Resets to a fresh draft each time the sheet opens. Validates required fields
 * before allowing save. Dependent fields (dependsOn) are automatically cleared
 * when their parent field changes.
 *
 * @param {{
 *   open: boolean,
 *   onOpenChange: (v: boolean) => void,
 *   schema: import('./form-schemas.js').FormSchema,
 *   createDraft: () => object,
 *   taxonomy: object,
 *   onSave: (draft: object) => void,
 *   sectionIds?: string[],
 * }} props
 */
export function EntityCreateSheet({
  open, onOpenChange, schema, createDraft, taxonomy, onSave, sectionIds,
}) {
  const [draft, setDraft] = useState(createDraft);

  useEffect(() => {
    if (open) setDraft(createDraft());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (path, val) => {
    setDraft(d => {
      const next = structuredClone(d);

      const writePath = (obj, p, v) => {
        const keys = p.split('.');
        let cur = obj;
        for (let i = 0; i < keys.length - 1; i++) {
          if (cur[keys[i]] == null) cur[keys[i]] = {};
          cur = cur[keys[i]];
        }
        cur[keys[keys.length - 1]] = v;
      };

      writePath(next, path, val);

      // Clear any fields whose options depend on this field
      schema.sections.forEach(s =>
        s.fields.forEach(f => {
          if (f.dependsOn === path) writePath(next, f.id, '');
        })
      );

      return next;
    });
  };

  const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);

  const activeSections = sectionIds
    ? schema.sections.filter(s => sectionIds.includes(s.id))
    : schema.sections;

  const isValid = activeSections
    .flatMap(s => s.fields.filter(f => f.required))
    .every(f => {
      const v = getPath(draft, f.id);
      return v !== '' && v !== null && v !== undefined;
    });

  const handleSave = () => {
    if (!isValid) return;
    onSave(draft);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[580px]"
        showCloseButton={false}
      >
        <SheetHeader className="flex-row items-center gap-3 border-b border-border px-6 py-4 space-y-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
            <Icon name={schema.icon} size={18}/>
          </div>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-base leading-tight">New {schema.title}</SheetTitle>
            <SheetDescription className="text-xs leading-tight mt-0.5">
              Fill in the required fields then click Create.
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <FormRenderer
            schema={schema}
            draft={draft}
            set={set}
            taxonomy={taxonomy}
            sectionIds={sectionIds}
          />
        </div>

        <SheetFooter className="border-t border-border px-6 py-4">
          <SheetClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </SheetClose>
          <Button size="sm" onClick={handleSave} disabled={!isValid}>
            <Icon name="plus" size={13}/>
            Create {schema.title}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
