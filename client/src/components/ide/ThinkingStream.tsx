// 🔴 CRITICAL: Thinking Stream Component - TDD Approach
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Brain,
  MessageSquare,
  Lightbulb,
  Search,
  Code,
  Bug,
  Clock,
  Filter,
  Download,
  Pause,
  Play,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { formatRelativeTime, truncateText } from '@/lib/utils';

// Thinking Entry Types
export type ThinkingCategory = 
  | 'analysis'
  | 'planning'
  | 'execution'
  | 'debugging'
  | 'optimization'
  | 'refactoring'
  | 'testing'
  | 'test_result'
  | 'test_error'
  | 'test_fix'
  | 'test_output';

export interface ThinkingEntry {
  id: string;
  content: string;
  category: ThinkingCategory;
  step?: number;
  totalSteps?: number;
  confidence?: number;
  timestamp: number;
  tokens?: number;
  model?: string;
  context?: any;
  metadata?: any;
}

// Thinking Stream Props
interface ThinkingStreamProps {
  entries: ThinkingEntry[];
  isLoading?: boolean;
  isStreaming?: boolean;
  currentEntry?: ThinkingEntry | null;
  onEntrySelect?: (entry: ThinkingEntry) => void;
  onEntryExpand?: (entryId: string) => void;
  onClearHistory?: () => void;
  onExportStream?: () => void;
  onToggleStreaming?: () => void;
  selectedEntryId?: string;
  expandedEntries?: Set<string>;
  maxHeight?: number;
  showMetadata?: boolean;
  showTimestamp?: boolean;
  filter?: ThinkingCategory | 'all';
  searchTerm?: string;
  onFilterChange?: (filter: ThinkingCategory | 'all') => void;
  onSearchChange?: (searchTerm: string) => void;
  className?: string;
}

// Category Configuration - Pure Data
const CATEGORY_CONFIG = {
  analysis: {
    name: 'Analysis',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: <Search className="h-4 w-4" />,
    description: 'Analyzing requirements and context'
  },
  planning: {
    name: 'Planning',
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50 border-purple-200',
    icon: <Lightbulb className="h-4 w-4" />,
    description: 'Creating execution plan'
  },
  execution: {
    name: 'Execution',
    color: 'bg-green-500',
    bgColor: 'bg-green-50 border-green-200',
    icon: <Code className="h-4 w-4" />,
    description: 'Executing planned tasks'
  },
  debugging: {
    name: 'Debugging',
    color: 'bg-red-500',
    bgColor: 'bg-red-50 border-red-200',
    icon: <Bug className="h-4 w-4" />,
    description: 'Debugging issues and errors'
  },
  optimization: {
    name: 'Optimization',
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50 border-yellow-200',
    icon: <Lightbulb className="h-4 w-4" />,
    description: 'Optimizing performance and code'
  },
  refactoring: {
    name: 'Refactoring',
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50 border-orange-200',
    icon: <Code className="h-4 w-4" />,
    description: 'Refactoring code structure'
  },
  testing: {
    name: 'Testing',
    color: 'bg-cyan-500',
    bgColor: 'bg-cyan-50 border-cyan-200',
    icon: <Bug className="h-4 w-4" />,
    description: 'Testing and validation'
  },
  test_result: {
    name: 'Test Results',
    color: 'bg-green-500',
    bgColor: 'bg-green-50 border-green-200',
    icon: <CheckCircle className="h-4 w-4" />,
    description: 'Test execution results'
  },
  test_error: {
    name: 'Test Errors',
    color: 'bg-red-500',
    bgColor: 'bg-red-50 border-red-200',
    icon: <AlertTriangle className="h-4 w-4" />,
    description: 'Test failures and errors'
  },
  test_fix: {
    name: 'Auto-Fix',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: <Bug className="h-4 w-4" />,
    description: 'AI-powered test fixes'
  },
  test_output: {
    name: 'Test Output',
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50 border-orange-200',
    icon: <Code className="h-4 w-4" />,
    description: 'Raw test output and logs'
  }
};

