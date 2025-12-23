
import { Executor } from "../server/ai/executor";
import { ProjectPlan } from "../server/ai/orchestrator";
import { AgentWebSocket } from "../server/websocket";

// Mock WebSocket
const mockWS = {
    broadcast: (type: string, data: any) => {
        console.log(`[WS Broadcast] ${type}:`, JSON.stringify(data, null, 2));
    }
} as AgentWebSocket;

async function testExecution() {
    console.log("Starting execution test...");

    const executor = new Executor(process.cwd());

    const mockPlan: ProjectPlan = {
        goal: "Test Project",
        reasoning: "Testing execution flow",
        phases: [
            {
                id: "phase-1",
                name: "Setup",
                description: "Initial setup",
                status: "pending",
                tasks: [
                    {
                        id: "task-1",
                        description: "Check node version",
                        tool: "terminal",
                        command: "node -v",
                        status: "pending"
                    },
                    {
                        id: "task-2",
                        description: "Create a test file",
                        tool: "file",
                        path: "test-output.txt",
                        status: "pending"
                    }
                ]
            }
        ]
    };

    try {
        await executor.executePlan(mockPlan, mockWS);
        console.log("Execution complete!");
    } catch (error) {
        console.error("Execution failed:", error);
    }
}

testExecution();
