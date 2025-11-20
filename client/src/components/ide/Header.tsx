import { 
  Play, 
  Share2, 
  Settings, 
  Menu, 
  Search,
  LayoutTemplate,
  Download,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  return (
    <div className="h-10 bg-[hsl(var(--card))] border-b border-[hsl(var(--sidebar-border))] flex items-center justify-between px-3 shrink-0 z-50">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(var(--muted-foreground))]">
          <Menu size={16} />
        </Button>
        
        <div className="flex items-center gap-2 ml-1">
          <div className="bg-blue-600 rounded p-1">
            <LayoutTemplate size={12} className="text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Ultimate IDE</span>
        </div>

        <div className="h-4 w-[1px] bg-[hsl(var(--sidebar-border))] mx-2" />

        <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
          <span className="hover:text-[hsl(var(--foreground))] cursor-pointer transition-colors">File</span>
          <span className="hover:text-[hsl(var(--foreground))] cursor-pointer transition-colors">Edit</span>
          <span className="hover:text-[hsl(var(--foreground))] cursor-pointer transition-colors">Selection</span>
          <span className="hover:text-[hsl(var(--foreground))] cursor-pointer transition-colors">View</span>
          <span className="hover:text-[hsl(var(--foreground))] cursor-pointer transition-colors">Go</span>
          <span className="hover:text-[hsl(var(--foreground))] cursor-pointer transition-colors">Run</span>
          <span className="hover:text-[hsl(var(--foreground))] cursor-pointer transition-colors">Terminal</span>
          <span className="hover:text-[hsl(var(--foreground))] cursor-pointer transition-colors">Help</span>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-[hsl(var(--input))] rounded-md px-3 py-1 w-80 border border-[hsl(var(--sidebar-border))] shadow-sm">
        <Search size={12} className="text-[hsl(var(--muted-foreground))]" />
        <span className="text-xs text-[hsl(var(--muted-foreground))] ml-2">Search files, commands...</span>
        <div className="flex-1" />
        <span className="text-[10px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--card))] px-1.5 py-0.5 rounded border border-[hsl(var(--sidebar-border))]">⌘K</span>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 px-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
          <Settings size={16} />
        </Button>
        
        <Button className="h-7 px-3 bg-green-600 hover:bg-green-700 text-white border-0 gap-2 text-xs font-medium">
          <Play size={12} fill="currentColor" />
          Run
        </Button>

        <Button variant="outline" className="h-7 px-3 bg-transparent border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))] hover:text-white gap-2 text-xs font-medium transition-colors">
          <Share2 size={12} />
          Share
        </Button>

        <Avatar className="h-7 w-7 ml-1 border border-[hsl(var(--sidebar-border))]">
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
