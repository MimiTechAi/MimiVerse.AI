import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Bot, Activity, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentRun } from "@/hooks/useAgentRun";

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

 interface AgentRun {
  id: string;
  type: TimelineEventType;
  description: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

 interface AgentManagerPanelProps {
  onOpenInChat: (prompt: string) => void;
}

 export function AgentManagerPanel({ onOpenInChat }: AgentManagerPanelProps) {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "agent" | "chat">("all");
  const { agentLog } = useAgentRun();

  const loadRuns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/timeline");
      if (!res.ok) {
        setRuns([]);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data.events) ? data.events : [];
      const filtered = (list as TimelineEvent[]).filter((e) =>
        e.type === "ai_request" || e.type === "agent_action"
      );
      filtered.sort((a, b) => b.timestamp - a.timestamp);
      setRuns(filtered as AgentRun[]);
    } catch (error) {
      console.error("AgentManager load failed:", error);
      setRuns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const visibleRuns = runs.filter((run) => {
    if (filter === "agent") return run.type === "agent_action";
    if (filter === "chat") return run.type === "ai_request";
    return true;
  });

  const handleReopen = (run: AgentRun) => {
    const lines: string[] = [];
    lines.push(
      `Revisit this ${
        run.type === "agent_action" ? "agent run" : "AI request"
      } from the Agent Manager.`
    );
    lines.push("");
    lines.push(run.description);
    const when = new Date(run.timestamp).toISOString();
    lines.push("");
    lines.push(`Originally created at: ${when}.`);
    if (run.metadata && typeof run.metadata === "object") {
      const keys = Object.keys(run.metadata).filter((key) => key !== "path");
      if (keys.length > 0) {
        lines.push("");
        lines.push("Metadata:");
        keys.forEach((key) => {
          const value = (run.metadata as any)[key];
          lines.push(`- ${key}: ${String(value)}`);
        });
      }
    }
    onOpenInChat(lines.join("\n"));
  };

  const handleSummarizeAll = () => {
    if (!visibleRuns.length) return;
    const lines: string[] = [];
    lines.push("Recent agent runs and AI requests:");
    const latest = visibleRuns.slice(0, 20);
    latest.forEach((run) => {
      const when = new Date(run.timestamp).toISOString();
      lines.push(`- [${run.type}] ${run.description} @ ${when}`);
    });
    onOpenInChat(lines.join("\n"));
  };

  const renderIcon = (type: TimelineEventType) => {
    if (type === "agent_action") {
      return <Bot size={12} className="text-purple-400" />;
    }
    if (type === "ai_request") {
      return <Activity size={12} className="text-blue-400" />;
    }
    return <Activity size={12} className="text-gray-400" />;
  };

  return (
    <div className="h-full flex flex-col bg-[#1E1E24] border-r border-[hsl(var(--sidebar-border))]">
      <div className="h-9 px-4 flex items-center justify-between border-b border-[hsl(var(--sidebar-border))] shrink-0">
        <span className="text-xs font-medium text-[hsl(var(--sidebar-foreground))] uppercase tracking-wider">
          Agent Manager
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={loadRuns}
            disabled={loading}
            className="h-7 w-7 text-gray-300 hover:text-white hover:bg-white/5"
          >
            <RefreshCw size={14} className={cn(loading ? "animate-spin" : "", "")} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!runs.length}
            onClick={handleSummarizeAll}
            className="h-7 px-2 text-[10px] text-gray-300 hover:text-white hover:bg-white/5 flex items-center gap-1"
          >
            <Bot size={10} />
            Summarize to MIMI
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-2 flex gap-2 border-b border-white/5 text-[10px] text-gray-400">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 rounded-full",
              filter === "all"
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 rounded-full",
              filter === "agent"
                ? "bg-purple-600/60 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
            onClick={() => setFilter("agent")}
          >
            Agent
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 rounded-full",
              filter === "chat"
                ? "bg-blue-600/60 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
            onClick={() => setFilter("chat")}
          >
            Chat
          </Button>
        </div>
        {!visibleRuns.length && !loading && (
          <div className="p-4 text-xs text-gray-500 space-y-1">
            <p>No runs match the current filter.</p>
            <p>Send prompts in the MIMI Agent panel or execute project plans to see them here.</p>
          </div>
        )}
        {visibleRuns.length > 0 && (
          <div className="py-2">
            {visibleRuns.map((run) => {
              const when = new Date(run.timestamp).toLocaleTimeString();
              const isAgent = run.type === "agent_action";
              const mode = run.metadata && typeof (run.metadata as any).mode === "string"
                ? String((run.metadata as any).mode)
                : undefined;
              const total = run.metadata && typeof (run.metadata as any).total === "number"
                ? (run.metadata as any).total as number
                : undefined;
              const passed = run.metadata && typeof (run.metadata as any).passed === "number"
                ? (run.metadata as any).passed as number
                : undefined;
              const failed = run.metadata && typeof (run.metadata as any).failed === "number"
                ? (run.metadata as any).failed as number
                : undefined;
              const fixedCount = run.metadata && typeof (run.metadata as any).fixedCount === "number"
                ? (run.metadata as any).fixedCount as number
                : undefined;
              const stillFailing = run.metadata && typeof (run.metadata as any).stillFailing === "number"
                ? (run.metadata as any).stillFailing as number
                : undefined;
              return (
                <div
                  key={run.id}
                  className="px-4 py-2 flex flex-col gap-1 border-b border-white/5 hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {renderIcon(run.type)}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-gray-200 truncate">
                        {run.description}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500">
                        <Clock size={10} />
                        <span>{when}</span>
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded-full border text-[9px]",
                            isAgent
                              ? "border-purple-500/40 text-purple-200"
                              : "border-blue-500/40 text-blue-200"
                          )}
                        >
                          {isAgent ? "Agent" : "Chat"}
                        </span>
                        {run.metadata && typeof (run.metadata as any).runId === "string" && (
                          <span className="px-1.5 py-0.5 rounded-full border border-gray-500/40 text-[9px] text-gray-300 font-mono">
                            #{String((run.metadata as any).runId).slice(-6)}
                          </span>
                        )}
                        {mode && (
                          <span className="px-1.5 py-0.5 rounded-full border border-emerald-500/40 text-[9px] text-emerald-200 font-mono">
                            {mode}
                          </span>
                        )}
                      </div>
                      {(mode === 'TEST' || mode === 'TEST_FIX') && (
                        <div className="mt-0.5 flex flex-wrap gap-2 text-[9px] text-gray-400">
                          {typeof total === 'number' && typeof passed === 'number' && typeof failed === 'number' && (
                            <span>
                              Tests: {passed}/{total} passed, {failed} failed
                            </span>
                          )}
                          {typeof fixedCount === 'number' && typeof stillFailing === 'number' && (
                            <span>
                              Auto-fix: {fixedCount} fixed, {stillFailing} still failing
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] text-gray-300 hover:text-white hover:bg-white/5"
                      onClick={() => handleReopen(run)}
                    >
                      Reopen in chat
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {agentLog.length > 0 && (
          <div className="px-4 pt-2 pb-3 border-t border-white/5 text-[10px] text-gray-200">
            <div className="flex items-center justify-between mb-1">
              <span className="uppercase tracking-[0.16em] text-[9px] text-gray-400">Agent log</span>
              <span className="text-[9px] text-gray-500">{agentLog.length}</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {agentLog.slice(-40).map((line, idx) => (
                <div key={idx} className="flex items-start gap-2 text-gray-300">
                  <span className="mt-[3px] w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span className="whitespace-pre-wrap break-words flex-1">{line}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
