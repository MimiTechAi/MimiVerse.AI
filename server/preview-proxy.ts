import { createProxyMiddleware } from 'http-proxy-middleware';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DevServerInfo {
    running: boolean;
    port?: number;
    url?: string;
}

/**
 * Preview Proxy - Proxies requests to the running dev server
 * Supports common dev server ports: 5173 (Vite), 3000 (React/Next), 8080 (Vue)
 */
export class PreviewProxy {
    private detectedPort: number | null = null;
    private commonPorts = [5173, 3000, 8080, 4200, 8000];

    /**
     * Detect running dev server
     */
    async detectDevServer(): Promise<DevServerInfo> {
        for (const port of this.commonPorts) {
            if (await this.isPortInUse(port)) {
                this.detectedPort = port;
                return {
                    running: true,
                    port,
                    url: `http://localhost:${port}`
                };
            }
        }

        return { running: false };
    }

    /**
     * Check if a port is in use
     */
    private async isPortInUse(port: number): Promise<boolean> {
        try {
            // Use lsof to check if port is in use (works on Linux/Mac)
            const { stdout } = await execAsync(`lsof -i:${port} -t`);
            return stdout.trim().length > 0;
        } catch {
            // If lsof fails or port is not in use, return false
            return false;
        }
    }

    /**
     * Create proxy middleware for Express
     */
    createProxy() {
        return createProxyMiddleware({
            target: `http://localhost:${this.detectedPort || 5173}`,
            changeOrigin: true,
            ws: true, // Proxy websockets for HMR
            pathRewrite: {
                '^/preview': '', // Remove /preview prefix
            },
        });
    }

    /**
     * Get the target port for proxying
     */
    getTargetPort(): number {
        return this.detectedPort || 5173;
    }
}
