// 🔴 CRITICAL: useAgentRun Hook - TDD First
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAgentRun } from './useAgentRun';
import { WSMessage } from '@/types/agent';

// Mock WebSocket hook
vi.mock('./useAgentWebSocket', () => ({
  useAgentWebSocket: () => ({
    lastMessage: mockLastMessage,
    isConnected: mockIsConnected,
    sendMessage: vi.fn()
  })
}));

// Mock agent state
vi.mock('@/lib/agentRunState', () => ({
  agentRunState: {
    currentRun: mockCurrentRun,
    agentEvents: mockAgentEvents,
    thinkingStream: mockThinkingStream
  }
}));

// Test data
const mockLastMessage: WSMessage | null = null;
const mockIsConnected = false;
const mockCurrentRun = null;
const mockAgentEvents = [];
const mockThinkingStream = [];

// Mock WebSocket messages
const createMockMessage = (type: string, data?: any): WSMessage => ({
  id: `msg-${Date.now()}`,
  type: type as any,
  createdAt: Date.now(),
  data
});

describe('useAgentRun Hook - TDD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mock values
    mockLastMessage.value = null;
    mockIsConnected.value = false;
    mockCurrentRun.value = null;
    mockAgentEvents.value = [];
    mockThinkingStream.value = [];
  });

  describe('Initial State', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useAgentRun());
      
      expect(result.current.currentRun).toBeNull();
      expect(result.current.agentEvents).toEqual([]);
      expect(result.current.thinkingStream).toEqual([]);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should have correct initial functions', () => {
      const { result } = renderHook(() => useAgentRun());
      
      expect(typeof result.current.startAgent).toBe('function');
      expect(typeof result.current.stopAgent).toBe('function');
      expect(typeof result.current.sendMessage).toBe('function');
      expect(typeof result.current.clearHistory).toBe('function');
      expect(typeof result.current.runTests).toBe('function');
      expect(typeof result.current.autoFix).toBe('function');
    });
  });

  describe('WebSocket Connection State', () => {
    it('should update connection state', () => {
      mockIsConnected.value = true;
      
      const { result } = renderHook(() => useAgentRun());
      
      expect(result.current.isConnected).toBe(true);
    });

    it('should handle connection state changes', async () => {
      const { result } = renderHook(() => useAgentRun());
      
      expect(result.current.isConnected).toBe(false);
      
      act(() => {
        mockIsConnected.value = true;
      });
      
      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('Message Processing', () => {
    it('should process status messages', async () => {
      const statusMessage = createMockMessage('status', {
        state: 'planning',
        runId: 'run-123',
        progress: 0.1
      });
      
      const { result } = renderHook(() => useAgentRun());
      
      act(() => {
        mockLastMessage.value = statusMessage;
      });
      
      await waitFor(() => {
        expect(result.current.currentRun).not.toBeNull();
        expect(result.current.currentRun?.state).toBe('planning');
        expect(result.current.currentRun?.runId).toBe('run-123');
        expect(result.current.currentRun?.progress).toBe(0.1);
      });
    });

    it('should process thinking messages', async () => {
      const thinkingMessage = createMockMessage('thinking', {
        content: 'Analyzing requirements...',
        step: 1,
        totalSteps: 5
      });
      
      const { result } = renderHook(() => useAgentRun());
      
      act(() => {
        mockLastMessage.value = thinkingMessage;
      });
      
      await waitFor(() => {
        expect(result.current.thinkingStream).toHaveLength(1);
        expect(result.current.thinkingStream[0]).toMatchObject({
          content: 'Analyzing requirements...',
          step: 1,
          totalSteps: 5
        });
      });
    });

    it('should process tool_use messages', async () => {
      const toolMessage = createMockMessage('tool_use', {
        tool: 'file_writer',
        input: { path: '/test.ts', content: 'test code' },
        output: { success: true, path: '/test.ts' }
      });
      
      const { result } = renderHook(() => useAgentRun());
      
      act(() => {
        mockLastMessage.value = toolMessage;
      });
      
      await waitFor(() => {
        expect(result.current.agentEvents).toHaveLength(1);
        expect(result.current.agentEvents[0]).toMatchObject({
          type: 'tool_use',
          tool: 'file_writer',
          status: 'completed'
        });
      });
    });

    it('should process file_change messages', async () => {
      const fileMessage = createMockMessage('file_change', {
        path: '/src/App.tsx',
        changeType: 'update',
        content: 'updated content'
      });
      
      const { result } = renderHook(() => useAgentRun());
      
      act(() => {
        mockLastMessage.value = fileMessage;
      });
      
      await waitFor(() => {
        expect(result.current.agentEvents).toHaveLength(1);
        expect(result.current.agentEvents[0]).toMatchObject({
          type: 'file_change',
          path: '/src/App.tsx',
          changeType: 'update'
        });
      });
    });

    it('should process test_result messages', async () => {
      const testMessage = createMockMessage('test_result', {
        status: 'failed',
        summary: { total: 10, passed: 8, failed: 2 },
        failures: [{ file: 'test.ts', error: 'Assertion failed' }]
      });
      
      const { result } = renderHook(() => useAgentRun());
      
      act(() => {
        mockLastMessage.value = testMessage;
      });
      
      await waitFor(() => {
        expect(result.current.currentRun?.testResults).toBeDefined();
        expect(result.current.currentRun?.testResults?.status).toBe('failed');
        expect(result.current.currentRun?.testResults?.summary).toEqual({
          total: 10, passed: 8, failed: 2
        });
      });
    });

    it('should process error messages', async () => {
      const errorMessage = createMockMessage('error', {
        message: 'Something went wrong',
        code: 'INTERNAL_ERROR',
        stack: 'Error stack trace'
      });
      
      const { result } = renderHook(() => useAgentRun());
      
      act(() => {
        mockLastMessage.value = errorMessage;
      });
      
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.error?.message).toBe('Something went wrong');
        expect(result.current.error?.code).toBe('INTERNAL_ERROR');
      });
    });

    it('should handle completion messages', async () => {
      const completionMessage = createMockMessage('completion', {
        status: 'success',
        summary: { filesCreated: 3, testsPassing: true },
        duration: 5000
      });
      
      const { result } = renderHook(() => useAgentRun());
      
      act(() => {
        mockLastMessage.value = completionMessage;
      });
      
      await waitFor(() => {
        expect(result.current.currentRun?.state).toBe('done');
        expect(result.current.currentRun?.completionSummary).toBeDefined();
        expect(result.current.currentRun?.completionSummary?.status).toBe('success');
      });
    });
  });

  describe('Agent Lifecycle', () => {
    it('should start agent run', async () => {
      const { result } = renderHook(() => useAgentRun());
      
      act(() => {
        result.current.startAgent({
          prompt: 'Create a React component',
          runId: 'run-123'
        });
      });
      
      await waitFor(() => {
        expect(result.current.currentRun).not.toBeNull();
        expect(result.current.currentRun?.state).toBe('planning');
        expect(result.current.currentRun?.prompt).toBe('Create a React component');
      });
    });

    it('should stop agent run', async () => {
      // Start agent first
      const { result } = renderHook(() => useAgentRun());
      
      act(() => {
        result.current.startAgent({ prompt: 'Test' });
      });
      
      await waitFor(() => {
        expect(result.current.currentRun).not.toBeNull();
      });
      
      // Stop agent
      act(() => {
        result.current.stopAgent('User stopped');
      });
      
      await waitFor(() => {
        expect(result.current.currentRun?.state).toBe('done');
        expect(result.current.currentRun?.completionReason).toBe('User stopped');
      });
    });

    it('should handle agent errors', async () => {
      const { result } = renderHook(() => useAgentRun());
      
      act(() => {
        result.current.startAgent({ prompt: 'Test' });
      });
      
      // Simulate error
      const errorMessage = createMockMessage('error', {
        message: 'Agent failed',
        code: 'AGENT_ERROR'
      });
      
      act(() => {
        mockLastMessage.value = errorMessage;
      });
      
      await waitFor(() => {
        expect(result.current.currentRun?.state).toBe('error');
        expect(result.current.error).not.toBeNull();
      });
    });
  });

  describe('Test Integration', () => {
    it('should run tests', async () => {
      const { result } = renderHook(() => useAgentRun());
      
      act(() => {
        result.current.runTests();
      });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
        expect(result.current.currentRun?.testResults).toBeDefined();
      });
    });

    it('should handle test failures and auto-fix', async () => {
      const { result } = renderHook(() => useAgentRun());
      
      // Simulate test failure
      const testFailureMessage = createMockMessage('test_result', {
        status: 'failed',
        failures: [{ file: 'test.ts', error: 'Test failed' }]
      });
      
      act(() => {
        mockLastMessage.value = testFailureMessage;
      });
      
      await waitFor(() => {
        expect(result.current.currentRun?.testResults?.status).toBe('failed');
      });
      
      act(() => {
        result.current.autoFix();
      });
      
      await waitFor(() => {
        expect(result.current.currentRun?.state).toBe('fixing');
      });
    });
  });

  describe('Message Sending', () => {
    it('should send user message to agent', () => {
      const mockSendMessage = vi.fn();
      vi.doMock('./useAgentWebSocket', () => ({
        useAgentWebSocket: () => ({
          lastMessage: null,
          isConnected: true,
          sendMessage: mockSendMessage
        })
      }));
      
      const { result } = renderHook(() => useAgentRun());
      
      act(() => {
        result.current.sendMessage({
          type: 'user_input',
          content: 'Hello agent'
        });
      });
      
      expect(mockSendMessage).toHaveBeenCalledWith({
        id: expect.any(String),
        type: 'user_input',
        createdAt: expect.any(Number),
        data: { content: 'Hello agent' }
      });
    });
  });

  describe('History Management', () => {
    it('should clear thinking stream', () => {
      const { result } = renderHook(() => useAgentRun());
      
      // Add some thinking entries
      act(() => {
        mockLastMessage.value = createMockMessage('thinking', { content: 'Test 1' });
      });
      
      act(() => {
        mockLastMessage.value = createMockMessage('thinking', { content: 'Test 2' });
      });
      
      act(() => {
        result.current.clearThinkingStream();
      });
      
      expect(result.current.thinkingStream).toEqual([]);
    });

    it('should clear agent events', () => {
      const { result } = renderHook(() => useAgentRun());
      
      // Add some events
      act(() => {
        mockLastMessage.value = createMockMessage('tool_use', { tool: 'test' });
      });
      
      act(() => {
        result.current.clearAgentEvents();
      });
      
      expect(result.current.agentEvents).toEqual([]);
    });

    it('should clear all history', () => {
      const { result } = renderHook(() => useAgentRun());
      
      // Add data
      act(() => {
        mockLastMessage.value = createMockMessage('thinking', { content: 'Test' });
        mockLastMessage.value = createMockMessage('tool_use', { tool: 'test' });
      });
      
      act(() => {
        result.current.clearHistory();
      });
      
      expect(result.current.thinkingStream).toEqual([]);
      expect(result.current.agentEvents).toEqual([]);
    });
  });

  describe('Performance & Optimization', () => {
    it('should limit thinking stream size', () => {
      const { result } = renderHook(() => useAgentRun());
      
      // Add more than max entries
      for (let i = 0; i < 150; i++) {
        act(() => {
          mockLastMessage.value = createMockMessage('thinking', { 
            content: `Thinking ${i}` 
          });
        });
      }
      
      expect(result.current.thinkingStream.length).toBeLessThanOrEqual(100);
    });

    it('should limit agent events size', () => {
      const { result } = renderHook(() => useAgentRun());
      
      // Add more than max events
      for (let i = 0; i < 550; i++) {
        act(() => {
          mockLastMessage.value = createMockMessage('tool_use', { 
            tool: `tool-${i}` 
          });
        });
      }
      
      expect(result.current.agentEvents.length).toBeLessThanOrEqual(500);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed messages gracefully', () => {
      const { result } = renderHook(() => useAgentRun());
      
      act(() => {
        mockLastMessage.value = {
          id: 'test',
          type: 'invalid_type',
          createdAt: Date.now()
        } as any;
      });
      
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toContain('Invalid message');
    });

    it('should handle network errors', () => {
      const { result } = renderHook(() => useAgentRun());
      
      act(() => {
        result.current.startAgent({ prompt: 'Test' });
      });
      
      // Simulate network error
      act(() => {
        mockIsConnected.value = false;
      });
      
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toContain('connection');
    });
  });
});
