// 🔴 CRITICAL: Agent State Machine Implementation
import { EventEmitter } from 'events';

// State definitions for agent lifecycle
export type RunLifecycleState = 
  | 'idle'       // Waiting for instructions
  | 'planning'   // Creating execution plan
  | 'executing'  // Running the plan
  | 'testing'    // Running tests
  | 'fixing'     // Fixing issues
  | 'error'      // Error occurred
  | 'done';      // Completed successfully

// Phase definitions for UI
export type RunPhase = 
  | 'plan'       // Planning phase
  | 'execute'    // Execution phase
  | 'test'       // Testing phase
  | 'fix';       // Fixing phase

// State transition result
export interface StateTransition {
  success: boolean;
  from: RunLifecycleState;
  to: RunLifecycleState;
  timestamp: number;
  reason?: string;
  error?: string;
}

// Agent execution context
export interface AgentContext {
  runId: string | null;
  currentPhase: RunPhase;
  currentFile?: string;
  line?: number;
  progress: number;
  error: string | null;
  startTime?: number;
  endTime?: number;
  metadata: Record<string, any>;
}

// History entry for state transitions
export interface StateHistoryEntry {
  from: RunLifecycleState;
  to: RunLifecycleState;
  timestamp: number;
  reason?: string;
  duration?: number;
}

// Serialized state machine data
export interface SerializedStateMachine {
  currentState: RunLifecycleState;
  currentPhase: RunPhase;
  context: Partial<AgentContext>;
  history: StateHistoryEntry[];
}

/**
 * 🔴 CRITICAL: Agent State Machine
 * Manages agent lifecycle with strict state transitions and comprehensive tracking
 */
export class AgentStateMachine extends EventEmitter {
  private currentState: RunLifecycleState;
  private context: AgentContext;
  private history: StateHistoryEntry[] = [];
  private readonly maxHistorySize = 100;

  // Valid state transitions matrix
  private readonly validTransitions: Record<RunLifecycleState, RunLifecycleState[]> = {
    idle: ['planning', 'error'],
    planning: ['executing', 'error'],
    executing: ['testing', 'error'],
    testing: ['fixing', 'done', 'error'],
    fixing: ['testing', 'done', 'error'],
    error: ['idle', 'planning'],
    done: ['idle']
  };

  // Phase mapping for UI
  private readonly phaseMapping: Record<RunLifecycleState, RunPhase> = {
    idle: 'plan',
    planning: 'plan',
    executing: 'execute',
    testing: 'test',
    fixing: 'fix',
    error: 'plan',
    done: 'plan'
  };

  constructor() {
    super();
    this.currentState = 'idle';
    this.context = this.createInitialContext();
  }

  /**
   * Get current state
   */
  getCurrentState(): RunLifecycleState {
    return this.currentState;
  }

  /**
   * Get current phase for UI
   */
  getCurrentPhase(): RunPhase {
    return this.context.currentPhase;
  }

  /**
   * Get full context
   */
  getContext(): AgentContext {
    return { ...this.context };
  }

  /**
   * Get transition history
   */
  getHistory(): StateHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Transition to new state
   */
  transition(
    newState: RunLifecycleState, 
    reason?: string, 
    runId?: string
  ): StateTransition {
    const from = this.currentState;
    const timestamp = Date.now();

    // Validate transition
    if (!this.isValidTransition(from, newState)) {
      const error = newState === from 
        ? 'Cannot transition to same state'
        : `Invalid transition: ${from} → ${newState}`;
      
      return {
        success: false,
        from,
        to: newState,
        timestamp,
        error
      };
    }

    // Record transition
    const historyEntry: StateHistoryEntry = {
      from,
      to: newState,
      timestamp,
      reason
    };

    // Calculate duration from previous entry
    if (this.history.length > 0) {
      const lastEntry = this.history[this.history.length - 1];
      historyEntry.duration = timestamp - lastEntry.timestamp;
    }

    // Update state
    const previousState = this.currentState;
    this.currentState = newState;
    this.context.currentPhase = this.phaseMapping[newState];
    
    // Update context
    if (runId) {
      this.context.runId = runId;
    }

    if (newState === 'idle') {
      this.resetContext();
    } else if (newState === 'error' && reason) {
      this.context.error = reason;
    } else if (newState !== 'error') {
      this.context.error = null;
    }

    if (newState === 'planning' && !this.context.startTime) {
      this.context.startTime = timestamp;
    }

    if (newState === 'done') {
      this.context.endTime = timestamp;
      this.context.progress = 1.0;
    }

    // Add to history
    this.addToHistory(historyEntry);

    // Emit events
    this.emit('stateChanged', {
      from: previousState,
      to: newState,
      context: this.getContext(),
      reason
    });

    if (newState === 'error') {
      this.emit('error', reason);
    }

    return {
      success: true,
      from,
      to: newState,
      timestamp,
      reason
    };
  }

