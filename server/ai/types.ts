/**
 * Agent Thinking and Execution Types
 * For transparent agent workflow visualization
 */

export interface ThoughtStep {
    id: string;
    type: 'thinking' | 'planning' | 'analyzing' | 'executing' | 'reflecting' | 'error';
    content: string;
    timestamp: number;
    depth: number; // For nested thoughts
    status: 'active' | 'complete' | 'failed';
    metadata?: {
        toolName?: string;
        filePath?: string;
        duration?: number;
    };
}

export interface ExecutionPhase {
    id: string;
    name: string;
    status: 'pending' | 'active' | 'complete' | 'failed';
    tasks: ExecutionTask[];
    startTime?: number;
    endTime?: number;
}

export interface ExecutionTask {
    id: string;
    description: string;
    status: 'pending' | 'active' | 'complete' | 'failed';
    result?: string;
    error?: string;
    duration?: number;
}

export interface AgentPlan {
    id: string;
    goal: string;
    phases: ExecutionPhase[];
    createdAt: number;
    status: 'draft' | 'approved' | 'executing' | 'complete' | 'failed';
}

// WebSocket message types
export type AgentMessage =
    | { type: 'thinking', step: ThoughtStep }
    | { type: 'plan_created', plan: AgentPlan }
    | { type: 'plan_approved', planId: string }
    | { type: 'phase_start', phase: ExecutionPhase }
    | { type: 'phase_complete', phase: ExecutionPhase }
    | { type: 'task_start', task: ExecutionTask, phaseId: string }
    | { type: 'task_complete', task: ExecutionTask, phaseId: string }
    | { type: 'error', error: string, context?: string }
    | { type: 'complete', summary: string, plan: AgentPlan };
