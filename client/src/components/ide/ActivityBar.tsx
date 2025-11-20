import { 
  Files, 
  Search, 
  GitGraph, 
  Play, 
  Settings, 
  User,
  Box,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityBarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export function ActivityBar({ activeView, setActiveView }: ActivityBarProps) {
  const topItems = [
    { id: 'explorer', icon: Files, label: 'Explorer' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'git', icon: GitGraph, label: 'Source Control' },
    { id: 'debug', icon: Play, label: 'Run and Debug' },
    { id: 'extensions', icon: Box, label: 'Extensions' },
    { id: 'ai', icon: Sparkles, label: 'AI Assistant', highlight: true },
  ];

  const bottomItems = [
    { id: 'account', icon: User, label: 'Accounts' },
    { id: 'settings', icon: Settings, label: 'Manage' },
  ];

  return (
    <div className="w-12 h-full bg-[hsl(var(--activity-bar))] flex flex-col justify-between z-20 border-r border-[hsl(var(--sidebar-border))]">
      <div className="flex flex-col">
        {topItems.map((item) => (
          <button
            key={item.id}
            className={cn(
              "w-12 h-12 flex items-center justify-center text-[hsl(var(--activity-bar-foreground))] hover:text-[hsl(var(--activity-bar-active))] transition-all relative group",
              activeView === item.id && "text-[hsl(var(--activity-bar-active))]",
              item.highlight && "text-purple-400 hover:text-purple-300"
            )}
            onClick={() => setActiveView(item.id)}
            title={item.label}
          >
            {activeView === item.id && (
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[hsl(var(--sidebar-primary))]" />
            )}
            {item.highlight && (
               <div className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
            <item.icon 
              size={24} 
              strokeWidth={1.5} 
              className={cn(item.highlight && activeView === item.id && "animate-pulse")}
            />
          </button>
        ))}
      </div>
      <div className="flex flex-col pb-2">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            className="w-12 h-12 flex items-center justify-center text-[hsl(var(--activity-bar-foreground))] hover:text-[hsl(var(--activity-bar-active))] transition-colors"
            title={item.label}
          >
            <item.icon size={24} strokeWidth={1.5} />
          </button>
        ))}
      </div>
    </div>
  );
}