// Main Thinking Stream Component
export const ThinkingStream = React.memo<ThinkingStreamProps>(({
  entries,
  isLoading = false,
  isStreaming = false,
  currentEntry,
  onEntrySelect,
  onEntryExpand,
  onClearHistory,
  onExportStream,
  onToggleStreaming,
  selectedEntryId,
  expandedEntries = new Set(),
  maxHeight = 400,
  showMetadata = true,
  showTimestamp = true,
  filter = 'all',
  searchTerm = '',
  onFilterChange,
  onSearchChange,
  className = ''
}) => {
  // Berechnete Werte für Performance
  const filteredEntries = React.useMemo(() => {
    let filtered = entries;

    // Category Filter
    if (filter !== 'all') {
      filtered = filtered.filter(entry => entry.category === filter);
    }

    // Search Filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.content.toLowerCase().includes(searchLower) ||
        entry.category.toLowerCase().includes(searchLower) ||
        (entry.model && entry.model.toLowerCase().includes(searchLower))
      );
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [entries, filter, searchTerm]);

  const categoryStats = React.useMemo(() => {
    const stats = entries.reduce((acc, entry) => {
      acc[entry.category] = (acc[entry.category] || 0) + 1;
      return acc;
    }, {} as Record<ThinkingCategory, number>);

    return Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
      category: key as ThinkingCategory,
      name: config.name,
      count: stats[key as ThinkingCategory] || 0,
      config
    }));
  }, [entries]);

  const totalTokens = React.useMemo(() => 
    entries.reduce((sum, entry) => sum + (entry.tokens || 0), 0), [entries]
  );

  const averageConfidence = React.useMemo(() => {
    const entriesWithConfidence = entries.filter(e => e.confidence !== undefined);
    if (entriesWithConfidence.length === 0) return 0;
    return entriesWithConfidence.reduce((sum, e) => sum + (e.confidence || 0), 0) / entriesWithConfidence.length;
  }, [entries]);

  // Event Handler
  const handleEntryClick = (entry: ThinkingEntry) => {
    onEntrySelect?.(entry);
  };

  const handleToggleExpand = (entryId: string) => {
    onEntryExpand?.(entryId);
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear the thinking history?')) {
      onClearHistory?.();
    }
  };

  const handleExportStream = () => {
    const exportData = {
      entries: filteredEntries,
      exportTime: new Date().toISOString(),
      totalEntries: filteredEntries.length,
      totalTokens,
      averageConfidence
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `thinking-stream-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>Thinking Stream</span>
              {isStreaming && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-sm text-blue-600">Live</span>
                </div>
              )}
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              {/* Streaming Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleStreaming}
              >
                {isStreaming ? (
                  <><Pause className="h-4 w-4 mr-2" />Pause</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" />Resume</>
                )}
              </Button>
              
              {/* Export */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportStream}
                disabled={filteredEntries.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              
              {/* Clear */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearHistory}
                disabled={entries.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <StatItem
              label="Total Entries"
              value={filteredEntries.length}
              icon={<MessageSquare className="h-4 w-4" />}
            />
            <StatItem
              label="Total Tokens"
              value={totalTokens.toLocaleString()}
              icon={<Brain className="h-4 w-4" />}
            />
            <StatItem
              label="Avg Confidence"
              value={`${Math.round(averageConfidence * 100)}%`}
              icon={<Lightbulb className="h-4 w-4" />}
            />
            <StatItem
              label="Categories"
              value={categoryStats.filter(s => s.count > 0).length}
              icon={<Filter className="h-4 w-4" />}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Category Filter */}
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Category Filter</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onFilterChange?.('all')}
                >
                  All ({entries.length})
                </Button>
                {categoryStats.map(({ category, name, count, config }) => (
                  <Button
                    key={category}
                    variant={filter === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onFilterChange?.(category)}
                    className="flex items-center space-x-1"
                  >
                    <div className={`w-2 h-2 rounded-full ${config.color}`} />
                    <span>{name} ({count})</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="md:w-80">
              <div className="flex items-center space-x-2 mb-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Search</span>
              </div>
              <Input
                placeholder="Search thinking entries..."
                value={searchTerm}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stream Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {filteredEntries.length} of {entries.length} entries
            </span>
            {selectedEntryId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEntrySelect?.(null as any)}
              >
                Clear Selection
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className={`${maxHeight ? `h-[${maxHeight}px]` : 'h-[400px]'}`}>
            {filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchTerm ? 'No matching entries found' : 'No thinking entries yet'}
                </h3>
                <p className="text-muted-foreground max-w-md">
                  {searchTerm 
                    ? 'Try adjusting your search terms or filters'
                    : 'Start the agent to see its thinking process in real-time'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Current Streaming Entry */}
                {currentEntry && isStreaming && (
                  <StreamingEntry
                    entry={currentEntry}
                    isExpanded={expandedEntries.has(currentEntry.id)}
                    onToggleExpand={handleToggleExpand}
                    showMetadata={showMetadata}
                    showTimestamp={showTimestamp}
                    isSelected={selectedEntryId === currentEntry.id}
                  />
                )}
                
                {/* Historical Entries */}
                {filteredEntries.map((entry) => (
                  <ThinkingEntryCard
                    key={entry.id}
                    entry={entry}
                    isExpanded={expandedEntries.has(entry.id)}
                    onToggleExpand={handleToggleExpand}
                    onClick={handleEntryClick}
                    showMetadata={showMetadata}
                    showTimestamp={showTimestamp}
                    isSelected={selectedEntryId === entry.id}
                    isStreaming={false}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
});

ThinkingStream.displayName = 'ThinkingStream';

// Stat Item Sub-Component
interface StatItemProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}

const StatItem = React.memo<StatItemProps>(({ label, value, icon }) => (
  <div className="text-center">
    <div className="flex justify-center mb-2">{icon}</div>
    <div className="text-lg font-semibold">{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
));

StatItem.displayName = 'StatItem';

// Streaming Entry Sub-Component
interface StreamingEntryProps {
  entry: ThinkingEntry;
  isExpanded: boolean;
  onToggleExpand: (entryId: string) => void;
  showMetadata: boolean;
  showTimestamp: boolean;
  isSelected: boolean;
}

const StreamingEntry = React.memo<StreamingEntryProps>(({
  entry,
  isExpanded,
  onToggleExpand,
  showMetadata,
  showTimestamp,
  isSelected
}) => {
  const config = CATEGORY_CONFIG[entry.category];

  return (
    <div className={`p-4 border-l-4 ${config.bgColor} animate-pulse`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <div className={`p-1 rounded-full text-white ${config.color}`}>
              {config.icon}
            </div>
            <Badge variant="secondary">{config.name}</Badge>
            {entry.step && entry.totalSteps && (
              <span className="text-sm text-muted-foreground">
                Step {entry.step} of {entry.totalSteps}
              </span>
            )}
          </div>
          
          <div className="text-sm leading-relaxed">
            {entry.content}
            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleExpand(entry.id)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>

      {isExpanded && (
        <EntryMetadata
          entry={entry}
          showTimestamp={showTimestamp}
          showMetadata={showMetadata}
        />
      )}
    </div>
  );
});

StreamingEntry.displayName = 'StreamingEntry';

// Thinking Entry Card Sub-Component
interface ThinkingEntryCardProps {
  entry: ThinkingEntry;
  isExpanded: boolean;
  onToggleExpand: (entryId: string) => void;
  onClick: (entry: ThinkingEntry) => void;
  showMetadata: boolean;
  showTimestamp: boolean;
  isSelected: boolean;
  isStreaming: boolean;
}

const ThinkingEntryCard = React.memo<ThinkingEntryCardProps>(({
  entry,
  isExpanded,
  onToggleExpand,
  onClick,
  showMetadata,
  showTimestamp,
  isSelected,
  isStreaming
}) => {
  const config = CATEGORY_CONFIG[entry.category];
  const contentPreview = truncateText(entry.content, 200);

  return (
    <div 
      className={`p-4 border-l-4 ${config.bgColor} cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
      onClick={() => onClick(entry)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <div className={`p-1 rounded-full text-white ${config.color}`}>
              {config.icon}
            </div>
            <Badge variant={isSelected ? 'default' : 'secondary'}>
              {config.name}
            </Badge>
            {entry.step && entry.totalSteps && (
              <span className="text-sm text-muted-foreground">
                Step {entry.step} of {entry.totalSteps}
              </span>
            )}
            {entry.confidence && (
              <span className="text-sm text-muted-foreground">
                {Math.round(entry.confidence * 100)}% confidence
              </span>
            )}
          </div>
          
          <div className="text-sm leading-relaxed">
            {isExpanded ? entry.content : contentPreview}
            {!isExpanded && entry.content.length > 200 && (
              <span className="text-muted-foreground">...</span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {showTimestamp && (
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(entry.timestamp)}
            </span>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(entry.id);
            }}
          >
            {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <EntryMetadata
          entry={entry}
          showTimestamp={showTimestamp}
          showMetadata={showMetadata}
        />
      )}
    </div>
  );
});

