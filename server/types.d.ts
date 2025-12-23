import 'express-session';

declare module 'express-session' {
    interface SessionData {
        userId: number;
        activeProjectId?: string;
        workspacePath?: string;
    }
}

declare global {
    namespace NodeJS {
        interface Global {
            currentWorkspacePath?: string;
            agentWS?: any;
        }
    }
}
