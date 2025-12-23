import {
  Files,
  Search,
  GitGraph,
  Play,
  Settings,
  User,
  Box,
  Sparkles,
  Globe,
  Activity,
  Edit3,
  Bot,
  Clock,
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityBarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onSettingsClick?: () => void;
}

export function ActivityBar({ activeView, setActiveView, onSettingsClick }: ActivityBarProps) {
  const topItems = [
    { id: 'explorer', icon: Files, label: 'Explorer' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'git', icon: GitGraph, label: 'Source Control' },
    { type: 'separator' },
    { id: 'ai', icon: Sparkles, label: 'MIMI Agent', highlight: true, color: 'text-purple-400' },
    { id: 'agent', icon: Bot, label: 'Agent Manager', color: 'text-emerald-400' },
    { id: 'composer', icon: Edit3, label: 'Composer', color: 'text-indigo-400' },
    { id: 'browser', icon: Globe, label: 'Neural Browser', color: 'text-blue-400' },
    { id: 'graph', icon: Activity, label: 'Cognitive Graph', color: 'text-green-400' },
    { id: 'timeline', icon: Clock, label: 'Agent Timeline', color: 'text-orange-400' },
    { id: 'context', icon: Layers, label: 'Context Section', color: 'text-cyan-400' },
  ];

  const bottomItems = [
    { id: 'account', icon: User, label: 'Accounts' },
    { id: 'settings', icon: Settings, label: 'Manage' },
  ];

  return (
    <div className="w-14 h-full bg-[#18181B] flex flex-col justify-between z-20 border-r border-[hsl(var(--sidebar-border))] py-2">
      <div className="flex flex-col gap-1 px-1">
        {topItems.map((item, i) => {
          if (item.type === 'separator') {
            return <div key={i} className="h-[1px] bg-white/10 mx-2 my-2" />;
          }

          const ItemIcon = item.icon as any;
          return (
            <button
              key={item.id}
              className={cn(
                "w-12 h-12 flex items-center justify-center rounded-xl transition-all relative group",
                activeView === item.id
                  ? "bg-white/10 text-white"
                  : "text-[hsl(var(--activity-bar-foreground))] hover:bg-white/5 hover:text-white",
                item.highlight && !activeView.includes(item.id!) && "text-purple-400"
              )}
              onClick={() => item.id && setActiveView(item.id)}
              title={item.label}
            >
              {activeView === item.id && (
                <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-purple-500 rounded-r-full" />
              )}

              <ItemIcon
                size={22}
                strokeWidth={1.5}
                className={cn(
                  "transition-transform group-hover:scale-110",
                  item.highlight && activeView === item.id && "animate-pulse text-purple-400",
                  item.color && activeView === item.id && item.color
                )}
              />
            </button>
          );
        })}
      </div>
      <div className="flex flex-col pb-2 gap-1 px-1">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            className="w-12 h-12 flex items-center justify-center rounded-xl text-[hsl(var(--activity-bar-foreground))] hover:bg-white/5 hover:text-white transition-all"
            title={item.label}
            onClick={() => {
              if (item.id === 'settings' && onSettingsClick) {
                onSettingsClick();
              } else {
                // Handle other bottom items if needed
              }
            }}
          >
            <item.icon size={22} strokeWidth={1.5} />
          </button>
        ))}
      </div>
    </div>
  );
}