ThinkingEntryCard.displayName = 'ThinkingEntryCard';

// Entry Metadata Sub-Component
interface EntryMetadataProps {
  entry: ThinkingEntry;
  showTimestamp: boolean;
  showMetadata: boolean;
}

const EntryMetadata = React.memo<EntryMetadataProps>(({ 
  entry, 
  showTimestamp, 
  showMetadata 
}) => (
  <div className="mt-4 pt-4 border-t space-y-3">
    {showTimestamp && (
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Timestamp</span>
        <span>{new Date(entry.timestamp).toLocaleString()}</span>
      </div>
    )}
    
    {showMetadata && (
      <>
        {entry.tokens && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Tokens</span>
            <span>{entry.tokens.toLocaleString()}</span>
          </div>
        )}
        
        {entry.model && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Model</span>
            <span>{entry.model}</span>
          </div>
        )}
        
        {entry.confidence && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Confidence</span>
            <span>{Math.round(entry.confidence * 100)}%</span>
          </div>
        )}
        
        {entry.context && (
          <div className="mt-3">
            <div className="text-xs text-muted-foreground mb-2">Context</div>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
              {JSON.stringify(entry.context, null, 2)}
            </pre>
          </div>
        )}
      </>
    )}
  </div>
));

EntryMetadata.displayName = 'EntryMetadata';

export default ThinkingStream;
