import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface McpServerInfo {
  name: string;
  enabled: boolean;
  rawStatus: string;
}

interface McpTool {
  id: string;
  serverId: string;
  name: string;
  description?: string;
  enabled?: boolean;
}

interface McpToolsResponse {
  tools: McpTool[];
}

interface McpServersResponse {
  servers: McpServerInfo[];
}

export function McpToolsPanel() {
  const [open, setOpen] = useState(false);
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [serversRes, toolsRes] = await Promise.all([
          fetch("/api/v1/mcp/servers"),
          fetch("/api/v1/mcp/tools"),
        ]);

        if (!serversRes.ok) {
          throw new Error("Failed to load MCP servers");
        }
        if (!toolsRes.ok) {
          throw new Error("Failed to load MCP tools");
        }

        const serversJson = (await serversRes.json()) as McpServersResponse & { warning?: string };
        const toolsJson = (await toolsRes.json()) as McpToolsResponse;

        setServers(serversJson.servers || []);
        setTools(toolsJson.tools || []);

        if (serversJson.warning) {
          setError(serversJson.warning);
        }
      } catch (err: any) {
        console.error("[McpToolsPanel] Failed to load MCP data", err);
        setError(err?.message || "Failed to load MCP configuration");
        toast({
          title: "MCP configuration error",
          description: err?.message || "Failed to load MCP servers/tools.",
        });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [open]);

  const toggleServer = async (server: McpServerInfo, nextEnabled: boolean) => {
    try {
      const endpoint = nextEnabled ? "enable" : "disable";
      const res = await fetch(`/api/v1/mcp/servers/${encodeURIComponent(server.name)}/${endpoint}`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(`Failed to ${endpoint} server ${server.name}`);
      }
      setServers((prev) =>
        prev.map((s) =>
          s.name === server.name
            ? { ...s, enabled: nextEnabled }
            : s,
        ),
      );
    } catch (err: any) {
      console.error("[McpToolsPanel] Failed to toggle server", err);
      toast({
        title: "Failed to update MCP server",
        description: err?.message || `Could not ${nextEnabled ? "enable" : "disable"} ${server.name}.`,
      });
    }
  };

  const toggleTool = async (tool: McpTool, nextEnabled: boolean) => {
    try {
      const endpoint = nextEnabled ? "enable" : "disable";
      const res = await fetch(`/api/v1/mcp/tools/${encodeURIComponent(tool.id)}/${endpoint}`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(`Failed to ${endpoint} tool ${tool.id}`);
      }
      setTools((prev) =>
        prev.map((t) =>
          t.id === tool.id
            ? { ...t, enabled: nextEnabled }
            : t,
        ),
      );
    } catch (err: any) {
      console.error("[McpToolsPanel] Failed to toggle tool", err);
      toast({
        title: "Failed to update MCP tool",
        description: err?.message || `Could not ${nextEnabled ? "enable" : "disable"} ${tool.id}.`,
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-3 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-white/5 rounded-full gap-1"
        >
          <Settings2 size={16} />
          <span className="text-xs">MCP Tools</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 bg-[hsl(var(--card))] border-[hsl(var(--sidebar-border))] p-4 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">MCP Servers</h3>
            {loading && <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Loading…</span>}
          </div>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
            Verwaltet die aktiven MCP-Server aus dem Docker MCP Catalog (docker mcp server ls / enable / disable).
          </p>
        </div>

        {error && (
          <div className="text-[11px] text-red-400 bg-red-950/40 border border-red-900/60 px-2 py-1.5 rounded">
            {error}
          </div>
        )}

        <div className="space-y-2 max-h-56 overflow-auto pr-1">
          {servers.map((server) => (
            <div key={server.name} className="flex items-center justify-between text-xs py-1">
              <div className="flex flex-col">
                <span className="font-medium text-[hsl(var(--foreground))]">{server.name}</span>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  Status: {server.rawStatus || (server.enabled ? "enabled" : "disabled")}
                </span>
              </div>
              <Switch
                checked={server.enabled}
                onCheckedChange={(checked) => void toggleServer(server, checked)}
              />
            </div>
          ))}

          {servers.length === 0 && !loading && (
            <div className="text-[11px] text-[hsl(var(--muted-foreground))] italic">
              Keine MCP-Server gefunden. Stelle sicher, dass docker mcp installiert ist und der Gateway läuft.
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-[hsl(var(--sidebar-border))] space-y-2">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">MCP Tools</h3>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
            Aktiviert/Deaktiviert registrierte MCP-Tools, die dem AgentBrain als Werkzeuge zur Verfügung stehen.
          </p>
          <div className="space-y-2 max-h-40 overflow-auto pr-1">
            {tools.map((tool) => (
              <div key={tool.id} className="flex items-center justify-between text-xs py-1">
                <div className="flex flex-col">
                  <span className="font-medium text-[hsl(var(--foreground))]">{tool.name || tool.id}</span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {tool.description || tool.id} · Server: {tool.serverId}
                  </span>
                </div>
                <Switch
                  checked={!!tool.enabled}
                  onCheckedChange={(checked) => void toggleTool(tool, checked)}
                />
              </div>
            ))}

            {tools.length === 0 && !loading && (
              <div className="text-[11px] text-[hsl(var(--muted-foreground))] italic">
                Noch keine MCP-Tools registriert. Konfiguriere sie über config/mcp-tools.json oder eine API.
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
