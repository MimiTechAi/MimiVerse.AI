import fs from "fs/promises";
import path from "path";
import { TerminalTool, type CommandResult } from "./terminal";

export interface LintResult {
  success: boolean;
  command: string;
  output: string;
  error?: string;
}

/**
 * Lint / Type-Check Tool
 *
 * Runs project checks (TypeScript / lint) in a safe way using TerminalTool
 * so that the agent can explicitly trigger a type-check step instead of
 * encoding it as an ad-hoc terminal command.
 */
export class LintTool {
  private terminal: TerminalTool;
  private workspaceRoot: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
    this.terminal = new TerminalTool(workspaceRoot);
  }

  private async detectCheckCommand(): Promise<string> {
    const packageJsonPath = path.join(this.workspaceRoot, "package.json");

    try {
      const raw = await fs.readFile(packageJsonPath, "utf-8");
      const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
      const scripts = pkg.scripts || {};

      if (typeof scripts.check === "string") {
        // Standard TypeScript check script
        return "npm run check";
      }

      if (typeof scripts.lint === "string") {
        // Generic lint script if present
        return "npm run lint";
      }
    } catch {
      // If package.json is missing or invalid, fall back to a generic command
    }

    // Fallback: plain TypeScript check without emit
    return "npx tsc --noEmit";
  }

  /**
   * Run the configured type-check / lint command for the current workspace.
   */
  async runTypeCheck(commandOverride?: string): Promise<LintResult> {
    const command = commandOverride || (await this.detectCheckCommand());

    const result: CommandResult = await this.terminal.execute(command);

    return {
      success: result.success,
      command,
      output: result.output,
      error: result.error,
    };
  }
}
