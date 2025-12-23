import { useState } from "react";
import { Globe, Search, FileCode, Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface CodeSearchResult {
  path: string;
  content: string;
  similarity: number;
}

interface NeuralBrowserPanelProps {
  onOpenFile: (path: string) => void;
  onSendToMimi: (prompt: string) => void;
}

export function NeuralBrowserPanel({ onOpenFile, onSendToMimi }: NeuralBrowserPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CodeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [source, setSource] = useState<"code" | "web">("code");

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (source !== "code") return;
    setIsSearching(true);
    try {
      const res = await fetch("/api/codebase/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, limit: 10 })
      });
      if (!res.ok) {
        setResults([]);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data.results) ? data.results : [];
      setResults(list as CodeSearchResult[]);
    } catch (error) {
      console.error("Code search failed:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSendAllToMimi = () => {
    if (!results.length) return;
    const lines: string[] = [];
    lines.push("Use the following code search results as context:");
    const limited = results.slice(0, 10);
    limited.forEach((r, index) => {
      const snippet = typeof r.content === "string" ? r.content.slice(0, 400) : "";
      const score = typeof r.similarity === "number" ? r.similarity.toFixed(2) : "";
      lines.push("");
      lines.push(`${index + 1}. ${r.path}${score ? ` (similarity ${score})` : ""}`);
      if (snippet) {
        lines.push("```");
        lines.push(snippet);
        if (typeof r.content === "string" && r.content.length > snippet.length) {
          lines.push("...");
        }
        lines.push("```");
      }
    });
    onSendToMimi(lines.join("\n"));
  };

  const handleSendSingleToMimi = (result: CodeSearchResult) => {
    const snippet = typeof result.content === "string" ? result.content.slice(0, 600) : "";
    const score = typeof result.similarity === "number" ? result.similarity.toFixed(2) : "";
    const lines: string[] = [];
    lines.push(`Use the following file as context: ${result.path}${score ? ` (similarity ${score})` : ""}.`);
    if (snippet) {
      lines.push("");
      lines.push("```");
      lines.push(snippet);
      if (typeof result.content === "string" && result.content.length > snippet.length) {
        lines.push("...");
      }
      lines.push("```");
    }
    onSendToMimi(lines.join("\n"));
  };

  return (
    <div className="h-full flex flex-col bg-[#1E1E24] border-r border-[hsl(var(--sidebar-border))]">
      <div className="h-9 px-4 flex items-center justify-between border-b border-[hsl(var(--sidebar-border))] shrink-0">
        <span className="text-xs font-medium text-[hsl(var(--sidebar-foreground))] uppercase tracking-wider">
          Neural Browser
        </span>
        <div className="flex items-center text-[10px] rounded-full bg-[#111827] p-0.5">
          <button
            type="button"
            onClick={() => setSource("code")}
            className={cn(
              "px-2 py-0.5 rounded-full flex items-center gap-1",
              source === "code" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <FileCode size={10} />
            Codebase
          </button>
          <button
            type="button"
            onClick={() => setSource("web")}
            className={cn(
              "px-2 py-0.5 rounded-full flex items-center gap-1",
              source === "web" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Globe size={10} />
            Web
          </button>
        </div>
      </div>

      <div className="p-3 space-y-2 border-b border-[hsl(var(--sidebar-border))]">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={source === "code" ? "Search codebase semantically..." : "Web search (Labs – disabled in this build)"}
            className="bg-[#252526] border-[#333] text-white placeholder:text-gray-500 text-sm"
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || !query.trim() || source !== "code"}
            size="icon"
            variant="ghost"
            className="shrink-0 hover:bg-purple-600"
          >
            {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          </Button>
        </div>
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Globe size={10} className="text-purple-400" />
            {source === "code" ? "Semantic code search via embeddings" : "Web search (Labs/experimental) – currently unavailable"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!results.length}
            onClick={handleSendAllToMimi}
            className="h-6 px-2 text-[10px] text-gray-300 hover:text-white hover:bg-white/5 flex items-center gap-1"
          >
            <Send size={10} />
            Send all to MIMI
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {results.length === 0 && query && !isSearching && source === "code" && (
          <div className="p-4 text-sm text-gray-500 text-center">
            No results found
          </div>
        )}
        {results.length === 0 && !query && !isSearching && (
          <div className="p-4 text-xs text-gray-500 space-y-1">
            <p>Start a semantic search in your current project.</p>
            <p>Results can be opened in the editor or sent to MIMI as context.</p>
          </div>
        )}
        {results.length > 0 && (
          <div className="py-2">
            <div className="px-4 pb-2 text-xs text-gray-400">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </div>
            {results.map((result, index) => {
              const snippet = typeof result.content === "string" ? result.content.slice(0, 260) : "";
              const score = typeof result.similarity === "number" ? result.similarity.toFixed(2) : "";
              return (
                <div
                  key={`${result.path}-${index}`}
                  className="px-4 py-2 border-b border-white/5 hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode size={14} className="text-blue-400 shrink-0" />
                      <span className="text-gray-200 font-mono text-xs truncate">
                        {result.path}
                      </span>
                    </div>
                    {score && (
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {score}
                      </span>
                    )}
                  </div>
                  {snippet && (
                    <div className="pl-5 text-[11px] text-gray-400 font-mono whitespace-pre-wrap break-words line-clamp-3">
                      {snippet}
                    </div>
                  )}
                  <div className="mt-2 flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] text-gray-300 hover:text-white hover:bg-white/5"
                      onClick={() => onOpenFile(result.path)}
                    >
                      Open in editor
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] text-purple-200 hover:text-white hover:bg-purple-600/60 flex items-center gap-1"
                      onClick={() => handleSendSingleToMimi(result)}
                    >
                      <Send size={10} />
                      Send to MIMI
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
