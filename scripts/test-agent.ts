
import { Executor } from "../server/ai/executor";
import { Orchestrator } from "../server/ai/orchestrator";

async function testSelfCorrection() {
    console.log("Starting Self-Correction Test...");

    const orchestrator = new Orchestrator();
    const executor = new Executor();

    // Mock a plan with a task that is destined to fail initially
    const mockPlan = {
        goal: "Test Self-Correction",
        reasoning: "Testing retry logic",
        phases: [
            {
                id: "phase-1",
                name: "Test Phase",
                description: "Phase with a failing task",
                status: "pending" as const,
                tasks: [
                    {
                        id: "task-1",
                        description: "Run a command that fails",
                        tool: "terminal" as const,
                        command: "ls /non_existent_directory_for_testing",
                        status: "pending" as const
                    }
                ]
            }
        ]
    };

    try {
        console.log("Executing plan with expected failure...");
        await executor.executePlan(mockPlan, (phaseId, taskId, status) => {
            console.log(`[Progress] ${phaseId}/${taskId}: ${status}`);
        });
        console.log("Plan executed successfully (Unexpected if self-correction didn't happen or if it fixed it!)");
    } catch (error) {
        console.error("Plan execution failed:", error);
    }
}

// Run the test
testSelfCorrection().catch(console.error);
