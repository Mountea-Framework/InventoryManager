// Re-export shadcn Command (cmdk-backed) and Dialog (Radix-backed).
// CommandDialog is replaced with a version that uses our wider layout.

import React from 'react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
  /* Dialog family — used by modal sheets in screens */
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};

/**
 * Settings-width command palette: full-width on mobile, 900 px cap on desktop.
 * Replaces the default shadcn CommandDialog which caps at max-w-lg.
 */
export const CommandDialog = ({ children, open, onOpenChange, label = 'Command Menu', ...props }) => (
  <Dialog open={open} onOpenChange={onOpenChange} {...props}>
    <DialogContent
      aria-label={label}
      className="overflow-hidden p-0 shadow-2xl w-[92vw] max-w-[900px]"
    >
      <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
        {children}
      </Command>
    </DialogContent>
  </Dialog>
);
