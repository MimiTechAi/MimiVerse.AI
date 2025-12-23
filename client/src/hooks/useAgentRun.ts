// 🔴 CRITICAL: useAgentRun Hook Implementation
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAgentWebSocket } from './useAgentWebSocket';
import { validateWSMessage, WSMessage } from '@/types/agent';
import { generateId } from '@/lib/utils';

// Agent run state
export interface AgentRunState {
  runId: string | null;
  state: 'idle' | 'planning' | 'executing' | 'testing' | 'fixing' | 'error' | 'done';
  prompt?: string;
  progress: number;
  startTime?: number;
  endTime?: number;
  testResults?: TestResults;
  completionSummary?: CompletionSummary;
  completionReason?: string;
  currentFile?: string;
  line?: number;
}

// Test results structure
export interface TestResults {
  status: 'passed' | 'failed' | 'running';
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  failures?: TestFailure[];
  output?: string;
}

// Test failure structure
export interface TestFailure {
  file: string;
  line?: number;
  error: string;
  expected?: string;
  actual?: string;
}

// Completion summary
export interface CompletionSummary {
  status: 'success' | 'failed' | 'cancelled';
  filesCreated?: number;
  filesModified?: number;
  testsPassing?: boolean;
  duration?: number;
  summary?: string;
}

// Agent event structure
export interface AgentEvent {
  id: string;
  type: 'tool_use' | 'file_change' | 'test_result' | 'error' | 'completion';
  timestamp: number;
  tool?: string;
  status?: 'started' | 'completed' | 'failed';
  path?: string;
  changeType?: 'create' | 'update' | 'delete';
  data?: any;
}

// Thinking stream entry
export interface ThinkingEntry {
  id: string;
  content: string;
  timestamp: number;
  relativeTime: string;
  step?: number;
  totalSteps?: number;
  category?: 'analysis' | 'planning' | 'execution' | 'debugging';
}

// Hook return type
export interface UseAgentRunReturn {
  // Current state
  currentRun: AgentRunState | null;
  agentEvents: AgentEvent[];
  thinkingStream: ThinkingEntry[];
  isConnected: boolean;
  isLoading: boolean;
  error: AgentError | null;
  
  // Actions
  startAgent: (options: StartAgentOptions) => void;
  stopAgent: (reason?: string) => void;
  sendMessage: (message: any) => void;
  runTests: () => void;
  autoFix: () => void;
  
  // History management
  clearThinkingStream: () => void;
  clearAgentEvents: () => void;
  clearHistory: () => void;
}

// Start agent options
export interface StartAgentOptions {
  prompt: string;
  runId?: string;
  context?: any;
  files?: string[];
}

// Agent error structure
export interface AgentError {
  message: string;
  code?: string;
  stack?: string;
  timestamp: number;
}

// Configuration constants
const MAX_THINKING_ENTRIES = 100;
const MAX_AGENT_EVENTS = 500;
const THINKING_ENTRY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * 🔴 CRITICAL: useAgentRun Hook
 * Manages agent execution state, WebSocket communication, and UI updates
 */
