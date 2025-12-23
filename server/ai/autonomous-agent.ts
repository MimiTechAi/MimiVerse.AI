import { AgentBrain, AgentMessage, AgentResponse } from './brain';
import { ContextManager } from './core/context';
import { generateCompletion } from './utils/ollama';

export interface ProjectContext {
    primaryLanguage: string;
    framework?: string;
    hasTests: boolean;
    hasDependencies: boolean;
    fileCount: number;
}

export interface ExecutionResult {
    success: boolean;
    steps: number;
    finalState: AgentMessage[];
    error?: string;
}

export interface ProgressEvaluation {
    complete: boolean;
    needsRefinement: boolean;
    stuck: boolean;
    confidence: number;
    refinedGoal?: string;
    issue?: string;
    nextAction?: string;
}

export interface AgentAction {
    action: string;
    reasoning: string;
    input: any;
}

/**
 * Autonomous Agent - Self-directed agent that works until goal is achieved
 * Implements retry logic, self-evaluation, and adaptive planning
 */
export class AutonomousAgent {
    private brain: AgentBrain;
    private contextManager: ContextManager;
    private maxIterations: number;
    private conversationMemory: AgentMessage[] = [];

    constructor(
        workspaceRoot: string,
        maxIterations: number = 20
    ) {
        this.brain = new AgentBrain(workspaceRoot);
        this.contextManager = new ContextManager(workspaceRoot);
        this.maxIterations = maxIterations;
    }

    /**
     * Execute task autonomously until complete or max iterations reached
     */
    async executeUntilComplete(
        userGoal: string,
        onProgress?: (step: number, action: string) => void
    ): Promise<ExecutionResult> {
        let currentStep = 0;
        let goalAchieved = false;

        // Get project context once at start
        const context = await this.getProjectContext();

        console.log(`[AutonomousAgent] Starting autonomous execution: "${userGoal}"`);
        console.log(`[AutonomousAgent] Max iterations: ${this.maxIterations}`);

        while (!goalAchieved && currentStep < this.maxIterations) {
            currentStep++;
            console.log(`\n=== Step ${currentStep}/${this.maxIterations} ===`);

            try {
                // 1. Decide next action
                const action = await this.decideNextAction(userGoal, context);
                console.log(`[Action] ${action.action}: ${action.reasoning}`);

                if (onProgress) {
                    onProgress(currentStep, `${action.action}: ${action.reasoning}`);
                }

                // 2. Execute action via brain
                const result = await this.executeAction(action, userGoal);

                // 3. Store in memory
                this.conversationMemory.push({
                    role: 'assistant',
                    content: result.message,
                    tool: result.tool,
                    toolResult: result.toolInput
                });

                // 4. Self-evaluate progress
                const evaluation = await this.evaluateProgress(userGoal);
                console.log(`[Evaluation] Complete: ${evaluation.complete}, Confidence: ${evaluation.confidence}`);

                if (evaluation.complete && evaluation.confidence > 0.7) {
                    goalAchieved = true;
                    console.log(`[AutonomousAgent] ✅ Goal achieved after ${currentStep} steps!`);
                } else if (evaluation.stuck) {
                    console.log(`[AutonomousAgent] ⚠️ Agent is stuck: ${evaluation.issue}`);
                    // In production, would request user guidance here
                    break;
                } else if (evaluation.needsRefinement) {
                    // Refine goal for next iteration
                    userGoal = evaluation.refinedGoal || userGoal;
                    console.log(`[AutonomousAgent] 🔄 Refining approach: ${userGoal}`);
                }

            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                console.error(`[AutonomousAgent] Error in step ${currentStep}:`, errorMsg);

                // Add error to memory for learning
                this.conversationMemory.push({
                    role: 'assistant',
                    content: `Error: ${errorMsg}`
                });

                // Try to recover (will be evaluated in next iteration)
            }
        }

        if (!goalAchieved && currentStep >= this.maxIterations) {
            console.log(`[AutonomousAgent] ⚠️ Reached max iterations without completing goal`);
        }

        return {
            success: goalAchieved,
            steps: currentStep,
            finalState: this.conversationMemory,
            error: goalAchieved ? undefined : 'Max iterations reached or agent stuck'
        };
    }

