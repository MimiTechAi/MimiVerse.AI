import { 
  Play, 
  Share2, 
  Settings, 
  Menu, 
  Search,
  LayoutTemplate,
  Download,
  ChevronDown,
  Sparkles,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function Header() {
  return (
    <div className="h-10 bg-[hsl(var(--card))] border-b border-[hsl(var(--sidebar-border))] flex items-center justify-between px-3 shrink-0 z-50 select-none">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(var(--muted-foreground))] hover:bg-white/5">
          <Menu size={16} />
        </Button>
        
        <div className="flex items-center gap-2 ml-1">
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded p-1 shadow-lg shadow-blue-500/20">
            <LayoutTemplate size={12} className="text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-white/90">Ultimate IDE</span>
        </div>

        <div className="h-4 w-[1px] bg-[hsl(var(--sidebar-border))] mx-2" />

        <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
          <span className="hover:text-[hsl(var(--foreground))] cursor-pointer transition-colors">File</span>
          <span className="hover:text-[hsl(var(--foreground))] cursor-pointer transition-colors">Edit</span>
          <span className="hover:text-[hsl(var(--foreground))] cursor-pointer transition-colors">View</span>
          <span className="hover:text-[hsl(var(--foreground))] cursor-pointer transition-colors">Run</span>
          <span className="hover:text-[hsl(var(--foreground))] cursor-pointer transition-colors">Help</span>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-[#1E1E1E] rounded-md px-3 py-1 w-96 border border-[hsl(var(--sidebar-border))] shadow-inner focus-within:ring-1 focus-within:ring-purple-500/50 transition-all group">
        <Search size={12} className="text-[hsl(var(--muted-foreground))] group-focus-within:text-purple-400" />
        <span className="text-xs text-[hsl(var(--muted-foreground))] ml-2 group-focus-within:hidden">Search files, commands...</span>
        <input className="hidden group-focus-within:block bg-transparent border-none outline-none text-xs text-white flex-1 h-4 ml-2" placeholder="Search..." />
        <div className="flex-1 group-focus-within:hidden" />
        <span className="text-[10px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--card))] px-1.5 py-0.5 rounded border border-[hsl(var(--sidebar-border))]">⌘K</span>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-8 px-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
          <Settings size={16} />
        </Button>
        
        <div className="h-4 w-[1px] bg-[hsl(var(--sidebar-border))]" />

        <Button className="h-7 px-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 gap-2 text-xs font-medium shadow-lg shadow-purple-500/20 transition-all hover:scale-105">
          <Sparkles size={12} fill="currentColor" />
          Ask AI
        </Button>

        <Button className="h-7 px-3 bg-green-600 hover:bg-green-700 text-white border-0 gap-2 text-xs font-medium">
          <Play size={12} fill="currentColor" />
          Run
        </Button>

        <Avatar className="h-7 w-7 ml-1 border border-[hsl(var(--sidebar-border))] cursor-pointer ring-2 ring-transparent hover:ring-purple-500/50 transition-all">
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
