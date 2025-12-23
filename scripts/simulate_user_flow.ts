
import WebSocket from 'ws';

const WS_URL = 'ws://localhost:5000/ws/agent';

function log(type: string, message: any) {
    console.log(`[${new Date().toISOString()}] [${type}]`, message);
}

// Revised approach:
async function runSimulationCorrected() {
    log('INFO', 'Connecting to WebSocket...');
    const ws = new WebSocket(WS_URL);

    ws.on('open', async () => {
        log('INFO', 'Connected to Agent WebSocket');

        // Step 1: Send Chat
        const message = "Create a simple Python script that prints 'Hello Mimiverse' and saves it to hello.py";
        log('USER', `Sending chat via HTTP: ${message}`);

        const chatRes = await fetch('http://localhost:5000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        const chatData = await chatRes.json();
        log('API', `Chat finished. Tool: ${chatData.tool}`);

        if (chatData.tool === 'create_project') {
            const plan = chatData.result;
            log('USER', 'Plan received. Approving execution...');

            // Step 2: Execute Plan
            const execRes = await fetch('http://localhost:5000/api/ai/execute-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan })
            });
            log('API', `Execution triggered. Status: ${execRes.status}`);
        }
    });

    ws.on('message', (data: WebSocket.Data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'thinking') log('THINKING', msg.data);
        if (msg.type === 'progress') log('PROGRESS', JSON.stringify(msg.data));
        if (msg.type === 'error') log('ERROR', msg.data);
    });

    ws.on('error', (err) => {
        log('ERROR', `WebSocket error: ${err.message}`);
    });

    ws.on('close', () => {
        log('INFO', 'Disconnected');
    });
}

runSimulationCorrected();