export function useAgentRun(): UseAgentRunReturn {
  // WebSocket connection
  const { lastMessage, isConnected, sendMessage } = useAgentWebSocket();
  
  // Agent state
  const [currentRun, setCurrentRun] = useState<AgentRunState | null>(null);
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  const [thinkingStream, setThinkingStream] = useState<ThinkingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AgentError | null>(null);
  
  // Refs for performance optimization
  const thinkingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const eventBatchRef = useRef<AgentEvent[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Process incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;
    
    try {
      processMessage(lastMessage);
    } catch (err) {
      console.error('[useAgentRun] Error processing message:', err);
      setError({
        message: err instanceof Error ? err.message : 'Unknown error',
        timestamp: Date.now()
      });
    }
  }, [lastMessage]);

  // Batch processing for performance
  useEffect(() => {
    if (eventBatchRef.current.length > 0) {
      const batch = [...eventBatchRef.current];
      eventBatchRef.current = [];
      
      setAgentEvents(prev => {
        const newEvents = [...prev, ...batch];
        return newEvents.slice(-MAX_AGENT_EVENTS);
      });
    }
  }, [lastMessage]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      thinkingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Process incoming WebSocket message
   */
  const processMessage = useCallback((message: WSMessage) => {
    const validatedMessage = validateWSMessage(message);
    
    switch (validatedMessage.type) {
      case 'status':
        processStatusMessage(validatedMessage);
        break;
      case 'thinking':
        processThinkingMessage(validatedMessage);
        break;
      case 'tool_use':
        processToolUseMessage(validatedMessage);
        break;
      case 'file_change':
        processFileChangeMessage(validatedMessage);
        break;
      case 'test_result':
        processTestResultMessage(validatedMessage);
        break;
      case 'error':
        processErrorMessage(validatedMessage);
        break;
      case 'completion':
        processCompletionMessage(validatedMessage);
        break;
      default:
        console.warn('[useAgentRun] Unknown message type:', validatedMessage.type);
    }
  }, []);

  /**
   * Process status update message
   */
  const processStatusMessage = useCallback((message: WSMessage) => {
    const { state, runId, progress, currentFile, line } = message.data || {};
    
    setCurrentRun(prev => {
      if (!prev && runId) {
        // New run started
        return {
          runId,
          state,
          progress: progress || 0,
          startTime: Date.now(),
          currentFile,
          line
        };
      } else if (prev) {
        // Update existing run
        return {
          ...prev,
          state,
          progress: progress ?? prev.progress,
          currentFile: currentFile ?? prev.currentFile,
          line: line ?? prev.line
        };
      }
      return prev;
    });
    
    // Clear error on successful status update
    setError(null);
  }, []);

  /**
   * Process thinking message
   */
  const processThinkingMessage = useCallback((message: WSMessage) => {
    const { content, step, totalSteps, category } = message.data || {};
    
    const thinkingEntry: ThinkingEntry = {
      id: generateId(),
      content: content || '',
      timestamp: Date.now(),
      relativeTime: formatRelativeTime(Date.now()),
      step,
      totalSteps,
      category: category || 'analysis'
    };
    
    setThinkingStream(prev => {
      const newStream = [...prev, thinkingEntry];
      return newStream.slice(-MAX_THINKING_ENTRIES);
    });
    
    // Auto-cleanup old entries
    const timeout = setTimeout(() => {
      setThinkingStream(prev => 
        prev.filter(entry => entry.id !== thinkingEntry.id)
      );
    }, THINKING_ENTRY_TIMEOUT);
    
    thinkingTimeoutRef.current.set(thinkingEntry.id, timeout);
  }, []);

  /**
   * Process tool use message
   */
  const processToolUseMessage = useCallback((message: WSMessage) => {
    const { tool, input, output } = message.data || {};
    
    const event: AgentEvent = {
      id: generateId(),
      type: 'tool_use',
      timestamp: Date.now(),
      tool,
      status: output ? 'completed' : 'started',
      data: { input, output }
    };
    
    // Batch events for performance
    eventBatchRef.current.push(event);
    
    // Trigger batch processing
    if (!batchTimeoutRef.current) {
      batchTimeoutRef.current = setTimeout(() => {
        batchTimeoutRef.current = null;
      }, 50);
    }
  }, []);

  /**
   * Process file change message
   */
  const processFileChangeMessage = useCallback((message: WSMessage) => {
    const { path, changeType, content } = message.data || {};
    
    const event: AgentEvent = {
      id: generateId(),
      type: 'file_change',
      timestamp: Date.now(),
      path,
      changeType,
      data: { content }
    };
    
    eventBatchRef.current.push(event);
  }, []);

  /**
   * Process test result message
   */
  const processTestResultMessage = useCallback((message: WSMessage) => {
    const testResults = message.data as TestResults;
    
    setCurrentRun(prev => 
      prev ? { ...prev, testResults } : null
    );
    
    const event: AgentEvent = {
      id: generateId(),
      type: 'test_result',
      timestamp: Date.now(),
      status: testResults.status === 'passed' ? 'completed' : 'failed',
      data: testResults
    };
    
    eventBatchRef.current.push(event);
    setIsLoading(false);
  }, []);

  /**
   * Process error message
   */
  const processErrorMessage = useCallback((message: WSMessage) => {
    const { message: errorMessage, code, stack } = message.data || {};
    
    setError({
      message: errorMessage || 'Unknown error',
      code,
      stack,
      timestamp: Date.now()
    });
    
    setCurrentRun(prev => 
      prev ? { ...prev, state: 'error' } : null
    );
    
    setIsLoading(false);
  }, []);

  /**
   * Process completion message
   */
  const processCompletionMessage = useCallback((message: WSMessage) => {
    const completionSummary = message.data as CompletionSummary;
    
    setCurrentRun(prev => 
      prev ? { 
        ...prev, 
        state: 'done',
        endTime: Date.now(),
        completionSummary 
      } : null
    );
    
    setIsLoading(false);
    setError(null);
  }, []);

  /**
   * Start new agent run
   */
  const startAgent = useCallback((options: StartAgentOptions) => {
    const runId = options.runId || generateId();
    
    // Reset state
    setCurrentRun({
      runId,
      state: 'planning',
      prompt: options.prompt,
      progress: 0,
      startTime: Date.now()
    });
    
    setAgentEvents([]);
    setThinkingStream([]);
    setError(null);
    setIsLoading(true);
    
    // Send start message
    sendMessage({
      id: generateId(),
      type: 'start_agent',
      createdAt: Date.now(),
      data: {
        runId,
        prompt: options.prompt,
        context: options.context,
        files: options.files
      }
    });
  }, [sendMessage]);

  /**
   * Stop current agent run
   */
  const stopAgent = useCallback((reason?: string) => {
    if (!currentRun) return;
    
    setCurrentRun(prev => 
      prev ? { 
        ...prev, 
        state: 'done',
        endTime: Date.now(),
        completionReason: reason || 'User stopped'
      } : null
    );
    
    setIsLoading(false);
    
    // Send stop message
    sendMessage({
      id: generateId(),
      type: 'stop_agent',
      createdAt: Date.now(),
      data: {
        runId: currentRun.runId,
        reason
      }
    });
  }, [currentRun, sendMessage]);

  /**
   * Send message to agent
   */
  const sendMessageToAgent = useCallback((messageData: any) => {
    if (!isConnected) {
      setError({
        message: 'Not connected to agent',
        timestamp: Date.now()
      });
      return;
    }
    
    sendMessage({
      id: generateId(),
      type: 'user_input',
      createdAt: Date.now(),
      data: messageData
    });
  }, [isConnected, sendMessage]);

  /**
   * Run tests
   */
  const runTests = useCallback(() => {
    if (!currentRun || !isConnected) return;
    
    setIsLoading(true);
    
    sendMessage({
      id: generateId(),
      type: 'run_tests',
      createdAt: Date.now(),
      data: {
        runId: currentRun.runId
      }
    });
  }, [currentRun, isConnected, sendMessage]);

  /**
   * Auto-fix issues
   */
  const autoFix = useCallback(() => {
    if (!currentRun || !isConnected) return;
    
    setCurrentRun(prev => 
      prev ? { ...prev, state: 'fixing' } : null
    );
    
    sendMessage({
      id: generateId(),
      type: 'auto_fix',
      createdAt: Date.now(),
      data: {
        runId: currentRun.runId,
        failures: currentRun.testResults?.failures || []
      }
    });
  }, [currentRun, isConnected, sendMessage]);

  /**
   * Clear thinking stream
   */
  const clearThinkingStream = useCallback(() => {
    setThinkingStream([]);
    
    // Clear timeouts
    thinkingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
    thinkingTimeoutRef.current.clear();
  }, []);

  /**
   * Clear agent events
   */
  const clearAgentEvents = useCallback(() => {
    setAgentEvents([]);
    eventBatchRef.current = [];
  }, []);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    clearThinkingStream();
    clearAgentEvents();
  }, [clearThinkingStream, clearAgentEvents]);

  return {
    currentRun,
    agentEvents,
    thinkingStream,
    isConnected,
    isLoading,
    error,
    startAgent,
    stopAgent,
    sendMessage: sendMessageToAgent,
    runTests,
    autoFix,
    clearThinkingStream,
    clearAgentEvents,
    clearHistory
  };
}

/**
 * Format relative time for thinking entries
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 1000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

/**
 * Generate unique ID for agent runs and events
 */
function generateAgentId(): string {
  return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
