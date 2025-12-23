// 🔴 CRITICAL: Agent Status Header Component - TDD Approach
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Play, 
  Square, 
  Bug, 
  Terminal, 
  CheckCircle, 
  XCircle, 
  Clock,
  Activity,
  Zap,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { formatDuration, formatRelativeTime } from '@/lib/utils';
import { AgentState } from '@/types/agent';

// Props für optimierte Performance mit memo
interface AgentStatusHeaderProps {
  state: AgentState;
  progress: number;
  isConnected: boolean;
  runId?: string;
  startTime?: number;
  currentFile?: string;
  currentLine?: number;
  error?: Error | null;
  onStart?: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onReconnect?: () => void;
  isLoading?: boolean;
  className?: string;
}

// Memoized Component für Performance
export const AgentStatusHeader = React.memo<AgentStatusHeaderProps>(({
  state,
  progress,
  isConnected,
  runId,
  startTime,
  currentFile,
  currentLine,
  error,
  onStart,
  onStop,
  onPause,
  onResume,
  onReconnect,
  isLoading = false,
  className = ''
}) => {
  // Berechnete Werte für Performance
  const statusInfo = React.useMemo(() => getStatusInfo(state), [state]);
  const runDuration = React.useMemo(() => 
    startTime ? Date.now() - startTime : 0, [startTime]
  );
  const progressPercentage = React.useMemo(() => 
    Math.round(progress * 100), [progress]
  );

  // Status-spezifische Berechnungen
  const isRunning = state !== 'idle' && state !== 'done' && state !== 'error';
  const canPause = state === 'executing' || state === 'testing';
  const canResume = state === 'idle' && !!runId;
  const showConnectionWarning = !isConnected && isRunning;

  return (
    <div className={`bg-card border rounded-lg p-6 space-y-4 ${className}`}>
      {/* Header mit Status und Connection */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Status Icon und Text */}
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-full text-white ${statusInfo.colorClass}`}>
              {statusInfo.icon}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{statusInfo.text}</h2>
              {runId && (
                <p className="text-sm text-muted-foreground">
                  Run: {runId.slice(0, 8)}...
                </p>
              )}
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {showConnectionWarning && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReconnect}
                disabled={isLoading}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reconnect
              </Button>
            )}
          </div>
        </div>

        {/* Fortschrittsanzeige */}
        {isRunning && (
          <div className="text-right">
            <div className="text-2xl font-bold">{progressPercentage}%</div>
            <div className="text-sm text-muted-foreground">
              {formatDuration(runDuration)}
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{statusInfo.phase}</span>
            <span>{formatDuration(runDuration)}</span>
          </div>
        </div>
      )}

      {/* Current File Info */}
      {currentFile && (
        <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm">
            {currentFile}
            {currentLine && `:${currentLine}`}
          </span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-destructive">Agent Error</h4>
              <p className="text-sm text-destructive/80 mt-1">{error.message}</p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer">
                    Show stack trace
                  </summary>
                  <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {!runId ? (
          <Button
            onClick={onStart}
            disabled={!isConnected || isLoading}
            className="flex-1"
            size="lg"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Agent
          </Button>
        ) : (
          <>
            {/* Stop Button */}
            <Button
              onClick={onStop}
              variant="outline"
              disabled={isLoading}
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>

            {/* Pause/Resume Buttons */}
            {canPause && onPause && (
              <Button
                onClick={onPause}
                variant="outline"
                disabled={isLoading}
              >
                <Clock className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}

            {canResume && onResume && (
              <Button
                onClick={onResume}
                variant="outline"
                disabled={isLoading}
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                <Bug className="h-4 w-4 mr-1" />
                Test
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                <Terminal className="h-4 w-4 mr-1" />
                Fix
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
        <StatusIndicator
          label="State"
          value={statusInfo.text}
          color={statusInfo.colorClass}
        />
        <StatusIndicator
          label="Progress"
          value={`${progressPercentage}%`}
          color="bg-blue-500"
        />
        <StatusIndicator
          label="Duration"
          value={formatDuration(runDuration)}
          color="bg-green-500"
        />
        <StatusIndicator
          label="Files"
          value="0" // TODO: Implement file counting
          color="bg-purple-500"
        />
      </div>
    </div>
  );
});

AgentStatusHeader.displayName = 'AgentStatusHeader';

// Status Info Helper - Pure Function für Performance
function getStatusInfo(state: AgentState) {
  const statusMap = {
    idle: {
      text: 'Idle',
      icon: <Clock className="h-6 w-6" />,
      colorClass: 'bg-gray-500',
      phase: 'Waiting for task'
    },
    planning: {
      text: 'Planning',
      icon: <Brain className="h-6 w-6" />,
      colorClass: 'bg-blue-500',
      phase: 'Creating execution plan'
    },
    executing: {
      text: 'Executing',
      icon: <Play className="h-6 w-6" />,
      colorClass: 'bg-green-500',
      phase: 'Running plan'
    },
    testing: {
      text: 'Testing',
      icon: <Bug className="h-6 w-6" />,
      colorClass: 'bg-yellow-500',
      phase: 'Running tests'
    },
    fixing: {
      text: 'Fixing',
      icon: <Terminal className="h-6 w-6" />,
      colorClass: 'bg-orange-500',
      phase: 'Fixing issues'
    },
    error: {
      text: 'Error',
      icon: <XCircle className="h-6 w-6" />,
      colorClass: 'bg-red-500',
      phase: 'Error occurred'
    },
    done: {
      text: 'Completed',
      icon: <CheckCircle className="h-6 w-6" />,
      colorClass: 'bg-emerald-500',
      phase: 'Task completed'
    }
  };

  return statusMap[state] || statusMap.idle;
}

// Status Indicator Sub-Component
interface StatusIndicatorProps {
  label: string;
  value: string | number;
  color: string;
}

const StatusIndicator = React.memo<StatusIndicatorProps>(({ label, value, color }) => (
  <div className="text-center">
    <div className={`w-2 h-2 rounded-full ${color} mx-auto mb-2`} />
    <div className="text-lg font-semibold">{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
));

StatusIndicator.displayName = 'StatusIndicator';

export default AgentStatusHeader;
