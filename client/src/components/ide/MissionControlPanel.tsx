// 🔴 CRITICAL: Mission Control Panel - Central Agent Interface
import React from 'react';
import { useAgentRun } from '@/hooks/useAgentRun';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAgentWebSocket } from '@/hooks/useAgentWebSocket';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Bug, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  Brain,
  Activity,
  Terminal,
  AlertTriangle
} from 'lucide-react';
import { formatDuration, formatRelativeTime } from '@/lib/utils';

export function MissionControlPanel() {
  const {
    currentRun,
    agentEvents,
    thinkingStream,
    isConnected,
    isLoading,
    error,
    startAgent,
    stopAgent,
    runTests,
    autoFix,
    clearHistory
  } = useAgentRun();

  const { reconnect } = useAgentWebSocket();

  const getAgentStatusColor = () => {
    if (!currentRun) return 'bg-gray-500';
    switch (currentRun.state) {
      case 'idle': return 'bg-gray-500';
      case 'planning': return 'bg-blue-500';
      case 'executing': return 'bg-green-500';
      case 'testing': return 'bg-yellow-500';
      case 'fixing': return 'bg-orange-500';
      case 'error': return 'bg-red-500';
      case 'done': return 'bg-emerald-500';
      default: return 'bg-gray-500';
    }
  };

  const getAgentStatusText = () => {
    if (!currentRun) return 'No Active Run';
    switch (currentRun.state) {
      case 'idle': return 'Idle';
      case 'planning': return 'Planning';
      case 'executing': return 'Executing';
      case 'testing': return 'Testing';
      case 'fixing': return 'Fixing Issues';
      case 'error': return 'Error';
      case 'done': return 'Completed';
      default: return 'Unknown';
    }
  };

  const getAgentStatusIcon = () => {
    if (!currentRun) return <Activity className="h-4 w-4" />;
    switch (currentRun.state) {
      case 'planning': return <Brain className="h-4 w-4" />;
      case 'executing': return <Play className="h-4 w-4" />;
      case 'testing': return <Bug className="h-4 w-4" />;
      case 'fixing': return <Terminal className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      case 'done': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const runDuration = currentRun?.startTime 
    ? Date.now() - currentRun.startTime
    : 0;

  return (
    <div className="flex flex-col h-full space-y-4 p-4">
      {/* Header with Agent Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Mission Control</CardTitle>
            <div className="flex items-center space-x-2">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-sm text-muted-foreground">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Agent Status */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full text-white ${getAgentStatusColor()}`}>
                {getAgentStatusIcon()}
              </div>
              <div>
                <div className="font-medium">{getAgentStatusText()}</div>
                {currentRun && (
                  <div className="text-sm text-muted-foreground">
                    Run ID: {currentRun.runId}
                  </div>
                )}
              </div>
            </div>
            
            {currentRun && (
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {Math.round(currentRun.progress * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDuration(runDuration)}
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {currentRun && (
            <Progress 
              value={currentRun.progress * 100} 
              className="h-2"
            />
          )}

          {/* Current File/Line Info */}
          {currentRun?.currentFile && (
            <div className="flex items-center space-x-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono bg-muted px-2 py-1 rounded">
                {currentRun.currentFile}
                {currentRun.line && `:${currentRun.line}`}
              </span>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-destructive">Agent Error</div>
                  <div className="text-sm text-destructive/80">{error.message}</div>
                  {error.code && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Code: {error.code}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {!currentRun ? (
              <Button 
                onClick={() => startAgent({ 
                  prompt: 'Start new development task' 
                })}
                disabled={!isConnected}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Agent
              </Button>
            ) : (
              <>
                <Button 
                  onClick={() => stopAgent('User stopped')}
                  variant="outline"
                  disabled={isLoading}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
                
                <Button 
                  onClick={runTests}
                  variant="outline"
                  disabled={isLoading || !isConnected}
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Run Tests
                </Button>
                
                <Button 
                  onClick={autoFix}
                  variant="outline"
                  disabled={isLoading || !currentRun.testResults?.failures?.length}
                >
                  <Terminal className="h-4 w-4 mr-2" />
                  Auto Fix
                </Button>
                
                <Button 
                  onClick={() => reconnect()}
                  variant="outline"
                  disabled={isLoading}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reconnect
                </Button>
                
                <Button 
                  onClick={clearHistory}
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                >
                  Clear History
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <div className="flex-1 min-h-0">
        <Tabs defaultValue="thinking" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="thinking">Thinking</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          {/* Thinking Stream Tab */}
          <TabsContent value="thinking" className="flex-1 mt-0">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>Agent Thinking Stream</span>
                  {thinkingStream.length > 0 && (
                    <Badge variant="secondary">{thinkingStream.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px] p-4">
                  {thinkingStream.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No thinking entries yet. Start the agent to see its reasoning process.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {thinkingStream.map((entry, index) => (
                        <div 
                          key={entry.id} 
                          className="p-3 bg-muted/30 rounded-lg border border-border/50"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant={getCategoryVariant(entry.category)}>
                                {entry.category}
                              </Badge>
                              {entry.step && entry.totalSteps && (
                                <span className="text-sm text-muted-foreground">
                                  Step {entry.step} of {entry.totalSteps}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(entry.timestamp)}
                            </span>
                          </div>
                          <div className="text-sm leading-relaxed">
                            {entry.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="flex-1 mt-0">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Agent Events</span>
                  {agentEvents.length > 0 && (
                    <Badge variant="secondary">{agentEvents.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px] p-4">
                  {agentEvents.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No events yet. Start the agent to see its activities.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {agentEvents.map((event, index) => (
                        <div 
                          key={event.id} 
                          className="p-3 bg-muted/30 rounded-lg border border-border/50"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant={getEventTypeVariant(event.type)}>
                                {event.type.replace('_', ' ')}
                              </Badge>
                              {event.tool && (
                                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                  {event.tool}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(event.timestamp)}
                            </span>
                          </div>
                          {event.path && (
                            <div className="text-sm font-mono text-muted-foreground mb-1">
                              {event.path}
                            </div>
                          )}
                          <div className="text-sm">
                            {formatEventDescription(event)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tests Tab */}
          <TabsContent value="tests" className="flex-1 mt-0">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bug className="h-5 w-5" />
                  <span>Test Results</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {currentRun?.testResults ? (
                  <div className="space-y-4">
                    {/* Test Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {currentRun.testResults.summary.total}
                        </div>
                        <div className="text-sm text-muted-foreground">Total</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-600">
                          {currentRun.testResults.summary.passed}
                        </div>
                        <div className="text-sm text-muted-foreground">Passed</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="text-2xl font-bold text-red-600">
                          {currentRun.testResults.summary.failed}
                        </div>
                        <div className="text-sm text-muted-foreground">Failed</div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold">
                          {formatDuration(currentRun.testResults.summary.duration)}
                        </div>
                        <div className="text-sm text-muted-foreground">Duration</div>
                      </div>
                    </div>

                    <Separator />

                    {/* Failures */}
                    {currentRun.testResults.failures && currentRun.testResults.failures.length > 0 && (
                      <div>
                        <h4 className="font-medium text-destructive mb-3">Test Failures</h4>
                        <div className="space-y-2">
                          {currentRun.testResults.failures.map((failure, index) => (
                            <div key={index} className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                              <div className="font-mono text-sm mb-1">
                                {failure.file}
                                {failure.line && `:${failure.line}`}
                              </div>
                              <div className="text-sm text-destructive">
                                {failure.error}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Test Output */}
                    {currentRun.testResults.output && (
                      <div>
                        <h4 className="font-medium mb-3">Test Output</h4>
                        <pre className="p-3 bg-muted rounded text-sm overflow-x-auto">
                          {currentRun.testResults.output}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No test results yet. Run tests to see the results.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="flex-1 mt-0">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>File Changes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {agentEvents.filter(e => e.type === 'file_change').length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No file changes yet. Start the agent to see file modifications.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {agentEvents
                      .filter(event => event.type === 'file_change')
                      .map((event, index) => (
                        <div 
                          key={event.id} 
                          className="p-3 bg-muted/30 rounded-lg border border-border/50"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant={getChangeTypeVariant(event.changeType)}>
                                {event.changeType}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(event.timestamp)}
                            </span>
                          </div>
                          <div className="text-sm font-mono text-muted-foreground mb-1">
                            {event.path}
                          </div>
                          {event.data?.content && (
                            <pre className="p-2 bg-background rounded text-xs overflow-x-auto max-h-32 overflow-y-auto">
                              {event.data.content}
                            </pre>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Helper functions for styling
function getCategoryVariant(category?: string) {
  switch (category) {
    case 'analysis': return 'default';
    case 'planning': return 'secondary';
    case 'execution': return 'default';
    case 'debugging': return 'destructive';
    default: return 'outline';
  }
}

function getEventTypeVariant(type: string) {
  switch (type) {
    case 'tool_use': return 'default';
    case 'file_change': return 'secondary';
    case 'test_result': return 'outline';
    case 'error': return 'destructive';
    case 'completion': return 'default';
    default: return 'outline';
  }
}

function getChangeTypeVariant(changeType?: string) {
  switch (changeType) {
    case 'create': return 'default';
    case 'update': return 'secondary';
    case 'delete': return 'destructive';
    default: return 'outline';
  }
}

function formatEventDescription(event: any): string {
  switch (event.type) {
    case 'tool_use':
      return event.status === 'started' 
        ? `Started using ${event.tool}`
        : `Completed ${event.tool} ${event.status}`;
    case 'file_change':
      return `${event.changeType === 'create' ? 'Created' : 'Modified'} file`;
    case 'test_result':
      return `Tests ${event.data?.status || 'completed'}`;
    default:
      return 'Unknown event';
  }
}
