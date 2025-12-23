import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitFileStatus {
    [filePath: string]: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed';
}

/**
 * Git integration tool for file status tracking
 */
export class GitTool {
    private workspaceRoot: string;
    private statusCache: { data: GitFileStatus; timestamp: number } | null = null;
    private readonly CACHE_TTL = 5000; // 5 seconds

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Get git status for all files (with caching)
     */
    async getStatus(): Promise<GitFileStatus> {
        // Return cached data if still valid
        if (this.statusCache && Date.now() - this.statusCache.timestamp < this.CACHE_TTL) {
            return this.statusCache.data;
        }

        try {
            const { stdout } = await execAsync('git status --porcelain', {
                cwd: this.workspaceRoot,
            });

            const status: GitFileStatus = {};

            // Parse porcelain format
            // Format: XY PATH or XY ORIG -> NEW (for renames)
            const lines = stdout.trim().split('\n').filter(line => line.length > 0);

            for (const line of lines) {
                const statusCode = line.substring(0, 2);
                let filePath = line.substring(3);

                // Handle renames (R  old -> new)
                if (filePath.includes(' -> ')) {
                    const [, newPath] = filePath.split(' -> ');
                    filePath = newPath;
                    status[filePath] = 'renamed';
                    continue;
                }

                // Map status codes to our enum
                const x = statusCode[0]; // Index status
                const y = statusCode[1]; // Working tree status

                if (x === '?' && y === '?') {
                    status[filePath] = 'untracked';
                } else if (x === 'A' || y === 'A') {
                    status[filePath] = 'added';
                } else if (x === 'M' || y === 'M') {
                    status[filePath] = 'modified';
                } else if (x === 'D' || y === 'D') {
                    status[filePath] = 'deleted';
                } else if (x === 'R') {
                    status[filePath] = 'renamed';
                }
            }

            // Cache the result
            this.statusCache = {
                data: status,
                timestamp: Date.now(),
            };

            return status;
        } catch (error: any) {
            // Not a git repository or git not available
            console.log('Git status failed:', error.message);
            return {};
        }
    }

    /**
     * Invalidate cache (called after git operations)
     */
    invalidateCache() {
        this.statusCache = null;
    }

    /**
     * Check if workspace is a git repository
     */
    async isGitRepository(): Promise<boolean> {
        try {
            await execAsync('git rev-parse --git-dir', {
                cwd: this.workspaceRoot,
            });
            return true;
        } catch {
            return false;
        }
    }
}
