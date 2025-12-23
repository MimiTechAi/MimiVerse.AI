// 🔴 CRITICAL: Context Section Component - Agent-Kontext und Workspace-Info
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  Globe,
  FileText,
  Users,
  Settings,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Clock,
  Cpu,
  HardDrive,
  Zap,
  Database,
  GitBranch,
  MessageSquare,
  Activity,
  Layers,
  Package,
  Code,
  TestTube,
  Bug,
  CheckCircle,
  AlertTriangle,
  Info,
  Loader2,
  XCircle,
  Trash2
} from 'lucide-react';
import { formatRelativeTime, formatBytes, truncateText } from '@/lib/utils';

// Context Types
export interface AgentContext {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'idle' | 'error' | 'loading';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  lastActivity?: number;
  capabilities?: string[];
  currentTask?: string;
  confidence?: number;
  tokensUsed?: number;
  tokensRemaining?: number;
  processingTime?: number;
}

export interface WorkspaceContext {
  id: string;
  name: string;
  path: string;
  description?: string;
  createdAt: number;
  lastModified: number;
  size?: number;
  fileCount?: number;
  language?: string;
  framework?: string;
  dependencies?: string[];
  branches?: string[];
  collaborators?: string[];
  permissions?: {
    read: boolean;
    write: boolean;
    execute: boolean;
  };
  settings?: {
    autoSave: boolean;
    autoTest: boolean;
    autoDeploy: boolean;
  };
}

export interface ProjectContext {
  id: string;
  name: string;
  type: 'web' | 'mobile' | 'desktop' | 'api' | 'cli';
  status: 'development' | 'testing' | 'staging' | 'production';
  version?: string;
  buildStatus?: 'pending' | 'running' | 'success' | 'failed';
  lastDeploy?: number;
  environment?: string;
  endpoints?: string[];
  tests?: {
    total: number;
    passed: number;
    failed: number;
    coverage?: number;
  };
  performance?: {
    loadTime?: number;
    memoryUsage?: number;
    cpuUsage?: number;
    errorRate?: number;
  };
}

// 🟡 Auto-Fix Test Context Interface
export interface TestAutoFixContext {
  id: string;
  status: 'idle' | 'analyzing' | 'fixing' | 'completed' | 'error';
  framework: 'jest' | 'vitest' | 'mocha' | 'playwright';
  testPath?: string;
  results?: {
    total: number;
    passed: number;
    failed: number;
    skipped?: number;
    errors: Array<{
      file: string;
      line?: number;
      message: string;
      stack?: string;
    }>;
  };
  autoFix?: {
    available: boolean;
    running: boolean;
    fixesAttempted: number;
    fixesApplied: number;
    lastFixTime?: number;
    confidence?: number;
  };
  suggestions?: Array<{
    type: 'fix' | 'improvement' | 'refactor';
    title: string;
    description: string;
    code?: string;
    confidence: number;
  }>;
}

export interface MemoryContext {
  id: string;
  type: 'short_term' | 'long_term' | 'working';
  capacity: number;
  used: number;
  entries: MemoryEntry[];
  lastCleanup?: number;
}

export interface MemoryEntry {
  id: string;
  type: 'conversation' | 'decision' | 'insight' | 'preference' | 'task' | 'bug' | 'feature';
  title: string;
  content: string;
  timestamp: number;
  importance: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  related?: string[];
}

