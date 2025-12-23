import { generateCompletion } from './utils/ollama';
import { searchCodebase } from "../codebase/indexer";
import fs from "fs/promises";
import path from "path";

interface Tool {
    name: string;
    description: string;
    execute: (args: any) => Promise<any>;
}

export class MimiAgent {
    private tools: Record<string, Tool> = {};

    constructor(private workspaceRoot: string) {
        this.registerTools();
    }

    private registerTools() {
        this.tools["read_file"] = {
            name: "read_file",
            description: "Read content of a file. Args: { path: string }",
            execute: async ({ path: filePath }) => {
                return await fs.readFile(path.resolve(process.cwd(), filePath), "utf-8");
            }
        };

        this.tools["write_file"] = {
            name: "write_file",
            description: "Write content to a file. Args: { path: string, content: string }",
            execute: async ({ path: filePath, content }) => {
                await fs.writeFile(path.resolve(process.cwd(), filePath), content, "utf-8");
                return `Written to ${filePath}`;
            }
        };

        this.tools["search_codebase"] = {
            name: "search_codebase",
            description: "Search the codebase semantically. Args: { query: string }",
            execute: async ({ query }) => {
                // Extract projectId from workspace root
                const projectId = path.basename(this.workspaceRoot);
                const relevantFiles = await searchCodebase(query, 5, projectId);
                return JSON.stringify(relevantFiles.map(r => ({ path: r.path, similarity: r.similarity })));
            }
        };
    }

    async executeTask(task: string) {
        // 1. Plan
        const planPrompt = `
      You are an autonomous coding agent.
      Task: ${task}
      
      Available Tools:
      ${Object.values(this.tools).map(t => `- ${t.name}: ${t.description}`).join("\n")}
      
      Return a JSON array of steps to accomplish this task. Each step should have:
      { "tool": "tool_name", "args": {...} }
      
      Example: [{"tool": "write_file", "args": {"path": "test.ts", "content": "console.log('hi')"}}]
    `;

        const planResponse = await generateCompletion("Plan the task execution", planPrompt);

        let steps: any[] = [];
        try {
            // Try to extract JSON from response
            const jsonMatch = planResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                steps = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error("Failed to parse plan:", e);
            return { success: false, error: "Failed to create execution plan" };
        }

        // 2. Execute
        const results = [];
        for (const step of steps) {
            if (this.tools[step.tool]) {
                try {
                    const result = await this.tools[step.tool].execute(step.args);
                    results.push({ tool: step.tool, success: true, result });
                } catch (error: any) {
                    results.push({ tool: step.tool, success: false, error: error.message });
                }
            }
        }

        return { success: true, steps: results };
    }
}
