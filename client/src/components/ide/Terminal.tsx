import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "xterm";
import "xterm/css/xterm.css";
import { Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error' | 'backend_offline' | 'no_workspace';

interface TerminalProps {
  onData?: (data: string) => void;
  isVisible?: boolean; // Control visibility from parent
}

export default function Terminal({ onData, isVisible = true }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const hasInitializedRef = useRef(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const onDataRef = useRef<TerminalProps['onData']>(onData);

  useEffect(() => {
    onDataRef.current = onData;
  }, [onData]);

  // Lazy initialization - only when visible and not yet initialized
  useEffect(() => {
    if (!isVisible || hasInitializedRef.current || !terminalRef.current) return;
    hasInitializedRef.current = true;

    console.log('[Terminal] Initializing (lazy)...');

    let disposed = false;
    let isMounted = true;

    const term = new XTerm({
      theme: {
        background: '#09090b',
        foreground: '#f4f4f5',
        cursor: '#a1a1aa',
        selectionBackground: '#3f3f46',
        black: '#09090b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#f4f4f5',
        brightBlack: '#52525b',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#fafafa',
      },
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      convertEol: true,
    });

    const safeWrite = (text: string) => {
      if (disposed) return;
      try {
        term.write(text);
      } catch (e) {
        console.warn('[Terminal] Write failed:', e);
      }
    };

    const safeWriteln = (text: string) => {
      safeWrite(text + '\r\n');
    };

    try {
      term.open(terminalRef.current);
      xtermRef.current = term;
      setIsInitialized(true);

      // Welcome message
      const workspacePath = localStorage.getItem("mimiverse_workspace");
      if (workspacePath) {
        safeWriteln('\x1b[36m🚀 Terminal ready\x1b[0m');
        setConnectionStatus('connecting');

        const connect = async () => {
          let backendHealthy = false;

          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            try {
              const res = await fetch('/health', { signal: controller.signal });
              backendHealthy = res.ok;
            } finally {
              clearTimeout(timeout);
            }
          } catch {
            backendHealthy = false;
          }

          if (!isMounted) {
            return;
          }

          if (!backendHealthy) {
            console.warn('[Terminal] Backend health check failed, skipping WebSocket connection');
            setConnectionStatus('backend_offline');
            safeWriteln('\r\n\x1b[31m✗ Backend offline. Start the server with `npm run dev`.\x1b[0m\r\n');
            return;
          }

          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const host = window.location.host;
          const wsUrl = `${protocol}//${host}/ws/terminal`;
          console.log('[Terminal] Connecting to:', wsUrl);

          try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
              if (!isMounted) return;
              console.log('[Terminal] WebSocket connected');
              setConnectionStatus('connected');
              safeWrite('\r\n\x1b[32m✓ Connected\x1b[0m\r\n$ ');
            };

            ws.onmessage = (event) => {
              try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'output') {
                  safeWrite(msg.data);
                }
              } catch (e) {
                console.error('[Terminal] Parse error:', e);
              }
            };

            ws.onerror = (error) => {
              if (!isMounted) return;
              console.error('[Terminal] WebSocket error event:', error);
              setConnectionStatus('error');
              safeWriteln('\r\n\x1b[31m✗ Connection failed\x1b[0m\r\n');
            };

            ws.onclose = (event) => {
              if (!isMounted) return;
              console.log('[Terminal] WebSocket closed:', event.code, event.reason);
              setConnectionStatus('disconnected');
              safeWriteln('\r\n\x1b[33m○ Disconnected\x1b[0m\r\n');
            };

            term.onData((data) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'input', data }));
              }
              const handler = onDataRef.current;
              if (handler) {
                try {
                  handler(data);
                } catch (e) {
                  console.warn('[Terminal] onData handler failed:', e);
                }
              }
            });
          } catch (error) {
            console.error('[Terminal] WebSocket error:', error);
            setConnectionStatus('error');
            safeWriteln('\r\n\x1b[31m✗ Connection failed\x1b[0m\r\n');
          }
        };

        connect();
      } else {
        setConnectionStatus('no_workspace');
        safeWriteln('\x1b[33m⚠ Select a workspace first\x1b[0m');
      }
    } catch (error) {
      console.error('[Terminal] Init failed:', error);
      hasInitializedRef.current = false;
    }

    return () => {
      isMounted = false;
      disposed = true;
      wsRef.current?.close();
      wsRef.current = null;
      try {
        term.dispose();
      } catch (e) {
        console.warn('[Terminal] Dispose failed:', e);
      }
      xtermRef.current = null;
      hasInitializedRef.current = false;
      setIsInitialized(false);
    };

  }, [isVisible]);

  const handleAutoFix = async () => {
    if (!xtermRef.current) return;
    setIsFixing(true);

    try {
      const buffer = xtermRef.current.buffer.active;
      const lines: string[] = [];
      const startLine = Math.max(0, buffer.baseY + buffer.cursorY - 50);
      const endLine = buffer.baseY + buffer.cursorY;

      for (let i = startLine; i <= endLine; i++) {
        const line = buffer.getLine(i);
        if (line) lines.push(line.translateToString(true));
      }

      const response = await fetch('/api/ai/auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: lines.join('\n') })
      });

      const result = await response.json();

      if (result.suggestion && xtermRef.current) {
        try {
          xtermRef.current.write(`\r\n\x1b[35m━━ Auto-Fix ━━\x1b[0m\r\n${result.suggestion}\r\n`);
        } catch (e) {
          console.warn('[Terminal] Auto-Fix write failed:', e);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFixing(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-[#09090b] border-t border-white/10">
      <div className="flex items-center justify-between px-4 py-2 bg-[#09090b] border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Terminal</span>
          <span className="text-[10px] font-medium text-gray-500">
            {connectionStatus === 'connected' && <span className="text-green-400">● Connected</span>}
            {connectionStatus === 'connecting' && <span className="text-yellow-400">● Connecting…</span>}
            {connectionStatus === 'backend_offline' && <span className="text-red-400">● Backend offline</span>}
            {connectionStatus === 'no_workspace' && <span className="text-yellow-400">● No workspace</span>}
            {(connectionStatus === 'disconnected' || connectionStatus === 'error') && (
              <span className="text-orange-400">● Disconnected</span>
            )}
            {connectionStatus === 'idle' && <span className="text-gray-500">● Idle</span>}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 gap-1.5"
            onClick={handleAutoFix}
            disabled={isFixing || !isInitialized}
          >
            {isFixing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
            {isFixing ? 'Fixing...' : 'Auto-Fix'}
          </Button>
        </div>
      </div>
      <div className="flex-1 p-2 overflow-hidden relative">
        <div ref={terminalRef} className="h-full w-full" />
      </div>
    </div>
  );
}
