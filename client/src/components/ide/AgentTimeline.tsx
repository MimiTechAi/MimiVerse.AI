// 🔴 CRITICAL: Agent Timeline Component - Chronologische Ereignis-Visualisierung
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Activity,
  FileText,
  GitBranch,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Download,
  Pause,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Calendar,
  User,
  Code,
  TestTube,
  Bug,
  MessageSquare,
  GitMerge
} from 'lucide-react';
import { formatRelativeTime, formatDuration, truncateText } from '@/lib/utils';

// Timeline Event Types
export type TimelineEventType = 
  | 'agent_start'
  | 'agent_stop'
  | 'task_created'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'file_created'
  | 'file_modified'
  | 'file_deleted'
  | 'test_run'
  | 'test_passed'
  | 'test_failed'
  | 'error_occurred'
  | 'warning_issued'
  | 'user_interaction'
  | 'system_event'
  | 'decision_made'
  | 'context_update';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  timestamp: number;
  duration?: number;
  status?: 'success' | 'error' | 'warning' | 'info' | 'pending';
  agent?: string;
  user?: string;
  metadata?: {
    files?: string[];
    tokens?: number;
    confidence?: number;
    [key: string]: any;
  };
  relatedEvents?: string[];
  parentEventId?: string;
  childEvents?: string[];
}

// Timeline Props
interface AgentTimelineProps {
  events: TimelineEvent[];
  isLoading?: boolean;
  isLive?: boolean;
  selectedEventId?: string;
  expandedEvents?: Set<string>;
  onEventSelect?: (event: TimelineEvent) => void;
  onEventExpand?: (eventId: string) => void;
  onClearHistory?: () => void;
  onExportTimeline?: () => void;
  onToggleLive?: () => void;
  maxHeight?: number;
  showMetadata?: boolean;
  showTimestamp?: boolean;
  showDuration?: boolean;
  groupByTime?: boolean;
  timeGrouping?: 'hour' | 'day' | 'week';
  filter?: TimelineEventType | 'all';
  searchTerm?: string;
  onFilterChange?: (filter: TimelineEventType | 'all') => void;
  onSearchChange?: (searchTerm: string) => void;
  zoomLevel?: number;
  onZoomChange?: (zoomLevel: number) => void;
  className?: string;
}

// Event Type Configuration
const EVENT_CONFIG = {
  agent_start: {
    name: 'Agent Start',
    color: 'bg-green-500',
    bgColor: 'bg-green-50 border-green-200',
    icon: <Play className="h-4 w-4" />,
    description: 'Agent execution started'
  },
  agent_stop: {
    name: 'Agent Stop',
    color: 'bg-red-500',
    bgColor: 'bg-red-50 border-red-200',
    icon: <Pause className="h-4 w-4" />,
    description: 'Agent execution stopped'
  },
  task_created: {
    name: 'Task Created',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: <FileText className="h-4 w-4" />,
    description: 'New task created'
  },
  task_started: {
    name: 'Task Started',
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50 border-yellow-200',
    icon: <Clock className="h-4 w-4" />,
    description: 'Task execution started'
  },
  task_completed: {
    name: 'Task Completed',
    color: 'bg-green-500',
    bgColor: 'bg-green-50 border-green-200',
    icon: <CheckCircle className="h-4 w-4" />,
    description: 'Task completed successfully'
  },
  task_failed: {
    name: 'Task Failed',
    color: 'bg-red-500',
    bgColor: 'bg-red-50 border-red-200',
    icon: <XCircle className="h-4 w-4" />,
    description: 'Task execution failed'
  },
  file_created: {
    name: 'File Created',
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50 border-purple-200',
    icon: <FileText className="h-4 w-4" />,
    description: 'New file created'
  },
  file_modified: {
    name: 'File Modified',
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50 border-orange-200',
    icon: <Code className="h-4 w-4" />,
    description: 'File content modified'
  },
  file_deleted: {
    name: 'File Deleted',
    color: 'bg-gray-500',
    bgColor: 'bg-gray-50 border-gray-200',
    icon: <FileText className="h-4 w-4" />,
    description: 'File deleted'
  },
  test_run: {
    name: 'Test Run',
    color: 'bg-cyan-500',
    bgColor: 'bg-cyan-50 border-cyan-200',
    icon: <TestTube className="h-4 w-4" />,
    description: 'Test execution'
  },
  test_passed: {
    name: 'Test Passed',
    color: 'bg-green-500',
    bgColor: 'bg-green-50 border-green-200',
    icon: <CheckCircle className="h-4 w-4" />,
    description: 'Test passed successfully'
  },
  test_failed: {
    name: 'Test Failed',
    color: 'bg-red-500',
    bgColor: 'bg-red-50 border-red-200',
    icon: <XCircle className="h-4 w-4" />,
    description: 'Test execution failed'
  },
  error_occurred: {
    name: 'Error',
    color: 'bg-red-500',
    bgColor: 'bg-red-50 border-red-200',
    icon: <XCircle className="h-4 w-4" />,
    description: 'Error occurred'
  },
  warning_issued: {
    name: 'Warning',
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50 border-yellow-200',
    icon: <AlertCircle className="h-4 w-4" />,
    description: 'Warning issued'
  },
  user_interaction: {
    name: 'User Action',
    color: 'bg-indigo-500',
    bgColor: 'bg-indigo-50 border-indigo-200',
    icon: <User className="h-4 w-4" />,
    description: 'User interaction'
  },
  system_event: {
    name: 'System Event',
    color: 'bg-gray-500',
    bgColor: 'bg-gray-50 border-gray-200',
    icon: <Activity className="h-4 w-4" />,
    description: 'System event'
  },
  decision_made: {
    name: 'Decision',
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50 border-purple-200',
    icon: <GitBranch className="h-4 w-4" />,
    description: 'Decision made'
  },
  context_update: {
    name: 'Context Update',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: <MessageSquare className="h-4 w-4" />,
    description: 'Context updated'
  }
};

