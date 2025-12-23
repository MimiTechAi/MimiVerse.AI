// 🔴 CRITICAL: Agent Type Definitions

// WebSocket Message Types
export type WSMessageType = 
  | 'status'           // Agent status updates
  | 'thinking'         // Agent thinking process
  | 'tool_use'        // Tool execution
  | 'file_change'      // File system operations
  | 'test_result'      // Test execution results
  | 'error'           // Error notifications
  | 'completion'       // Task completion
  | 'heartbeat'        // Connection health
  | 'start_agent'      // Start new agent run
  | 'stop_agent'       // Stop agent run
  | 'run_tests'        // Run tests command
  | 'auto_fix'         // Auto-fix command
  | 'user_input';       // User input to agent

// Base WebSocket Message
export interface WSMessage {
  id: string;
  type: WSMessageType;
  createdAt: number;
  data?: any;
}

// Agent State Types
export type AgentState = 
  | 'idle'       // Waiting for instructions
  | 'planning'   // Creating execution plan
  | 'executing'  // Running plan
  | 'testing'    // Running tests
  | 'fixing'     // Fixing issues
  | 'error'      // Error occurred
  | 'done';      // Completed successfully

// WebSocket Connection State
export interface WebSocketState {
  ws: WebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
  lastMessage: WSMessage | null;
}

// Agent Run Configuration
export interface AgentRunConfig {
  runId: string;
  prompt: string;
  context?: any;
  files?: string[];
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    autoFix?: boolean;
  };
}

// Status Message Data
export interface StatusMessageData {
  state: AgentState;
  runId?: string;
  progress?: number;
  currentFile?: string;
  line?: number;
  phase?: 'plan' | 'execute' | 'test' | 'fix';
}

// Thinking Message Data
export interface ThinkingMessageData {
  content: string;
  step?: number;
  totalSteps?: number;
  category?: 'analysis' | 'planning' | 'execution' | 'debugging';
  confidence?: number;
}

// Tool Use Message Data
export interface ToolUseMessageData {
  tool: string;
  input?: any;
  output?: any;
  status?: 'started' | 'completed' | 'failed';
  duration?: number;
}

// File Change Message Data
export interface FileChangeMessageData {
  path: string;
  changeType: 'create' | 'update' | 'delete';
  content?: string;
  size?: number;
  timestamp?: number;
}

// Test Result Message Data
export interface TestResultMessageData {
  status: 'passed' | 'failed' | 'running';
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  failures?: Array<{
    file: string;
    line?: number;
    error: string;
    expected?: string;
    actual?: string;
  }>;
  output?: string;
}

// Error Message Data
export interface ErrorMessageData {
  message: string;
  code?: string;
  stack?: string;
  details?: any;
}

// Completion Message Data
export interface CompletionMessageData {
  status: 'success' | 'failed' | 'cancelled';
  filesCreated?: number;
  filesModified?: number;
  testsPassing?: boolean;
  duration?: number;
  summary?: string;
  details?: any;
}

// User Input Message Data
export interface UserInputMessageData {
  content: string;
  type?: 'prompt' | 'command' | 'feedback';
  context?: any;
}

// Start Agent Message Data
export interface StartAgentMessageData {
  runId: string;
  prompt: string;
  context?: any;
  files?: string[];
  options?: AgentRunConfig['options'];
}

// Stop Agent Message Data
export interface StopAgentMessageData {
  runId: string;
  reason?: string;
}

// Run Tests Message Data
export interface RunTestsMessageData {
  runId: string;
  testPattern?: string;
  options?: {
    coverage?: boolean;
    watch?: boolean;
    bail?: boolean;
  };
}

// Auto Fix Message Data
export interface AutoFixMessageData {
  runId: string;
  failures?: Array<{
    file: string;
    line?: number;
    error: string;
  }>;
  options?: {
    maxAttempts?: number;
    strategy?: 'safe' | 'aggressive';
  };
}

