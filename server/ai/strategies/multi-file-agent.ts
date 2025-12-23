import { generateCompletion } from "../utils/ollama";
import { searchCodebase } from "../../codebase/indexer";
import fs from "fs/promises";
import path from "path";

export interface FileDiff {
    path: string;
    action: "create" | "modify" | "delete";
    originalContent: string;
    newContent: string;
    diff: string; // Unified diff format
}

export interface MultiFileEditPlan {
    task: string;
    files: FileDiff[];
    reasoning: string;
}

/**
 * Multi-File Agent: Orchestrates atomic file operations across multiple files
 * Inspired by Windsurf's autonomous editing capabilities
 */
export class MultiFileAgent {
    private snapshots: Map<string, string> = new Map();

    /**
     * Plan multi-file changes based on a high-level task description
     */
    async planMultiFileEdit(task: string, workspaceRoot: string, projectId: string): Promise<MultiFileEditPlan> {
        // 1. Search codebase for relevant files
        const relevantFiles = await searchCodebase(task, 10, projectId);

        // 2. Build context for the AI
        const contextFiles = await Promise.all(
            relevantFiles.slice(0, 5).map(async (file) => {
                const fullPath = path.join(workspaceRoot, file.path);
                const content = await fs.readFile(fullPath, "utf-8");
                return { path: file.path, content };
            })
        );

        // 3. Generate plan using Ollama
        const prompt = `You are an expert software architect. Given the task and relevant files, create a detailed plan for multi-file changes.

Task: ${task}

Relevant Files:
${contextFiles.map((f) => `=== ${f.path} ===\n${f.content.slice(0, 500)}...`).join("\n\n")}

Return a JSON object with this exact structure:
{
  "reasoning": "Why these changes are needed",
  "files": [
    {
      "path": "relative/path/to/file.ts",
      "action": "modify",
      "changes": "Detailed description of changes to make"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown or explanations.`;

        const response = await generateCompletion("Plan multi-file edit", prompt);

        // Parse AI response
        let plan;
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found in response");
            plan = JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error("Failed to parse plan:", e);
            throw new Error("AI failed to generate valid plan");
        }

        // 4. Generate detailed diffs for each file
        const fileDiffs: FileDiff[] = [];

        for (const fileChange of plan.files) {
            const fullPath = path.join(workspaceRoot, fileChange.path);

            let originalContent = "";
            let newContent = "";

            if (fileChange.action === "create") {
                newContent = await this.generateNewFileContent(fileChange.path, fileChange.changes);
            } else if (fileChange.action === "modify") {
                try {
                    originalContent = await fs.readFile(fullPath, "utf-8");
                    newContent = await this.generateModifiedContent(
                        fileChange.path,
                        originalContent,
                        fileChange.changes
                    );
                } catch (error: any) {
                    if (error?.code === 'ENOENT') {
                        // File does not exist yet – treat this as a create operation
                        fileChange.action = "create";
                        originalContent = "";
                        newContent = await this.generateNewFileContent(fileChange.path, fileChange.changes);
                    } else {
                        throw error;
                    }
                }
            } else if (fileChange.action === "delete") {
                try {
                    originalContent = await fs.readFile(fullPath, "utf-8");
                } catch (error: any) {
                    if (error?.code === 'ENOENT') {
                        // Nothing to delete
                        continue;
                    }
                    throw error;
                }
            }

            fileDiffs.push({
                path: fileChange.path,
                action: fileChange.action,
                originalContent,
                newContent,
                diff: this.generateUnifiedDiff(originalContent, newContent, fileChange.path),
            });
        }

        return {
            task,
            files: fileDiffs,
            reasoning: plan.reasoning,
        };
    }

    /**
     * Generate content for a new file
     */
    private async generateNewFileContent(filePath: string, instructions: string): Promise<string> {
        const prompt = `Generate the complete content for a new file based on these instructions.

File: ${filePath}
Instructions: ${instructions}

Return ONLY the file content, no explanations or markdown.`;

        return await generateCompletion("Generate new file", prompt);
    }

    /**
     * Generate modified content for an existing file
     */
    private async generateModifiedContent(
        filePath: string,
        original: string,
        instructions: string
    ): Promise<string> {
        const prompt = `Modify the following file according to the instructions. Return the COMPLETE modified file.

File: ${filePath}

Original Content:
${original}

Instructions: ${instructions}

Return ONLY the complete modified file content, no explanations.`;

        return await generateCompletion("Modify file", prompt);
    }

    /**
     * Generate unified diff (simplified version)
     */
    private generateUnifiedDiff(original: string, modified: string, filePath: string): string {
        const originalLines = original.split("\n");
        const modifiedLines = modified.split("\n");

        let diff = `--- ${filePath}\n+++ ${filePath}\n`;

        // Simple line-by-line diff (in production, use a proper diff library)
        const maxLines = Math.max(originalLines.length, modifiedLines.length);

        for (let i = 0; i < maxLines; i++) {
            const origLine = originalLines[i] || "";
            const modLine = modifiedLines[i] || "";

            if (origLine !== modLine) {
                if (origLine) diff += `- ${origLine}\n`;
                if (modLine) diff += `+ ${modLine}\n`;
            }
        }

        return diff;
    }

    /**
     * Execute multi-file edits atomically (all-or-nothing)
     */
    async executeMultiFileEdit(
        plan: MultiFileEditPlan,
        workspaceRoot: string
    ): Promise<{ success: boolean; error?: string }> {
        // 1. Create snapshots for rollback
        for (const file of plan.files) {
            const fullPath = path.join(workspaceRoot, file.path);
            try {
                if (file.action !== "create") {
                    const content = await fs.readFile(fullPath, "utf-8");
                    this.snapshots.set(file.path, content);
                }
            } catch (e) {
                // File might not exist yet
            }
        }

        // Helper function to write files with logging
        const writeFile = async (fullPath: string, content: string): Promise<void> => {
            console.log(`[MultiFileAgent] Writing to absolute path: ${fullPath}`);
            try {
                await fs.mkdir(path.dirname(fullPath), { recursive: true });
                await fs.writeFile(fullPath, content, 'utf-8');
                console.log(`[MultiFileAgent] Successfully wrote file: ${fullPath}`);
            } catch (error) {
                console.error(`[MultiFileAgent] Error writing file ${fullPath}:`, error);
                throw error;
            }
        };

        // 2. Apply changes
        try {
            for (const file of plan.files) {
                const fullPath = path.join(workspaceRoot, file.path);

                if (file.action === "create" || file.action === "modify") {
                    await writeFile(fullPath, file.newContent);
                } else if (file.action === "delete") {
                    console.log(`[MultiFileAgent] Deleting file: ${fullPath}`);
                    try {
                        await fs.unlink(fullPath);
                    } catch (error: any) {
                        if (error?.code !== 'ENOENT') {
                            throw error;
                        }
                    }
                    console.log(`[MultiFileAgent] Successfully deleted file: ${fullPath}`);
                }
            }

            // Success! Clear snapshots
            this.snapshots.clear();
            return { success: true };
        } catch (error: any) {
            // 3. Rollback on error
            await this.rollback(workspaceRoot);
            return { success: false, error: error.message };
        }
    }

    /**
   * Rollback all changes using snapshots
   */
    private async rollback(workspaceRoot: string): Promise<void> {
        const entries = Array.from(this.snapshots.entries());
        for (const [filePath, content] of entries) {
            const fullPath = path.join(workspaceRoot, filePath);
            await fs.writeFile(fullPath, content, "utf-8");
        }
        this.snapshots.clear();
    }
}
