import { Router } from 'express';
import crypto from 'crypto';
import { generateCompletion } from '../ai/utils/ollama';
import { pool } from '../storage';
import { ThoughtStep } from '../ai/types';
import { AgentBrain, type AgentMessage, type AgentMode } from '../ai/brain';
import path from 'path';
import { normalizeModelPreset } from '../ai/model-presets';
import { resolveRiskDecision } from '../ai/risk-gate';
import { z } from 'zod';

// 🔴 CRITICAL: Input Validation Schemas for Security
const chatRequestSchema = z.object({
    message: z.string()
        .min(1, 'Message cannot be empty')
        .max(10000, 'Message too long - maximum 10,000 characters')
        .refine(msg => !msg.toLowerCase().includes('ignore all previous'), {
            message: 'Potential prompt injection detected'
        })
        .refine(msg => !msg.toLowerCase().includes('system:'), {
            message: 'System prompt injection detected'
        })
        .refine(msg => !msg.toLowerCase().includes('developer mode'), {
            message: 'Developer mode bypass attempt detected'
        }),
    history: z.array(z.object({
        role: z.enum(['user', 'assistant', 'model']),
        parts: z.string().max(50000, 'Message part too long')
    })).max(50, 'Too many messages in history'),
    modelPreset: z.enum(['fast', 'balanced', 'deep']).optional().default('balanced')
});

const agentChatRequestSchema = z.object({
    message: z.string()
        .min(1, 'Message cannot be empty')
        .max(10000, 'Message too long - maximum 10,000 characters')
        .refine(msg => !msg.toLowerCase().includes('ignore all previous'), {
            message: 'Potential prompt injection detected'
        })
        .refine(msg => !msg.toLowerCase().includes('system:'), {
            message: 'System prompt injection detected'
        }),
    history: z.array(z.object({
        role: z.enum(['user', 'assistant', 'model']),
        parts: z.string().max(50000, 'Message part too long')
    })).max(50, 'Too many messages in history'),
    mode: z.enum(['chat', 'build']).optional().default('chat'),
    modelPreset: z.enum(['fast', 'balanced', 'deep']).optional().default('balanced'),
    openFiles: z.array(z.string()).max(20, 'Too many open files').optional()
});

const autoFixRequestSchema = z.object({
    command: z.string().max(1000, 'Command too long'),
    output: z.string().max(10000, 'Output too long'),
    exitCode: z.number().int().min(0).max(255)
});

// Validation helper function
const validateInput = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errorMessages = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        throw new Error(`Validation failed: ${errorMessages}`);
    }
    return result.data;
};

export const aiRouter = Router();

type AgentIntent = 'chat' | 'build' | 'inspect';

interface IntentClassification {
    intent: AgentIntent;
    reason: string;
}

function classifyIntent(
    message: string,
    rawMode: string,
    openFiles: unknown[] | undefined,
): IntentClassification {
    const text = message.toLowerCase();
    const uiMode = typeof rawMode === 'string' ? rawMode.toLowerCase() : 'chat';

    // If the UI explicitly selected BUILD, respect that and don't downgrade
    if (uiMode === 'build') {
        return {
            intent: 'build',
            reason: 'UI mode is BUILD; treating this as a build/project request.',
        };
    }

    // Strong build signals: creating/scaffolding apps, pages, dashboards, CRUD, etc.
    const buildPatterns: RegExp[] = [
        /\b(build|create|generate|scaffold|implement|implementiere|baue|bau|erstelle|setup)\b/,
        /landing\s?page|landingpage/,
        /fullstack app|full-stack app|full stack app/,
        /dashboard/,
        /crud app|crud api/,
        /projektplan|project plan/,
        /"?neues? projekt"?/,
    ];

    if (buildPatterns.some((re) => re.test(text))) {
        return {
            intent: 'build',
            reason: 'Detected build-related keywords (create/build/scaffold/page/app/dashboard).',
        };
    }

    // Inspect / review / debug style requests
    const inspectPatterns: RegExp[] = [
        /\b(show|zeige|where|wo|finde|search|suche|open|\u00f6ffne|inspect|review|analysiere|analyse|debug|fehler|bug)\b/,
        /refactor/,
        /\brename\b/,
        /\bimprove\b.*code/,
        /in allen dateien|\u00fcberall/,
    ];

    if (inspectPatterns.some((re) => re.test(text))) {
        return {
            intent: 'inspect',
            reason: 'Detected code inspection/review/debug style request.',
        };
    }

    // If many files are open and the user asks generally about the project, lean towards inspect
    if (Array.isArray(openFiles) && openFiles.length > 3) {
        if (/projekt|project|codebase|code-basis|ganze app|ganzen code/.test(text)) {
            return {
                intent: 'inspect',
                reason: 'Multiple open files and project-level wording – treating as inspect.',
            };
        }
    }

    // Default: plain chat/explanation
    return {
        intent: 'chat',
        reason: 'No strong build or inspect signals detected – treating as explanation/chat.',
    };
}

