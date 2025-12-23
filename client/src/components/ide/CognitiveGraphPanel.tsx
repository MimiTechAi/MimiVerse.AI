import { useEffect, useState } from "react";
import { Activity, FileCode, Terminal, Bot, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TimelineEventType =
  | "file_edit"
  | "file_create"
  | "file_delete"
  | "command_run"
  | "ai_request"
  | "agent_action";

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  description: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface CognitiveGraphPanelProps {
  onOpenFile: (path: string) => void;
  onSendToMimi: (prompt: string) => void;
}

export function CognitiveGraphPanel({ onOpenFile, onSendToMimi }: CognitiveGraphPanelProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/timeline");
      if (!res.ok) {
        setEvents([]);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data.events) ? data.events : [];
      setEvents(list as TimelineEvent[]);
    } catch (error) {
      console.error("Timeline fetch failed:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const grouped = events.reduce<Record<TimelineEventType, TimelineEvent[]>>((acc, event) => {
    const key = event.type;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(event);
    return acc;
  }, {
    file_edit: [],
    file_create: [],
    file_delete: [],
    command_run: [],
    ai_request: [],
    agent_action: []
  });

  const handleSendSummary = () => {
    if (!events.length) return;
    const lines: string[] = [];
    lines.push("Recent agent and IDE activity:");
    const latest = events.slice(0, 20);
    latest.forEach((event) => {
      const date = new Date(event.timestamp).toISOString();
      const file = event.metadata && typeof event.metadata.path === "string" ? event.metadata.path : undefined;
      lines.push(`- [${event.type}] ${event.description}${file ? ` (${file})` : ""} @ ${date}`);
    });
    onSendToMimi(lines.join("\n"));
  };

  const handleSendSingle = (event: TimelineEvent) => {
    const date = new Date(event.timestamp).toISOString();
    const file = event.metadata && typeof event.metadata.path === "string" ? event.metadata.path : undefined;
    const lines: string[] = [];
    lines.push(`Context from timeline: [${event.type}] ${event.description}`);
    lines.push(`Timestamp: ${date}`);
    if (file) {
      lines.push(`File: ${file}`);
    }
    if (event.metadata && typeof event.metadata === "object") {
      const keys = Object.keys(event.metadata).filter((key) => key !== "path");
      if (keys.length > 0) {
        lines.push("Metadata:");
        keys.forEach((key) => {
          const value = event.metadata ? event.metadata[key] : undefined;
          lines.push(`- ${key}: ${String(value)}`);
        });
      }
    }
    onSendToMimi(lines.join("\n"));
  };

  const renderIcon = (type: TimelineEventType) => {
    if (type === "command_run") {
      return <Terminal size={12} className="text-emerald-400" />;
    }
    if (type === "ai_request" || type === "agent_action") {
      return <Bot size={12} className="text-purple-400" />;
    }
    if (type === "file_edit" || type === "file_create" || type === "file_delete") {
      return <FileCode size={12} className="text-blue-400" />;
    }
    return <Activity size={12} className="text-gray-400" />;
  };

  const typeOrder: TimelineEventType[] = [
    "agent_action",
    "ai_request",
    "file_edit",
    "file_create",
    "file_delete",
    "command_run"
  ];

  const typeLabel: Record<TimelineEventType, string> = {
    file_edit: "File edits",
    file_create: "New files",
    file_delete: "Deleted files",
    command_run: "Commands",
    ai_request: "AI requests",
    agent_action: "Agent actions"
  };

  return (
    <div className="h-full flex flex-col bg-[#1E1E24] border-r border-[hsl(var(--sidebar-border))]">
      <div className="h-9 px-4 flex items-center justify-between border-b border-[hsl(var(--sidebar-border))] shrink-0">
        <span className="text-xs font-medium text-[hsl(var(--sidebar-foreground))] uppercase tracking-wider">
          Cognitive Graph
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={loadEvents}
            disabled={loading}
            className="h-7 w-7 text-gray-300 hover:text-white hover:bg-white/5"
          >
            <RefreshCw size={14} className={cn(loading ? "animate-spin" : "", "")} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!events.length}
            onClick={handleSendSummary}
            className="h-7 px-2 text-[10px] text-gray-300 hover:text-white hover:bg-white/5 flex items-center gap-1"
          >
            <Bot size={10} />
            Send to MIMI
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {!events.length && !loading && (
          <div className="p-4 text-xs text-gray-500 space-y-1">
            <p>No recent timeline events.</p>
            <p>Actions like file edits, commands and agent runs will appear here.</p>
          </div>
        )}
        {events.length > 0 && (
          <div className="py-2">
            {typeOrder.map((type) => {
              const items = grouped[type];
              if (!items || !items.length) {
                return null;
              }
              return (
                <div key={type} className="mb-3">
                  <div className="px-4 pb-1 flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-wider">
                    <Activity size={12} className="text-purple-400" />
                    <span>{typeLabel[type]}</span>
                    <span className="text-[9px] text-gray-500">{items.length}</span>
                  </div>
                  {items.map((event) => {
                    const file = event.metadata && typeof event.metadata.path === "string" ? event.metadata.path : undefined;
                    const time = new Date(event.timestamp).toLocaleTimeString();
                    const runId = event.metadata && typeof (event.metadata as any).runId === "string"
                      ? String((event.metadata as any).runId)
                      : undefined;
                    return (
                      <div
                        key={event.id}
                        className="px-4 py-1.5 flex flex-col gap-1 border-b border-white/5 hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {renderIcon(event.type)}
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] text-gray-200 truncate">
                              {event.description}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                              <span>{time}</span>
                              {runId && (
                                <span className="px-1.5 py-0.5 rounded-full border border-purple-500/40 text-[9px] text-purple-200 font-mono">
                                  #{runId.slice(-6)}
                                </span>
                              )}
                              {file && (
                                <span className="truncate font-mono text-[10px] text-gray-400">
                                  {file}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          {file && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] text-gray-300 hover:text-white hover:bg-white/5"
                              onClick={() => onOpenFile(file)}
                            >
                              Open file
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-purple-200 hover:text-white hover:bg-purple-600/60 flex items-center gap-1"
                            onClick={() => handleSendSingle(event)}
                          >
                            <Bot size={10} />
                            Use as context
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