// Context Section Props
interface ContextSectionProps {
  agentContext?: AgentContext;
  workspaceContext?: WorkspaceContext;
  projectContext?: ProjectContext;
  memoryContext?: MemoryContext;
  isLoading?: boolean;
  isRefreshing?: boolean;
  selectedTab?: string;
  onTabChange?: (tab: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onClearMemory?: () => void;
  expandedSections?: Set<string>;
  onSectionToggle?: (section: string) => void;
  showDetails?: boolean;
  showMetadata?: boolean;
  maxHeight?: number;
  className?: string;
}

// Context Type Configuration
const CONTEXT_CONFIG = {
  agent: {
    name: 'Agent Context',
    icon: <Brain className="h-4 w-4" />,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 border-blue-200'
  },
  workspace: {
    name: 'Workspace',
    icon: <Globe className="h-4 w-4" />,
    color: 'bg-green-500',
    bgColor: 'bg-green-50 border-green-200'
  },
  project: {
    name: 'Project',
    icon: <Package className="h-4 w-4" />,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50 border-purple-200'
  },
  memory: {
    name: 'Memory',
    icon: <Database className="h-4 w-4" />,
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50 border-orange-200'
  }
};

// Status Configuration
const STATUS_CONFIG = {
  active: { color: 'text-green-600', bgColor: 'bg-green-100', icon: <CheckCircle className="h-3 w-3" /> },
  idle: { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: <Clock className="h-3 w-3" /> },
  error: { color: 'text-red-600', bgColor: 'bg-red-100', icon: <AlertTriangle className="h-3 w-3" /> },
  loading: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  development: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: <Code className="h-3 w-3" /> },
  testing: { color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: <TestTube className="h-3 w-3" /> },
  staging: { color: 'text-purple-600', bgColor: 'bg-purple-100', icon: <Layers className="h-3 w-3" /> },
  production: { color: 'text-green-600', bgColor: 'bg-green-100', icon: <CheckCircle className="h-3 w-3" /> },
  pending: { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: <Clock className="h-3 w-3" /> },
  running: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  success: { color: 'text-green-600', bgColor: 'bg-green-100', icon: <CheckCircle className="h-3 w-3" /> },
  failed: { color: 'text-red-600', bgColor: 'bg-red-100', icon: <XCircle className="h-3 w-3" /> }
};

