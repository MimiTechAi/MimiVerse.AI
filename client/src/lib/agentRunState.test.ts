import { describe, it, expect } from 'vitest';
import {
  createInitialRun,
  updateRunState,
  getRunSteps,
  type AgentRun,
  type RunLifecycleState,
} from '@/lib/agentRunState';

function makeRun(state: RunLifecycleState, overrides: Partial<AgentRun> = {}): AgentRun {
  const base = createInitialRun('test-run', 'BUILD');
  const withState = updateRunState(base, state, overrides.failedStep ? { failedStep: overrides.failedStep } : undefined);
  return { ...withState, ...overrides };
}

describe('agentRunState', () => {
  it('creates an initial run with idle state', () => {
    const run = createInitialRun('abc123', 'BUILD');
    expect(run.runId).toBe('abc123');
    expect(run.mode).toBe('BUILD');
    expect(run.state).toBe('idle');
    expect(typeof run.startedAt).toBe('number');
    expect(run.finishedAt).toBeUndefined();
  });

  it('updates run state while preserving identity', () => {
    const run = createInitialRun('abc123', 'BUILD');
    const next = updateRunState(run, 'planning');
    expect(next.state).toBe('planning');
    expect(next.runId).toBe(run.runId);
    expect(next.mode).toBe(run.mode);
    expect(next.startedAt).toBe(run.startedAt);
  });

  it('computes step statuses for the normal lifecycle', () => {
    const idleSteps = getRunSteps(makeRun('idle'));
    expect(idleSteps.map((s: { status: string }) => s.status)).toEqual(['pending', 'pending', 'pending', 'pending']);

    const planningSteps = getRunSteps(makeRun('planning'));
    expect(planningSteps.map((s: { status: string }) => s.status)).toEqual(['active', 'pending', 'pending', 'pending']);

    const executingSteps = getRunSteps(makeRun('executing'));
    expect(executingSteps.map((s: { status: string }) => s.status)).toEqual(['completed', 'active', 'pending', 'pending']);

    const testingSteps = getRunSteps(makeRun('testing'));
    expect(testingSteps.map((s: { status: string }) => s.status)).toEqual(['completed', 'completed', 'active', 'pending']);

    const fixingSteps = getRunSteps(makeRun('fixing'));
    expect(fixingSteps.map((s: { status: string }) => s.status)).toEqual(['completed', 'completed', 'completed', 'active']);

    const doneSteps = getRunSteps(makeRun('done'));
    expect(doneSteps.map((s: { status: string }) => s.status)).toEqual(['completed', 'completed', 'completed', 'completed']);
  });

  it('marks the failed step when run is in error state', () => {
    const errorRun = makeRun('error', { failedStep: 'tests' });
    const steps = getRunSteps(errorRun);

    expect(steps.map((s: { id: string }) => s.id)).toEqual(['plan', 'execute', 'tests', 'fix']);
    expect(steps.map((s: { status: string }) => s.status)).toEqual(['completed', 'completed', 'failed', 'pending']);
  });
});
