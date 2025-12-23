import { generateCompletion, streamChat, generateEmbedding } from './utils/ollama';
import { ContextManager } from "./core/context";
import { OutlineParser } from './outline-parser';
import { TerminalTool } from './tools/terminal';
import { FileTool } from './tools/file-tool';
import { GitTool } from './tools/git';
import { LintTool } from './tools/lint-tool';
import { BrowserTool } from './tools/browser-tool';
import { MultiFileAgent } from "./strategies/multi-file-agent";
import { Orchestrator } from "./orchestrator";
import { searchCodebase } from '../codebase/indexer';
import { AgentWebSocket } from '../websocket';
import { Executor } from "./executor";
import { MentionsParser } from "./mentions";
import { ThoughtStep, AgentPlan, ExecutionPhase, ExecutionTask } from "./types";
import { getAllTools as getMcpTools } from "./mcp/mcp-registry";
import { invokeMcpTool } from "./mcp/mcp-client";
import { logger } from "../utils/logger";
import { type ModelPreset, DEFAULT_MODEL_PRESET } from "./model-presets";
import { RunPhase } from "@shared/run-phases";
import crypto from "crypto";

/**
 * Tool definitions for the agent
 */
interface Tool {
    name: string;
    description: string;
    parameters?: Record<string, string>;
}

const AVAILABLE_TOOLS: Tool[] = [
    {
        name: "chat",
        description: "Have a conversation or answer questions. Use this for general queries, explanations, or when no action is needed."
    },
    {
        name: "edit_file",
        description: "Edit one or more files. Use when user wants to modify, refactor, or update existing code."
    },
    {
        name: "create_project",
        description: "Create a complete project from scratch. Use when user wants to build a new app, website, or component."
    },
    {
        name: "execute_project",
        description: "Execute the current project plan. Use when the user confirms they want to build, run, or execute the plan."
    },
    {
        name: "search_codebase",
        description: "Search the codebase semantically. Use when you need to find relevant files or understand existing code."
    },
    {
        name: "read_file",
        description: "Read the contents of a specific file. Use when you need to see file contents before editing."
    },
    {
        name: "check_types",
        description: "Run a TypeScript project check (tsc) or related script to surface type errors before or after edits."
    },
    {
        name: "browse_web",
        description: "Fetch external HTTP/HTTPS pages (docs, APIs) and summarize relevant content for the current task."
    }
];

function getAvailableTools(): Tool[] {
    const mcpTools = getMcpTools()
        .filter((tool) => tool.enabled)
        .map<Tool>((tool) => ({
            name: tool.id,
            description: tool.description || `MCP tool from server ${tool.serverId}`
        }));

    return [
        ...AVAILABLE_TOOLS,
        ...mcpTools
    ];
}

export interface AgentMessage {
    role: "user" | "assistant";
    content: string;
    tool?: string;
    toolResult?: any;
}

export interface AgentResponse {
    message: string;
    tool?: string;
    toolInput?: any;
    thinking?: string;
    plan?: AgentPlan;
}

export type AgentMode = "CHAT" | "BUILD" | "ARCHITECT" | "DEBUG";

/**
 * Intelligent Agent Brain using ReAct (Reasoning + Acting) pattern
 * This is the core that decides what to do based on user input
 * NOW WITH TRANSPARENT THINKING!
 */
export class AgentBrain {
    private contextManager: ContextManager;
    private fileAgent: MultiFileAgent;
    private orchestrator: Orchestrator;
    private executor: Executor;
    private mentionsParser: MentionsParser;
    private conversationHistory: AgentMessage[] = [];
    private thoughtCallback?: (thought: ThoughtStep) => void;
    private thoughtStream: ThoughtStep[] = [];
    private modelPreset: ModelPreset;
    private currentPhase: RunPhase | null = null;
    private workspaceIntelEmitted = false;