aiRouter.post('/agent/risk-decision', async (req, res) => {
    try {
        const { requestId, allow } = req.body || {};

        if (typeof requestId !== 'string' || !requestId.trim()) {
            return res.status(400).json({ message: 'requestId is required' });
        }

        const applied = resolveRiskDecision(requestId, !!allow);
        if (!applied) {
            return res.status(404).json({ message: 'Risk prompt not found or already resolved' });
        }

        return res.json({ ok: true });
    } catch (error: any) {
        console.error('[Agent Risk Decision] Error:', error?.message || error);
        return res.status(500).json({ message: 'Failed to record risk decision' });
    }
});

aiRouter.post('/chat', async (req, res) => {
    let message: string | undefined;
    let outputChars = 0;

    try {
        // 🔴 CRITICAL: Input validation for security
        const input = validateInput(chatRequestSchema, req.body);
        message = input.message;
        const { history, modelPreset } = input;

        const startedAt = Date.now();

        const preset = normalizeModelPreset(modelPreset);

        // Internal thinking stream over WebSocket (from same model) in background
        const agentWS = (global as any).agentWS as { sendThinking?: (thought: ThoughtStep) => void } | undefined;

        if (agentWS?.sendThinking && typeof message === 'string' && message.trim().length > 0) {
            (async () => {
                try {
                    const historySnippet = Array.isArray(history)
                        ? history.slice(-4).map((m: any) => {
                            const role = m.role === 'model' ? 'assistant' : m.role;
                            return `${role}: ${typeof m.parts === 'string' ? m.parts : ''}`;
                        }).join('\n')
                        : '';

                    const thinkingPrompt = `You are the internal reasoning process of the MIMI IDE agent.\n\n` +
                        `User message:\n"""${message}"""\n\n` +
                        (historySnippet
                            ? `Recent conversation:\n${historySnippet}\n\n`
                            : '') +
                        `Without answering the user directly, write 1–3 short paragraphs in full sentences that explain what you will analyze or do next. ` +
                        `Focus on concrete actions (inspect files, search the codebase, plan changes, run tools) and keep the text concise but natural.`;

                    const thinkingText = await generateCompletion('MIMI internal thinking', thinkingPrompt, {
                        modelPreset: preset,
                    });

                    const thought: ThoughtStep = {
                        id: crypto.randomUUID(),
                        type: 'thinking',
                        content: thinkingText,
                        timestamp: Date.now(),
                        depth: 0,
                        status: 'complete'
                    };

                    agentWS.sendThinking?.(thought);
                } catch (err) {
                    console.error('[AI Chat] Failed to generate thinking stream:', err);
                }
            })();
        }

        // Stream response from the model immediately
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        try {
            const { streamChat } = await import('../ai/utils/ollama');

            // Convert history to format expected by streamChat
            const chatHistory = (history || []).map((msg: any) => ({
                role: msg.role === 'model' ? 'assistant' : msg.role,
                content: msg.parts
            }));

            let temperature: number | undefined;
            if (preset === 'fast') temperature = 0.4;
            else if (preset === 'balanced') temperature = 0.6;
            else if (preset === 'deep') temperature = 0.8;

            const stream = streamChat(message, chatHistory, { temperature, modelPreset: preset });

            for await (const chunk of stream) {
                const textChunk =
                    typeof chunk === 'string'
                        ? chunk
                        : Buffer.isBuffer(chunk)
                            ? chunk.toString('utf8')
                            : String(chunk ?? '');
                outputChars += textChunk.length;
                res.write(textChunk);
            }

            res.end();

        } catch (aiError: any) {
            console.error('AI Generation error:', aiError);
            res.write("I'm sorry, I'm having trouble connecting to my brain right now.");
            res.end();
        }

    } catch (error: any) {
        console.error('Chat endpoint error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        try {
            const userId = (req as any).session?.userId as string | undefined;
            const projectId = (req as any).session?.activeProjectId as string | undefined;

            if (userId && projectId) {
                const tokensInput = String(message || '').length;
                const tokensOutput = outputChars;

                await pool.query(
                    'INSERT INTO usage_logs (user_id, project_id, action_type, model_used, tokens_input, tokens_output) VALUES ($1, $2, $3, $4, $5, $6)',
                    [
                        userId,
                        projectId,
                        'ai_chat',
                        null,
                        tokensInput,
                        tokensOutput
                    ]
                );
            }
        } catch (logError) {
            console.error('[UsageLogs] Failed to log chat usage:', logError);
        }
    }
});

