import {
  Settings,
  Search,
  Cpu, // Changed icon for more "AI/OS" feel
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { FileMenu } from "./FileMenu";
import { useUIMode } from "@/hooks/useUIMode";
import { McpToolsPanel } from "./McpToolsPanel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";

interface HeaderProps {
  currentProject?: string | null;
  onProjectChange?: (projectId: string) => void;
  onSettingsClick?: () => void;
  onRefreshFiles?: () => void;
  onAskMimi?: () => void;
  onSearchSubmit?: (query: string) => void;
}

interface Project {
  id: string;
  name: string;
}

export function Header({ currentProject, onProjectChange, onSettingsClick, onRefreshFiles, onAskMimi, onSearchSubmit }: HeaderProps = {}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const { mode, setMode } = useUIMode();
  const [searchQuery, setSearchQuery] = useState("");
  const { logout } = useAuth();

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch('/api/v1/projects');
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
        }
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    };
    loadProjects();
  }, []);

  const handleSearchSubmit = () => {
    const q = searchQuery.trim();
    if (!q) return;
    onSearchSubmit?.(q);
  };
  return (
    <div className="h-12 bg-[hsl(var(--card))] border-b border-[hsl(var(--sidebar-border))] flex items-center justify-between px-4 shrink-0 z-50 select-none relative overflow-hidden">
      {/* Cosmic Gradient Border Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />

      <div className="flex items-center gap-4">
        <FileMenu onOpenSettings={onSettingsClick} onRefreshFiles={onRefreshFiles} />

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

        {/* Project Selector */}
        {projects.length > 0 && (
          <Select value={currentProject || undefined} onValueChange={onProjectChange}>
            <SelectTrigger className="h-8 w-48 bg-[hsl(var(--card))] border-[hsl(var(--sidebar-border))] text-xs">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="h-6 w-[1px] bg-[hsl(var(--sidebar-border))] mx-2" />

        <div className="flex items-center gap-4 text-xs font-medium text-[hsl(var(--muted-foreground))]">
          <span className="hover:text-white cursor-pointer transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">File</span>
          <span className="hover:text-white cursor-pointer transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">Edit</span>
          <span className="hover:text-white cursor-pointer transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">View</span>
          <span className="hover:text-white cursor-pointer transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">Run</span>
          <span className="hover:text-white cursor-pointer transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">Help</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mx-4">
        <div className="flex items-center gap-2 bg-[#1E1E1E]/80 backdrop-blur-sm rounded-full px-4 py-1.5 w-80 border border-[hsl(var(--sidebar-border))] shadow-inner focus-within:ring-1 focus-within:ring-purple-500/50 transition-all group">
          <Search size={14} className="text-[hsl(var(--muted-foreground))] group-focus-within:text-purple-400 transition-colors" />
          <input
            className="bg-transparent border-none outline-none text-xs text-white flex-1 h-5 ml-2 placeholder:text-[hsl(var(--muted-foreground))]"
            placeholder="Search files, commands, or ask MIMI..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearchSubmit();
              }
            }}
          />
          <span className="text-[10px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--card))] px-1.5 py-0.5 rounded border border-[hsl(var(--sidebar-border))] group-focus-within:border-purple-500/30">
            ⌘K
          </span>
        </div>

        <Select
          value={mode}
          onValueChange={(value) => setMode(value as any)}
        >
          <SelectTrigger className="h-8 w-32 bg-[#1E1E1E]/80 border-[hsl(var(--sidebar-border))] text-[10px] uppercase tracking-wide font-semibold">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="simple">Simple</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
            <SelectItem value="expert">Expert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-white/5 rounded-full"
          onClick={onSettingsClick}
        >
          <Settings size={18} />
        </Button>

        <div className="h-5 w-[1px] bg-[hsl(var(--sidebar-border))]" />

        <McpToolsPanel />

        <Button
          className="h-8 px-4 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-pink-500 text-white border-0 gap-2 text-xs font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all hover:scale-105 rounded-full"
          onClick={() => {
            if (searchQuery.trim() && onSearchSubmit) {
              handleSearchSubmit();
            } else {
              onAskMimi?.();
            }
          }}
        >
          <Sparkles size={14} fill="currentColor" />
          Ask MIMI
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-8 w-8 ml-2 border-2 border-purple-500/20 cursor-pointer ring-2 ring-transparent hover:ring-purple-500/50 transition-all">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1E1E24] border-[hsl(var(--sidebar-border))] text-white">
            <DropdownMenuItem className="focus:bg-purple-500/20 focus:text-white cursor-pointer" onClick={() => logout()}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
