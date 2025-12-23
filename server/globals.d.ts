/**
 * Global WebSocket instances
 * These are set during server initialization and accessed across the application
 */

import type { AgentWebSocket } from './websocket';

declare global {
    var agentWS: AgentWebSocket | undefined;
}

declare module "express-session" {
    interface SessionData {
        userId: string;
        activeProjectId?: string;
    }
}

export { };
