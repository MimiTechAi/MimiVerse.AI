import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { timeline } from "../../timeline";
import { requestRiskApproval } from "../risk-gate";

const execAsync = promisify(exec);

type CommandRisk = "low" | "medium" | "high";

export interface CommandResult {
    success: boolean;
    output: string;
    error?: string;
}

export class TerminalTool {
    private allowedCommands = [
        "npm", "git", "ls", "pwd", "echo", "mkdir", "touch", "cat", "grep", "find", "node", "npx", "cd"
    ];
    private currentDir: string;

    constructor(private workspaceRoot: string = process.cwd()) {
        this.currentDir = workspaceRoot;
    }

    private classifyRisk(command: string): CommandRisk {
        const lower = command.toLowerCase();

        if (lower.startsWith("git push") || lower.includes(" git push ")) {
            return "high";
        }
        if (lower.includes("git reset --hard") || lower.includes("git clean -fd")) {
            return "high";
        }

        if (
            lower.startsWith("npm install") ||
            lower.includes(" npm install ") ||
            lower.startsWith("npm add") ||
            lower.includes(" npm add ") ||
            lower.includes("npm run build") ||
            lower.includes("npm run test") ||
            lower.startsWith("npm test") ||
            lower.startsWith("git commit") ||
            lower.startsWith("git checkout")
        ) {
            return "medium";
        }

        return "low";
    }

    /**
     * Execute a shell command safely
     */
    async execute(command: string): Promise<CommandResult> {
        const parts = command.trim().split(/\s+/);
        const baseCommand = parts[0];

        const risk = this.classifyRisk(command);

        const logAndReturn = (result: CommandResult): CommandResult => {
            try {
                timeline.log('command_run', command, {
                    cwd: this.currentDir,
                    success: result.success,
                    error: result.error,
                    risk,
                });
            } catch (e) {
                console.error('[Timeline] command_run log failed:', e);
            }
            return result;
        };

        if (risk === "high") {
            try {
                const allowed = await requestRiskApproval({
                    tool: 'terminal',
                    command,
                    cwd: this.currentDir,
                    risk,
                });

                if (!allowed) {
                    return logAndReturn({
                        success: false,
                        output: "",
                        error: "Command was not approved by the user (risk gate).",
                    });
                }
            } catch (e: any) {
                console.error('[TerminalTool] Risk approval failed:', e?.message || e);
                return logAndReturn({
                    success: false,
                    output: "",
                    error: "Command blocked because risk approval failed.",
                });
            }
        }

        // 1. Safety Check: Validate command
        if (!this.allowedCommands.includes(baseCommand)) {
            return logAndReturn({
                success: false,
                output: "",
                error: `Command '${baseCommand}' is not allowed for security reasons.`
            });
        }

        // 2. Safety Check: Prevent directory traversal (except for cd)
        if (baseCommand !== "cd" && (command.includes("..") || command.includes("~"))) {
            return logAndReturn({
                success: false,
                output: "",
                error: "Directory traversal (.. or ~) is not allowed."
            });
        }

        // Special handling for 'cd'
        if (baseCommand === "cd") {
            const targetDir = parts[1] || this.workspaceRoot;
            const newPath = path.resolve(this.currentDir, targetDir);

            // Ensure we don't go above workspace root (optional security, but good practice)
            // For now, we'll allow it but maybe warn? Or just allow it since it's a local tool.
            // Let's just verify it exists.
            if (!fs.existsSync(newPath)) {
                return logAndReturn({
                    success: false,
                    output: "",
                    error: `Directory not found: ${targetDir}`
                });
            }

            this.currentDir = newPath;
            return logAndReturn({
                success: true,
                output: `Changed directory to ${this.currentDir}`
            });
        }

        try {
            console.log(`[Terminal] Executing in ${this.currentDir}: ${command}`);
            const { stdout, stderr } = await execAsync(command, {
                cwd: this.currentDir,
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });

            return logAndReturn({
                success: true,
                output: stdout || stderr // Some tools write info to stderr
            });
        } catch (error: any) {
            return logAndReturn({
                success: false,
                output: error.stdout || "",
                error: error.message
            });
        }
    }
}
