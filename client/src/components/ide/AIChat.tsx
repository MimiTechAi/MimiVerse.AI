import { useState, useRef, useEffect, type ChangeEvent, type KeyboardEvent } from "react";
import { Send, Bot, User, Sparkles, Paperclip, Mic, Cpu, Globe, FileCode, Loader2, CheckCircle2, AlertCircle, Circle, Brain, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAgentRun, type ThinkingEntry, type AgentEvent } from "@/hooks/useAgentRun";
import { AgentThinking } from "./AgentThinking";
import ProjectPlanView from "./ProjectPlanView";
import { createInitialRun, getRunSteps, updateRunState, type AgentRun, type RunStep } from "@/lib/agentRunState";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  thoughts?: string;
  isSystem?: boolean;
  thoughtDurationMs?: number;
  suggestions?: {
    key: string;
    label: string;
    action:
      | { type: 'run_tests' }
      | { type: 'auto_fix_tests' }
      | { type: 'chat_prompt'; prompt: string };
  }[];
  artifacts?: {
    type: 'file' | 'search' | 'plan';
    title: string;
  }[];
  attachments?: {
    path: string;
    name: string;
    mimeType?: string;
  }[];
}

interface TestResult {
  name: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  stack?: string;
}

interface FixSuggestion {
  diagnosis: string;
  fix: string;
  filePath: string;
  confidence: number;
}

interface FixReport {
  fixedCount: number;
  stillFailing: number;
  details: TestResult[];
  suggestions: FixSuggestion[];
}

interface QueuedMessage {
  id: string;
  content: string;
}

interface InlineActivityState {
  messageId: string;
  thinkingStartIndex: number;
  eventStartIndex: number;
  startedAt: number;
  done: boolean;
  aborted?: boolean;
}

const DEFAULT_RUN_STEPS: RunStep[] = [
  { id: 'plan', label: 'Plan', status: 'pending' },
  { id: 'execute', label: 'Execute', status: 'pending' },
  { id: 'tests', label: 'Tests', status: 'pending' },
  { id: 'fix', label: 'Auto-Fix', status: 'pending' },
];

function formatRunDelta(startedAt?: number, timestamp?: number): string | null {
  if (typeof startedAt !== 'number' || typeof timestamp !== 'number') return null;
  const deltaMs = timestamp - startedAt;
  if (!Number.isFinite(deltaMs) || deltaMs < 0) return null;
  const deltaSec = Math.round(deltaMs / 1000);
  return `+${deltaSec}s`;
}

type AgentRunHeaderProps = {
  isAgentConnected: boolean;
  agentStatus: 'idle' | 'running' | 'error';
  isTyping: boolean;
  currentPhase: string | null;
  modeLabel: 'CHAT' | 'BUILD';
  canStop: boolean;
  onStop: () => void;
};

