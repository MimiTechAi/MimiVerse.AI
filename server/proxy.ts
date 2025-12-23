import { createProxyMiddleware } from 'http-proxy-middleware';
import { Express } from 'express';
import net from 'net';

const PORTS_TO_CHECK = [5173, 3000, 8080, 8000, 4321];

async function checkPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(200);
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });
        socket.connect(port, '127.0.0.1');
    });
}

export async function getActiveDevServer() {
    for (const port of PORTS_TO_CHECK) {
        if (await checkPort(port)) {
            return { running: true, port, url: `http://localhost:${port}` };
        }
    }
    return { running: false };
}

export function setupPreviewProxy(app: Express) {
    // Dynamic proxy that finds the running dev server
    const proxy = createProxyMiddleware({
        target: 'http://localhost:5173', // Fallback
        router: async () => {
            const status = await getActiveDevServer();
            return status.url || 'http://localhost:5173';
        },
        changeOrigin: true,
        ws: true, // Support WebSocket for HMR
        pathRewrite: {
            '^/preview': '', // Remove /preview prefix
        },
        // @ts-ignore - onError is valid but types are strict
        onError: (err: any, req: any, res: any) => {
            console.error('Proxy error:', err);
            res.writeHead(502, { 'Content-Type': 'text/plain' });
            res.end('Dev server not reachable. Please start your app with "npm run dev".');
        },
        logLevel: 'silent'
    });

    app.use('/preview', proxy);
}
