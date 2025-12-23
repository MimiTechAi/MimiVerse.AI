import crypto from "crypto";
import { AgentWebSocket } from "../websocket";

export type RiskLevel = "low" | "medium" | "high" | string;

interface RiskPromptContext {
  tool: string;
  command?: string;
  url?: string;
  cwd?: string;
  risk: RiskLevel;
}

interface PendingRisk {
  resolve: (allowed: boolean) => void;
  timer: NodeJS.Timeout;
  createdAt: number;
}

const pending: Map<string, PendingRisk> = new Map();
const DEFAULT_TIMEOUT_MS = 60_000;

export function requestRiskApproval(
  ctx: RiskPromptContext,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<boolean> {
  const id = crypto.randomUUID();
  const agentWS = (global as any).agentWS as AgentWebSocket | undefined;

  if (agentWS && typeof (agentWS as any).sendStatus === "function") {
    (agentWS as any).sendStatus({
      type: "risk_prompt",
      description:
        ctx.command
          ? `High-risk command: ${ctx.command}`
          : ctx.url
            ? `High-risk request: ${ctx.url}`
            : "High-risk action requested.",
      risk: ctx.risk,
      tool: ctx.tool,
      command: ctx.command,
      url: ctx.url,
      cwd: ctx.cwd,
      requestId: id,
      source: "agent_chat",
      at: Date.now(),
      metadata: {
        risk: ctx.risk,
      },
    });
  }

  return new Promise<boolean>((resolve) => {
    const createdAt = Date.now();
    const timer = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        resolve(false);
      }
    }, timeoutMs);

    pending.set(id, { resolve, timer, createdAt });
  });
}

export function resolveRiskDecision(requestId: string, allow: boolean): boolean {
  const entry = pending.get(requestId);
  if (!entry) {
    return false;
  }

  clearTimeout(entry.timer);
  pending.delete(requestId);
  entry.resolve(allow);
  return true;
}
