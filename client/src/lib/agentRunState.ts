export type RunLifecycleState =
  | 'idle'
  | 'planning'
  | 'executing'
  | 'testing'
  | 'fixing'
  | 'done'
  | 'error'
  | 'cancelled';

export type RunMode = 'BUILD' | 'TEST' | 'TEST_FIX';

export type StepId = 'plan' | 'execute' | 'tests' | 'fix';

export type StepStatus = 'pending' | 'active' | 'completed' | 'failed';

export interface AgentRun {
  runId: string;
  mode: RunMode;
  state: RunLifecycleState;
  failedStep?: StepId;
  startedAt: number;
  finishedAt?: number;
}

export interface RunStep {
  id: StepId;
  label: string;
  status: StepStatus;
}

export function createInitialRun(runId: string, mode: RunMode): AgentRun {
  return {
    runId,
    mode,
    state: 'idle',
    startedAt: Date.now(),
  };
}

export function updateRunState(
  run: AgentRun,
  newState: RunLifecycleState,
  options?: { failedStep?: StepId },
): AgentRun {
  const next: AgentRun = {
    ...run,
    state: newState,
  };

  if (newState === 'error' && options?.failedStep) {
    next.failedStep = options.failedStep;
  }

  if (
    (newState === 'done' || newState === 'error' || newState === 'cancelled') &&
    !next.finishedAt
  ) {
    next.finishedAt = Date.now();
  }

  return next;
}

export function getRunSteps(run: AgentRun): RunStep[] {
  const steps: RunStep[] = [
    { id: 'plan', label: 'Plan', status: 'pending' },
    { id: 'execute', label: 'Execute', status: 'pending' },
    { id: 'tests', label: 'Tests', status: 'pending' },
    { id: 'fix', label: 'Auto-Fix', status: 'pending' },
  ];

  const state = run.state;

  if (state === 'idle') {
    return steps;
  }

  if (state === 'planning') {
    steps[0].status = 'active';
    return steps;
  }

  if (state === 'executing') {
    steps[0].status = 'completed';
    steps[1].status = 'active';
    return steps;
  }

  if (state === 'testing') {
    steps[0].status = 'completed';
    steps[1].status = 'completed';
    steps[2].status = 'active';
    return steps;
  }

  if (state === 'fixing') {
    steps[0].status = 'completed';
    steps[1].status = 'completed';
    steps[2].status = 'completed';
    steps[3].status = 'active';
    return steps;
  }

  if (state === 'done') {
    return steps.map((step) => ({ ...step, status: 'completed' }));
  }

  if (state === 'error') {
    const failedStep = run.failedStep ?? 'execute';
    const order: StepId[] = ['plan', 'execute', 'tests', 'fix'];

    for (const id of order) {
      const step = steps.find((s) => s.id === id)!;
      const currentIndex = order.indexOf(id);
      const failedIndex = order.indexOf(failedStep);

      if (id === failedStep) {
        step.status = 'failed';
      } else if (currentIndex < failedIndex) {
        step.status = 'completed';
      } else {
        step.status = 'pending';
      }
    }

    return steps;
  }

  if (state === 'cancelled') {
    const cancelledStep = run.failedStep ?? 'execute';
    const order: StepId[] = ['plan', 'execute', 'tests', 'fix'];

    for (const id of order) {
      const step = steps.find((s) => s.id === id)!;
      const currentIndex = order.indexOf(id);
      const cancelledIndex = order.indexOf(cancelledStep);

      if (currentIndex < cancelledIndex) {
        step.status = 'completed';
      } else {
        step.status = 'pending';
      }
    }

    return steps;
  }

  return steps;
}