aiRouter.post('/agent-chat', async (req, res) => {
    try {
        // 🔴 CRITICAL: Input validation for security
        const { message, history, mode, modelPreset, openFiles } = validateInput(agentChatRequestSchema, req.body);
        const preset = normalizeModelPreset(modelPreset);

        const streamParam = (req.query as any)?.stream;
        const wantStream = typeof streamParam === 'string'
            && ["1", "true", "yes"].includes(streamParam.toLowerCase());


        const agentWS = (global as any).agentWS as { sendThinking?: (thought: ThoughtStep) => void } | undefined;

        const userId = (req as any).session?.userId as string | undefined;
        const projectId = (req as any).session?.activeProjectId as string | undefined;

        let workspaceRoot: string;
        if (userId && projectId) {
            // Mirror WORKSPACES_ROOT logic from routes.ts
            const WORKSPACES_ROOT = '/home/mimitechai/workspaces';
            workspaceRoot = path.join(WORKSPACES_ROOT, `user-${userId}`, projectId);
        } else {
            workspaceRoot = process.cwd();
        }

        const brain = new AgentBrain(workspaceRoot, (thought: ThoughtStep) => {
            agentWS?.sendThinking?.(thought);
        }, preset);

        const historyMessages: AgentMessage[] = Array.isArray(history)
            ? history.map((m: any) => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: typeof m.parts === 'string' ? m.parts : '',
            }))
            : [];

        const rawMode = typeof mode === 'string' ? mode.toLowerCase() : 'chat';
        const intent = classifyIntent(message, rawMode, openFiles);
        const effectiveModeString = intent.intent === 'build' ? 'build' : rawMode;
        const agentMode: AgentMode = effectiveModeString === 'build' ? 'BUILD' : 'CHAT';

        const metaLines: string[] = [];
        if (agentMode === 'BUILD') {
            metaLines.push('Mode: BUILD. You may plan multi-file changes and project-wide refactors when appropriate.');
        } else {
            metaLines.push('Mode: CHAT. Prefer explanations and targeted edits; only create large project plans when explicitly requested.');
        }
        metaLines.push(`Detected intent: ${intent.intent.toUpperCase()} – ${intent.reason}`);

        if (Array.isArray(openFiles) && openFiles.length > 0) {
            const fileList = openFiles
                .filter((v: unknown) => typeof v === 'string')
                .slice(0, 20)
                .join(', ');
            if (fileList) {
                metaLines.push(`Open files for additional context: ${fileList}`);
            }
        }

        const augmentedMessage = metaLines.length > 0
            ? `${metaLines.join('\n')}

${message}`
            : message;

        if (wantStream) {
            // Fire AgentBrain in the background so that thinking/tool events still go over WebSocket
            (async () => {
                try {
                    await brain.processMessage(augmentedMessage, historyMessages, agentMode);
                } catch (err: any) {
                    console.error('[AI Agent Chat][stream] Brain error:', err?.message || err);
                }
            })();

            try {
                const { streamChat } = await import('../ai/utils/ollama');

                // Build chat history for the streaming call
                const chatHistory = historyMessages.map((m: AgentMessage) => ({
                    role: m.role,
                    content: m.content,
                }));

                const systemContext = [
                    `You are MIMI, a senior software engineer working inside the Mimiverse IDE.`,
                    `Context:\n- Workspace root: ${workspaceRoot}\n- You run inside an AI-assisted IDE that can read and edit files, search the codebase, run tests, check types, use Git, call external MCP tools, and execute project plans.`,
                    `Modes:\n- In CHAT mode, focus on explaining, reviewing, debugging, and proposing small, safe changes.\n- In BUILD mode, focus on designing or refining multi-step plans. The IDE will run tools like project planning, execution, and tests – you should not invent raw shell commands for the user.`,
                    `Hard constraints:\n- Never say you cannot see project files. If you need more context, ask the user to open or mention specific files via @file: or @codebase:.\n- Prefer small, reviewable changes over huge rewrites.\n- When suggesting edits, always specify file + location + what to change, instead of dumping full files.\n- Do not propose destructive commands (rm -rf, mass deletes, dropping databases, etc.).`,
                    `Answer style:\n- Be concrete and code-focused.\n- Use short sections and bullet points where helpful.\n- State your assumptions explicitly if your answer depends on them.\n- Optionally suggest how the IDE's agents (plan-project, execute-project, tests, auto-fix) could be used next, but describe them as suggestions, not as already executed actions.`,
                ];

                if (metaLines.length > 0) {
                    systemContext.push(metaLines.join('\n'));
                }

                const fullPrompt = `${systemContext.join('\n\n')}\n\nCurrent user message:\n${message}`;

                let temperature: number | undefined;
                if (preset === 'fast') temperature = 0.4;
                else if (preset === 'balanced') temperature = 0.6;
                else if (preset === 'deep') temperature = 0.8;

                res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
                res.setHeader('Transfer-Encoding', 'chunked');

                const stream = streamChat(fullPrompt, chatHistory as any, { temperature, modelPreset: preset });

                for await (const chunk of stream) {
                    const textChunk =
                        typeof chunk === 'string'
                            ? chunk
                            : Buffer.isBuffer(chunk)
                                ? chunk.toString('utf8')
                                : String(chunk ?? '');

                    if (res.writableEnded) {
                        break;
                    }

                    if (!textChunk) {
                        continue;
                    }

                    const payload = {
                        type: 'contentDelta' as const,
                        delta: textChunk,
                    };

                    res.write(JSON.stringify(payload) + '\n');
                }

                if (!res.writableEnded) {
                    res.write(JSON.stringify({ type: 'final' }) + '\n');
                    res.end();
                }
            } catch (streamError: any) {
                console.error('[AI Agent Chat] Streaming error:', streamError?.message || streamError);
                if (!res.headersSent) {
                    res.status(500).send('Agent chat streaming failed');
                } else if (!res.writableEnded) {
                    res.end('\n[Agent chat streaming failed]');
                }
            }

            return;
        }

        // Default: non-streaming JSON response via AgentBrain
        const agentResponse = await brain.processMessage(augmentedMessage, historyMessages, agentMode);

        return res.json({
            content: agentResponse.message,
            tool: agentResponse.tool,
            plan: agentResponse.plan,
            thinking: agentResponse.thinking,
        });
    } catch (error: any) {
        console.error('[AI Agent Chat] Error:', error?.message || error);
        return res.status(500).json({ message: error?.message || 'Agent chat failed' });
    }
});

// Auto-fix endpoint (used by Terminal)
aiRouter.post('/auto-fix', async (req, res) => {
    try {
        // 🔴 CRITICAL: Input validation for security
        const { command, output, exitCode } = validateInput(autoFixRequestSchema, req.body);
        const prompt = `The command "${command}" failed with exit code ${exitCode}. Output:\n${output}\n\nSuggest a fix.`;
        const response = await generateCompletion("You are a CLI expert.", prompt);
        res.json({ suggestion: response });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});
