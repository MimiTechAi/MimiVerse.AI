// 🔴 CRITICAL: Build Pipeline Component - TDD Approach
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Square,
  RefreshCw,
  FileText,
  Terminal,
  TestTube,
  Package,
  AlertTriangle,
  Zap,
  Settings
} from 'lucide-react';
import { formatDuration, formatRelativeTime } from '@/lib/utils';

// Pipeline Stage Types
export type PipelineStage = 
  | 'setup'
  | 'dependencies'
  | 'build'
  | 'test'
  | 'lint'
  | 'package'
  | 'deploy';

export type PipelineStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

// Pipeline Stage Configuration
interface PipelineStageConfig {
  id: PipelineStage;
  name: string;
  description: string;
  icon: React.ReactNode;
  estimatedDuration: number;
  dependencies?: PipelineStage[];
}

// Pipeline Stage Data
interface PipelineStageData {
  stage: PipelineStage;
  status: PipelineStatus;
  startTime?: number;
  endTime?: number;
  duration?: number;
  output?: string;
  error?: string;
  details?: any;
}

// Build Pipeline Props
interface BuildPipelineProps {
  stages: PipelineStageData[];
  overallStatus: PipelineStatus;
  startTime?: number;
  endTime?: number;
  currentStage?: PipelineStage;
  onStageStart?: (stage: PipelineStage) => void;
  onStageRetry?: (stage: PipelineStage) => void;
  onPipelineStart?: () => void;
  onPipelineStop?: () => void;
  onPipelineReset?: () => void;
  onStageToggle?: (stage: PipelineStage) => void;
  isLoading?: boolean;
  className?: string;
}

// Pipeline Stage Configuration - Pure Data
const PIPELINE_STAGES: PipelineStageConfig[] = [
  {
    id: 'setup',
    name: 'Setup',
    description: 'Initialize build environment',
    icon: <Settings className="h-4 w-4" />,
    estimatedDuration: 5000,
    dependencies: []
  },
  {
    id: 'dependencies',
    name: 'Dependencies',
    description: 'Install and verify dependencies',
    icon: <Package className="h-4 w-4" />,
    estimatedDuration: 30000,
    dependencies: ['setup']
  },
  {
    id: 'build',
    name: 'Build',
    description: 'Compile and build assets',
    icon: <Terminal className="h-4 w-4" />,
    estimatedDuration: 45000,
    dependencies: ['dependencies']
  },
  {
    id: 'lint',
    name: 'Lint',
    description: 'Run code quality checks',
    icon: <FileText className="h-4 w-4" />,
    estimatedDuration: 15000,
    dependencies: ['build']
  },
  {
    id: 'test',
    name: 'Test',
    description: 'Run test suite',
    icon: <TestTube className="h-4 w-4" />,
    estimatedDuration: 60000,
    dependencies: ['lint']
  },
  {
    id: 'package',
    name: 'Package',
    description: 'Create distribution package',
    icon: <Package className="h-4 w-4" />,
    estimatedDuration: 20000,
    dependencies: ['test']
  },
  {
    id: 'deploy',
    name: 'Deploy',
    description: 'Deploy to target environment',
    icon: <Zap className="h-4 w-4" />,
    estimatedDuration: 30000,
    dependencies: ['package']
  }
];

