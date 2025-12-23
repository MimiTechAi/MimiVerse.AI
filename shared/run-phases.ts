export type RunPhase =
  | 'analyzing'
  | 'scanning_project'
  | 'planning'
  | 'editing_files'
  | 'testing'
  | 'done'
  | 'cancelled'
  | 'error';

export interface RunPhaseEventPayload {
  phase: RunPhase;
  reason?: string;
  source?: 'agent_chat' | 'project_agent' | 'tests' | 'manual';
  at?: number;
}