// Main Context Section Component
export const ContextSection = React.memo<ContextSectionProps>(({
  agentContext,
  workspaceContext,
  projectContext,
  memoryContext,
  isLoading = false,
  isRefreshing = false,
  selectedTab = 'agent',
  onTabChange,
  onRefresh,
  onExport,
  onClearMemory,
  expandedSections = new Set(),
  onSectionToggle,
  showDetails = true,
  showMetadata = true,
  maxHeight = 600,
  className = ''
}) => {
  // Event Handler
  const handleRefresh = () => {
    onRefresh?.();
  };

  const handleExport = () => {
    const exportData = {
      agentContext,
      workspaceContext,
      projectContext,
      memoryContext,
      exportTime: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `context-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    onExport?.();
  };

  const handleClearMemory = () => {
    if (confirm('Are you sure you want to clear the memory context?')) {
      onClearMemory?.();
    }
  };

  const handleSectionToggle = (section: string) => {
    onSectionToggle?.(section);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Layers className="h-5 w-5" />
              <span>Context Section</span>
              {isLoading && (
                <div className="flex items-center space-x-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-blue-600">Loading</span>
                </div>
              )}
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              {/* Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Refreshing</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" />Refresh</>
                )}
              </Button>
              
              {/* Export */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Context Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={selectedTab} onValueChange={onTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="agent" className="flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">Agent</span>
              </TabsTrigger>
              <TabsTrigger value="workspace" className="flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Workspace</span>
              </TabsTrigger>
              <TabsTrigger value="project" className="flex items-center space-x-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Project</span>
              </TabsTrigger>
              <TabsTrigger value="memory" className="flex items-center space-x-2">
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Memory</span>
              </TabsTrigger>
            </TabsList>

            {/* Agent Context Tab */}
            <TabsContent value="agent" className="mt-0">
              <ScrollArea className={`${maxHeight ? `h-[${maxHeight}px]` : 'h-[500px]'}`}>
                <div className="p-6">
                  {agentContext ? (
                    <AgentContextCard
                      context={agentContext}
                      isExpanded={expandedSections.has('agent')}
                      onToggleExpand={() => handleSectionToggle('agent')}
                      showDetails={showDetails}
                      showMetadata={showMetadata}
                    />
                  ) : (
                    <EmptyState
                      icon={<Brain className="h-12 w-12" />}
                      title="No Agent Context"
                      description="Agent context is not available"
                    />
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Workspace Context Tab */}
            <TabsContent value="workspace" className="mt-0">
              <ScrollArea className={`${maxHeight ? `h-[${maxHeight}px]` : 'h-[500px]'}`}>
                <div className="p-6">
                  {workspaceContext ? (
                    <WorkspaceContextCard
                      context={workspaceContext}
                      isExpanded={expandedSections.has('workspace')}
                      onToggleExpand={() => handleSectionToggle('workspace')}
                      showDetails={showDetails}
                      showMetadata={showMetadata}
                    />
                  ) : (
                    <EmptyState
                      icon={<Globe className="h-12 w-12" />}
                      title="No Workspace Context"
                      description="Workspace context is not available"
                    />
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Project Context Tab */}
            <TabsContent value="project" className="mt-0">
              <ScrollArea className={`${maxHeight ? `h-[${maxHeight}px]` : 'h-[500px]'}`}>
                <div className="p-6">
                  {projectContext ? (
                    <ProjectContextCard
                      context={projectContext}
                      isExpanded={expandedSections.has('project')}
                      onToggleExpand={() => handleSectionToggle('project')}
                      showDetails={showDetails}
                      showMetadata={showMetadata}
                    />
                  ) : (
                    <EmptyState
                      icon={<Package className="h-12 w-12" />}
                      title="No Project Context"
                      description="Project context is not available"
                    />
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Memory Context Tab */}
            <TabsContent value="memory" className="mt-0">
              <ScrollArea className={`${maxHeight ? `h-[${maxHeight}px]` : 'h-[500px]'}`}>
                <div className="p-6">
                  {memoryContext ? (
                    <MemoryContextCard
                      context={memoryContext}
                      isExpanded={expandedSections.has('memory')}
                      onToggleExpand={() => handleSectionToggle('memory')}
                      onClearMemory={handleClearMemory}
                      showDetails={showDetails}
                      showMetadata={showMetadata}
                    />
                  ) : (
                    <EmptyState
                      icon={<Database className="h-12 w-12" />}
                      title="No Memory Context"
                      description="Memory context is not available"
                    />
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
});

ContextSection.displayName = 'ContextSection';

// Empty State Component
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const EmptyState = React.memo<EmptyStateProps>(({ icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="text-muted-foreground mb-4">{icon}</div>
    <h3 className="text-lg font-medium mb-2">{title}</h3>
    <p className="text-muted-foreground max-w-md">{description}</p>
  </div>
));

EmptyState.displayName = 'EmptyState';

// Agent Context Card Component
interface AgentContextCardProps {
  context: AgentContext;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showDetails: boolean;
  showMetadata: boolean;
}

const AgentContextCard = React.memo<AgentContextCardProps>(({
  context,
  isExpanded,
  onToggleExpand,
  showDetails,
  showMetadata
}) => {
  const statusConfig = STATUS_CONFIG[context.status];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full ${CONTEXT_CONFIG.agent.bgColor} border-2 border-background flex items-center justify-center`}>
            <div className={CONTEXT_CONFIG.agent.color.replace('bg-', 'text-')}>
              {CONTEXT_CONFIG.agent.icon}
            </div>
          </div>
          <div>
            <h3 className="font-semibold">{context.name}</h3>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className={`${statusConfig?.color} ${statusConfig?.bgColor}`}>
                {statusConfig?.icon}
                <span className="ml-1">{context.status}</span>
              </Badge>
              {context.lastActivity && (
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(context.lastActivity)}
                </span>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpand}
        >
          {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>

      {context.description && (
        <p className="text-sm text-muted-foreground">
          {isExpanded ? context.description : truncateText(context.description, 150)}
          {!isExpanded && context.description.length > 150 && (
            <span className="text-muted-foreground">...</span>
          )}
        </p>
      )}

      {isExpanded && (
        <div className="space-y-4">
          {/* Model Info */}
          {showDetails && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoCard
                title="Model Configuration"
                icon={<Cpu className="h-4 w-4" />}
                items={[
                  ...(context.model ? [{ label: 'Model', value: context.model }] : []),
                  ...(context.temperature ? [{ label: 'Temperature', value: context.temperature.toString() }] : []),
                  ...(context.maxTokens ? [{ label: 'Max Tokens', value: context.maxTokens.toLocaleString() }] : [])
                ]}
              />
              
              <InfoCard
                title="Performance Metrics"
                icon={<Zap className="h-4 w-4" />}
                items={[
                  ...(context.confidence ? [{ label: 'Confidence', value: `${Math.round(context.confidence * 100)}%` }] : []),
                  ...(context.tokensUsed ? [{ label: 'Tokens Used', value: context.tokensUsed.toLocaleString() }] : []),
                  ...(context.processingTime ? [{ label: 'Processing Time', value: `${context.processingTime}ms` }] : [])
                ]}
              />
            </div>
          )}

          {/* Capabilities */}
          {context.capabilities && context.capabilities.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center space-x-2">
                <GitBranch className="h-4 w-4" />
                <span>Capabilities</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {context.capabilities.map((capability, index) => (
                  <Badge key={index} variant="secondary">
                    {capability}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Current Task */}
          {context.currentTask && (
            <div>
              <h4 className="font-medium mb-2 flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>Current Task</span>
              </h4>
              <p className="text-sm bg-muted p-3 rounded-lg">
                {context.currentTask}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

AgentContextCard.displayName = 'AgentContextCard';

// Workspace Context Card Component
interface WorkspaceContextCardProps {
  context: WorkspaceContext;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showDetails: boolean;
  showMetadata: boolean;
}

const WorkspaceContextCard = React.memo<WorkspaceContextCardProps>(({
  context,
  isExpanded,
  onToggleExpand,
  showDetails,
  showMetadata
}) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full ${CONTEXT_CONFIG.workspace.bgColor} border-2 border-background flex items-center justify-center`}>
            <div className={CONTEXT_CONFIG.workspace.color.replace('bg-', 'text-')}>
              {CONTEXT_CONFIG.workspace.icon}
            </div>
          </div>
          <div>
            <h3 className="font-semibold">{context.name}</h3>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                <Globe className="h-3 w-3 mr-1" />
                Workspace
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(context.lastModified)}
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpand}
        >
          {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>

      {context.description && (
        <p className="text-sm text-muted-foreground">
          {isExpanded ? context.description : truncateText(context.description, 150)}
          {!isExpanded && context.description.length > 150 && (
            <span className="text-muted-foreground">...</span>
          )}
        </p>
      )}

      {isExpanded && (
        <div className="space-y-4">
          {/* Path Info */}
          <div>
            <h4 className="font-medium mb-2 flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Workspace Path</span>
            </h4>
            <div className="flex items-center space-x-2">
              <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                {context.path}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard.writeText(context.path)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Statistics */}
          {showDetails && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoCard
                title="Workspace Statistics"
                icon={<HardDrive className="h-4 w-4" />}
                items={[
                  ...(context.fileCount ? [{ label: 'Files', value: context.fileCount.toLocaleString() }] : []),
                  ...(context.size ? [{ label: 'Size', value: formatBytes(context.size) }] : []),
                  { label: 'Created', value: new Date(context.createdAt).toLocaleDateString() }
                ].filter(item => item.label !== undefined)}
              />
              
              <InfoCard
                title="Project Details"
                icon={<Code className="h-4 w-4" />}
                items={[
                  ...(context.language ? [{ label: 'Language', value: context.language }] : []),
                  ...(context.framework ? [{ label: 'Framework', value: context.framework }] : [])
                ]}
              />
            </div>
          )}

          {/* Dependencies */}
          {context.dependencies && context.dependencies.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center space-x-2">
                <Package className="h-4 w-4" />
                <span>Dependencies</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {context.dependencies.slice(0, 10).map((dep, index) => (
                  <Badge key={index} variant="outline">
                    {dep}
                  </Badge>
                ))}
                {context.dependencies.length > 10 && (
                  <Badge variant="secondary">
                    +{context.dependencies.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Collaborators */}
          {context.collaborators && context.collaborators.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Collaborators</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {context.collaborators.map((collaborator, index) => (
                  <Badge key={index} variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {collaborator}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

WorkspaceContextCard.displayName = 'WorkspaceContextCard';

// Project Context Card Component
interface ProjectContextCardProps {
  context: ProjectContext;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showDetails: boolean;
  showMetadata: boolean;
}

const ProjectContextCard = React.memo<ProjectContextCardProps>(({
  context,
  isExpanded,
  onToggleExpand,
  showDetails,
  showMetadata
}) => {
  const statusConfig = STATUS_CONFIG[context.status];
  const buildStatusConfig = context.buildStatus ? STATUS_CONFIG[context.buildStatus] : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full ${CONTEXT_CONFIG.project.bgColor} border-2 border-background flex items-center justify-center`}>
            <div className={CONTEXT_CONFIG.project.color.replace('bg-', 'text-')}>
              {CONTEXT_CONFIG.project.icon}
            </div>
          </div>
          <div>
            <h3 className="font-semibold">{context.name}</h3>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className={`${statusConfig?.color} ${statusConfig?.bgColor}`}>
                {statusConfig?.icon}
                <span className="ml-1">{context.status}</span>
              </Badge>
              {context.version && (
                <Badge variant="secondary">{context.version}</Badge>
              )}
              {buildStatusConfig && (
                <Badge variant="outline" className={`${buildStatusConfig.color} ${buildStatusConfig.bgColor}`}>
                  {buildStatusConfig.icon}
                  <span className="ml-1">{context.buildStatus}</span>
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpand}
        >
          {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* Project Info */}
          {showDetails && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoCard
                title="Project Information"
                icon={<Package className="h-4 w-4" />}
                items={[
                  { label: 'Type', value: context.type },
                  ...(context.environment ? [{ label: 'Environment', value: context.environment }] : []),
                  ...(context.lastDeploy ? [{ label: 'Last Deploy', value: formatRelativeTime(context.lastDeploy) }] : [])
                ]}
              />
              
              <InfoCard
                title="Build Status"
                icon={<Activity className="h-4 w-4" />}
                items={[
                  ...(context.buildStatus ? [{ label: 'Status', value: context.buildStatus }] : []),
                  ...(context.version ? [{ label: 'Version', value: context.version }] : [])
                ]}
              />
            </div>
          )}

          {/* Test Results */}
          {context.tests && (
            <div>
              <h4 className="font-medium mb-2 flex items-center space-x-2">
                <TestTube className="h-4 w-4" />
                <span>Test Results</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600">{context.tests.passed}</div>
                  <div className="text-sm text-muted-foreground">Passed</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-600">{context.tests.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">{context.tests.coverage}%</div>
                  <div className="text-sm text-muted-foreground">Coverage</div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          {context.performance && (
            <div>
              <h4 className="font-medium mb-2 flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>Performance</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard
                  title="Performance Metrics"
                  icon={<Activity className="h-4 w-4" />}
                  items={[
                    ...(context.performance.loadTime ? [{ label: 'Load Time', value: `${context.performance.loadTime}ms` }] : []),
                    ...(context.performance.errorRate ? [{ label: 'Error Rate', value: `${context.performance.errorRate}%` }] : [])
                  ]}
                />
                
                <InfoCard
                  title="Resource Usage"
                  icon={<Cpu className="h-4 w-4" />}
                  items={[
                    ...(context.performance.memoryUsage ? [{ label: 'Memory', value: `${context.performance.memoryUsage}%` }] : []),
                    ...(context.performance.cpuUsage ? [{ label: 'CPU', value: `${context.performance.cpuUsage}%` }] : [])
                  ]}
                />
              </div>
            </div>
          )}

          {/* Endpoints */}
          {context.endpoints && context.endpoints.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center space-x-2">
                <ExternalLink className="h-4 w-4" />
                <span>Endpoints</span>
              </h4>
              <div className="space-y-2">
                {context.endpoints.map((endpoint, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                      {endpoint}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(endpoint)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ProjectContextCard.displayName = 'ProjectContextCard';

// 🟡 Test Auto-Fix Card Component
interface TestAutoFixCardProps {
  context: TestAutoFixContext;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showDetails: boolean;
  showMetadata: boolean;
  onRunTests?: (framework: string, testPath?: string) => void;
  onAutoFix?: (testContext: TestAutoFixContext) => void;
  onStopAutoFix?: () => void;
}

const TestAutoFixCard = React.memo<TestAutoFixCardProps>(({
  context,
  isExpanded,
  onToggleExpand,
  showDetails,
  showMetadata,
  onRunTests,
  onAutoFix,
  onStopAutoFix
}) => {
  const statusConfig = STATUS_CONFIG[context.status === 'fixing' ? 'running' : 
                                   context.status === 'analyzing' ? 'loading' :
                                   context.status === 'completed' ? 'success' :
                                   context.status === 'error' ? 'failed' : 'idle'];

  const hasFailures = context.results && context.results.failed > 0;
  const canAutoFix = hasFailures && context.autoFix?.available && context.status !== 'fixing';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 border-2 border-background flex items-center justify-center">
            <TestTube className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold flex items-center space-x-2">
              <span>Test Auto-Fix</span>
              {context.framework && (
                <Badge variant="secondary">{context.framework}</Badge>
              )}
            </h3>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className={`${statusConfig?.color} ${statusConfig?.bgColor}`}>
                {statusConfig?.icon}
                <span className="ml-1">{context.status}</span>
              </Badge>
              {context.testPath && (
                <span className="text-xs text-muted-foreground">
                  {context.testPath}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Auto-Fix Button */}
          {canAutoFix && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onAutoFix?.(context)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Bug className="h-4 w-4 mr-2" />
              Auto-Fix ({context.results?.failed || 0})
            </Button>
          )}

          {/* Stop Button */}
          {context.status === 'fixing' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onStopAutoFix}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Stop
            </Button>
          )}

          {/* Expand Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
          >
            {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Test Results Summary */}
      {context.results && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="text-center p-2 bg-green-50 rounded border border-green-200">
            <div className="text-lg font-bold text-green-600">{context.results.passed}</div>
            <div className="text-xs text-muted-foreground">Passed</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded border border-red-200">
            <div className="text-lg font-bold text-red-600">{context.results.failed}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
          {context.results.skipped !== undefined && (
            <div className="text-center p-2 bg-yellow-50 rounded border border-yellow-200">
              <div className="text-lg font-bold text-yellow-600">{context.results.skipped}</div>
              <div className="text-xs text-muted-foreground">Skipped</div>
            </div>
          )}
          <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
            <div className="text-lg font-bold text-blue-600">{context.results.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>
      )}

      {/* Auto-Fix Status */}
      {context.autoFix && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bug className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Auto-Fix Status</span>
            </div>
            <div className="flex items-center space-x-2">
              {context.autoFix.running && (
                <div className="flex items-center space-x-1">
                  <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-600">Running</span>
                </div>
              )}
              {context.autoFix.confidence && (
                <Badge variant="outline">
                  Confidence: {Math.round(context.autoFix.confidence * 100)}%
                </Badge>
              )}
            </div>
          </div>
          
          {showDetails && (
            <div className="mt-2 text-sm text-blue-700">
              <div className="flex justify-between">
                <span>Fixes Attempted:</span>
                <span className="font-medium">{context.autoFix.fixesAttempted}</span>
              </div>
              <div className="flex justify-between">
                <span>Fixes Applied:</span>
                <span className="font-medium">{context.autoFix.fixesApplied}</span>
              </div>
              {context.autoFix.lastFixTime && (
                <div className="flex justify-between">
                  <span>Last Fix:</span>
                  <span className="font-medium">{formatRelativeTime(context.autoFix.lastFixTime)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isExpanded && (
        <div className="space-y-4">
          {/* Test Errors */}
          {context.results?.errors && context.results.errors.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span>Test Errors</span>
                <Badge variant="destructive">{context.results.errors.length}</Badge>
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {context.results.errors.map((error, index) => (
                  <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="destructive" className="text-xs">
                          {error.file}
                        </Badge>
                        {error.line && (
                          <Badge variant="outline" className="text-xs">
                            Line {error.line}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-red-800 mb-2">{error.message}</p>
                    {showMetadata && error.stack && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-red-600 hover:text-red-800">
                          Show Stack Trace
                        </summary>
                        <pre className="mt-1 p-2 bg-red-100 rounded text-red-700 overflow-x-auto">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Suggestions */}
          {context.suggestions && context.suggestions.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center space-x-2">
                <Brain className="h-4 w-4 text-blue-600" />
                <span>AI Suggestions</span>
                <Badge variant="secondary">{context.suggestions.length}</Badge>
              </h4>
              <div className="space-y-2">
                {context.suggestions.map((suggestion, index) => (
                  <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={suggestion.type === 'fix' ? 'destructive' : 
                                  suggestion.type === 'improvement' ? 'default' : 'secondary'}
                          className="text-xs capitalize"
                        >
                          {suggestion.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </Badge>
                      </div>
                    </div>
                    <h5 className="font-medium text-sm mb-1">{suggestion.title}</h5>
                    <p className="text-sm text-blue-700 mb-2">{suggestion.description}</p>
                    {showMetadata && suggestion.code && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                          Show Code
                        </summary>
                        <pre className="mt-1 p-2 bg-blue-100 rounded text-blue-700 overflow-x-auto">
                          <code>{suggestion.code}</code>
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRunTests?.(context.framework, context.testPath)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-run Tests
            </Button>
            
            {hasFailures && !context.autoFix?.running && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onAutoFix?.(context)}
              >
                <Bug className="h-4 w-4 mr-2" />
                Retry Auto-Fix
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

TestAutoFixCard.displayName = 'TestAutoFixCard';

// Memory Context Card Component
interface MemoryContextCardProps {
  context: MemoryContext;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClearMemory?: () => void;
  showDetails: boolean;
  showMetadata: boolean;
}

const MemoryContextCard = React.memo<MemoryContextCardProps>(({
  context,
  isExpanded,
  onToggleExpand,
  onClearMemory,
  showDetails,
  showMetadata
}) => {
  const usagePercentage = Math.round((context.used / context.capacity) * 100);
  const isNearCapacity = usagePercentage > 80;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full ${CONTEXT_CONFIG.memory.bgColor} border-2 border-background flex items-center justify-center`}>
            <div className={CONTEXT_CONFIG.memory.color.replace('bg-', 'text-')}>
              {CONTEXT_CONFIG.memory.icon}
            </div>
          </div>
          <div>
            <h3 className="font-semibold">Memory Context</h3>
            <div className="flex items-center space-x-2">
              <Badge variant={isNearCapacity ? 'destructive' : 'secondary'}>
                {usagePercentage}% Used
              </Badge>
              <span className="text-xs text-muted-foreground capitalize">
                {context.type.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onClearMemory && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearMemory}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
          >
            {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Usage Bar */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span>{formatBytes(context.used)} used</span>
          <span>{formatBytes(context.capacity)} total</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              isNearCapacity ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${usagePercentage}%` }}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* Memory Statistics */}
          {showDetails && (
            <InfoCard
              title="Memory Statistics"
              icon={<Database className="h-4 w-4" />}
              items={[
                { label: 'Type', value: context.type.replace('_', ' ') },
                { label: 'Entries', value: context.entries.length.toLocaleString() },
                ...(context.lastCleanup ? [{ label: 'Last Cleanup', value: formatRelativeTime(context.lastCleanup) }] : [])
              ]}
            />
          )}

          {/* Recent Entries */}
          <div>
            <h4 className="font-medium mb-2 flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>Recent Entries</span>
            </h4>
            <div className="space-y-2">
              {context.entries.slice(0, 5).map((entry) => (
                <div key={entry.id} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="capitalize">
                        {entry.type}
                      </Badge>
                      <Badge 
                        variant={entry.importance === 'critical' ? 'destructive' : 
                                entry.importance === 'high' ? 'default' : 'secondary'}
                      >
                        {entry.importance}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </div>
                  <h5 className="font-medium text-sm mb-1">{entry.title}</h5>
                  <p className="text-xs text-muted-foreground">
                    {truncateText(entry.content, 100)}
                  </p>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {entry.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {entry.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{entry.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {context.entries.length > 5 && (
                <div className="text-center">
                  <Badge variant="secondary">
                    +{context.entries.length - 5} more entries
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MemoryContextCard.displayName = 'MemoryContextCard';

// Info Card Component
interface InfoCardProps {
  title: string;
  icon: React.ReactNode;
  items: Array<{ label: string; value: string }>;
}

const InfoCard = React.memo<InfoCardProps>(({ title, icon, items }) => (
  <div className="bg-muted/50 rounded-lg p-4">
    <h4 className="font-medium mb-3 flex items-center space-x-2">
      {icon}
      <span>{title}</span>
    </h4>
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{item.label}:</span>
          <span className="font-medium">{item.value}</span>
        </div>
      ))}
    </div>
  </div>
));

InfoCard.displayName = 'InfoCard';

export default ContextSection;