// Message Type Mappings
export type WSMessageDataMap = {
  status: StatusMessageData;
  thinking: ThinkingMessageData;
  tool_use: ToolUseMessageData;
  file_change: FileChangeMessageData;
  test_result: TestResultMessageData;
  error: ErrorMessageData;
  completion: CompletionMessageData;
  heartbeat: Record<string, any>;
  start_agent: StartAgentMessageData;
  stop_agent: StopAgentMessageData;
  run_tests: RunTestsMessageData;
  auto_fix: AutoFixMessageData;
  user_input: UserInputMessageData;
};

// Helper type to get data type for message type
export type GetDataForMessageType<T extends WSMessageType> = WSMessageDataMap[T];

// Create typed message helper
export function createWSMessage<T extends WSMessageType>(
  type: T,
  data?: GetDataForMessageType<T>
): Omit<WSMessage, 'data' | 'id' | 'createdAt'> & { 
    data?: GetDataForMessageType<T>;
    id: string;
    createdAt: number;
  } {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    createdAt: Date.now(),
    data
  };
}

// Type guards
export function isStatusMessage(message: WSMessage): message is WSMessage & { data: StatusMessageData } {
  return message.type === 'status' && message.data !== undefined;
}

export function isThinkingMessage(message: WSMessage): message is WSMessage & { data: ThinkingMessageData } {
  return message.type === 'thinking' && message.data !== undefined;
}

export function isToolUseMessage(message: WSMessage): message is WSMessage & { data: ToolUseMessageData } {
  return message.type === 'tool_use' && message.data !== undefined;
}

export function isFileChangeMessage(message: WSMessage): message is WSMessage & { data: FileChangeMessageData } {
  return message.type === 'file_change' && message.data !== undefined;
}

export function isTestResultMessage(message: WSMessage): message is WSMessage & { data: TestResultMessageData } {
  return message.type === 'test_result' && message.data !== undefined;
}

export function isErrorMessage(message: WSMessage): message is WSMessage & { data: ErrorMessageData } {
  return message.type === 'error' && message.data !== undefined;
}

export function isCompletionMessage(message: WSMessage): message is WSMessage & { data: CompletionMessageData } {
  return message.type === 'completion' && message.data !== undefined;
}

export function isUserInputMessage(message: WSMessage): message is WSMessage & { data: UserInputMessageData } {
  return message.type === 'user_input' && message.data !== undefined;
}

// Message validation
export function isValidWSMessage(obj: any): obj is WSMessage {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.createdAt === 'number' &&
    ['status', 'thinking', 'tool_use', 'file_change', 'test_result', 'error', 'completion', 'heartbeat', 'start_agent', 'stop_agent', 'run_tests', 'auto_fix', 'user_input'].includes(obj.type)
  );
}

// Export validateWSMessage for compatibility
export function validateWSMessage(message: any): WSMessage {
  if (!isValidWSMessage(message)) {
    throw new Error('Invalid WebSocket message structure');
  }
  return message;
}

// WebSocket URL construction
export function getWebSocketUrl(userId: string, workspaceId: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/api/ws/agent/${userId}/${workspaceId}`;
}

// Reconnection strategy
export interface ReconnectionConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export const DEFAULT_RECONNECTION_CONFIG: ReconnectionConfig = {
  maxAttempts: 10,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2
};

// Connection status events
export interface ConnectionEvents {
  connecting: () => void;
  connected: () => void;
  disconnected: (code?: number, reason?: string) => void;
  error: (error: Event) => void;
  message: (message: WSMessage) => void;
  reconnecting: (attempt: number) => void;
}

// Connection configuration
export interface WebSocketConfig {
  userId: string;
  workspaceId: string;
  onConnect?: () => void;
  onDisconnect?: (code?: number, reason?: string) => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WSMessage) => void;
  onReconnecting?: (attempt: number) => void;
}
