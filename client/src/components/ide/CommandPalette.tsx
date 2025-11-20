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

export function CommandPalette() {
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
          <CommandItem>
            <Search className="mr-2 h-4 w-4" />
            <span>Search files</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Code className="mr-2 h-4 w-4" />
            <span>Format Document</span>
            <CommandShortcut>⇧⌥F</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Terminal className="mr-2 h-4 w-4" />
            <span>Toggle Terminal</span>
            <CommandShortcut>⌘`</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="File">
          <CommandItem>
            <Plus className="mr-2 h-4 w-4" />
            <span>New File</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <File className="mr-2 h-4 w-4" />
            <span>Save All</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Git">
          <CommandItem>
            <GitBranch className="mr-2 h-4 w-4" />
            <span>Commit Changes</span>
          </CommandItem>
          <CommandItem>
            <RefreshCw className="mr-2 h-4 w-4" />
            <span>Pull from Remote</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