// Status Configuration
const STATUS_CONFIG = {
  success: { color: 'text-green-600', bgColor: 'bg-green-100', icon: <CheckCircle className="h-3 w-3" /> },
  error: { color: 'text-red-600', bgColor: 'bg-red-100', icon: <XCircle className="h-3 w-3" /> },
  warning: { color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: <AlertCircle className="h-3 w-3" /> },
  info: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: <MessageSquare className="h-3 w-3" /> },
  pending: { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: <Clock className="h-3 w-3" /> }
};

// Main Timeline Component
export const AgentTimeline = React.memo<AgentTimelineProps>(({
  events,
  isLoading = false,
  isLive = false,
  selectedEventId,
  expandedEvents = new Set(),
  onEventSelect,
  onEventExpand,
  onClearHistory,
  onExportTimeline,
  onToggleLive,
  maxHeight = 600,
  showMetadata = true,
  showTimestamp = true,
  showDuration = true,
  groupByTime = true,
  timeGrouping = 'hour',
  filter = 'all',
  searchTerm = '',
  onFilterChange,
  onSearchChange,
  zoomLevel = 1,
  onZoomChange,
  className = ''
}) => {
  // Berechnete Werte für Performance
  const filteredEvents = React.useMemo(() => {
    let filtered = events;

    // Type Filter
    if (filter !== 'all') {
      filtered = filtered.filter(event => event.type === filter);
    }

    // Search Filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower) ||
        event.type.toLowerCase().includes(searchLower) ||
        (event.agent && event.agent.toLowerCase().includes(searchLower)) ||
        (event.user && event.user.toLowerCase().includes(searchLower))
      );
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [events, filter, searchTerm]);

  // Time Grouping
  const groupedEvents = React.useMemo(() => {
    if (!groupByTime) {
      return { 'All Events': filteredEvents };
    }

    const groups: Record<string, TimelineEvent[]> = {};
    
    filteredEvents.forEach(event => {
      const date = new Date(event.timestamp);
      let groupKey: string;

      switch (timeGrouping) {
        case 'hour':
          groupKey = date.toLocaleString('de-DE', { 
            hour: '2-digit', 
            minute: '2-digit',
            day: 'numeric',
            month: 'short'
          });
          break;
        case 'day':
          groupKey = date.toLocaleDateString('de-DE', { 
            weekday: 'long',
            day: 'numeric',
            month: 'short'
          });
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          groupKey = `Week ${weekStart.toLocaleDateString('de-DE', { 
            day: 'numeric',
            month: 'short'
          })}`;
          break;
        default:
          groupKey = date.toLocaleDateString('de-DE');
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(event);
    });

    return groups;
  }, [filteredEvents, groupByTime, timeGrouping]);

  const eventStats = React.useMemo(() => {
    const stats = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<TimelineEventType, number>);

    return Object.entries(EVENT_CONFIG).map(([key, config]) => ({
      type: key as TimelineEventType,
      name: config.name,
      count: stats[key as TimelineEventType] || 0,
      config
    }));
  }, [events]);

  const totalDuration = React.useMemo(() => 
    events.reduce((sum, event) => sum + (event.duration || 0), 0), [events]
  );

  const successRate = React.useMemo(() => {
    const completedEvents = events.filter(e => e.status === 'success' || e.status === 'error');
    if (completedEvents.length === 0) return 0;
    const successful = completedEvents.filter(e => e.status === 'success').length;
    return Math.round((successful / completedEvents.length) * 100);
  }, [events]);

  // Event Handler
  const handleEventClick = (event: TimelineEvent) => {
    onEventSelect?.(event);
  };

  const handleToggleExpand = (eventId: string) => {
    onEventExpand?.(eventId);
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear the timeline history?')) {
      onClearHistory?.();
    }
  };

  const handleExportTimeline = () => {
    const exportData = {
      events: filteredEvents,
      exportTime: new Date().toISOString(),
      totalEvents: filteredEvents.length,
      totalDuration,
      successRate,
      eventStats: eventStats.reduce((acc, stat) => {
        acc[stat.type] = stat.count;
        return acc;
      }, {} as Record<string, number>)
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agent-timeline-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleZoomIn = () => {
    onZoomChange?.(Math.min(zoomLevel + 0.25, 3));
  };

  const handleZoomOut = () => {
    onZoomChange?.(Math.max(zoomLevel - 0.25, 0.5));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <GitMerge className="h-5 w-5" />
              <span>Agent Timeline</span>
              {isLive && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-green-600">Live</span>
                </div>
              )}
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              {/* Zoom Controls */}
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium w-12 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>

              {/* Live Toggle */}
              <Button
                variant={isLive ? 'default' : 'outline'}
                size="sm"
                onClick={onToggleLive}
              >
                {isLive ? (
                  <><Activity className="h-4 w-4 mr-2" />Live</>
                ) : (
                  <><Pause className="h-4 w-4 mr-2" />Paused</>
                )}
              </Button>
              
              {/* Export */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportTimeline}
                disabled={filteredEvents.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              
              {/* Clear */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearHistory}
                disabled={events.length === 0}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
            <StatItem
              label="Total Events"
              value={filteredEvents.length}
              icon={<Activity className="h-4 w-4" />}
            />
            <StatItem
              label="Success Rate"
              value={`${successRate}%`}
              icon={<CheckCircle className="h-4 w-4" />}
            />
            <StatItem
              label="Total Duration"
              value={formatDuration(totalDuration)}
              icon={<Clock className="h-4 w-4" />}
            />
            <StatItem
              label="Event Types"
              value={eventStats.filter(s => s.count > 0).length}
              icon={<Filter className="h-4 w-4" />}
            />
            <StatItem
              label="Time Groups"
              value={Object.keys(groupedEvents).length}
              icon={<Calendar className="h-4 w-4" />}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Event Type Filter */}
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Event Filter</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onFilterChange?.('all')}
                >
                  All ({events.length})
                </Button>
                {eventStats.map(({ type, name, count, config }) => (
                  <Button
                    key={type}
                    variant={filter === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onFilterChange?.(type)}
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
                placeholder="Search timeline events..."
                value={searchTerm}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {filteredEvents.length} of {events.length} events
            </span>
            {selectedEventId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEventSelect?.(null as any)}
              >
                Clear Selection
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea 
            className={`${maxHeight ? `h-[${maxHeight}px]` : 'h-[600px]'}`}
            style={{ fontSize: `${0.875 * zoomLevel}rem` }}
          >
            {filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <GitMerge className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchTerm ? 'No matching events found' : 'No timeline events yet'}
                </h3>
                <p className="text-muted-foreground max-w-md">
                  {searchTerm 
                    ? 'Try adjusting your search terms or filters'
                    : 'Start the agent to see events in real-time'
                  }
                </p>
              </div>
            ) : (
              <div className="p-6">
                {Object.entries(groupedEvents).map(([groupName, groupEvents]) => (
                  <div key={groupName} className="mb-8">
                    {/* Group Header */}
                    <div className="sticky top-0 z-10 bg-background mb-4 pb-2 border-b">
                      <h3 className="text-lg font-semibold">{groupName}</h3>
                      <span className="text-sm text-muted-foreground">
                        {groupEvents.length} events
                      </span>
                    </div>

                    {/* Timeline Events */}
                    <div className="relative">
                      {/* Timeline Line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                      
                      {groupEvents.map((event, index) => (
                        <TimelineEventCard
                          key={event.id}
                          event={event}
                          isExpanded={expandedEvents.has(event.id)}
                          onToggleExpand={handleToggleExpand}
                          onClick={handleEventClick}
                          showMetadata={showMetadata}
                          showTimestamp={showTimestamp}
                          showDuration={showDuration}
                          isSelected={selectedEventId === event.id}
                          isLast={index === groupEvents.length - 1}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
});

AgentTimeline.displayName = 'AgentTimeline';

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

// Timeline Event Card Sub-Component
interface TimelineEventCardProps {
  event: TimelineEvent;
  isExpanded: boolean;
  onToggleExpand: (eventId: string) => void;
  onClick: (event: TimelineEvent) => void;
  showMetadata: boolean;
  showTimestamp: boolean;
  showDuration: boolean;
  isSelected: boolean;
  isLast: boolean;
}

const TimelineEventCard = React.memo<TimelineEventCardProps>(({
  event,
  isExpanded,
  onToggleExpand,
  onClick,
  showMetadata,
  showTimestamp,
  showDuration,
  isSelected,
  isLast
}) => {
  const config = EVENT_CONFIG[event.type];
  const statusConfig = event.status ? STATUS_CONFIG[event.status] : null;

  return (
    <div 
      className={`relative flex items-start space-x-4 pb-8 ${!isLast ? 'border-l-2 border-transparent' : ''}`}
      onClick={() => onClick(event)}
    >
      {/* Timeline Dot */}
      <div className="relative z-10">
        <div className={`w-8 h-8 rounded-full ${config.bgColor} border-2 border-background flex items-center justify-center ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
          <div className={config.color.replace('bg-', 'text-')}>
            {config.icon}
          </div>
        </div>
        {statusConfig && (
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${statusConfig.bgColor} border border-background flex items-center justify-center`}>
            <div className={statusConfig.color}>
              {statusConfig.icon}
            </div>
          </div>
        )}
      </div>

      {/* Event Content */}
      <div className={`flex-1 min-w-0 ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 rounded-lg p-4 -m-4' : ''} cursor-pointer transition-all duration-200 hover:shadow-md`}>
        <div className="bg-card rounded-lg border p-4">
          {/* Event Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant={isSelected ? 'default' : 'secondary'}>
                {config.name}
              </Badge>
              {event.status && (
                <Badge variant="outline" className={`${statusConfig?.color} ${statusConfig?.bgColor}`}>
                  {event.status}
                </Badge>
              )}
              {event.agent && (
                <span className="text-sm text-muted-foreground">
                  Agent: {event.agent}
                </span>
              )}
              {event.user && (
                <span className="text-sm text-muted-foreground">
                  User: {event.user}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {showTimestamp && (
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(event.timestamp)}
                </span>
              )}
              
              {showDuration && event.duration && (
                <span className="text-xs text-muted-foreground">
                  {formatDuration(event.duration)}
                </span>
              )}
            </div>
          </div>
          
          {/* Event Title */}
          <h4 className="font-medium mb-1">{event.title}</h4>
          
          {/* Event Description */}
          {event.description && (
            <p className="text-sm text-muted-foreground mb-3">
              {isExpanded ? event.description : truncateText(event.description, 150)}
              {!isExpanded && event.description.length > 150 && (
                <span className="text-muted-foreground">...</span>
              )}
            </p>
          )}

          {/* Expand Button */}
          {(showMetadata || (event.metadata && Object.keys(event.metadata).length > 0)) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(event.id);
              }}
              className="mt-2"
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </Button>
          )}

          {/* Expanded Metadata */}
          {isExpanded && (
            <EventMetadata
              event={event}
              showTimestamp={showTimestamp}
              showMetadata={showMetadata}
            />
          )}
        </div>
      </div>
    </div>
  );
});

