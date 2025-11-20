import { GitBranch, RefreshCw, AlertCircle, Signal, Bell, Check } from "lucide-react";

export function StatusBar() {
  return (
    <div className="h-6 bg-[hsl(var(--status-bar))] text-[hsl(var(--status-bar-foreground))] flex items-center justify-between px-3 text-xs select-none">
      <div className="flex items-center gap-4 h-full">
        <div className="flex items-center gap-1 hover:bg-white/20 px-2 h-full cursor-pointer transition-colors">
          <GitBranch size={12} />
          <span>main*</span>
        </div>
        <div className="flex items-center gap-1 hover:bg-white/20 px-2 h-full cursor-pointer transition-colors">
          <RefreshCw size={12} />
          <span>0</span>
          <span>↓</span>
          <span>0</span>
          <span>↑</span>
        </div>
        <div className="flex items-center gap-1 hover:bg-white/20 px-2 h-full cursor-pointer transition-colors">
          <AlertCircle size={12} />
          <span>0</span>
          <AlertCircle size={12} className="ml-2" />
          <span>0</span>
        </div>
      </div>

      <div className="flex items-center gap-4 h-full">
        <div className="flex items-center gap-1 hover:bg-white/20 px-2 h-full cursor-pointer transition-colors">
          <span>Ln 12, Col 34</span>
        </div>
        <div className="flex items-center gap-1 hover:bg-white/20 px-2 h-full cursor-pointer transition-colors">
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-1 hover:bg-white/20 px-2 h-full cursor-pointer transition-colors">
          <span>TypeScript React</span>
        </div>
        <div className="flex items-center gap-1 hover:bg-white/20 px-2 h-full cursor-pointer transition-colors">
          <Signal size={12} />
        </div>
        <div className="flex items-center gap-1 hover:bg-white/20 px-2 h-full cursor-pointer transition-colors">
          <Bell size={12} />
        </div>
      </div>
    </div>
  );
}