    constructor(
        private workspaceRoot: string = process.cwd(),
        thoughtCallback?: (thought: ThoughtStep) => void,
        modelPreset: ModelPreset = DEFAULT_MODEL_PRESET,
    ) {
        this.contextManager = new ContextManager(workspaceRoot);
        this.fileAgent = new MultiFileAgent();
        this.orchestrator = new Orchestrator(workspaceRoot);
        this.executor = new Executor(workspaceRoot);
        this.mentionsParser = new MentionsParser(workspaceRoot);
        this.thoughtCallback = thoughtCallback;
        this.modelPreset = modelPreset;
    }

    /**
     * Emit a thought step for transparent thinking visualization
     */
    private emitThought(partial: Partial<ThoughtStep>): ThoughtStep {
        const thought: ThoughtStep = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            status: 'active',
            depth: 0,
            type: partial.type || 'thinking',
            content: partial.content || '',
            ...partial
        };

        this.thoughtStream.push(thought);
        if (this.thoughtCallback) {
            this.thoughtCallback(thought);
        }
        return thought;
    }

    /**
     * Mark a thought as complete
     */
    private completeThought(thoughtId: string, status: 'complete' | 'failed' = 'complete') {
        const thought = this.thoughtStream.find(t => t.id === thoughtId);
        if (thought) {
            thought.status = status;
            if (this.thoughtCallback) {
                this.thoughtCallback(thought);
            }
        }
    }

    private setPhase(phase: RunPhase, reason?: string) {
        this.currentPhase = phase;
        try {
            const agentWS = (global as any).agentWS as AgentWebSocket | undefined;
            if (agentWS && typeof (agentWS as any).sendStatus === 'function') {
                (agentWS as any).sendStatus({
                    type: 'phase_change',
                    phase,
                    reason,
                    source: 'agent_chat',
                    at: Date.now(),
                });
            }
        } catch (error: any) {
            logger.warn("Failed to broadcast phase_change event", {
                error: error?.message || String(error),
                phase,
            });
        }
    }

    private async emitWorkspaceIntel() {
        if (this.workspaceIntelEmitted) {
            return;
        }
        this.workspaceIntelEmitted = true;

        this.setPhase('scanning_project', 'Inspecting workspace structure');

        try {
            const fs = await import('fs/promises');
            const path = await import('path');

            const root = this.workspaceRoot;

            let hasFiles = false;
            try {
                const entries = await fs.readdir(root, { withFileTypes: true } as any);
                hasFiles = entries.some((entry: any) => !entry.name.startsWith('.'));
            } catch {
                hasFiles = false;
            }

            let hasPackageJson = false;
            let hasTsconfig = false;
            let framework: 'nextjs' | 'vite' | 'cra' | 'node' | 'unknown' = 'unknown';

            const pkgPath = path.join(root, 'package.json');
            let pkg: any | null = null;
            try {
                const pkgStat = await fs.stat(pkgPath);
                if (pkgStat.isFile()) {
                    hasPackageJson = true;
                    const raw = await fs.readFile(pkgPath, 'utf-8');
                    pkg = JSON.parse(raw);
                }
            } catch {
                hasPackageJson = false;
            }

            const tsconfigPath = path.join(root, 'tsconfig.json');
            try {
                const tsStat = await fs.stat(tsconfigPath);
                if (tsStat.isFile()) {
                    hasTsconfig = true;
                }
            } catch {
                hasTsconfig = false;
            }

            if (pkg && typeof pkg === 'object') {
                const scriptsObj = typeof (pkg as any).scripts === 'object' && (pkg as any).scripts
                    ? (pkg as any).scripts
                    : {};

                const deps = {
                    ...(pkg as any).dependencies || {},
                    ...(pkg as any).devDependencies || {},
                } as Record<string, unknown>;
                const depNames = Object.keys(deps);
                const hasDep = (name: string) => depNames.includes(name);

                if (hasDep('next')) {
                    framework = 'nextjs';
                } else if (hasDep('vite') || depNames.some(n => n.startsWith('@vite/'))) {
                    framework = 'vite';
                } else if (hasDep('react-scripts')) {
                    framework = 'cra';
                } else if (hasDep('express')) {
                    framework = 'node';
                }
            }

            const agentWS = (global as any).agentWS as AgentWebSocket | undefined;
            if (agentWS && typeof (agentWS as any).sendStatus === 'function') {
                const descriptionParts: string[] = [];
                descriptionParts.push(hasFiles ? 'Workspace has files.' : 'Workspace appears empty.');
                if (hasPackageJson) {
                    descriptionParts.push('Found package.json.');
                    if (framework !== 'unknown') {
                        descriptionParts.push(`Detected framework: ${framework}.`);
                    }
                } else {
                    descriptionParts.push('No package.json found.');
                }
                if (hasTsconfig) {
                    descriptionParts.push('TypeScript configuration detected.');
                }

                (agentWS as any).sendStatus({
                    type: 'workspace_intel',
                    description: descriptionParts.join(' '),
                    source: 'agent_chat',
                    at: Date.now(),
                });
            }
        } catch (error: any) {
            logger.warn('Failed to collect workspace intel', {
                error: error?.message || String(error),
            });
        }
    }

    /**
     * Main entry point: process user message with TRANSPARENT THINKING
     * context-aware RAG integration
     */
    async processMessage(
        userMessage: string,
        history: AgentMessage[] = [],
        mode: AgentMode = "CHAT",
        runId?: string
    ): Promise<AgentResponse> {
        // 1. Get Context (RAG Enhanced)
        // If in BUILD/ARCHITECT mode, use RAG. If in CHAT, use lightweight context.
        const path = await import('path'); // Ensure path is imported for basename
        const projectId = path.basename(this.workspaceRoot);
        let context;

        if (mode === "BUILD" || mode === "ARCHITECT" || mode === "DEBUG") {
            // RAG Search for relevant code
            context = await this.contextManager.buildContextWithRAG(userMessage, projectId);
            logger.info(`[AgentBrain] 🧠 RAG Context loaded: ${context.tokenStats?.files} tokens from ${context.relevantFiles.length} files`);
        } else {
            // Standard context for chat
            context = await this.contextManager.buildContext("user", projectId, "chat");
        }

        // 2. Decide Action (Router)
        const decision = await this.routeToTool(userMessage, mode);

        this.conversationHistory = history;
        this.thoughtStream = []; // Reset thoughts for new message
        this.setPhase('analyzing');

        // STEP 1: Analyzing
        const analyzeThought = this.emitThought({
            type: 'analyzing',
            content: 'Understanding your request and determining the best approach...',
            depth: 0
        });

        // Process @mentions first to enrich context
        const processedMessage = await this.mentionsParser.processMessage(userMessage);

        this.completeThought(analyzeThought.id);

        await this.emitWorkspaceIntel();

        // STEP 2: Planning
        const planThought = this.emitThought({
            type: 'planning',
            content: 'Deciding which tool and strategy to use...',
            depth: 0
        });

        this.setPhase('planning');

        // Analyze intent and route to appropriate tool
        const routing = await this.routeToTool(processedMessage, mode);

        this.emitThought({
            type: 'thinking',
            content: `Selected tool: ${routing.tool} - ${routing.reasoning}`,
            depth: 1,
            status: 'complete'
        });

        this.completeThought(planThought.id);

        // STEP 3: Executing
        const executeThought = this.emitThought({
            type: 'executing',
            content: `Executing ${routing.tool}...`,
            depth: 0
        });

        // Execute the tool
        if (routing.tool === "chat") {
            // Use the base model to generate a real answer as an IDE-integrated assistant.
            // We treat the routing "thinking" as internal rationale, but the visible answer
            // should come from a dedicated completion call that knows about the IDE context.

            // Build a compact text context from recent conversation and the processed message
            const historySnippet = this.conversationHistory
                .slice(-6)
                .map(m => `${m.role}: ${m.content}`)
                .join("\n");

            const contextBlocks: string[] = [];
            contextBlocks.push(
                `You are MIMI, an IDE-integrated coding assistant working inside a project at workspace root: ${this.workspaceRoot}.`,
            );
            contextBlocks.push(
                "You have access to tools in the runtime (reading and editing files, searching the codebase, running tests, checking types, using Git and browser tools, and calling external MCP tools). The UI will trigger these tools for you based on your decisions.",
            );
            contextBlocks.push(
                "Never tell the user that you cannot see or access project files. Instead, if you need more context, politely ask them to open specific files in the editor or reference them via @file: or @codebase: mentions.",
            );
            if (historySnippet) {
                contextBlocks.push(`Recent conversation:\n${historySnippet}`);
            }
            contextBlocks.push(
                `Current user message (with resolved mentions/context appended):\n${processedMessage}`,
            );

            const completionContext = contextBlocks.join("\n\n");

            const completionPrompt =
                "You are MIMI, a senior software engineer working inside the Mimiverse IDE.\n\n" +
                "Context:\n" +
                `- Workspace root: ${this.workspaceRoot}\n` +
                "- You run inside an AI-assisted IDE that can read and edit files, search the codebase,\n" +
                "  run tests, check types, use Git, call external MCP tools, and execute project plans.\n\n" +
                "Modes:\n" +
                "- In CHAT mode, focus on explaining, reviewing, debugging, and proposing small, safe changes.\n" +
                "- In BUILD mode, focus on designing or refining multi-step plans. The IDE will run tools like\n" +
                "  project planning, execution, and tests – you should not invent raw shell commands for the user.\n\n" +
                "Hard constraints:\n" +
                "- Never say you cannot see project files. If you need more context, ask the user to open\n" +
                "  or mention specific files via @file: or @codebase:.\n" +
                "- Prefer small, reviewable changes over huge rewrites.\n" +
                "- When suggesting edits, always specify file + location + what to change, instead of dumping full files.\n" +
                "- Do not propose destructive commands (rm -rf, mass deletes, dropping databases, etc.).\n\n" +
                "Answer style:\n" +
                "- Be concrete and code-focused.\n" +
                "- Use short sections and bullet points where helpful.\n" +
                "- State your assumptions explicitly if your answer depends on them.\n" +
                "- Optionally suggest how the IDE's agents (plan-project, execute-project, tests, auto-fix)\n" +
                "  could be used next, but describe them as suggestions, not as already executed actions.\n\n" +
                "Before finalizing your answer, perform a quick self-check (mentally):\n" +
                "- Does this respect the current mode and safety constraints?\n" +
                "- Are the suggested changes small enough to be reviewed?\n" +
                "- Are any obvious failure modes or missing checks worth mentioning?";

            const answer = await generateCompletion(completionPrompt, completionContext, {
                modelPreset: this.modelPreset,
            });

            this.completeThought(executeThought.id);
            this.setPhase('done');
            this.emitThought({
                type: 'reflecting',
                content: 'Generated conversational IDE response using chat tool',
                depth: 0,
                status: 'complete'
            });

            return {
                message: answer,
                thinking: routing.thinking
            };
        } else if (routing.tool === "create_project") {
            const plan = await this.orchestrator.planProject(userMessage);

            this.completeThought(executeThought.id);
            this.emitThought({
                type: 'reflecting',
                content: `Created project plan with ${plan.phases.length} phases`,
                depth: 0,
                status: 'complete'
            });

            return {
                message: `I've created a project plan: ${plan.goal}`,
                tool: "create_project",
                toolInput: plan,
                thinking: routing.thinking,
                plan: this.convertToAgentPlan(plan)
            };
        } else if (routing.tool === "execute_project") {
            this.setPhase('editing_files');
            this.completeThought(executeThought.id);

            return {
                message: "Starting project execution...",
                tool: "execute_project",
                toolInput: {},
                thinking: routing.thinking
            };
        } else if (routing.tool === "edit_file") {
            this.setPhase('planning', 'Preparing multi-file edit plan');
            const path = await import("path");
            const plan = await this.fileAgent.planMultiFileEdit(userMessage, this.workspaceRoot, path.basename(this.workspaceRoot));

            this.completeThought(executeThought.id);
            this.emitThought({
                type: 'reflecting',
                content: `Prepared changes for ${plan.files.length} file(s)`,
                depth: 0,
                status: 'complete'
            });

            return {
                message: `I've prepared changes to ${plan.files.length} file(s)`,
                tool: "edit_file",
                toolInput: plan,
                thinking: routing.thinking
            };
        } else if (routing.tool === "search_codebase") {
            this.setPhase('scanning_project');
            const { searchCodebase } = await import("../codebase/indexer");
            const path = await import("path"); // Import path module
            // 2. Search codebase for context
            const projectId = path.basename(this.workspaceRoot); // Use workspaceRoot for projectId
            const codeContext = await searchCodebase(userMessage, 3, projectId);
            const summary = codeContext.map(r => `- ${r.path} (${r.similarity.toFixed(2)})`).join("\n");

            this.completeThought(executeThought.id);
            this.emitThought({
                type: 'reflecting',
                content: `Found ${codeContext.length} relevant files`,
                depth: 0,
                status: 'complete'
            });

            return {
                message: `Found relevant files:\n${summary}`,
                tool: "search_codebase",
                toolInput: codeContext,
                thinking: routing.thinking
            };
        } else if (routing.tool === "read_file") {
            // Extract file path from user message
            const pathMatch = userMessage.match(/(?:@file:|file:)?\s*([^\s]+\.[a-z]+)/i);
            if (pathMatch) {
                const filePath = pathMatch[1];
                const fs = await import("fs/promises");
                const path = await import("path");

                // Resolve path relative to workspace root
                const fullPath = filePath.startsWith('/')
                    ? filePath
                    : path.join(this.workspaceRoot, filePath);

                try {
                    const content = await fs.readFile(fullPath, "utf-8");

                    this.completeThought(executeThought.id);
                    this.setPhase('done');
                    this.emitThought({
                        type: 'reflecting',
                        content: `Successfully read ${filePath}`,
                        depth: 0,
                        status: 'complete'
                    });

                    return {
                        message: `Here's the content of ${filePath}:\n\`\`\`\n${content.slice(0, 5000)}\n${content.length > 5000 ? '...(truncated)' : ''}\n\`\`\``,
                        tool: "read_file",
                        toolInput: { path: filePath, content },
                        thinking: routing.thinking
                    };
                } catch (error: any) {
                    this.completeThought(executeThought.id, 'failed');
                    this.setPhase('error', `Failed to read file: ${error?.message || String(error)}`);
                    this.emitThought({
                        type: 'error',
                        content: `Failed to read ${filePath}: ${error.message}`,
                        depth: 0,
                        status: 'failed'
                    });

                    return {
                        message: `Error reading file: ${error.message}`,
                        thinking: routing.thinking
                    };
                }
            }
        } else if (routing.tool === "check_types") {
            this.setPhase('testing');
            const lintTool = new LintTool(this.workspaceRoot);
            const result = await lintTool.runTypeCheck();

            this.completeThought(executeThought.id, result.success ? 'complete' : 'failed');
            this.setPhase(result.success ? 'done' : 'error', result.success ? undefined : 'Type check reported problems');
            this.emitThought({
                type: result.success ? 'reflecting' : 'error',
                content: result.success
                    ? `Type check command "${result.command}" completed successfully.`
                    : `Type check command "${result.command}" reported problems.`,
                depth: 0,
                status: result.success ? 'complete' : 'failed'
            });

            let outputSummary = "";
            if (result.output && result.output.trim().length > 0) {
                outputSummary = `\n\nFirst 800 characters of output:\n\`\`\`\n${result.output.slice(0, 800)}\n\`\`\``;
            }

            const baseMessage = result.success
                ? `Type check completed successfully using "${result.command}".`
                : `Type check finished with issues using "${result.command}".`;

            return {
                message: `${baseMessage}${outputSummary}`,
                tool: "check_types",
                toolInput: { command: result.command, success: result.success },
                thinking: routing.thinking
            };
        } else if (routing.tool === "browse_web") {
            const urlMatch = userMessage.match(/https?:\/\/\S+/i);
            if (!urlMatch) {
                this.completeThought(executeThought.id, 'failed');
                this.emitThought({
                    type: 'error',
                    content: 'No valid http/https URL found in the request to browse.',
                    depth: 0,
                    status: 'failed'
                });

                return {
                    message: "I could not find a valid http/https URL in your request to browse.",
                    thinking: routing.thinking
                };
            }

            const browser = new BrowserTool();

            try {
                const result = await browser.fetch(urlMatch[0]);

                this.completeThought(executeThought.id);
                this.setPhase('done');
                this.emitThought({
                    type: 'reflecting',
                    content: `Fetched ${result.url} with status ${result.status}.`,
                    depth: 0,
                    status: 'complete'
                });

                let summary: string | null = null;
                try {
                    const summaryPrompt =
                        `You are an IDE assistant. Summarize the following web content in 3–6 concise sentences, focusing on information relevant for a developer.\n\n` +
                        `URL: ${result.url}\nStatus: ${result.status}\nContent snippet (truncated):\n"""${result.contentSnippet.slice(0, 4000)}"""`;
                    summary = await generateCompletion('Summarize web content', summaryPrompt, {
                        modelPreset: this.modelPreset,
                    });
                } catch {
                    summary = null;
                }

                const baseText = `I fetched ${result.url} (status ${result.status}).`;
                const bodyText = summary
                    ? `\n\nSummary:\n${summary}`
                    : `\n\nFirst part of the content:\n\`\`\`\n${result.contentSnippet.slice(0, 800)}\n\`\`\``;

                return {
                    message: `${baseText}${bodyText}`,
                    tool: "browse_web",
                    toolInput: { url: result.url, status: result.status },
                    thinking: routing.thinking
                };
            } catch (error: any) {
                this.completeThought(executeThought.id, 'failed');
                this.setPhase('error', `Failed to fetch URL: ${error?.message || String(error)}`);
                this.emitThought({
                    type: 'error',
                    content: `Failed to fetch URL: ${error?.message || String(error)}`,
                    depth: 0,
                    status: 'failed'
                });

                return {
                    message: `Error while fetching ${urlMatch[0]}: ${error?.message || String(error)}`,
                    thinking: routing.thinking
                };
            }
        } else if (routing.tool) {
            try {
                const result = await invokeMcpTool(routing.tool, {
                    message: userMessage,
                    history: this.conversationHistory
                });

                this.completeThought(executeThought.id);
                this.setPhase('done');
                this.emitThought({
                    type: 'reflecting',
                    content: `Executed MCP tool ${routing.tool}`,
                    depth: 0,
                    status: 'complete'
                });

                return {
                    message: typeof result === 'string' ? result : JSON.stringify(result),
                    tool: routing.tool,
                    toolInput: { result },
                    thinking: routing.thinking
                };
            } catch (error: any) {
                this.completeThought(executeThought.id, 'failed');
                this.setPhase('error', `Failed to execute MCP tool ${routing.tool}: ${error?.message || String(error)}`);
                this.emitThought({
                    type: 'error',
                    content: `Failed to execute MCP tool ${routing.tool}: ${error?.message || String(error)}`,
                    depth: 0,
                    status: 'failed'
                });

                return {
                    message: `Error executing MCP tool ${routing.tool}: ${error?.message || String(error)}`,
                    thinking: routing.thinking
                };
            }
        }

        this.completeThought(executeThought.id);
        this.setPhase('error', 'Unable to determine appropriate action');
        this.emitThought({
            type: 'reflecting',
            content: 'Unable to determine appropriate action',
            depth: 0,
            status: 'complete'
        });

        return {
            message: "I'm not sure how to help with that.",
            thinking: routing.thinking
        };
    }

    /**
     * Convert orchestrator plan to AgentPlan format
     */
    private convertToAgentPlan(orchestratorPlan: any): AgentPlan {
        return {
            id: crypto.randomUUID(),
            goal: orchestratorPlan.goal,
            phases: orchestratorPlan.phases.map((p: any) => ({
                id: crypto.randomUUID(),
                name: p.name,
                status: 'pending',
                tasks: p.tasks.map((t: any) => ({
                    id: crypto.randomUUID(),
                    description: t.description,
                    status: 'pending'
                }))
            })),
            createdAt: Date.now(),
            status: 'draft'
        };
    }

    /**
     * Heuristic to detect broad, codebase-wide changes (refactors, "everywhere", etc.).
     * Used to prefer search_codebase/read_file before edit_file in BUILD mode.
     */
    private needsBroadCodebaseChange(userMessage: string): boolean {
        const text = userMessage.toLowerCase();

        const broadKeywords = [
            'überall',
            'in allen dateien',
            'in all files',
            'across the codebase',
            'global ',
            'globaler ',
            'refactor',
            'refactoring',
            'rename ',
            'renaming',
        ];

        if (broadKeywords.some(keyword => text.includes(keyword))) {
            return true;
        }

        const patterns = [
            /refactor .* across/i,
            /rename .* across/i,
            /apply .* everywhere/i,
            /update .* in all/i,
        ];

        return patterns.some(re => re.test(userMessage));
    }

    /**
     * Intelligent routing: decide which tool to use based on user intent
     */
    private async routeToTool(
        userMessage: string,
        mode: AgentMode = "CHAT",
    ): Promise<{ tool: string; reasoning: string; thinking: string }> {
        const context = this.conversationHistory.map(m => `${m.role}: ${m.content}`).join("\n");
        const tools = getAvailableTools();
        const toolNames = new Set(tools.map(t => t.name));

        logger.debug("Routing user message", {
            messageSnippet: userMessage.slice(0, 200),
            historyLength: this.conversationHistory.length,
            availableTools: Array.from(toolNames),
        });

        const prompt = `You are MIMI, an AI coding assistant embedded in the Mimiverse IDE.

You are currently operating in MODE = "${mode}".

=== Modes ===
- CHAT mode:
  - Purpose: explain, review, debug, and suggest small, focused changes.
  - You MUST NOT select tools that directly modify files or execute multi-step build plans
    ("create_project", "execute_project", "edit_file", "check_types") in this mode.
  - Prefer:
    - "chat" when a natural language answer is enough.
    - "search_codebase" or "read_file" when you need more context from the existing code.
    - "browse_web" only if the user clearly refers to external docs or URLs.

- BUILD mode:
  - Purpose: design and execute larger, multi-step changes.
  - You MAY select:
    - "create_project" to design a multi-phase project plan.
    - "edit_file" for concrete multi-file changes.
    - "execute_project" to run an existing plan (once the user has approved it in the IDE UI).
    - "check_types" and related tools to validate changes.

Your job in this routing step is ONLY to choose exactly ONE tool from the list below.
You do not execute the tool here; the IDE will handle execution.

Rules:
- You MUST pick one of these tools: ${Array.from(toolNames).join(", ")}.
- If no external action is needed and a normal answer is enough, pick "chat".
- NEVER invent new tool names.
- Prefer "search_codebase" when you need to inspect or understand existing code.
- Prefer "edit_file" only when the user clearly wants code/files changed AND MODE is "BUILD".
- For broad refactors or "everywhere/in all files" requests in BUILD mode, first select "search_codebase" (and then "read_file"), and only in later steps "edit_file".
- Prefer "create_project" / "execute_project" only for larger, multi-step project work AND MODE is "BUILD".
- Prefer "read_file" when the user references a specific file they want to inspect.
- MCP tools (like "serverId:toolId") are allowed only if they clearly match the request.

Available tools:
${tools.map(t => `- ${t.name}: ${t.description}`).join("\n")}

Recent conversation:
${context}

User message:
"""${userMessage}"""

Think step-by-step about:
1. What is the user asking for?
2. In the current MODE, which categories of tools are allowed?
3. Does this require reading, searching, editing, planning, or external browsing?
4. Which single tool is the best fit under these constraints?
5. Briefly reflect on whether similar tool choices earlier in this conversation worked well or caused problems.

Respond with ONLY a valid JSON object, with no extra text:
{
  "thinking": "1–3 sentences explaining your reasoning and short self-reflection on similar past tool choices in this conversation.",
  "tool": "one of: ${Array.from(toolNames).join(", ")}",
  "reasoning": "Short explanation why this tool is appropriate in the current MODE"
}`;

        let response: string;

        try {
            response = await generateCompletion("Route to tool", prompt, {
                modelPreset: this.modelPreset,
            });
        } catch (error: any) {
            logger.error("Failed to get routing decision from model", {
                error: error?.message || String(error)
            });

            return {
                tool: "chat",
                reasoning: "Routing model failed, defaulting to chat",
                thinking: ""
            };
        }

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found");
            const parsed = JSON.parse(jsonMatch[0]);

            const pickedTool = typeof parsed.tool === "string" ? parsed.tool : "chat";
            let safeTool = toolNames.has(pickedTool) ? pickedTool : "chat";

            if (mode === "CHAT") {
                const forbiddenInChat = new Set([
                    "create_project",
                    "execute_project",
                    "edit_file",
                    "check_types"
                ]);
                if (forbiddenInChat.has(safeTool)) {
                    safeTool = "chat";
                }
            }

            if (mode === "BUILD" && safeTool === "edit_file" && this.needsBroadCodebaseChange(userMessage)) {
                logger.info("Broad codebase change detected; routing to search_codebase before edit_file", {
                    pickedTool,
                    mode,
                });
                safeTool = "search_codebase";
            }

            if (safeTool !== pickedTool) {
                logger.warn("Adjusted routing decision due to safety or mode constraints", {
                    pickedTool,
                    finalTool: safeTool,
                    mode,
                    availableTools: Array.from(toolNames),
                });
            }

            logger.info("Routing decision", {
                tool: safeTool,
                pickedTool,
                hasMcpTool: safeTool.includes(":"),
                reasoningSnippet: typeof parsed.reasoning === "string" ? parsed.reasoning.slice(0, 200) : undefined,
            });

            try {
                const agentWS = (global as any).agentWS as AgentWebSocket | undefined;
                if (agentWS) {
                    agentWS.broadcast({
                        type: 'tool_use' as any,
                        data: {
                            tool: safeTool,
                            mode,
                            input: userMessage.slice(0, 200),
                        },
                    });
                }
            } catch (broadcastError) {
                logger.warn("Failed to broadcast tool_use event", {
                    error: (broadcastError as any)?.message || String(broadcastError),
                });
            }

            return {
                tool: safeTool,
                reasoning: parsed.reasoning || response,
                thinking: parsed.thinking || ""
            };
        } catch (e: any) {
            logger.error("Failed to parse routing decision, defaulting to chat", {
                error: e?.message || String(e),
                rawResponse: response
            });
            // Default to chat if parsing fails
            return {
                tool: "chat",
                reasoning: response,
                thinking: "Failed to parse routing decision, defaulting to chat"
            };
        }
    }
}