    /**
     * Decide next action based on goal and current state
     */
    private async decideNextAction(
        goal: string,
        context: ProjectContext
    ): Promise<AgentAction> {
        const availableActions = this.getApplicableActions(context);
        const recentHistory = this.conversationMemory.slice(-5);

        const prompt = `You are an autonomous coding agent. Analyze the situation and decide the BEST next action.

GOAL: ${goal}

PROJECT CONTEXT:
- Primary Language: ${context.primaryLanguage}
- Framework: ${context.framework || 'Unknown'}
- Has Tests: ${context.hasTests}
- File Count: ${context.fileCount}

AVAILABLE ACTIONS:
${availableActions.map(a => `- ${a.name}: ${a.description}`).join('\n')}

PREVIOUS ACTIONS (last 5):
${recentHistory.map(m => `${m.role}: ${m.content.slice(0, 200)}`).join('\n')}

Think step-by-step:
1. What has been done so far?
2. What's the next logical step toward the goal?
3. Which action best achieves that step?

Respond with ONLY valid JSON:
{
  "action": "action_name",
  "reasoning": "why this action now",
  "input": { /* action-specific parameters */ }
}`;

        const response = await generateCompletion('Decide next action', prompt);

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON in response');

            const parsed = JSON.parse(jsonMatch[0]);
            return {
                action: parsed.action || 'chat',
                reasoning: parsed.reasoning || 'No reasoning provided',
                input: parsed.input || {}
            };
        } catch (error) {
            console.error('[AutonomousAgent] Failed to parse action decision:', error);
            // Default to chat
            return {
                action: 'chat',
                reasoning: 'Failed to parse decision, defaulting to chat',
                input: { message: response }
            };
        }
    }

    /**
     * Execute an action via the brain
     */
    private async executeAction(
        action: AgentAction,
        originalGoal: string
    ): Promise<AgentResponse> {
        // Construct message for brain based on action
        const message = action.input.message ||
            action.input.task ||
            `Execute ${action.action}: ${action.reasoning}`;

        return await this.brain.processMessage(message, this.conversationMemory, "BUILD");
    }

    /**
     * Self-evaluate if goal has been achieved
     */
    private async evaluateProgress(goal: string): Promise<ProgressEvaluation> {
        const recentActions = this.conversationMemory.slice(-8);

        const prompt = `You are evaluating if a coding task has been completed successfully.

ORIGINAL GOAL: ${goal}

ACTIONS TAKEN:
${recentActions.map((m, i) => `${i + 1}. ${m.role}: ${m.content.slice(0, 300)}`).join('\n')}

Evaluate the progress:
1. Has the goal been achieved? (look for concrete evidence)
2. If not complete, what's missing?
3. Is the agent stuck in a loop?
4. Does the approach need refinement?

Respond with ONLY valid JSON:
{
  "complete": true/false,
  "needsRefinement": true/false,
  "stuck": true/false,
  "confidence": 0.0-1.0,
  "refinedGoal": "if needs refinement, what should be the new goal",
  "issue": "if stuck, what's the problem",
  "nextAction": "what should happen next"
}`;

        const response = await generateCompletion('Evaluate progress', prompt);

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON in response');

            const parsed = JSON.parse(jsonMatch[0]);
            return {
                complete: parsed.complete || false,
                needsRefinement: parsed.needsRefinement || false,
                stuck: parsed.stuck || false,
                confidence: parsed.confidence || 0.5,
                refinedGoal: parsed.refinedGoal,
                issue: parsed.issue,
                nextAction: parsed.nextAction
            };
        } catch (error) {
            console.error('[AutonomousAgent] Failed to parse evaluation:', error);
            // Safe default - assume not complete, not stuck
            return {
                complete: false,
                needsRefinement: false,
                stuck: false,
                confidence: 0.3
            };
        }
    }

    /**
     * Get project context for intelligent action selection
     */
    private async getProjectContext(): Promise<ProjectContext> {
        const state = await this.contextManager.analyzeProjectState();

        // Determine primary language from dependencies
        let primaryLanguage = 'javascript';
        if (state.dependencies.typescript) primaryLanguage = 'typescript';

        // Detect framework
        let framework: string | undefined;
        if (state.dependencies.react) framework = 'React';
        else if (state.dependencies.vue) framework = 'Vue';
        else if (state.dependencies.angular) framework = 'Angular';
        else if (state.dependencies.express) framework = 'Express';

        // Check for tests
        const hasTests = !!(
            state.dependencies.jest ||
            state.dependencies.vitest ||
            state.dependencies.mocha
        );

        return {
            primaryLanguage,
            framework,
            hasTests,
            hasDependencies: Object.keys(state.dependencies).length > 0,
            fileCount: state.structure.split('\n').length
        };
    }

    /**
     * Get actions applicable to current project
     */
    private getApplicableActions(context: ProjectContext) {
        const baseActions = [
            {
                name: 'chat',
                description: 'Answer questions or provide explanations'
            },
            {
                name: 'edit_file',
                description: 'Modify existing files'
            },
            {
                name: 'create_project',
                description: 'Create new project structure'
            },
            {
                name: 'search_codebase',
                description: 'Find relevant code'
            },
            {
                name: 'read_file',
                description: 'Read file contents'
            }
        ];

        // Add test actions if project has tests
        if (context.hasTests) {
            baseActions.push({
                name: 'run_tests',
                description: 'Execute test suite and analyze results'
            });
        }

        return baseActions;
    }
}
