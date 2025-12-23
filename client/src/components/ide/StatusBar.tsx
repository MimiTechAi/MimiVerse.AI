import { GitBranch, RefreshCw, AlertCircle, Signal, Bell } from "lucide-react";

interface StatusBarProps {
  line?: number;
  column?: number;
  language?: string;
  encoding?: string;
  gitBranch?: string;
  gitChanges?: number;
  errors?: number;
  warnings?: number;
  layoutPreset?: "build" | "debug" | "chat";
  onLayoutPresetChange?: (value: "build" | "debug" | "chat") => void;
}

export function StatusBar({
  line = 1,
  column = 1,
  language = "Plain Text",
  encoding = "UTF-8",
  gitBranch = "main",
  gitChanges = 0,
  errors = 0,
  warnings = 0,
  layoutPreset,
  onLayoutPresetChange
}: StatusBarProps) {
  return (
    <div className="h-6 bg-[hsl(var(--status-bar))] text-[hsl(var(--status-bar-foreground))] flex items-center justify-between px-3 text-xs select-none">
      <div className="flex items-center gap-4 h-full">
        <div className="flex items-center gap-1 hover:bg-white/20 px-2 h-full cursor-pointer transition-colors">
          <GitBranch size={12} />
          <span>{gitBranch}{gitChanges > 0 ? '*' : ''}</span>
        </div>
        <div className="flex items-center gap-1 hover:bg-white/20 px-2 h-full cursor-pointer transition-colors">
          <RefreshCw size={12} />
          <span>0</span>
          <span>↓</span>
          <span>0</span>
          <span>↑</span>
        </div>
        <div className="flex items-center gap-1 hover:bg-white/20 px-2 h-full cursor-pointer transition-colors">
          <AlertCircle size={12} className={errors > 0 ? "text-red-400" : ""} />
          <span className={errors > 0 ? "text-red-400" : ""}>{errors}</span>
          <AlertCircle size={12} className={`ml-2 ${warnings > 0 ? "text-yellow-400" : ""}`} />
          <span className={warnings > 0 ? "text-yellow-400" : ""}>{warnings}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 h-full">
        {layoutPreset && onLayoutPresetChange && (
          <div className="flex items-center gap-1 h-full px-1 rounded-md bg-white/5">
            <button
              type="button"
              className={`px-2 h-full flex items-center rounded-sm transition-colors ${layoutPreset === "build" ? "bg-white/20 text-white" : "text-[hsl(var(--status-bar-foreground))] hover:bg-white/10"}`}
              onClick={() => onLayoutPresetChange("build")}
            >
              Build
            </button>
            <button
              type="button"
              className={`px-2 h-full flex items-center rounded-sm transition-colors ${layoutPreset === "debug" ? "bg-white/20 text-white" : "text-[hsl(var(--status-bar-foreground))] hover:bg-white/10"}`}
              onClick={() => onLayoutPresetChange("debug")}
            >
              Debug
            </button>
            <button
              type="button"
              className={`px-2 h-full flex items-center rounded-sm transition-colors ${layoutPreset === "chat" ? "bg-white/20 text-white" : "text-[hsl(var(--status-bar-foreground))] hover:bg-white/10"}`}
              onClick={() => onLayoutPresetChange("chat")}
            >
              Chat
            </button>
          </div>
        )}
        <div className="flex items-center gap-1 hover:bg-white/20 px-2 h-full cursor-pointer transition-colors">
          <span>Ln {line}, Col {column}</span>
        </div>
        <div className="flex items-center gap-1 hover:bg-white/20 px-2 h-full cursor-pointer transition-colors">
          <span>{encoding}</span>
        </div>
        <div className="flex items-center gap-1 hover:bg-white/20 px-2 h-full cursor-pointer transition-colors">
          <span>{language}</span>
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
