import * as React from "react";
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  File,
  Search,
  Code,
  Terminal,
  GitBranch,
  Plus,
  RefreshCw
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

interface CommandPaletteProps {
  onCommand?: (commandId: string) => void;
}

export function CommandPalette({ onCommand }: CommandPaletteProps = {}) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem onSelect={() => { onCommand?.('search'); setOpen(false); }}>
            <Search className="mr-2 h-4 w-4" />
            <span>Search files</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => { onCommand?.('format'); setOpen(false); }}>
            <Code className="mr-2 h-4 w-4" />
            <span>Format Document</span>
            <CommandShortcut>⇧⌥F</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => { onCommand?.('terminal'); setOpen(false); }}>
            <Terminal className="mr-2 h-4 w-4" />
            <span>Toggle Terminal</span>
            <CommandShortcut>⌘`</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="File">
          <CommandItem onSelect={() => { onCommand?.('file:new'); setOpen(false); }}>
            <Plus className="mr-2 h-4 w-4" />
            <span>New File</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => { onCommand?.('file:saveAll'); setOpen(false); }}>
            <File className="mr-2 h-4 w-4" />
            <span>Save All</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Git">
          <CommandItem onSelect={() => { onCommand?.('git:commit'); setOpen(false); }}>
            <GitBranch className="mr-2 h-4 w-4" />
            <span>Commit Changes</span>
          </CommandItem>
          <CommandItem onSelect={() => { onCommand?.('git:pull'); setOpen(false); }}>
            <RefreshCw className="mr-2 h-4 w-4" />
            <span>Pull from Remote</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
