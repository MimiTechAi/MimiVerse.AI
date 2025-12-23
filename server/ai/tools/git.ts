import { TerminalTool } from './terminal';
import { generateCompletion } from '../utils/ollama';

export interface GitStatus {
    modified: string[];
    added: string[];
    deleted: string[];
    untracked: string[];
    branch: string;
}

export interface GitCommit {
    hash: string;
    author: string;
    email: string;
    date: string;
    message: string;
}

/**
 * Git Tool - Version control operations
 */
export class GitTool {
    private terminal: TerminalTool;

    constructor(private workspaceRoot: string = process.cwd()) {
        this.terminal = new TerminalTool(workspaceRoot);
    }

    /**
     * Get current repository status
     */
    async status(): Promise<GitStatus> {
        const result = await this.exec('git status --porcelain --branch');
        return this.parseStatus(result.output);
    }

    /**
     * Get diff for file(s)
     */
    async diff(file?: string): Promise<string> {
        const cmd = file ? `git diff ${file}` : 'git diff';
        const result = await this.exec(cmd);
        return result.output;
    }

    /**
     * Get staged diff
     */
    async diffStaged(file?: string): Promise<string> {
        const cmd = file ? `git diff --staged ${file}` : 'git diff --staged';
        const result = await this.exec(cmd);
        return result.output;
    }

    /**
     * Stage files
     */
    async add(files: string | string[]): Promise<void> {
        const fileList = Array.isArray(files) ? files.join(' ') : files;
        await this.exec(`git add ${fileList}`);
    }

    /**
     * Unstage files
     */
    async reset(files?: string): Promise<void> {
        const cmd = files ? `git reset ${files}` : 'git reset';
        await this.exec(cmd);
    }

    /**
     * Commit changes
     */
    async commit(message: string): Promise<void> {
        // Escape quotes in message
        const escaped = message.replace(/"/g, '\\"');
        await this.exec(`git commit -m "${escaped}"`);
    }

    /**
     * Get commit log
     */
    async log(limit: number = 10): Promise<GitCommit[]> {
        const result = await this.exec(
            `git log --oneline --graph -n ${limit} --format=%H|%an|%ae|%ad|%s --date=short`
        );
        return this.parseLog(result.output);
    }

    /**
     * Get list of branches
     */
    async branches(): Promise<{ current: string; all: string[] }> {
        const result = await this.exec('git branch');
        const lines = result.output.split('\n').filter(l => l.trim());

        let current = '';
        const all: string[] = [];

        for (const line of lines) {
            const name = line.replace('*', '').trim();
            all.push(name);
            if (line.startsWith('*')) {
                current = name;
            }
        }

        return { current, all };
    }

    /**
     * Checkout branch
     */
    async checkout(branch: string, create: boolean = false): Promise<void> {
        const flag = create ? '-b' : '';
        await this.exec(`git checkout ${flag} ${branch}`);
    }

    /**
     * Pull from remote
     */
    async pull(): Promise<string> {
        const result = await this.exec('git pull');
        return result.output;
    }

    /**
     * Push to remote
     */
    async push(): Promise<string> {
        const result = await this.exec('git push');
        return result.output;
    }

    /**
     * AI-generated commit message based on changes
     */
    async suggestCommitMessage(changes?: GitStatus): Promise<string> {
        if (!changes) {
            changes = await this.status();
        }

        const diff = await this.diffStaged() || await this.diff();

        const prompt = `Generate a concise, conventional commit message for these changes.

Modified files: ${changes.modified.join(', ') || 'none'}
Added files: ${changes.added.join(', ') || 'none'}
Deleted files: ${changes.deleted.join(', ') || 'none'}

Diff (first 2000 chars):
${diff.slice(0, 2000)}

Use conventional commit format: type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Keep it under 72 characters.

Return ONLY the commit message, nothing else.`;

        const message = await generateCompletion('Generate commit message', prompt);
        return message.trim().split('\n')[0]; // First line only
    }

    /**
     * Execute git command
     */
    private async exec(command: string): Promise<{ output: string }> {
        const result = await this.terminal.execute(command);

        if (!result.success && result.error) {
            throw new Error(`Git command failed: ${result.error}`);
        }

        return { output: result.output };
    }

    /**
     * Parse git status output
     */
    private parseStatus(output: string): GitStatus {
        const status: GitStatus = {
            modified: [],
            added: [],
            deleted: [],
            untracked: [],
            branch: 'unknown'
        };

        const lines = output.split('\n');

        for (const line of lines) {
            // Branch info
            if (line.startsWith('##')) {
                const branchMatch = line.match(/##\s+([^\s.]+)/);
                if (branchMatch) status.branch = branchMatch[1];
                continue;
            }

            if (line.length < 3) continue;

            const statusCode = line.substring(0, 2);
            const file = line.substring(3).trim();

            // Modified in working tree
            if (statusCode.includes('M')) {
                status.modified.push(file);
            }
            // Added to index
            else if (statusCode.includes('A')) {
                status.added.push(file);
            }
            // Deleted
            else if (statusCode.includes('D')) {
                status.deleted.push(file);
            }
            // Untracked
            else if (statusCode.includes('?')) {
                status.untracked.push(file);
            }
        }

        return status;
    }

    /**
     * Parse git log output
     */
    private parseLog(output: string): GitCommit[] {
        const commits: GitCommit[] = [];
        const lines = output.split('\n').filter(l => l.includes('|'));

        for (const line of lines) {
            // Remove graph characters
            const clean = line.replace(/[*|\/\\\s]+/, '').trim();
            const parts = clean.split('|');

            if (parts.length >= 5) {
                commits.push({
                    hash: parts[0],
                    author: parts[1],
                    email: parts[2],
                    date: parts[3],
                    message: parts[4]
                });
            }
        }

        return commits;
    }
}