// Main Build Pipeline Component
export const BuildPipeline = React.memo<BuildPipelineProps>(({
  stages,
  overallStatus,
  startTime,
  endTime,
  currentStage,
  onStageStart,
  onStageRetry,
  onPipelineStart,
  onPipelineStop,
  onPipelineReset,
  onStageToggle,
  isLoading = false,
  className = ''
}) => {
  // Berechnete Werte für Performance
  const pipelineDuration = React.useMemo(() => {
    if (!startTime) return 0;
    const end = endTime || Date.now();
    return end - startTime;
  }, [startTime, endTime]);

  const stageProgress = React.useMemo(() => {
    const completedStages = stages.filter(s => s.status === 'completed').length;
    return stages.length > 0 ? completedStages / stages.length : 0;
  }, [stages]);

  const canStartPipeline = overallStatus === 'pending' || overallStatus === 'failed';
  const canStopPipeline = overallStatus === 'running';
  const canResetPipeline = overallStatus !== 'running';

  // Stage status helpers
  const getStageIcon = (status: PipelineStatus) => {
    switch (status) {
      case 'running': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled': return <Square className="h-4 w-4 text-orange-500" />;
      case 'skipped': return <Clock className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStageColor = (status: PipelineStatus) => {
    switch (status) {
      case 'running': return 'border-blue-500 bg-blue-50';
      case 'completed': return 'border-green-500 bg-green-50';
      case 'failed': return 'border-red-500 bg-red-50';
      case 'cancelled': return 'border-orange-500 bg-orange-50';
      case 'skipped': return 'border-gray-500 bg-gray-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const getStatusBadge = (status: PipelineStatus) => {
    const variants = {
      pending: 'secondary',
      running: 'default',
      completed: 'default',
      failed: 'destructive',
      cancelled: 'secondary',
      skipped: 'outline'
    } as const;

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Pipeline Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Terminal className="h-5 w-5" />
              <span>Build Pipeline</span>
              {getStatusBadge(overallStatus)}
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              {pipelineDuration > 0 && (
                <span className="text-sm text-muted-foreground">
                  {formatDuration(pipelineDuration)}
                </span>
              )}
              
              <div className="flex gap-2">
                {canStartPipeline && (
                  <Button
                    onClick={onPipelineStart}
                    disabled={isLoading}
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start
                  </Button>
                )}
                
                {canStopPipeline && (
                  <Button
                    onClick={onPipelineStop}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                )}
                
                {canResetPipeline && (
                  <Button
                    onClick={onPipelineReset}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Overall Progress */}
          {overallStatus === 'running' && (
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(stageProgress * 100)}%</span>
              </div>
              <Progress value={stageProgress * 100} className="h-2" />
              {currentStage && (
                <div className="text-xs text-muted-foreground">
                  Current: {PIPELINE_STAGES.find(s => s.id === currentStage)?.name}
                </div>
              )}
            </div>
          )}

          {/* Pipeline Stages */}
          <div className="space-y-3">
            {PIPELINE_STAGES.map((config) => {
              const stageData = stages.find(s => s.stage === config.id);
              const status = stageData?.status || 'pending';
              const isCurrent = currentStage === config.id;
              
              return (
                <StageCard
                  key={config.id}
                  config={config}
                  data={stageData}
                  isCurrent={isCurrent}
                  onStart={() => onStageStart?.(config.id)}
                  onRetry={() => onStageRetry?.(config.id)}
                  onToggle={() => onStageToggle?.(config.id)}
                  isLoading={isLoading}
                  getStageIcon={getStageIcon}
                  getStageColor={getStageColor}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stage Details */}
      {stages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Stage Details</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              <div className="p-4 space-y-4">
                {stages.map((stage) => (
                  <StageDetails
                    key={stage.stage}
                    stage={stage}
                    config={PIPELINE_STAGES.find(s => s.id === stage.stage)}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

BuildPipeline.displayName = 'BuildPipeline';

// Stage Card Sub-Component
interface StageCardProps {
  config: PipelineStageConfig;
  data?: PipelineStageData;
  isCurrent: boolean;
  onStart: () => void;
  onRetry: () => void;
  onToggle: () => void;
  isLoading: boolean;
  getStageIcon: (status: PipelineStatus) => React.ReactNode;
  getStageColor: (status: PipelineStatus) => string;
}

const StageCard = React.memo<StageCardProps>(({
  config,
  data,
  isCurrent,
  onStart,
  onRetry,
  onToggle,
  isLoading,
  getStageIcon,
  getStageColor
}) => {
  const status = data?.status || 'pending';
  const hasError = status === 'failed' && data?.error;
  
  return (
    <div className={`p-4 border rounded-lg transition-all duration-200 ${
      getStageColor(status)
    } ${isCurrent ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-full bg-white">
            {getStageIcon(status)}
          </div>
          
          <div>
            <h3 className="font-medium">{config.name}</h3>
            <p className="text-sm text-muted-foreground">
              {config.description}
            </p>
            {data?.duration && (
              <p className="text-xs text-muted-foreground">
                Duration: {formatDuration(data.duration)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {hasError && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={isLoading}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
          >
            <AlertTriangle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {hasError && (
        <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded text-sm">
          <div className="font-medium text-red-800">Error:</div>
          <div className="text-red-700 mt-1">{data.error}</div>
        </div>
      )}

      {/* Progress Bar for Running Stage */}
      {status === 'running' && (
        <div className="mt-3">
          <Progress value={undefined} className="h-1" />
        </div>
      )}
    </div>
  );
});

StageCard.displayName = 'StageCard';

// Stage Details Sub-Component
interface StageDetailsProps {
  stage: PipelineStageData;
  config?: PipelineStageConfig;
}

const StageDetails = React.memo<StageDetailsProps>(({ stage, config }) => {
  if (!stage.output && !stage.error) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{config?.name}</h4>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(stage.startTime || Date.now())}
        </span>
      </div>

      {stage.output && (
        <div>
          <h5 className="text-sm font-medium mb-2">Output</h5>
          <pre className="p-3 bg-muted rounded text-xs overflow-x-auto whitespace-pre-wrap">
            {stage.output}
          </pre>
        </div>
      )}

      {stage.error && (
        <div>
          <h5 className="text-sm font-medium text-red-600 mb-2">Error</h5>
          <pre className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 overflow-x-auto whitespace-pre-wrap">
            {stage.error}
          </pre>
        </div>
      )}

      {stage.details && (
        <div>
          <h5 className="text-sm font-medium mb-2">Details</h5>
          <pre className="p-3 bg-muted rounded text-xs overflow-x-auto">
            {JSON.stringify(stage.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
});

StageDetails.displayName = 'StageDetails';

export default BuildPipeline;
