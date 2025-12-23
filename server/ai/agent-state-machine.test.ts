// 🔴 CRITICAL: Agent State Machine - TDD First
import { describe, it, expect, beforeEach } from 'vitest';
import { AgentStateMachine, RunLifecycleState, StateTransition } from './agent-state-machine';

describe('AgentStateMachine - TDD', () => {
  let stateMachine: AgentStateMachine;

  beforeEach(() => {
    stateMachine = new AgentStateMachine();
  });

  describe('Initial State', () => {
    it('should start in idle state', () => {
      expect(stateMachine.getCurrentState()).toBe('idle');
      expect(stateMachine.getHistory()).toHaveLength(0);
      expect(stateMachine.getCurrentPhase()).toBe('plan');
    });

    it('should initialize with empty context', () => {
      const context = stateMachine.getContext();
      expect(context.runId).toBeNull();
      expect(context.currentPhase).toBe('plan');
      expect(context.error).toBeNull();
    });
  });

  describe('Valid State Transitions', () => {
    it('should transition from idle to planning', () => {
      const result = stateMachine.transition('planning');
      
      expect(result.success).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('planning');
      expect(stateMachine.getHistory()).toHaveLength(1);
      expect(stateMachine.getHistory()[0]).toEqual({
        from: 'idle',
        to: 'planning',
        timestamp: expect.any(Number),
        reason: undefined
      });
    });

    it('should transition from planning to executing', () => {
      stateMachine.transition('planning');
      const result = stateMachine.transition('executing');
      
      expect(result.success).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('executing');
      expect(stateMachine.getCurrentPhase()).toBe('execute');
    });

    it('should transition from executing to testing', () => {
      stateMachine.transition('planning');
      stateMachine.transition('executing');
      const result = stateMachine.transition('testing');
      
      expect(result.success).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('testing');
      expect(stateMachine.getCurrentPhase()).toBe('test');
    });

    it('should transition from testing to fixing', () => {
      setupToTesting(stateMachine);
      const result = stateMachine.transition('fixing', 'Tests failed');
      
      expect(result.success).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('fixing');
      expect(stateMachine.getCurrentPhase()).toBe('fix');
      expect(stateMachine.getContext().error).toBe('Tests failed');
    });

    it('should transition from testing to done', () => {
      setupToTesting(stateMachine);
      const result = stateMachine.transition('done');
      
      expect(result.success).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('done');
    });

    it('should transition from fixing to testing', () => {
      setupToFixing(stateMachine);
      const result = stateMachine.transition('testing');
      
      expect(result.success).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('testing');
    });

    it('should transition from fixing to done', () => {
      setupToFixing(stateMachine);
      const result = stateMachine.transition('done', 'Issues resolved');
      
      expect(result.success).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('done');
    });

    it('should transition from error to idle', () => {
      setupToError(stateMachine);
      const result = stateMachine.transition('idle', 'Reset after error');
      
      expect(result.success).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('idle');
      expect(stateMachine.getContext().error).toBeNull();
    });

    it('should transition from error to planning', () => {
      setupToError(stateMachine);
      const result = stateMachine.transition('planning', 'Retry after error');
      
      expect(result.success).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('planning');
    });

    it('should transition from done to idle', () => {
      setupToDone(stateMachine);
      const result = stateMachine.transition('idle');
      
      expect(result.success).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('idle');
    });
  });

  describe('Invalid State Transitions', () => {
    it('should reject transition from idle to executing', () => {
      const result = stateMachine.transition('executing');
      
      expect(result.success).toBe(false);
      expect(stateMachine.getCurrentState()).toBe('idle');
      expect(result.error).toContain('Invalid transition');
    });

    it('should reject transition from planning to testing', () => {
      stateMachine.transition('planning');
      const result = stateMachine.transition('testing');
      
      expect(result.success).toBe(false);
      expect(stateMachine.getCurrentState()).toBe('planning');
      expect(result.error).toContain('Invalid transition');
    });

    it('should reject transition from executing to fixing', () => {
      setupToExecuting(stateMachine);
      const result = stateMachine.transition('fixing');
      
      expect(result.success).toBe(false);
      expect(stateMachine.getCurrentState()).toBe('executing');
    });

    it('should reject transition from done to planning', () => {
      setupToDone(stateMachine);
      const result = stateMachine.transition('planning');
      
      expect(result.success).toBe(false);
      expect(stateMachine.getCurrentState()).toBe('done');
    });

    it('should reject transition to same state', () => {
      stateMachine.transition('planning');
      const result = stateMachine.transition('planning');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot transition to same state');
    });
  });

  describe('Error Handling', () => {
    it('should handle error state from any state', () => {
      const states: RunLifecycleState[] = ['idle', 'planning', 'executing', 'testing', 'fixing'];
      
      states.forEach(state => {
        const sm = new AgentStateMachine();
        if (state !== 'idle') {
          // Set up the state first
          setupToState(sm, state);
        }
        
        const result = sm.transition('error', 'Test error');
        expect(result.success).toBe(true);
        expect(sm.getCurrentState()).toBe('error');
        expect(sm.getContext().error).toBe('Test error');
      });
    });

    it('should clear error on successful transition', () => {
      stateMachine.transition('planning');
      stateMachine.transition('error', 'Test error');
      expect(stateMachine.getContext().error).toBe('Test error');
      
      stateMachine.transition('planning', 'Retry');
      expect(stateMachine.getContext().error).toBeNull();
    });
  });

  describe('Context Management', () => {
    it('should update run ID when provided', () => {
      const result = stateMachine.transition('planning', undefined, 'run-123');
      
      expect(result.success).toBe(true);
      expect(stateMachine.getContext().runId).toBe('run-123');
    });

    it('should update context data', () => {
      stateMachine.transition('planning');
      
      stateMachine.updateContext({
        currentFile: 'test.ts',
        line: 42,
        progress: 0.5
      });
      
      const context = stateMachine.getContext();
      expect(context.currentFile).toBe('test.ts');
      expect(context.line).toBe(42);
      expect(context.progress).toBe(0.5);
    });

    it('should preserve existing context when updating', () => {
      stateMachine.transition('planning', undefined, 'run-123');
      
      stateMachine.updateContext({ currentFile: 'test.ts' });
      
      const context = stateMachine.getContext();
      expect(context.runId).toBe('run-123');
      expect(context.currentFile).toBe('test.ts');
    });
  });

  describe('State Queries', () => {
    it('should correctly identify active states', () => {
      expect(stateMachine.isActive()).toBe(false);
      
      stateMachine.transition('planning');
      expect(stateMachine.isActive()).toBe(true);
      
      stateMachine.transition('done');
      expect(stateMachine.isActive()).toBe(false);
    });

    it('should correctly identify terminal states', () => {
      expect(stateMachine.isTerminal()).toBe(false);
      
      stateMachine.transition('planning');
      stateMachine.transition('done');
      expect(stateMachine.isTerminal()).toBe(true);
      
      stateMachine.transition('idle');
      expect(stateMachine.isTerminal()).toBe(false);
    });

    it('should correctly identify error states', () => {
      expect(stateMachine.isError()).toBe(false);
      
      stateMachine.transition('planning');
      stateMachine.transition('error');
      expect(stateMachine.isError()).toBe(true);
      
      stateMachine.transition('idle');
      expect(stateMachine.isError()).toBe(false);
    });

    it('should return possible transitions from current state', () => {
      expect(stateMachine.getPossibleTransitions()).toEqual(['planning', 'error']);
      
      stateMachine.transition('planning');
      expect(stateMachine.getPossibleTransitions()).toEqual(['executing', 'error']);
      
      stateMachine.transition('executing');
      expect(stateMachine.getPossibleTransitions()).toEqual(['testing', 'error']);
    });
  });

  describe('History Management', () => {
    it('should maintain transition history', () => {
      const transitions = [
        { from: 'idle', to: 'planning' },
        { from: 'planning', to: 'executing' },
        { from: 'executing', to: 'testing' },
        { from: 'testing', to: 'done' }
      ];
      
      transitions.forEach(({ to }, index) => {
        stateMachine.transition(to);
        expect(stateMachine.getHistory()).toHaveLength(index + 1);
      });
      
      const history = stateMachine.getHistory();
      expect(history).toHaveLength(4);
      expect(history[0]).toMatchObject({ from: 'idle', to: 'planning' });
      expect(history[3]).toMatchObject({ from: 'testing', to: 'done' });
    });

    it('should include timestamps in history', () => {
      const before = Date.now();
      stateMachine.transition('planning');
      const after = Date.now();
      
      const history = stateMachine.getHistory();
      expect(history[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(history[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should include transition reasons in history', () => {
      stateMachine.transition('planning', 'User requested');
      
      const history = stateMachine.getHistory();
      expect(history[0].reason).toBe('User requested');
    });
  });

  describe('Serialization', () => {
    it('should serialize state machine to JSON', () => {
      stateMachine.transition('planning', 'Test', 'run-123');
      stateMachine.updateContext({ currentFile: 'test.ts' });
      
      const serialized = stateMachine.toJSON();
      
      expect(serialized).toEqual({
        currentState: 'planning',
        currentPhase: 'plan',
        context: expect.objectContaining({
          runId: 'run-123',
          currentFile: 'test.ts'
        }),
        history: expect.any(Array)
      });
    });

    it('should deserialize from JSON', () => {
      const data = {
        currentState: 'executing' as RunLifecycleState,
        currentPhase: 'execute',
        context: {
          runId: 'run-456',
          currentFile: 'app.ts',
          error: null
        },
        history: []
      };
      
      const restored = AgentStateMachine.fromJSON(data);
      
      expect(restored.getCurrentState()).toBe('executing');
      expect(restored.getCurrentPhase()).toBe('execute');
      expect(restored.getContext().runId).toBe('run-456');
      expect(restored.getContext().currentFile).toBe('app.ts');
    });
  });
});

// Helper functions for test setup
function setupToTesting(sm: AgentStateMachine): void {
  sm.transition('planning');
  sm.transition('executing');
  sm.transition('testing');
}

function setupToExecuting(sm: AgentStateMachine): void {
  sm.transition('planning');
  sm.transition('executing');
}

function setupToFixing(sm: AgentStateMachine): void {
  setupToTesting(sm);
  sm.transition('fixing', 'Tests failed');
}

function setupToError(sm: AgentStateMachine): void {
  sm.transition('planning');
  sm.transition('error', 'Critical error');
}

function setupToDone(sm: AgentStateMachine): void {
  setupToTesting(sm);
  sm.transition('done');
}

function setupToState(sm: AgentStateMachine, targetState: RunLifecycleState): void {
  switch (targetState) {
    case 'planning':
      sm.transition('planning');
      break;
    case 'executing':
      setupToExecuting(sm);
      break;
    case 'testing':
      setupToTesting(sm);
      break;
    case 'fixing':
      setupToFixing(sm);
      break;
    case 'error':
      setupToError(sm);
      break;
    case 'done':
      setupToDone(sm);
      break;
  }
}
