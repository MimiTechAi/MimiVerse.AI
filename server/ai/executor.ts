import { Orchestrator, ProjectPlan, SubTask } from "./orchestrator";
import { TerminalTool } from "./tools/terminal";
import { MultiFileAgent } from "./strategies/multi-file-agent";
import { ContextManager } from "./core/context";
import { AgentWebSocket } from "../websocket";

export class Executor {
    private terminal: TerminalTool;
    private fileAgent: MultiFileAgent;
    private context: ContextManager;
    private orchestrator: Orchestrator;

    constructor(private workspaceRoot: string = process.cwd()) {
        this.terminal = new TerminalTool(workspaceRoot);
        this.fileAgent = new MultiFileAgent();
        this.context = new ContextManager(workspaceRoot);
        this.orchestrator = new Orchestrator(workspaceRoot);
    }

    /**
     * Execute a full project plan
     */
    async executePlan(plan: ProjectPlan, ws?: AgentWebSocket): Promise<void> {
        const broadcast = (type: string, data: any) => {
            if (ws) ws.broadcast({ type: type as any, data });
        };

        for (const phase of plan.phases) {
            console.log(`\n=== Starting Phase: ${phase.name} ===`);
            phase.status = "active";
            broadcast('progress', { phaseId: phase.id, phaseName: phase.name, taskId: null, status: 'running' });

            let phaseComplete = false;
            let retryCount = 0;
            const MAX_RETRIES = 3;

            while (!phaseComplete && retryCount < MAX_RETRIES) {
                try {
                    for (const task of phase.tasks) {
                        if (task.status === 'completed') continue;

                        console.log(`Executing Task: ${task.description}`);
                        task.status = "running";
                        broadcast('progress', { phaseId: phase.id, phaseName: phase.name, taskId: task.id, taskDescription: task.description, status: 'running' });

                        // Simulate "Team" thinking
                        broadcast('thinking', `👷 executing: ${task.description}`);

                        await this.executeTask(task, ws);

                        task.status = "completed";
                        broadcast('progress', { phaseId: phase.id, phaseName: phase.name, taskId: task.id, taskDescription: task.description, status: 'completed' });
                    }
                    phaseComplete = true;
                } catch (error: any) {
                    console.error(`Task Failed: ${error.message}`);
                    broadcast('error', `Task failed: ${error.message}`);
                    retryCount++;

                    if (retryCount >= MAX_RETRIES) {
                        phase.status = "failed";
                        broadcast('progress', { phaseId: phase.id, phaseName: phase.name, taskId: null, status: 'failed' });
                        throw new Error(`Phase failed after ${MAX_RETRIES} attempts: ${error.message}`);
                    }

                    console.log(`Attempting replan (Attempt ${retryCount}/${MAX_RETRIES})...`);
                    broadcast('thinking', `⚠️ Error detected. Architect is replanning phase... (Attempt ${retryCount})`);

                    try {
                        const newPhase = await this.orchestrator.replanPhase(phase, error.message);
                        phase.tasks = newPhase.tasks;
                        console.log("Plan updated. Retrying...");
                        broadcast('thinking', `✅ Plan updated. Resuming execution...`);
                    } catch (replanError) {
                        throw new Error(`Replanning failed: ${replanError}`);
                    }
                }
            }

            phase.status = "completed";
            broadcast('progress', { phaseId: phase.id, phaseName: phase.name, taskId: null, status: 'completed' });
        }

        // After all phases have completed successfully, emit a unified completion event
        if (ws) {
            ws.sendComplete({
                status: "completed",
                goal: plan.goal,
                phases: plan.phases.map((p) => ({
                    id: p.id,
                    name: p.name,
                    status: p.status,
                })),
            });
        }
    }

    /**
     * Execute a single subtask
     */
    private async executeTask(task: SubTask, ws?: AgentWebSocket): Promise<void> {
        if (task.tool === "terminal" && task.command) {
            if (ws) ws.broadcast({ type: 'tool_use', data: { tool: 'terminal', input: task.command } });

            const result = await this.terminal.execute(task.command);
            if (!result.success) {
                throw new Error(`Terminal command failed: ${result.error}\nOutput: ${result.output}`);
            }

            // Send output to UI
            if (ws && result.output) {
                ws.broadcast({ type: 'chunk', data: `\n$ ${task.command}\n${result.output}\n` });
            }
        } else if (task.tool === "file") {
            if (ws) ws.broadcast({ type: 'tool_use', data: { tool: 'file_agent', input: task.description } });

            // For file tasks, we use the MultiFileAgent to plan & execute the specific change
            const path = await import('path');
            const projectId = path.basename(this.workspaceRoot);
            const plan = await this.fileAgent.planMultiFileEdit(task.description, this.workspaceRoot, projectId);
            const result = await this.fileAgent.executeMultiFileEdit(plan, this.workspaceRoot);

            if (!result.success) {
                throw new Error(`File operation failed: ${result.error}`);
            }

            // Broadcast structured file_change events for each affected file
            if (ws && Array.isArray(plan?.files)) {
                for (const file of plan.files) {
                    const changeType = file.action === "modify"
                        ? "update"
                        : file.action === "create"
                            ? "create"
                            : "delete";
                    ws.broadcast({
                        type: 'file_change' as any,
                        data: {
                            filePath: file.path,
                            changeType,
                        },
                    });
                }
            }

            if (ws) ws.broadcast({ type: 'chunk', data: `\n✅ File operations completed for: ${task.description}\n` });
        } else {
            throw new Error(`Unknown tool or missing parameters: ${task.tool}`);
        }
    }

    private async gatherContext(task: string): Promise<string> {
        const { searchCodebase } = await import("../codebase/indexer");
        const path = await import("path");
        const projectId = path.basename(this.workspaceRoot);
        const files = await searchCodebase(task, 3, projectId);
        return files.map(f => `File: ${f.path}\nContent:\n${f.content}\n`).join("\n---\n");
    }
}
