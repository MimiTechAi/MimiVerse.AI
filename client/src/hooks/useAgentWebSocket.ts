// 🔴 CRITICAL: useAgentWebSocket Hook Implementation
import { useState, useEffect, useCallback, useRef } from 'react';
import { WSMessage, WebSocketState, getWebSocketUrl, DEFAULT_RECONNECTION_CONFIG } from '@/types/agent';

// Hook return type
export interface UseAgentWebSocketReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
  
  // Messages
  lastMessage: WSMessage | null;
  sendMessage: (message: WSMessage) => void;
  
  // Connection control
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

// Connection configuration
interface WebSocketConfig {
  userId: string;
  workspaceId: string;
  onConnect?: () => void;
  onDisconnect?: (code?: number, reason?: string) => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WSMessage) => void;
}

/**
 * 🔴 CRITICAL: useAgentWebSocket Hook
 * Manages WebSocket connection with auto-reconnection and error handling
 */
export function useAgentWebSocket(config?: Partial<WebSocketConfig>): UseAgentWebSocketReturn {
  // Connection state
  const [state, setState] = useState<WebSocketState>({
    ws: null,
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0,
    lastMessage: null
  });

  // Refs for connection management
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<WSMessage[]>([]);
  const configRef = useRef<WebSocketConfig>({
    userId: 'default-user',
    workspaceId: 'default-workspace',
    ...config
  });

  // Update refs when config changes
  useEffect(() => {
    configRef.current = {
      userId: 'default-user',
      workspaceId: 'default-workspace',
      ...config
    };
  }, [config]);

  // Get WebSocket URL
  const getWebSocketUrlInternal = useCallback(() => {
    const { userId, workspaceId } = configRef.current;
    return getWebSocketUrl(userId, workspaceId);
  }, []);

  // Create WebSocket connection
  const createWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return wsRef.current;
    }

    const ws = new WebSocket(getWebSocketUrlInternal());
    wsRef.current = ws;

    setState(prev => ({
      ...prev,
      isConnecting: true,
      error: null
    }));

    return ws;
  }, [getWebSocketUrlInternal]);

  // Setup WebSocket event handlers
  const setupWebSocketHandlers = useCallback((ws: WebSocket) => {
    ws.onopen = (event) => {
      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
        reconnectAttempts: 0
      }));

      // Send queued messages
      while (messageQueueRef.current.length > 0) {
        const message = messageQueueRef.current.shift();
        if (message) {
          ws.send(JSON.stringify(message));
        }
      }

      // Start heartbeat
      startHeartbeat(ws);

      // Call callback
      configRef.current.onConnect?.();
    };

    ws.onclose = (event) => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        ws: null
      }));

      // Stop heartbeat
      stopHeartbeat();

      // Call callback
      configRef.current.onDisconnect?.(event.code, event.reason);

      // Attempt reconnection if not manual disconnect
      if (event.code !== 1000) {
        scheduleReconnect();
      }
    };

    ws.onerror = (event) => {
      const errorMessage = `WebSocket error: ${event.type}`;
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isConnecting: false
      }));

      // Call callback
      configRef.current.onError?.(event);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Validate message
        if (message && typeof message === 'object' && message.id && message.type && message.createdAt) {
          setState(prev => ({
            ...prev,
            lastMessage: message
          }));

          // Call callback
          configRef.current.onMessage?.(message);
        } else {
          console.warn('[useAgentWebSocket] Invalid message format:', message);
        }
      } catch (error) {
        console.error('[useAgentWebSocket] Error parsing message:', error);
      }
    };
  }, []);

  // Start heartbeat to keep connection alive
  const startHeartbeat = useCallback((ws: WebSocket) => {
    stopHeartbeat(); // Clear existing heartbeat
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          id: `heartbeat-${Date.now()}`,
          type: 'heartbeat',
          createdAt: Date.now()
        }));
      } else {
        stopHeartbeat();
      }
    }, 30000); // 30 seconds
  }, []);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    const { reconnectAttempts } = state;
    
    if (reconnectAttempts >= DEFAULT_RECONNECTION_CONFIG.maxAttempts) {
      setState(prev => ({
        ...prev,
        error: 'Maximum reconnection attempts reached'
      }));
      return;
    }

    const delay = Math.min(
      DEFAULT_RECONNECTION_CONFIG.baseDelay * Math.pow(DEFAULT_RECONNECTION_CONFIG.backoffFactor, reconnectAttempts),
      DEFAULT_RECONNECTION_CONFIG.maxDelay
    );

    setState(prev => ({
      ...prev,
      reconnectAttempts: prev.reconnectAttempts + 1
    }));

    reconnectTimeoutRef.current = setTimeout(() => {
      configRef.current.onReconnecting?.(state.reconnectAttempts + 1);
      connect();
    }, delay);
  }, [state.reconnectAttempts]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (state.isConnected || state.isConnecting) {
      return;
    }

    const ws = createWebSocket();
    setupWebSocketHandlers(ws);

    setState(prev => ({
      ...prev,
      ws
    }));
  }, [state.isConnected, state.isConnecting, createWebSocket, setupWebSocketHandlers]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Stop heartbeat
    stopHeartbeat();

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      ws: null,
      error: null
    }));
  }, [stopHeartbeat]);

  // Force reconnect
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      connect();
    }, 1000);
  }, [disconnect, connect]);

  // Send message to WebSocket
  const sendMessage = useCallback((message: WSMessage) => {
    if (!state.isConnected) {
      // Queue message for when connection is restored
      messageQueueRef.current.push(message);
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.error('[useAgentWebSocket] Error sending message:', error);
        setState(prev => ({
          ...prev,
          error: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`
        }));
      }
    } else {
      // Queue message for when connection is ready
      messageQueueRef.current.push(message);
    }
  }, [state.isConnected]);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []); // Only run once on mount

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, reduce heartbeat frequency
        if (heartbeatIntervalRef.current) {
          stopHeartbeat();
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            heartbeatIntervalRef.current = setInterval(() => {
              wsRef.current?.send(JSON.stringify({
                id: `heartbeat-${Date.now()}`,
                type: 'heartbeat',
                createdAt: Date.now()
              }));
            }, 60000); // 1 minute when hidden
          }
        }
      } else {
        // Page is visible, restore normal heartbeat
        stopHeartbeat();
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          startHeartbeat(wsRef.current);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startHeartbeat, stopHeartbeat]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (!state.isConnected) {
        connect();
      }
    };

    const handleOffline = () => {
      setState(prev => ({
        ...prev,
        error: 'Network offline'
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state.isConnected, connect]);

  return {
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    reconnectAttempts: state.reconnectAttempts,
    lastMessage: state.lastMessage,
    sendMessage,
    connect,
    disconnect,
    reconnect
  };
}

/**
 * Utility function to create WebSocket with retry logic
 */
export function createWebSocketWithRetry(
  url: string, 
  maxAttempts: number = 3
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const tryConnect = () => {
      attempts++;
      
      try {
        const ws = new WebSocket(url);
        
        ws.onopen = () => resolve(ws);
        
        ws.onerror = (error) => {
          if (attempts >= maxAttempts) {
            reject(new Error(`Failed to connect after ${maxAttempts} attempts`));
          } else {
            setTimeout(tryConnect, 1000 * attempts);
          }
        };
      } catch (error) {
        if (attempts >= maxAttempts) {
          reject(error);
        } else {
          setTimeout(tryConnect, 1000 * attempts);
        }
      }
    };
    
    tryConnect();
  });
}

/**
 * Utility function to check WebSocket support
 */
export function isWebSocketSupported(): boolean {
  return typeof WebSocket !== 'undefined';
}

/**
 * Utility function to get connection status text
 */
export function getConnectionStatusText(state: WebSocketState): string {
  if (state.error) return `Error: ${state.error}`;
  if (state.isConnecting) return 'Connecting...';
  if (state.isConnected) return 'Connected';
  if (state.reconnectAttempts > 0) return `Reconnecting... (${state.reconnectAttempts}/${DEFAULT_RECONNECTION_CONFIG.maxAttempts})`;
  return 'Disconnected';
}
