import { useState } from 'react';
import { Search, X, FileText, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SearchResult {
    file: string;
    line: number;
    column: number;
    match: string;
    context: string;
}

interface SearchPanelProps {
    onFileSelect: (file: string, line: number) => void;
}

export function SearchPanel({ onFileSelect }: SearchPanelProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [isRegex, setIsRegex] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setIsSearching(true);
        try {
            const response = await fetch('/api/v1/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    caseSensitive,
                    isRegex
                })
            });

            const data = await response.json();
            setResults(data.results || []);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#1E1E24] border-r border-[hsl(var(--sidebar-border))]">
            <div className="h-9 px-4 flex items-center justify-between border-b border-[hsl(var(--sidebar-border))] shrink-0">
                <span className="text-xs font-medium text-[hsl(var(--sidebar-foreground))] uppercase tracking-wider">
                    Search
                </span>
            </div>

            <div className="p-3 space-y-2 border-b border-[hsl(var(--sidebar-border))]">
                <div className="flex gap-2">
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search files..."
                        className="bg-[#252526] border-[#333] text-white placeholder:text-gray-500 text-sm"
                    />
                    <Button
                        onClick={handleSearch}
                        disabled={isSearching || !query.trim()}
                        size="icon"
                        variant="ghost"
                        className="shrink-0 hover:bg-purple-600"
                    >
                        {isSearching ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Search size={16} />
                        )}
                    </Button>
                </div>

                <div className="flex gap-2 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer text-gray-400 hover:text-white">
                        <input
                            type="checkbox"
                            checked={caseSensitive}
                            onChange={(e) => setCaseSensitive(e.target.checked)}
                            className="w-3 h-3"
                        />
                        <span>Aa</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer text-gray-400 hover:text-white">
                        <input
                            type="checkbox"
                            checked={isRegex}
                            onChange={(e) => setIsRegex(e.target.checked)}
                            className="w-3 h-3"
                        />
                        <span>.*</span>
                    </label>
                </div>
            </div>

            <ScrollArea className="flex-1">
                {results.length === 0 && !isSearching && query && (
                    <div className="p-4 text-sm text-gray-500 text-center">
                        No results found
                    </div>
                )}

                {results.length > 0 && (
                    <div className="py-2">
                        <div className="px-4 pb-2 text-xs text-gray-400">
                            {results.length} result{results.length !== 1 ? 's' : ''}
                        </div>
                        {results.map((result, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "px-4 py-2 cursor-pointer hover:bg-[hsl(var(--sidebar-accent))] transition-colors",
                                    "border-l-2 border-transparent hover:border-purple-500"
                                )}
                                onClick={() => onFileSelect(result.file, result.line)}
                            >
                                <div className="flex items-center gap-2 text-sm mb-1">
                                    <FileText size={14} className="text-blue-400 shrink-0" />
                                    <span className="text-gray-300 font-mono text-xs truncate">
                                        {result.file}
                                    </span>
                                    <span className="text-gray-500 text-xs shrink-0">
                                        :{result.line}
                                    </span>
                                </div>
                                <div className="pl-6 text-xs text-gray-400 font-mono truncate">
                                    {result.context.trim()}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