function AgentRunHeader({
  isAgentConnected,
  agentStatus,
  isTyping,
  currentPhase,
  modeLabel,
  canStop,
  onStop,
}: AgentRunHeaderProps) {
  const isThinking = isTyping || agentStatus === 'running';

  const steps = [
    { id: 'analyzing', label: 'Analyze' },
    { id: 'scanning_project', label: 'Scan' },
    { id: 'planning', label: 'Plan' },
    { id: 'editing_files', label: 'Edit' },
    { id: 'testing', label: 'Test' },
  ] as const;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">MIMI Agent</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-white/10 flex items-center gap-1 bg-[#111827]">
              {!isAgentConnected && <span className="text-red-300">Offline</span>}
              {isAgentConnected && agentStatus === 'error' && (
                <span className="text-red-300">Error</span>
              )}
              {isAgentConnected && agentStatus !== 'error' && isThinking && (
                <span className="text-emerald-300">Thinking…</span>
              )}
              {isAgentConnected && agentStatus === 'idle' && !isThinking && (
                <span className="text-emerald-300">Ready</span>
              )}
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            Ask for refactors, new features, or full project changes.
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center px-4">
        <div className="flex items-center gap-3 text-[9px] text-gray-400 whitespace-nowrap">
          {steps.map((step, idx, arr) => {
            const active = currentPhase === step.id;
            const completedIndex = arr.findIndex((s) => s.id === currentPhase);
            const completed = completedIndex !== -1 && completedIndex > idx;
            const baseDot = 'w-1.5 h-1.5 rounded-full border';
            const dotClass = completed
              ? `${baseDot} bg-purple-500 border-purple-400`
              : active
                ? `${baseDot} bg-purple-400 border-purple-300`
                : `${baseDot} bg-transparent border-gray-600`;
            const labelClass = completed || active ? 'text-gray-100' : 'text-gray-500';
            return (
              <div key={step.id} className="flex items-center gap-1">
                <div className={dotClass} />
                <span className={labelClass}>{step.label}</span>
                {idx < arr.length - 1 && (
                  <div className="w-6 h-px bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 opacity-70" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-gray-500">
        <span className="px-2 py-0.5 rounded-full border border-white/10 bg-[#111827] uppercase tracking-[0.16em] text-[9px] text-gray-200">
          {modeLabel}
        </span>
        {canStop && (
          <button
            type="button"
            className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-200 border border-red-500/40 hover:bg-red-500/20"
            onClick={onStop}
          >
            Stop
          </button>
        )}
        <button
          type="button"
          className="p-1.5 rounded-md border border-white/10 bg-[#111827] hover:bg-white/5 text-gray-300"
        >
          <Settings2 size={12} />
        </button>
      </div>
    </div>
  );
}

type RunDetailsCardProps = {
  run: AgentRun;
  runStatusLabel: string;
  runSteps: RunStep[];
  latestThinkingDelta: string | null;
  lastWorkspaceIntelEvent?: AgentEvent;
  recentAgentEvents: AgentEvent[];
};

function RunDetailsCard({
  run,
  runStatusLabel,
  runSteps,
  latestThinkingDelta,
  lastWorkspaceIntelEvent,
  recentAgentEvents,
}: RunDetailsCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-[11px] text-gray-200 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cpu size={12} className="text-purple-300" />
          <div>
            <div className="uppercase tracking-[0.16em] text-[9px] text-gray-400">Agent Run</div>
            <div className="text-xs text-white">{runStatusLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-gray-400">
          <span className="px-1.5 py-0.5 rounded-full border border-white/10">
            Mode: {run.mode}
          </span>
          {latestThinkingDelta && (
            <span className="px-1.5 py-0.5 rounded-full border border-white/10 text-gray-300">
              {latestThinkingDelta}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {runSteps.map((step) => {
          const isActive = step.status === 'active';
          const isCompleted = step.status === 'completed';
          const isFailed = step.status === 'failed';
          const baseClass =
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px]';
          const variant = isFailed
            ? 'border-red-500/60 text-red-300 bg-red-500/10'
            : isActive
              ? 'border-purple-500/70 text-purple-100 bg-purple-500/20'
              : isCompleted
                ? 'border-emerald-500/60 text-emerald-200 bg-emerald-500/10'
                : 'border-white/10 text-gray-400 bg-black/20';
          return (
            <span key={step.id} className={cn(baseClass, variant)}>
              {isCompleted && <CheckCircle2 size={10} className="shrink-0" />}
              {isActive && !isCompleted && !isFailed && (
                <Loader2 size={10} className="shrink-0 animate-spin" />
              )}
              {isFailed && <AlertCircle size={10} className="shrink-0" />}
              {!isActive && !isCompleted && !isFailed && (
                <Circle size={8} className="shrink-0" />
              )}
              <span>{step.label}</span>
            </span>
          );
        })}
      </div>

      {lastWorkspaceIntelEvent && lastWorkspaceIntelEvent.detail && (
        <div className="flex items-start gap-1 text-[10px] text-gray-300">
          <Globe size={10} className="mt-0.5 text-blue-300" />
          <div>
            <span className="font-semibold text-gray-200">Workspace:</span>{' '}
            <span>{lastWorkspaceIntelEvent.detail}</span>
          </div>
        </div>
      )}

      {recentAgentEvents.length > 0 && (
        <div className="border-t border-white/10 pt-1.5">
          <div className="text-[9px] uppercase tracking-[0.16em] text-gray-500 mb-1">
            Recent activity
          </div>
          <div className="space-y-0.5">
            {recentAgentEvents.map((evt) => {
              const delta = formatRunDelta(run.startedAt, evt.timestamp);
              return (
                <div
                  key={evt.id}
                  className="flex items-center justify-between gap-2 text-[10px] text-gray-300"
                >
                  <div className="truncate">
                    <span className="font-medium text-gray-100">{evt.label}</span>
                    {evt.detail && (
                      <span className="text-gray-400"> — {evt.detail}</span>
                    )}
                  </div>
                  {delta && (
                    <span className="shrink-0 text-[9px] text-gray-500">{delta}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface AIChatProps {
  openFiles?: any[];
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
  onFileChange?: (path: string) => void;
}

export function AIChat({
  openFiles,
  initialPrompt,
  onClearInitialPrompt,
  onFileChange
}: AIChatProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [lastTestResults, setLastTestResults] = useState<TestResult[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isAutoFixingTests, setIsAutoFixingTests] = useState(false);
  const {
    currentRun,
    setCurrentRun,
    agentStatus,
    isAgentConnected,
    thinkingStream,
    agentEvents,
    agentLog,
    currentPhase,
    pendingRiskPrompt,
    setPendingRiskPrompt,
  } = useAgentRun();
  const [composerDraft, setComposerDraft] = useState<string | null>(null);
  const [projectPlan, setProjectPlan] = useState<any | null>(null);
  const [isExecutingPlan, setIsExecutingPlan] = useState(false);
  const [neuralSearchEnabled, setNeuralSearchEnabled] = useState(true);
  const [fileGenEnabled, setFileGenEnabled] = useState(false);
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const [modelPreset, setModelPreset] = useState<'fast' | 'balanced' | 'deep'>('balanced');
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const [mentionMode, setMentionMode] = useState<'none' | 'type' | 'file'>('none');
  const [mentionQuery, setMentionQuery] = useState('');
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const queuedMessagesRef = useRef<QueuedMessage[]>([]);
  const [inlineActivity, setInlineActivity] = useState<InlineActivityState | null>(null);
  const [thinkingHidden, setThinkingHidden] = useState(true);

  // Keep a live ref of the thinking stream so we can attach full thoughts to chat messages
  const thinkingRef = useRef<ThinkingEntry[]>(thinkingStream);
  useEffect(() => {
    thinkingRef.current = thinkingStream;
  }, [thinkingStream]);

  useEffect(() => {
    queuedMessagesRef.current = queuedMessages;
  }, [queuedMessages]);

  const logTimeline = async (
    type: 'ai_request' | 'agent_action',
    description: string,
    metadata?: Record<string, any>
  ) => {
    try {
      await fetch('/api/timeline/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, description, metadata })
      });
    } catch (error) {
      console.error('Timeline log failed:', error);
    }
  };

  const getFileCandidates = (): string[] => {
    if (!openFiles || !Array.isArray(openFiles)) return [];
    const paths: string[] = [];
    for (const f of openFiles as any[]) {
      if (!f) continue;
      if (typeof f === 'string') {
        paths.push(f);
        continue;
      }
      if (typeof f.path === 'string') {
        paths.push(f.path);
        continue;
      }
      if (typeof f.filePath === 'string') {
        paths.push(f.filePath);
        continue;
      }
      if (typeof f.name === 'string') {
        paths.push(f.name);
      }
    }
    return paths;
  };

  const executeProjectPlan = async (planToExecute: any) => {
    if (!planToExecute) return;
    setIsExecutingPlan(true);
    try {
      const execRes = await fetch('/api/ai/execute-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planToExecute })
      });

      if (!execRes.ok) {
        let message = 'Failed to execute project plan';
        try {
          const errJson = await execRes.json();
          if (typeof errJson?.message === 'string') {
            message = errJson.message;
          }
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 5).toString(),
        role: 'assistant',
        content: 'Project agent has finished executing the plan. Check the workspace for updated files and dependencies.',
        timestamp: new Date(),
      }]);
    } catch (error: any) {
      console.error('Execute project plan error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 6).toString(),
        role: 'assistant',
        content: `Project plan execution failed: ${error?.message ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        isSystem: true,
      }]);
    } finally {
      setIsExecutingPlan(false);
    }
  };

  const runTestsFromChat = async () => {
    setIsRunningTests(true);
    setIsTyping(true);
    const runId = currentRun?.runId ?? Math.random().toString(36).slice(2, 10);
    const baseMode = currentRun?.mode ?? 'TEST';

    setCurrentRun(prev => {
      if (prev && prev.runId === runId) {
        return updateRunState(prev, 'testing');
      }
      const base = createInitialRun(runId, baseMode as any);
      return updateRunState(base, 'testing');
    });
    try {
      logTimeline('agent_action', 'Started test run from AIChat', {
        mode: 'TEST',
        runId
      });

      const res = await fetch('/api/tests/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!res.ok) {
        let message = 'Failed to run tests';
        try {
          const errJson = await res.json();
          if (typeof errJson?.message === 'string') {
            message = errJson.message;
          }
        } catch {
          // ignore JSON parse errors
        }
        toast.error(message);
        throw new Error(message);
      }

      const data = await res.json();
      const results = Array.isArray(data?.results) ? (data.results as TestResult[]) : [];
      setLastTestResults(results);

      const total = results.length;
      const passed = results.filter(r => r.status === 'passed').length;
      const failed = results.filter(r => r.status === 'failed').length;
      const skipped = results.filter(r => r.status === 'skipped').length;

      const lines: string[] = [];
      lines.push('Test run completed.');
      lines.push('');
      lines.push(`Total: ${total}, Passed: ${passed}, Failed: ${failed}, Skipped: ${skipped}`);
      if (results.length > 0) {
        lines.push('');
        lines.push('Summary:');
        const limited = results.slice(0, 20);
        for (const r of limited) {
          const status = r.status.toUpperCase();
          const dur = typeof r.duration === 'number' ? ` (${r.duration}ms)` : '';
          lines.push(`- [${status}] ${r.name} - ${r.file}${dur}`);
          if (r.status === 'failed' && r.error) {
            lines.push(`  Error: ${r.error}`);
          }
        }
        if (results.length > limited.length) {
          lines.push('');
          lines.push(`(Only first ${limited.length} tests shown.)`);
        }
      }
      if (failed > 0) {
        lines.push('');
        lines.push('You can ask MIMI to auto-fix the failing tests using the test controls below the context bar.');
      }

      const summaryText = lines.join('\n');

      const suggestions: NonNullable<Message['suggestions']> = failed > 0
        ? [
            {
              key: 'auto-fix-tests',
              label: 'Auto-fix failing tests',
              action: { type: 'auto_fix_tests' },
            },
            {
              key: 'explain-failures',
              label: 'Explain failing tests',
              action: {
                type: 'chat_prompt',
                prompt: [
                  'Here are the latest test results from the test runner:',
                  '',
                  summaryText,
                  '',
                  'Explain the failing tests and propose concrete code changes to fix them.',
                ].join('\n'),
              },
            },
            {
              key: 'rerun-tests',
              label: 'Re-run tests',
              action: { type: 'run_tests' },
            },
          ]
        : [
            {
              key: 'next-step',
              label: 'Suggest next improvement',
              action: {
                type: 'chat_prompt',
                prompt: [
                  'All tests are currently passing. Here are the latest test results:',
                  '',
                  summaryText,
                  '',
                  'Suggest the next high-impact refactor or feature for this codebase and outline a short plan.',
                ].join('\n'),
              },
            },
            {
              key: 'rerun-tests',
              label: 'Re-run tests',
              action: { type: 'run_tests' },
            },
          ];

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 3).toString(),
          role: 'assistant',
          content: summaryText,
          timestamp: new Date(),
          suggestions,
        }
      ]);
      logTimeline('agent_action', 'Completed test run from AIChat', {
        mode: 'TEST',
        runId,
        total,
        passed,
        failed,
        skipped
      });

      setCurrentRun(prev => {
        if (!prev || prev.runId !== runId) return prev;
        if (failed > 0) {
          return updateRunState(prev, 'error', { failedStep: 'tests' });
        }
        return updateRunState(prev, 'done');
      });
    } catch (error: any) {
      console.error('Test run error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 4).toString(),
          role: 'assistant',
          content: `Test run failed: ${error?.message ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
          isSystem: true,
        }
      ]);
      setCurrentRun(prev => {
        if (!prev || prev.runId !== runId) return prev;
        return updateRunState(prev, 'error', { failedStep: 'tests' });
      });
    } finally {
      setIsRunningTests(false);
      setIsTyping(false);
    }
  };

  const autoFixTestsFromChat = async () => {
    if (!lastTestResults || lastTestResults.length === 0) {
      toast.info('Run tests first so MIMI knows what to fix.');
      return;
    }
    const failures = lastTestResults.filter(r => r.status === 'failed');
    if (failures.length === 0) {
      toast.info('There are no failing tests to auto-fix.');
      return;
    }

    setIsAutoFixingTests(true);
    setIsTyping(true);
    const runId = currentRun?.runId ?? Math.random().toString(36).slice(2, 10);
    const runMode = currentRun?.mode ?? 'TEST_FIX';

    setCurrentRun(prev => {
      if (prev && prev.runId === runId) {
        return updateRunState(prev, 'fixing');
      }
      const base = createInitialRun(runId, runMode as any);
      return updateRunState(base, 'fixing');
    });
    try {
      logTimeline('agent_action', 'Started test auto-fix from AIChat', {
        mode: 'TEST_FIX',
        runId,
        failures: failures.length
      });

      const res = await fetch('/api/tests/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failures })
      });

      if (!res.ok) {
        let message = 'Failed to auto-fix tests';
        try {
          const errJson = await res.json();
          if (typeof errJson?.message === 'string') {
            message = errJson.message;
          }
        } catch {
          // ignore JSON parse errors
        }
        toast.error(message);
        throw new Error(message);
      }

      const data = (await res.json()) as FixReport;
      const details = Array.isArray(data?.details) ? data.details : lastTestResults;
      setLastTestResults(details);

      const lines: string[] = [];
      lines.push('Test auto-fix completed.');
      lines.push('');
      lines.push(`Fixed: ${data.fixedCount}, Still failing: ${data.stillFailing}`);

      if (Array.isArray(data?.suggestions) && data.suggestions.length > 0) {
        lines.push('');
        lines.push('Suggestions:');
        for (const s of data.suggestions) {
          const conf = typeof s.confidence === 'number' ? ` (confidence ${(s.confidence * 100).toFixed(1)}%)` : '';
          lines.push(`- ${s.filePath}${conf}`);
          lines.push(`  Diagnosis: ${s.diagnosis}`);
        }
      }

      if (details.length > 0) {
        const failedNow = details.filter(r => r.status === 'failed').length;
        lines.push('');
        lines.push('Current test status after auto-fix:');
        lines.push(`Total: ${details.length}, Failed: ${failedNow}`);
      }

      const summaryText = lines.join('\n');
      const failedNow = details.filter(r => r.status === 'failed').length;

      const suggestions: NonNullable<Message['suggestions']> = failedNow > 0
        ? [
            {
              key: 'rerun-tests',
              label: 'Re-run tests',
              action: { type: 'run_tests' },
            },
            {
              key: 'explain-remaining-failures',
              label: 'Explain remaining failures',
              action: {
                type: 'chat_prompt',
                prompt: [
                  'Here are the latest test results after auto-fix:',
                  '',
                  summaryText,
                  '',
                  'Explain the remaining failing tests and propose further fixes.',
                ].join('\n'),
              },
            },
          ]
        : [
            {
              key: 'rerun-tests',
              label: 'Re-run tests',
              action: { type: 'run_tests' },
            },
            {
              key: 'next-step',
              label: 'Suggest next improvement',
              action: {
                type: 'chat_prompt',
                prompt: [
                  'All tests are now passing after auto-fix. Here are the latest test results:',
                  '',
                  summaryText,
                  '',
                  'Suggest the next high-impact refactor or feature for this codebase and outline a short plan.',
                ].join('\n'),
              },
            },
          ];

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 7).toString(),
          role: 'assistant',
          content: summaryText,
          timestamp: new Date(),
          suggestions,
        }
      ]);
      logTimeline('agent_action', 'Completed test auto-fix from AIChat', {
        mode: 'TEST_FIX',
        runId,
        fixedCount: data.fixedCount,
        stillFailing: data.stillFailing,
        remainingFailed: failedNow
      });

      setCurrentRun(prev => {
        if (!prev || prev.runId !== runId) return prev;
        if (data.stillFailing > 0 || failedNow > 0) {
          return updateRunState(prev, 'error', { failedStep: 'fix' });
        }
        return updateRunState(prev, 'done');
      });
    } catch (error: any) {
      console.error('Test auto-fix error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 8).toString(),
          role: 'assistant',
          content: `Test auto-fix failed: ${error?.message ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
          isSystem: true,
        }
      ]);
    } finally {
      setIsAutoFixingTests(false);
      setIsTyping(false);
    }
  };

  const runChat = async (msgContent: string, userMessageId?: string) => {
    // Abort any previous streaming run before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsTyping(true);
    // Capture current length of the thinking stream so we can slice out the new thoughts for this turn
    const thinkingStartIndex = thinkingRef.current.length;
    const eventStartIndex = agentEvents.length;

    if (userMessageId) {
      setInlineActivity({
        messageId: userMessageId,
        thinkingStartIndex,
        eventStartIndex,
        startedAt: Date.now(),
        done: false,
      });
    }

    let wasAborted = false;
    try {
      const response = await fetch('/api/ai/agent-chat?stream=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: msgContent,
          history: messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: m.content
          })),
          modelPreset,
          mode: fileGenEnabled ? 'build' : 'chat',
          openFiles: getFileCandidates(),
        })
      });

      if (!response.ok) {
        let message = 'Failed to send message';
        try {
          const errJson = await response.json();
          if (typeof errJson?.message === 'string') {
            message = errJson.message;
          }
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }

      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        const newThoughts = thinkingRef.current.slice(thinkingStartIndex);
        let thoughtsText = '';
        let thoughtDurationMs: number | undefined;
        if (newThoughts.length > 0) {
          thoughtsText = newThoughts.map(t => t.content).join('\n\n');
          const firstTs = newThoughts[0]?.timestamp;
          const lastTs = newThoughts[newThoughts.length - 1]?.timestamp;
          if (
            typeof firstTs === 'number' &&
            typeof lastTs === 'number' &&
            Number.isFinite(firstTs) &&
            Number.isFinite(lastTs) &&
            lastTs >= firstTs
          ) {
            thoughtDurationMs = lastTs - firstTs;
          }
        }
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: typeof data.content === 'string' ? data.content : JSON.stringify(data),
          timestamp: new Date(),
          thoughts: thoughtsText || undefined,
          thoughtDurationMs,
        }]);
      } else {
        // Handle streaming response (NDJSON events)
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader available');

        const aiMsgId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, {
          id: aiMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date()
        }]);

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;

          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            if (!line) continue;

            try {
              const evt = JSON.parse(line);
              if (evt.type === 'contentDelta' && typeof evt.delta === 'string') {
                const deltaText = evt.delta as string;
                setMessages(prev => prev.map(msg =>
                  msg.id === aiMsgId
                    ? { ...msg, content: msg.content + deltaText }
                    : msg
                ));
              } else if (evt.type === 'error' && typeof evt.message === 'string') {
                // Emit a dedicated system message for streaming errors and stop the typing indicator
                setMessages(prev => [
                  ...prev,
                  {
                    id: `${aiMsgId}-error-${Date.now()}`,
                    role: 'assistant',
                    content: `Streaming error: ${evt.message}`,
                    timestamp: new Date(),
                    isSystem: true,
                  },
                ]);
                setIsTyping(false);
              } else if (evt.type === 'final') {
                // Stream is logically complete – clear the typing indicator immediately
                setIsTyping(false);
              }
            } catch {
              // Ignore malformed lines
            }
          }
        }

        // Attach full thinking text for this turn to the completed assistant message
        const newThoughts = thinkingRef.current.slice(thinkingStartIndex);
        let thoughtsText = '';
        let thoughtDurationMs: number | undefined;
        if (newThoughts.length > 0) {
          thoughtsText = newThoughts.map(t => t.content).join('\n\n');
          const firstTs = newThoughts[0]?.timestamp;
          const lastTs = newThoughts[newThoughts.length - 1]?.timestamp;
          if (
            typeof firstTs === 'number' &&
            typeof lastTs === 'number' &&
            Number.isFinite(firstTs) &&
            Number.isFinite(lastTs) &&
            lastTs >= firstTs
          ) {
            thoughtDurationMs = lastTs - firstTs;
          }
        }
        if (thoughtsText || typeof thoughtDurationMs === 'number') {
          setMessages(prev => prev.map(msg =>
            msg.id === aiMsgId
              ? {
                  ...msg,
                  ...(thoughtsText && { thoughts: thoughtsText }),
                  ...(typeof thoughtDurationMs === 'number' && { thoughtDurationMs }),
                }
              : msg
          ));
        }
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        wasAborted = true;
      } else {
        console.error('Chat error:', error);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Sorry, I encountered an error connecting to the brain. ${error?.message ? `(${error.message})` : ''}`,
          timestamp: new Date(),
          isSystem: true,
        }]);
      }
    } finally {
      setIsTyping(false);
      if (userMessageId) {
        setInlineActivity(prev =>
          prev && prev.messageId === userMessageId
            ? { ...prev, done: true, ...(wasAborted ? { aborted: true } : {}) }
            : prev
        );
        setTimeout(() => {
          setInlineActivity(prev =>
            prev && prev.messageId === userMessageId ? null : prev
          );
        }, 2500);
      }
    }
  };

  const handleStartPlan = async () => {
    if (!projectPlan) return;
    // Transition existing run (if any) into the executing phase when the user manually starts the build.
    setCurrentRun(prev => {
      if (!prev) return prev;
      return updateRunState(prev, 'executing');
    });
    await executeProjectPlan(projectPlan);
  };

  const runProjectAgent = async (goal: string, runId?: string) => {
    setIsTyping(true);
    setProjectPlan(null);
    setIsExecutingPlan(false);

    const effectiveRunId = runId ?? Math.random().toString(36).slice(2, 10);
    // Initialize or reset the build run when a new BUILD request is issued.
    setCurrentRun(prev => {
      if (prev && prev.runId === effectiveRunId) {
        return updateRunState(prev, 'planning');
      }
      const base = createInitialRun(effectiveRunId, 'BUILD');
      return updateRunState(base, 'planning');
    });
    try {
      logTimeline('agent_action', `Started project plan for: ${goal}`, {
        mode: 'BUILD',
        runId: effectiveRunId,
        modelPreset,
      });
      const planRes = await fetch('/api/ai/plan-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: goal })
      });

      if (!planRes.ok) {
        let message = 'Failed to plan project';
        try {
          const errJson = await planRes.json();
          if (typeof errJson?.message === 'string') {
            message = errJson.message;
          }
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }

      const plan = await planRes.json();

      let summary = 'Created a project execution plan.';
      const phases = Array.isArray(plan?.phases) ? plan.phases : null;
      if (phases && phases.length > 0) {
        summary = [
          'Created a project execution plan with the following phases:',
          '',
          ...phases.map((p: any, idx: number) => {
            const label = p.name || p.id || 'Phase';
            const taskInfo = Array.isArray(p.tasks) ? `${p.tasks.length} tasks` : 'tasks planned';
            return `${idx + 1}. ${label} – ${taskInfo}`;
          })
        ].join('\n');
      }

      setProjectPlan(plan);
      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'I\'ve created a project plan below. Review it and start the build when you are ready.',
        timestamp: new Date(),
      }]);
      if (autopilotEnabled) {
        await executeProjectPlan(plan);
      }
    } catch (error: any) {
      console.error('Project agent error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 4).toString(),
        role: 'assistant',
        content: `Project agent failed: ${error?.message ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        isSystem: true,
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (textInput?: string) => {
    const msgContent = textInput || input;
    const trimmed = msgContent.trim();
    if (!trimmed) return;

    if (isTyping) {
      const id = `${Date.now().toString()}-${Math.random().toString(36).slice(2, 8)}`;
      setQueuedMessages(prev => [...prev, { id, content: trimmed }]);
      setInput("");
      toast.info('Queued message – it will run after the current task finishes.');
      setMentionMode('none');
      setMentionQuery('');
      return;
    }

    setMentionMode('none');
    setMentionQuery('');

    const runId = Math.random().toString(36).slice(2, 10);

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msgContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInput("");

    logTimeline('ai_request', msgContent, {
      mode: fileGenEnabled ? 'BUILD' : 'CHAT',
      runId,
      modelPreset,
    });

    if (fileGenEnabled) {
      await runProjectAgent(msgContent, runId);
    } else {
      await runChat(msgContent, newMessage.id);
    }
  };

  const handleSuggestionClick = async (
    suggestion: NonNullable<Message['suggestions']>[number]
  ) => {
    if (suggestion.action.type === 'run_tests') {
      if (isRunningTests) {
        toast.info('A test run is already in progress. Please wait for it to finish.');
        return;
      }
      await runTestsFromChat();
      return;
    }
    if (suggestion.action.type === 'auto_fix_tests') {
      if (isAutoFixingTests) {
        toast.info('Auto-fix is already running. Please wait for it to finish.');
        return;
      }
      await autoFixTestsFromChat();
      return;
    }
    if (suggestion.action.type === 'chat_prompt') {
      await handleSend(suggestion.action.prompt);
      return;
    }
  };

  // Handle initial prompt from other components (e.g. Create Project)
  useEffect(() => {
    if (initialPrompt) {
      handleSend(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const [lastFileEventId, setLastFileEventId] = useState<string | null>(null);
  const processedAgentEventIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!onFileChange || agentEvents.length === 0) return;
    const last = agentEvents[agentEvents.length - 1];
    if (last.type !== 'file_change' || !last.detail) return;
    if (last.id === lastFileEventId) return;
    setLastFileEventId(last.id);

    const match = last.detail.match(/\]\s*(.+)$/);
    const path = match?.[1] ?? last.detail;
    onFileChange(path);
  }, [agentEvents, onFileChange, lastFileEventId]);

  const renderAgentEventIcon = (evt: AgentEvent) => {
    switch (evt.type) {
      case 'tool_use':
        return <Cpu size={10} className="text-purple-300" />;
      case 'file_change':
        return <FileCode size={10} className="text-blue-300" />;
      case 'test_result':
        return <CheckCircle2 size={10} className="text-emerald-300" />;
      case 'progress':
        return <Sparkles size={10} className="text-blue-300" />;
      case 'complete':
        return <CheckCircle2 size={10} className="text-emerald-300" />;
      case 'error':
        return <AlertCircle size={10} className="text-red-400" />;
      case 'status':
        return <Circle size={8} className="text-gray-300" />;
      default:
        return <Sparkles size={10} className="text-purple-300" />;
    }
  };

  const describeAgentEvent = (evt: AgentEvent): { text: string; isError?: boolean } | null => {
    switch (evt.type) {
      case 'tool_use': {
        const base = evt.label || 'Tool';
        const detail = evt.detail ? ` – ${evt.detail}` : '';
        return { text: `${base}${detail}` };
      }
      case 'progress': {
        const base = evt.label || 'Progress';
        const detail = evt.detail ? ` – ${evt.detail}` : '';
        return { text: `${base}${detail}` };
      }
      case 'file_change': {
        const detail = evt.detail || '';
        return { text: `File change ${detail}` };
      }
      case 'test_result': {
        const base = evt.label || 'Test result';
        const detail = evt.detail ? ` – ${evt.detail}` : '';
        return { text: `${base}${detail}` };
      }
      case 'error': {
        const detail = evt.detail || 'Agent reported an error.';
        return { text: detail, isError: true };
      }
      case 'complete': {
        return { text: 'Agent run completed.' };
      }
      case 'status': {
        const base = evt.label || 'Status';
        const detail = evt.detail ? ` – ${evt.detail}` : '';
        return { text: `${base}${detail}` };
      }
      case 'thinking':
      default:
        return null;
    }
  };

  const getInlineThoughtText = (): string => {
    if (!inlineActivity) return '';
    const slice = thinkingStream.slice(inlineActivity.thinkingStartIndex);
    if (slice.length === 0) return '';
    return slice.map(t => t.content).join('\n');
  };

  const getInlineAgentEvents = (): AgentEvent[] => {
    if (!inlineActivity) return [];
    return agentEvents
      .slice(inlineActivity.eventStartIndex)
      .filter((evt) => evt.type !== 'thinking');
  };

  useEffect(() => {
    if (!fileGenEnabled || agentEvents.length === 0) return;

    const seen = processedAgentEventIdsRef.current;
    const newMessages: Message[] = [];

    for (const evt of agentEvents) {
      if (seen.has(evt.id)) continue;
      seen.add(evt.id);

      const desc = describeAgentEvent(evt as AgentEvent);
      if (!desc) continue;

      newMessages.push({
        id: `${evt.id}-chat`,
        role: 'assistant',
        content: desc.text,
        timestamp: new Date(),
        ...(desc.isError ? { isSystem: true } : {}),
      });
    }

    if (newMessages.length === 0) return;

    setMessages(prev => [...prev, ...newMessages]);
  }, [agentEvents, fileGenEnabled]);

  useEffect(() => {
    if (isTyping) return;
    const next = queuedMessagesRef.current[0];
    if (!next) return;
    queuedMessagesRef.current = queuedMessagesRef.current.slice(1);
    setQueuedMessages(prev => prev.slice(1));
    void handleSend(next.content);
  }, [isTyping]);

  const handleAttachment = () => {
    if (attachmentInputRef.current) {
      attachmentInputRef.current.click();
    }
  };

  const handleAttachmentSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('attachment', file);

      const res = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let message = 'Attachment upload failed';
        try {
          const errJson = await res.json();
          if (typeof errJson?.message === 'string') {
            message = errJson.message;
          }
        } catch {
          // ignore JSON parse errors
        }
        toast.error(message);
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: message,
            timestamp: new Date(),
            isSystem: true,
          },
        ]);
        return;
      }

      const data = await res.json();
      const relPath = typeof data?.path === 'string' ? data.path : '';
      const name = (data?.name as string) || file.name;

      if (relPath) {
        setInput(prev => `${prev ? `${prev} ` : ''}@file:${relPath}`);
      }

      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'user',
          content: relPath
            ? `Uploaded attachment: ${name}\n\nI will reference it as @file:${relPath} in my next message.`
            : `Uploaded attachment: ${name}`,
          timestamp: new Date(),
          attachments: relPath
            ? [
                {
                  path: relPath,
                  name,
                  mimeType: file.type || undefined,
                },
              ]
            : undefined,
        },
      ]);

      toast.success('Attachment uploaded');
    } catch (error: any) {
      console.error('Attachment upload failed:', error);
      const message = `Attachment upload failed: ${error?.message ? error.message : 'Unknown error'}`;
      toast.error(message);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: message,
          timestamp: new Date(),
          isSystem: true,
        },
      ]);
    } finally {
      // Allow selecting the same file again
      event.target.value = '';
    }
  };

  const updateMentionState = (value: string, caretIndex: number | null) => {
    const pos = caretIndex ?? value.length;
    const upto = value.slice(0, pos);

    const fileMatch = /@file:([^\s]*)$/.exec(upto);
    if (fileMatch) {
      setMentionMode('file');
      setMentionQuery(fileMatch[1] || '');
      return;
    }

    const typeMatch = /@(\w*)$/.exec(upto);
    if (typeMatch) {
      setMentionMode('type');
      setMentionQuery(typeMatch[1] || '');
      return;
    }

    setMentionMode('none');
    setMentionQuery('');
  };

  const applyMentionType = (kind: 'file' | 'codebase' | 'web') => {
    setInput(prev => {
      const caret = inputRef.current?.selectionStart ?? prev.length;
      const upto = prev.slice(0, caret);
      const after = prev.slice(caret);
      const replaced = upto.replace(/@(\w*)$/, `@${kind}:`);
      return replaced + after;
    });
    if (kind === 'file') {
      setMentionMode('file');
      setMentionQuery('');
    } else {
      setMentionMode('none');
      setMentionQuery('');
    }
  };

  const applyFileMentionPath = (path: string) => {
    setInput(prev => {
      const caret = inputRef.current?.selectionStart ?? prev.length;
      const upto = prev.slice(0, caret);
      const after = prev.slice(caret);
      const replaced = upto.replace(/@file:([^\s]*)$/, `@file:${path}`);
      return replaced + after;
    });
    setMentionMode('none');
    setMentionQuery('');
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInput(value);
    const caret = event.target.selectionStart ?? value.length;
    updateMentionState(value, caret);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setMentionMode('none');
      setMentionQuery('');
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSend();
      return;
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Copied to clipboard');
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('Copy failed');
    }
  };

  const handleSendToComposer = (content: string) => {
    try {
      localStorage.setItem('mimiverse_composer_instruction', content);
      setComposerDraft(content);
      toast.success('Sent to Composer. Open the Composer view to refine and apply changes.');
    } catch (error) {
      console.error('Send to Composer failed:', error);
      toast.error('Failed to send to Composer');
    }
  };

  const cancelQueuedMessage = (id: string) => {
    setQueuedMessages(prev => prev.filter((msg) => msg.id !== id));
  };

  const runSteps = currentRun ? getRunSteps(currentRun) : DEFAULT_RUN_STEPS;
  const currentRunState = currentRun?.state ?? 'idle';

  const runStatusLabel = (() => {
    if (currentPhase === 'analyzing') {
      return 'Analyzing request…';
    }
    if (currentPhase === 'scanning_project') {
      return 'Scanning project files…';
    }
    if (currentPhase === 'planning') {
      return 'Planning changes…';
    }
    if (currentPhase === 'editing_files') {
      return 'Editing files…';
    }
    if (currentPhase === 'testing') {
      return 'Running tests…';
    }
    if (currentPhase === 'done') {
      return 'Run complete';
    }
    if (currentPhase === 'error') {
      return 'Run failed – check Agent Timeline';
    }
    if (currentPhase === 'cancelled') {
      return 'Run cancelled by user';
    }
    switch (currentRunState) {
      case 'planning':
        return 'Planning project-wide changes…';
      case 'executing':
        return 'Applying plan to the codebase…';
      case 'testing':
        return 'Running test suite…';
      case 'fixing':
        return 'Auto-fixing failing tests…';
      case 'done':
        return 'Run complete';
      case 'error':
        return 'Run failed – check Agent Timeline';
      case 'cancelled':
        return 'Run cancelled by user';
      default:
        return 'Idle – waiting for instructions';
    }
  })();

  const isAgentThinking = agentStatus === 'running' || isTyping;
  const thinkingCardThoughts = thinkingStream.map((t) => ({
    id: t.id,
    text: t.content,
  }));
  const hasThinking = thinkingCardThoughts.length > 0;

  const inlinePhaseLabel = (() => {
    if (currentPhase === 'analyzing') return 'Understanding your request…';
    if (currentPhase === 'scanning_project') return 'Scanning project files…';
    if (currentPhase === 'planning') return 'Planning changes…';
    if (currentPhase === 'editing_files') return 'Editing files…';
    if (currentPhase === 'testing') return 'Running tests…';
    if (currentPhase === 'done') return 'Finalizing answer…';
    if (currentPhase === 'error') return 'Handling error…';
    if (currentPhase === 'cancelled') return 'Stopped by user';
    return 'Thinking…';
  })();

  const canContinue =
    (currentRunState === 'done' || currentRunState === 'error' || currentRunState === 'cancelled') &&
    !isTyping &&
    queuedMessages.length === 0;

  const handleContinue = async () => {
    const lines: string[] = [];
    const modeLabel = currentRun?.mode ? String(currentRun.mode) : undefined;
    lines.push('Continue from the last agent run.');
    if (modeLabel) {
      lines.push('Run mode: ' + modeLabel + '.');
    }
    lines.push('Use the recent agent timeline and existing plan to resume the task where it stopped, without repeating completed steps.');
    lines.push('If files or tests were partially updated, reconcile their current state and continue the trajectory logically.');
    await handleSend(lines.join('\n'));
  };

  const [isSubmittingRiskDecision, setIsSubmittingRiskDecision] = useState(false);

  const handleRiskDecision = async (allow: boolean) => {
    if (!pendingRiskPrompt) return;
    setIsSubmittingRiskDecision(true);
    try {
      const res = await fetch('/api/ai/agent/risk-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: pendingRiskPrompt.requestId, allow }),
      });

      if (!res.ok) {
        const text = await res.text();
        toast.error(`Risk decision failed: ${text || res.status}`);
      } else if (!allow) {
        toast.message('High-risk action cancelled');
      }
    } catch (error: any) {
      console.error('Risk decision error:', error);
      toast.error('Failed to send risk decision');
    } finally {
      setIsSubmittingRiskDecision(false);
      setPendingRiskPrompt(null);
    }
  };

  const getThinkingDelta = (timestamp: number) => {
    return formatRunDelta(currentRun?.startedAt, timestamp);
  };

  const latestThinkingEvent =
    agentEvents.length > 0
      ? [...agentEvents].slice().reverse().find((evt) => evt.type === 'thinking')
      : undefined;

  const latestThinkingDelta =
    latestThinkingEvent && typeof latestThinkingEvent.timestamp === 'number'
      ? getThinkingDelta(latestThinkingEvent.timestamp)
      : null;

  const recentAgentEvents = agentEvents
    .filter((evt) => evt.type !== 'thinking')
    .slice(-5)
    .reverse();

  const lastWorkspaceIntelEvent = [...agentEvents]
    .slice()
    .reverse()
    .find((evt) => evt.type === 'status' && evt.label === 'Workspace intel');

  const modeLabel: 'CHAT' | 'BUILD' = fileGenEnabled ? 'BUILD' : 'CHAT';
  const canStop = isTyping || agentStatus === 'running';

  return (
    <div className="h-full flex flex-col bg-[#1E1E24] border-r border-[hsl(var(--sidebar-border))]">
      <div className="px-4 py-3 border-b border-[hsl(var(--sidebar-border))] bg-[#1E1E24]/80 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 relative">
          <AgentRunHeader
            isAgentConnected={isAgentConnected}
            agentStatus={agentStatus}
            isTyping={isTyping}
            currentPhase={currentPhase ?? null}
            modeLabel={modeLabel}
            canStop={canStop}
            onStop={() => {
              if (abortControllerRef.current) {
                abortControllerRef.current.abort();
              }
              setIsTyping(false);
              setCurrentRun((prev) =>
                prev ? updateRunState(prev, 'cancelled') : prev
              );
            }}
          />

          {mentionMode !== 'none' && (
            <div className="absolute left-3 bottom-[-4.5rem] z-20 w-64 rounded-md border border-white/10 bg-[#18181b] shadow-xl text-[11px] text-gray-100">
              <div className="px-2 py-1 border-b border-white/10 flex items-center justify-between">
                <span className="uppercase tracking-[0.16em] text-[9px] text-gray-400">Mentions</span>
                <span className="text-[9px] text-gray-500">Esc to close</span>
              </div>
              {mentionMode === 'type' && (
                <div className="py-1">
                  {["file", "codebase", "web"].filter((kind) =>
                    kind.startsWith(mentionQuery.toLowerCase())
                  ).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      className="w-full text-left px-2 py-1.5 hover:bg-white/5 flex items-center gap-2"
                      onClick={() => applyMentionType(kind as 'file' | 'codebase' | 'web')}
                    >
                      <span className="font-mono text-xs">@{kind}:</span>
                      <span className="text-[10px] text-gray-400">
                        {kind === 'file' && 'Reference a specific file in the workspace'}
                        {kind === 'codebase' && 'Search the indexed codebase'}
                        {kind === 'web' && 'Point to an external URL'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {mentionMode === 'file' && (
                <div className="py-1 max-h-40 overflow-y-auto">
                  {(() => {
                    const candidates = getFileCandidates();
                    const filtered = candidates
                      .filter((p) =>
                        mentionQuery
                          ? p.toLowerCase().includes(mentionQuery.toLowerCase())
                          : true
                      )
                      .slice(0, 8);
                    if (filtered.length === 0) {
                      return (
                        <div className="px-2 py-1.5 text-[10px] text-gray-500">
                          No file suggestions. Open files in the editor to see them here.
                        </div>
                      );
                    }
                    return filtered.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className="w-full text-left px-2 py-1.5 hover:bg-white/5 flex items-center gap-2"
                        onClick={() => applyFileMentionPath(p)}
                      >
                        <FileCode size={10} className="text-purple-300" />
                        <span className="truncate text-[10px]">{p}</span>
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-4">
      <div className="h-full flex items-start gap-4">
        <div className="flex-1 space-y-3">
          {pendingRiskPrompt && (
            <div className="rounded-md border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle size={12} className="text-amber-300" />
                  <div>
                    <div className="uppercase tracking-[0.16em] text-[9px] text-amber-300/80">Risk gate</div>
                    <div className="text-xs text-amber-50">
                      {pendingRiskPrompt.description || 'High-risk action requires your approval.'}
                    </div>
                  </div>
                </div>
                {pendingRiskPrompt.risk && (
                  <span className="px-1.5 py-0.5 rounded-full border border-amber-400/60 text-[9px] text-amber-100">
                    Risk: {pendingRiskPrompt.risk}
                  </span>
                )}
              </div>
              {(pendingRiskPrompt.command || pendingRiskPrompt.url) && (
                <div className="text-[10px] text-amber-100/90 truncate">
                  {pendingRiskPrompt.command ? `Command: ${pendingRiskPrompt.command}` : null}
                  {pendingRiskPrompt.url ? `URL: ${pendingRiskPrompt.url}` : null}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 text-[10px] mt-1">
                <button
                  type="button"
                  disabled={isSubmittingRiskDecision}
                  className="px-2 py-0.5 rounded-md border border-amber-500/60 text-amber-100 hover:bg-amber-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => handleRiskDecision(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingRiskDecision}
                  className="px-2 py-0.5 rounded-md border border-emerald-500/60 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => handleRiskDecision(true)}
                >
                  Allow once
                </button>
              </div>
            </div>
          )}

          {hasThinking && (
            <div className="sticky top-0 z-10 pt-1 pb-2 bg-[#1E1E24]">
              <AgentThinking
                thoughts={thinkingCardThoughts}
                isThinking={isAgentThinking}
                hidden={thinkingHidden}
                onToggleHidden={() => setThinkingHidden((h) => !h)}
                onCopyAll={handleCopy}
                onSendToComposer={handleSendToComposer}
              />
            </div>
          )}

          <div className="mt-4 space-y-3">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
              >
                <div
                  className={cn(
                    "flex gap-2",
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <>
                      <Avatar className="w-7 h-7 border border-purple-500/40 bg-purple-500/10">
                        <AvatarFallback className="text-[10px] bg-transparent text-purple-200">
                          M
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 max-w-[85%]">
                        <div
                          className={cn(
                            "rounded-2xl border px-3 py-2 text-xs leading-relaxed bg-[#111827] text-gray-100 space-y-1",
                            msg.isSystem
                              ? "border-amber-400/60 bg-amber-500/10"
                              : "border-white/10"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] uppercase tracking-[0.16em]",
                                  msg.isSystem
                                    ? "bg-amber-500/10 text-amber-200 border border-amber-400/60"
                                    : "bg-purple-500/10 text-purple-200 border border-purple-400/60"
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    msg.isSystem ? "bg-amber-400" : "bg-emerald-400"
                                  )}
                                />
                                <span>{msg.isSystem ? "System status" : "Agent response"}</span>
                              </span>
                            </div>
                            {typeof msg.thoughtDurationMs === 'number' && (
                              <span className="text-[10px] text-gray-400">
                                Thought for {Math.max(1, Math.round(msg.thoughtDurationMs / 1000))}s
                              </span>
                            )}
                          </div>

                          <div className="whitespace-pre-wrap break-words text-[11px]">
                            {msg.content}
                          </div>

                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.attachments.map((att, idx) => {
                                const isImage = /\.(png|jpe?g|gif|webp|bmp)$/i.test(att.name || att.path);
                                const url = `/api/attachments/get?path=${encodeURIComponent(att.path)}`;
                                if (isImage) {
                                  return (
                                    <div
                                      key={`${att.path}-${idx}`}
                                      className="border border-white/10 bg-black/20 rounded-md p-1"
                                    >
                                      <div className="text-[10px] text-gray-400 mb-1 flex items-center gap-1">
                                        <Paperclip size={10} className="text-purple-300" />
                                        <span className="truncate">{att.name}</span>
                                      </div>
                                      <img
                                        src={url}
                                        alt={att.name}
                                        className="max-h-40 rounded-sm border border-white/5 object-contain bg-black/40"
                                      />
                                    </div>
                                  );
                                }
                                return (
                                  <a
                                    key={`${att.path}-${idx}`}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-gray-100"
                                  >
                                    <Paperclip size={10} className="text-purple-300" />
                                    <span className="truncate max-w-[160px]">{att.name}</span>
                                  </a>
                                );
                              })}
                            </div>
                          )}

                          {msg.suggestions && msg.suggestions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {msg.suggestions.map((s) => (
                                <button
                                  key={s.key}
                                  type="button"
                                  className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-purple-500/40 text-[10px] text-purple-100 transition-colors"
                                  onClick={() => handleSuggestionClick(s)}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          )}

                          {msg.thoughts && (
                            <div className="mt-2 border-t border-white/10 pt-1.5">
                              <button
                                type="button"
                                className="text-[10px] text-purple-300 hover:text-purple-100 flex items-center gap-1"
                                onClick={() =>
                                  setExpandedThoughts(prev => ({
                                    ...prev,
                                    [msg.id]: !prev[msg.id],
                                  }))
                                }
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                {expandedThoughts[msg.id]
                                  ? 'Hide thoughts'
                                  : typeof msg.thoughtDurationMs === 'number'
                                    ? `Thought for ${Math.max(1, Math.round(msg.thoughtDurationMs / 1000))}s`
                                    : 'Show thoughts'}
                              </button>
                              {expandedThoughts[msg.id] && (
                                <div className="mt-1 text-[11px] text-gray-300 whitespace-pre-wrap break-words">
                                  {msg.thoughts}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-2 flex gap-2 justify-end text-[10px] text-gray-400">
                            <button
                              type="button"
                              className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10"
                              onClick={() => handleCopy(msg.content)}
                            >
                              Copy
                            </button>
                            <button
                              type="button"
                              className="px-2 py-0.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/40 text-purple-200"
                              onClick={() => handleSendToComposer(msg.content)}
                            >
                              Send to Composer
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed bg-purple-600 text-white shadow-lg shadow-purple-900/30",
                        )}
                      >
                        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((att, idx) => {
                              const isImage = /\.(png|jpe?g|gif|webp|bmp)$/i.test(att.name || att.path);
                              const url = `/api/attachments/get?path=${encodeURIComponent(att.path)}`;
                              if (isImage) {
                                return (
                                  <div
                                    key={`${att.path}-${idx}`}
                                    className="border border-white/10 bg-black/20 rounded-md p-1"
                                  >
                                    <div className="text-[10px] text-gray-400 mb-1 flex items-center gap-1">
                                      <Paperclip size={10} className="text-purple-300" />
                                      <span className="truncate">{att.name}</span>
                                    </div>
                                    <img
                                      src={url}
                                      alt={att.name}
                                      className="max-h-40 rounded-sm border border-white/5 object-contain bg-black/40"
                                    />
                                  </div>
                                );
                              }
                              return (
                                <a
                                  key={`${att.path}-${idx}`}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-gray-100"
                                >
                                  <Paperclip size={10} className="text-purple-300" />
                                  <span className="truncate max-w-[160px]">{att.name}</span>
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <Avatar className="w-7 h-7 border border-white/10 bg-white/5">
                        <AvatarFallback className="text-[10px] bg-transparent text-gray-100">
                          U
                        </AvatarFallback>
                      </Avatar>
                    </>
                  )}
                </div>

                {msg.role === 'user' && inlineActivity && inlineActivity.messageId === msg.id && (
                  <div className="w-full flex flex-col items-end mt-1 space-y-1">
                    <div className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#111827] border border-purple-500/40 text-[10px] text-purple-100",
                      !inlineActivity.done && "animate-pulse"
                    )}>
                      <Brain size={10} className="text-purple-300" />
                      <span>
                        {inlineActivity.done
                          ? inlineActivity.aborted
                            ? "Stopped by user"
                            : "Thoughts completed"
                          : inlinePhaseLabel}
                      </span>
                    </div>

                    {(() => {
                      const thoughtText = getInlineThoughtText();
                      if (!thoughtText) return null;
                      return (
                        <div className="max-w-[80%] rounded-lg bg-black/40 border border-purple-500/30 px-2 py-1 text-[11px] text-gray-100 font-mono whitespace-pre-wrap break-words">
                          {thoughtText}
                        </div>
                      );
                    })()}

                    {(() => {
                      const events = getInlineAgentEvents();
                      if (!events.length) return null;

                      return (
                        <div className="flex flex-col items-end gap-0.5">
                          {events.slice(-4).map((evt) => {
                            const desc = describeAgentEvent(evt as AgentEvent);
                            if (!desc) return null;
                            return (
                              <div
                                key={evt.id}
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#020617] border border-white/10 text-[10px]",
                                  desc.isError && "border-red-400/60 text-red-200"
                                )}
                              >
                                {renderAgentEventIcon(evt)}
                                <span>{desc.text}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
        <div className="w-72 shrink-0 space-y-2 hidden xl:block">
            {currentRun && (
              <RunDetailsCard
                run={currentRun}
                runStatusLabel={runStatusLabel}
                runSteps={runSteps}
                latestThinkingDelta={latestThinkingDelta}
                lastWorkspaceIntelEvent={lastWorkspaceIntelEvent}
                recentAgentEvents={recentAgentEvents}
              />
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-[hsl(var(--sidebar-border))] bg-[#1E1E24] relative">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
        <div className="relative bg-[#27272A] rounded-xl border border-white/5 focus-within:border-purple-500/40 focus-within:ring-1 focus-within:ring-purple-500/20 transition-all">
          <input
            ref={attachmentInputRef}
            type="file"
            className="hidden"
            onChange={handleAttachmentSelected}
          />
          <Input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder={fileGenEnabled ? "Command MIMI to build..." : "Ask MIMI anything..."}
            className="pr-24 bg-transparent border-none focus-visible:ring-0 text-sm h-12 text-white placeholder:text-gray-500"
          />
          <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg"
              onClick={() =>
                toast.info(
                  'Voice input is not enabled in this build yet. For now, type your instructions or use @file/@codebase/@web mentions.',
                )
              }
            >
              <Mic size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg"
              onClick={handleAttachment}
            >
              <Paperclip size={16} />
            </Button>
            <Button
              size="icon"
              className="h-9 w-9 bg-purple-600 hover:bg-purple-500 text-white rounded-lg shadow-lg shadow-purple-600/20"
              onClick={() => handleSend()}
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
        <div className="flex justify-between mt-3 text-[10px] text-gray-500">
          <div className="flex gap-3 flex-wrap">
            <span
              className={cn(
                "flex items-center gap-1.5 transition-colors cursor-pointer select-none",
                neuralSearchEnabled ? "text-purple-400" : "hover:text-purple-400"
              )}
              onClick={() => setNeuralSearchEnabled(!neuralSearchEnabled)}
            >
              <Globe size={10} /> Neural Search: {neuralSearchEnabled ? 'ON' : 'OFF'}
            </span>
            <span
              className={cn(
                "flex items-center gap-1.5 transition-colors cursor-pointer select-none",
                fileGenEnabled ? "text-purple-400" : "hover:text-purple-400"
              )}
              onClick={() => setFileGenEnabled(!fileGenEnabled)}
            >
              <FileCode size={10} /> Code Mode: {fileGenEnabled ? 'BUILD' : 'CHAT'}
            </span>
            <span
              className={cn(
                "flex items-center gap-1.5 transition-colors cursor-pointer select-none",
                autopilotEnabled ? "text-emerald-400" : "hover:text-emerald-400"
              )}
              onClick={() => setAutopilotEnabled(!autopilotEnabled)}
            >
              <Sparkles size={10} /> Autopilot: {autopilotEnabled ? 'ON' : 'OFF'}
            </span>
            <span
              className={cn(
                "flex items-center gap-1.5 transition-colors cursor-pointer select-none",
                modelPreset === 'fast'
                  ? 'text-emerald-300'
                  : modelPreset === 'deep'
                    ? 'text-purple-300'
                    : 'text-blue-300'
              )}
              onClick={() =>
                setModelPreset(prev =>
                  prev === 'fast' ? 'balanced' : prev === 'balanced' ? 'deep' : 'fast'
                )
              }
            >
              <Cpu size={10} /> Model: {modelPreset === 'fast' ? 'FAST' : modelPreset === 'deep' ? 'DEEP' : 'BALANCED'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {canContinue && (
              <button
                type="button"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-gray-200"
                onClick={handleContinue}
              >
                <Sparkles size={10} className="text-purple-300" />
                Continue
              </button>
            )}
            <span className="font-mono">MIMI-OS v3.0.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
