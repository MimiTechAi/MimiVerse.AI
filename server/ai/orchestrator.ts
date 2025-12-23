import { generateCompletion } from './utils/ollama';
import { ContextManager } from './core/context';

export interface SubTask {
    id: string;
    description: string;
    tool: "terminal" | "file" | "browser";
    command?: string; // For terminal
    path?: string;    // For file
    status: "pending" | "running" | "completed" | "failed";
}

export interface ProjectPhase {
    id: string;
    name: string;
    description: string;
    tasks: SubTask[];
    status: "pending" | "active" | "completed" | "failed";
}

export interface ProjectPlan {
    goal: string;
    phases: ProjectPhase[];
    reasoning: string;
}

export class Orchestrator {
    private contextManager: ContextManager;

    constructor(workspaceRoot: string = process.cwd()) {
        this.contextManager = new ContextManager(workspaceRoot);
    }

    /**
     * Create a comprehensive project plan from a high-level prompt
     */
    async planProject(prompt: string): Promise<ProjectPlan> {
        const context = await this.contextManager.analyzeProjectState();

        const systemPrompt = `You are an expert Software Architect. Your goal is to break down a high-level project request into detailed, executable phases.

Current Project Structure:
${context.structure}

Current Dependencies:
${JSON.stringify(context.dependencies, null, 2)}

Request: "${prompt}"

Create a step-by-step plan to build this. Break it down into logical phases (e.g., Setup, Database, Backend, Frontend).
For each phase, list specific tasks that an AI agent can execute using these tools:
- 'terminal': Run shell commands (npm install, git init, etc.)
- 'file': Create or edit files (write code)
- 'browser': Verify UI (not yet implemented, but you can list it)

Return a JSON object with this structure:
{
  "goal": "Brief summary of what will be built",
  "reasoning": "Architectural decisions and tech stack choice",
  "phases": [
    {
      "id": "phase-1",
      "name": "Phase Name",
      "description": "What this phase achieves",
      "tasks": [
        {
          "id": "task-1",
          "description": "Specific actionable task",
          "tool": "terminal" | "file",
          "command": "npm install ... (if terminal)",
          "path": "path/to/file (if file)"
        }
      ]
    }
  ]
}

IMPORTANT:
1. Be specific. Don't say "Setup project", say "Run npm create vite@latest".
2. Use existing technologies in the project if applicable.
3. Return ONLY valid JSON.`;

        const response = await generateCompletion("Plan Project", systemPrompt);

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found in response");
            const plan = JSON.parse(jsonMatch[0]);

            // Add status fields
            plan.phases.forEach((phase: any) => {
                phase.status = "pending";
                phase.tasks.forEach((task: any) => {
                    task.status = "pending";
                });
            });

            return plan as ProjectPlan;
        } catch (e) {
            console.error("Failed to parse project plan:", e);
            throw new Error("AI failed to generate a valid project plan");
        }
    }

    /**
     * Re-plan a specific phase if it fails or needs adjustment
     */
    async replanPhase(phase: ProjectPhase, error: string): Promise<ProjectPhase> {
        const prompt = `The following phase failed during execution. Please adjust the plan to fix the error.

Phase: ${JSON.stringify(phase, null, 2)}
Error: ${error}

Return the updated Phase object as JSON. Keep the same phase ID and name, but modify the tasks to resolve the error.
IMPORTANT: Return ONLY valid JSON.`;

        const response = await generateCompletion("Replan Phase", prompt);

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found in response");
            const newPhase = JSON.parse(jsonMatch[0]);

            // Ensure status is reset to pending for new tasks
            newPhase.tasks.forEach((task: any) => {
                if (task.status === 'failed') {
                    task.status = 'pending'; // Retry
                }
                // Keep completed tasks as completed? 
                // Actually, for simplicity, let's assume the AI gives us a full valid phase state.
                // But usually we want to re-run only failed or new tasks.
                // Let's trust the AI to return the correct state, but force 'pending' on anything that isn't 'completed'
                if (task.status !== 'completed') {
                    task.status = 'pending';
                }
            });

            return newPhase as ProjectPhase;
        } catch (e) {
            console.error("Failed to parse replan:", e);
            throw new Error("AI failed to generate a valid recovery plan");
        }
    }
}
