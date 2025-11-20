import { 
  Files, 
  Search, 
  GitGraph, 
  Play, 
  Settings, 
  User,
  Box
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
              "w-12 h-12 flex items-center justify-center text-[hsl(var(--activity-bar-foreground))] hover:text-[hsl(var(--activity-bar-active))] transition-colors relative",
              activeView === item.id && "text-[hsl(var(--activity-bar-active))]"
            )}
            onClick={() => setActiveView(item.id)}
            title={item.label}
          >
            {activeView === item.id && (
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[hsl(var(--sidebar-primary))]" />
            )}
            <item.icon size={24} strokeWidth={1.5} />
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