TimelineEventCard.displayName = 'TimelineEventCard';

// Event Metadata Sub-Component
interface EventMetadataProps {
  event: TimelineEvent;
  showTimestamp: boolean;
  showMetadata: boolean;
}

const EventMetadata = React.memo<EventMetadataProps>(({ 
  event, 
  showTimestamp, 
  showMetadata 
}) => (
  <div className="mt-4 pt-4 border-t space-y-3">
    {showTimestamp && (
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Timestamp</span>
        <span>{new Date(event.timestamp).toLocaleString()}</span>
      </div>
    )}
    
    {showDuration && event.duration && (
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Duration</span>
        <span>{formatDuration(event.duration)}</span>
      </div>
    )}
    
    {showMetadata && event.metadata && (
      <div className="space-y-2">
        {Object.entries(event.metadata).map(([key, value]) => (
          <div key={key} className="flex items-start justify-between text-xs">
            <span className="text-muted-foreground capitalize">{key.replace('_', ' ')}</span>
            <div className="text-right max-w-xs">
              {Array.isArray(value) ? (
                <div className="flex flex-wrap gap-1">
                  {value.map((item, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {item}
                    </Badge>
                  ))}
                </div>
              ) : typeof value === 'object' ? (
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {JSON.stringify(value, null, 2)}
                </pre>
              ) : (
                <span>{String(value)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
    
    {event.relatedEvents && event.relatedEvents.length > 0 && (
      <div className="text-xs">
        <span className="text-muted-foreground">Related Events: </span>
        <span>{event.relatedEvents.length} events</span>
      </div>
    )}
  </div>
));

EventMetadata.displayName = 'EventMetadata';

export default AgentTimeline;