  /**
   * Update context data
   */
  updateContext(updates: Partial<AgentContext>): void {
    const previousContext = { ...this.context };
    Object.assign(this.context, updates);
    
    this.emit('contextUpdated', {
      previous: previousContext,
      current: this.getContext(),
      updates
    });
  }

  /**
   * Check if state machine is in active state
   */
  isActive(): boolean {
    return !['idle', 'done'].includes(this.currentState);
  }

  /**
   * Check if state machine is in terminal state
   */
  isTerminal(): boolean {
    return this.currentState === 'done';
  }

  /**
   * Check if state machine is in error state
   */
  isError(): boolean {
    return this.currentState === 'error';
  }

  /**
   * Get possible transitions from current state
   */
  getPossibleTransitions(): RunLifecycleState[] {
    return [...this.validTransitions[this.currentState]];
  }

  /**
   * Reset state machine to initial state
   */
  reset(): void {
    const previousState = this.currentState;
    this.currentState = 'idle';
    this.resetContext();
    this.history = [];
    
    this.emit('reset', { from: previousState });
  }

  /**
   * Serialize state machine to JSON
   */
  toJSON(): SerializedStateMachine {
    return {
      currentState: this.currentState,
      currentPhase: this.context.currentPhase,
      context: { ...this.context },
      history: [...this.history]
    };
  }

  /**
   * Restore state machine from JSON
   */
  static fromJSON(data: SerializedStateMachine): AgentStateMachine {
    const machine = new AgentStateMachine();
    machine.currentState = data.currentState;
    machine.context = {
      ...machine.createInitialContext(),
      ...data.context
    };
    machine.history = data.history || [];
    
    return machine;
  }

  /**
   * Get state machine statistics
   */
  getStats(): {
    totalTransitions: number;
    timeInCurrentState: number;
    averageStateDuration: number;
    errorCount: number;
  } {
    const totalTransitions = this.history.length;
    const timeInCurrentState = this.history.length > 0 
      ? Date.now() - this.history[this.history.length - 1].timestamp 
      : 0;

    const durations = this.history
      .filter(entry => entry.duration !== undefined)
      .map(entry => entry.duration!);
    
    const averageStateDuration = durations.length > 0
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
      : 0;

    const errorCount = this.history.filter(entry => entry.to === 'error').length;

    return {
      totalTransitions,
      timeInCurrentState,
      averageStateDuration,
      errorCount
    };
  }

  /**
   * Check if transition is valid
   */
  private isValidTransition(from: RunLifecycleState, to: RunLifecycleState): boolean {
    if (from === to) return false;
    return this.validTransitions[from]?.includes(to) || false;
  }

  /**
   * Create initial context
   */
  private createInitialContext(): AgentContext {
    return {
      runId: null,
      currentPhase: 'plan',
      progress: 0,
      error: null,
      metadata: {}
    };
  }

  /**
   * Reset context to initial state
   */
  private resetContext(): void {
    this.context = this.createInitialContext();
  }

  /**
   * Add entry to history with size limit
   */
  private addToHistory(entry: StateHistoryEntry): void {
    this.history.push(entry);
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }
}

/**
 * Factory function to create state machine with initial state
 */
export function createStateMachine(
  initialState: RunLifecycleState = 'idle',
  runId?: string
): AgentStateMachine {
  const machine = new AgentStateMachine();
  
  if (initialState !== 'idle') {
    machine.transition(initialState, 'Initial state', runId);
  }
  
  return machine;
}

/**
 * Utility function to validate state transition
 */
export function isValidStateTransition(
  from: RunLifecycleState, 
  to: RunLifecycleState
): boolean {
  const machine = new AgentStateMachine();
  return machine['isValidTransition'](from, to);
}

/**
 * Utility function to get state description
 */
export function getStateDescription(state: RunLifecycleState): string {
  const descriptions: Record<RunLifecycleState, string> = {
    idle: 'Waiting for instructions',
    planning: 'Creating execution plan',
    executing: 'Running the plan',
    testing: 'Running tests',
    fixing: 'Fixing issues',
    error: 'Error occurred',
    done: 'Completed successfully'
  };
  
  return descriptions[state] || 'Unknown state';
}

/**
 * Utility function to get phase description
 */
export function getPhaseDescription(phase: RunPhase): string {
  const descriptions: Record<RunPhase, string> = {
    plan: 'Planning Phase',
    execute: 'Execution Phase',
    test: 'Testing Phase',
    fix: 'Fixing Phase'
  };
  
  return descriptions[phase] || 'Unknown phase';
}
