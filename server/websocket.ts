import { WebSocketServer, WebSocket } from "ws";
import { Server, IncomingMessage } from "http";
import { Duplex } from "stream";
import { spawn } from "child_process";
import crypto from "crypto";
import { ThoughtStep } from "./ai/types";
import { RunPhaseEventPayload } from "@shared/run-phases";
import { parse } from "url";

export type AgentWsEventType =
    | "thinking"
    | "tool_use"
    | "chunk"
    | "complete"
    | "error"
    | "progress"
    | "terminal_output"
    | "file_change"
    | "test_result"
    | "test_status"
    | "test_progress"
    | "test_files_changed"
    | "status"
    | "auto_fix_plan_generated"
    | "auto_fix_plan_failed"
    | "auto_fix_execution_started"
    | "auto_fix_step_started"
    | "auto_fix_step_completed"
    | "auto_fix_step_failed"
    | "auto_fix_step_error"
    | "auto_fix_completed"
    | "auto_fix_failed";

export interface WSMessage {
    id?: string;
    type: AgentWsEventType;
    createdAt?: number;
    data: any;
}

/**
 * WebSocket manager for real-time agent communication
 */
export class AgentWebSocket {
    public wss: WebSocketServer;
    private clients: Set<WebSocket> = new Set();

    constructor() {
        this.wss = new WebSocketServer({ noServer: true });

        this.wss.on("connection", (ws: WebSocket) => {
            console.log("[WebSocket] Client connected");
            this.clients.add(ws);

            ws.on("close", () => {
                console.log("[WebSocket] Client disconnected");
                this.clients.delete(ws);
            });

            ws.on("error", (error) => {
                console.error("[WebSocket] Error:", error);
                this.clients.delete(ws);
            });
        });
    }

    handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer) {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit('connection', ws, request);
        });
    }

    /**
     * Broadcast message to all connected clients
     */
    broadcast(message: WSMessage) {
        const enrichedMessage: WSMessage = {
            id: message.id ?? crypto.randomUUID(),
            type: message.type,
            createdAt: message.createdAt ?? Date.now(),
            data: message.data,
        };

        const payload = JSON.stringify(enrichedMessage);
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    }

    /**
     * Send thinking process step
     */
    sendThinking(thought: ThoughtStep) {
        this.broadcast({ type: "thinking", data: thought });
    }

    /**
     * Send tool usage notification
     */
    sendToolUse(tool: string, input: any) {
        this.broadcast({ type: "tool_use", data: { tool, input } });
    }

    /**
     * Send streaming chunk
     */
    sendChunk(chunk: string) {
        this.broadcast({ type: "chunk", data: chunk });
    }

    /**
     * Send completion
     */
    sendComplete(result: any) {
        this.broadcast({ type: "complete", data: result });
    }

    /**
     * Send error
     */
    sendError(error: string) {
        this.broadcast({ type: "error", data: error });
    }

    /**
     * Send progress update (for long operations like project execution)
     */
    sendProgress(phaseId: string, taskId: string, status: string) {
        this.broadcast({
            type: "progress",
            data: { phaseId, taskId, status }
        });
    }

    sendStatus(data: { type?: string; description?: string } & Partial<RunPhaseEventPayload>) {
        this.broadcast({
            type: "status",
            data,
        });
    }
}

/**
 * WebSocket manager for real terminal communication using child_process
 */
export class TerminalWebSocket {
    public wss: WebSocketServer;

    constructor() {
        this.wss = new WebSocketServer({ noServer: true });

        this.wss.on("connection", (ws: WebSocket) => {
            console.log("[Terminal WS] Client connected");

            // Spawn a bash/powershell process
            const shell = process.platform === "win32" ? "powershell.exe" : "/bin/bash";
            const shellProcess = spawn(shell, [], {
                cwd: process.cwd(),
                env: process.env,
            });

            // Send stdout to client
            shellProcess.stdout.on("data", (data: Buffer) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: "output", data: data.toString() }));
                }
            });

            // Send stderr to client
            shellProcess.stderr.on("data", (data: Buffer) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: "output", data: data.toString() }));
                }
            });

            // Handle process exit
            shellProcess.on("exit", (code: number | null) => {
                console.log(`[Terminal WS] Shell exited with code ${code}`);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: "exit", code }));
                }
            });

            // Receive input from client and write to stdin
            ws.on("message", (message: string) => {
                try {
                    const msg = JSON.parse(message.toString());
                    if (msg.type === "input") {
                        shellProcess.stdin.write(msg.data);
                    }
                } catch (e) {
                    console.error("[Terminal WS] Message parse error:", e);
                }
            });

            // Cleanup on disconnect
            ws.on("close", () => {
                console.log("[Terminal WS] Client disconnected");
                shellProcess.kill();
            });

            ws.on("error", (error) => {
                console.error("[Terminal WS] Error:", error);
                shellProcess.kill();
            });

            // Send initial prompt
            ws.send(JSON.stringify({ type: "connected", shell }));
        });
    }

    handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer) {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit('connection', ws, request);
        });
    }
}

let agentWSInstance: AgentWebSocket | null = null;

export function getWebSocket() {
    return agentWSInstance;
}

export function setupWebSockets(server: Server) {
    const agentWS = new AgentWebSocket();
    const terminalWS = new TerminalWebSocket();
    agentWSInstance = agentWS;

    server.on('upgrade', (request, socket, head) => {
        const { pathname } = parse(request.url || '', true);
        console.log(`[WebSocket] Upgrade request for: ${pathname}`);

        if (pathname === '/ws/agent') {
            console.log('[WebSocket] Upgrading to Agent WS');
            agentWS.handleUpgrade(request, socket, head);
        } else if (pathname === '/ws/terminal') {
            console.log('[WebSocket] Upgrading to Terminal WS');
            terminalWS.handleUpgrade(request, socket, head);
        } else {
            console.log(`[WebSocket] Ignoring upgrade for: ${pathname}`);
            // Let other listeners (like Vite) handle it
        }
    });

    return { agentWS, terminalWS };
}
