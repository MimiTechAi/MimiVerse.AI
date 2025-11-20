import { 
  Play, 
  Share2, 
  Settings, 
  Menu, 
  Search,
  Cpu, // Changed icon for more "AI/OS" feel
  Sparkles,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function Header() {
  return (
    <div className="h-12 bg-[hsl(var(--card))] border-b border-[hsl(var(--sidebar-border))] flex items-center justify-between px-4 shrink-0 z-50 select-none relative overflow-hidden">
      {/* Cosmic Gradient Border Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />
      
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-9 w-9 text-[hsl(var(--muted-foreground))] hover:bg-white/5">
          <Menu size={18} />
        </Button>
        
        <div className="flex items-center gap-3 ml-1">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500 blur-md opacity-40 animate-pulse" />
            <div className="bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-lg p-1.5 shadow-lg shadow-purple-500/20 relative z-10">
              <Cpu size={16} className="text-white" />
            </div>
          </div>
          <div className="flex flex-col justify-center">
             <span className="font-bold text-base tracking-tight text-white leading-none">Mimiverse<span className="text-purple-400">.ai</span></span>
             <span className="text-[10px] text-purple-300/60 font-mono tracking-wider uppercase leading-none mt-1">Cognitive OS v3.0.1</span>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-[hsl(var(--sidebar-border))] mx-2" />

        <div className="flex items-center gap-4 text-xs font-medium text-[hsl(var(--muted-foreground))]">
          <span className="hover:text-white cursor-pointer transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">File</span>
          <span className="hover:text-white cursor-pointer transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">Edit</span>
          <span className="hover:text-white cursor-pointer transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">View</span>
          <span className="hover:text-white cursor-pointer transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">Run</span>
          <span className="hover:text-white cursor-pointer transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">Help</span>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-[#1E1E1E]/80 backdrop-blur-sm rounded-full px-4 py-1.5 w-96 border border-[hsl(var(--sidebar-border))] shadow-inner focus-within:ring-1 focus-within:ring-purple-500/50 transition-all group mx-4">
        <Search size={14} className="text-[hsl(var(--muted-foreground))] group-focus-within:text-purple-400 transition-colors" />
        <input className="bg-transparent border-none outline-none text-xs text-white flex-1 h-5 ml-2 placeholder:text-[hsl(var(--muted-foreground))]" placeholder="Search files, commands, or ask MIMI..." />
        <span className="text-[10px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--card))] px-1.5 py-0.5 rounded border border-[hsl(var(--sidebar-border))] group-focus-within:border-purple-500/30">⌘K</span>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="h-9 px-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-white/5 rounded-full">
          <Settings size={18} />
        </Button>
        
        <div className="h-5 w-[1px] bg-[hsl(var(--sidebar-border))]" />

        <Button className="h-8 px-4 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-pink-500 text-white border-0 gap-2 text-xs font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all hover:scale-105 rounded-full">
          <Sparkles size={14} fill="currentColor" />
          Ask MIMI
        </Button>

        <Button className="h-8 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 gap-2 text-xs font-medium rounded-full transition-colors">
          <Play size={12} fill="currentColor" />
          Run Simulation
        </Button>

        <Avatar className="h-8 w-8 ml-2 border-2 border-purple-500/20 cursor-pointer ring-2 ring-transparent hover:ring-purple-500/50 transition-all">
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
