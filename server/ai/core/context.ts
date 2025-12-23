import fs from "fs/promises";
import path from "path";
import { searchCodebase } from "../../codebase/indexer";
import { ContextWindowManager } from "./token-manager";
import { logger } from "../../utils/logger";

export interface ProjectState {
    root: string;
    files: string[];
    dependencies: Record<string, string>;
    structure: string; // Tree view string
}

export interface Context {
    state: ProjectState;
    relevantFiles: { path: string; content: string }[];
    recentErrors: string[];
    projectInfo?: string;
    recentHistory: string[];
    tokenStats?: {
        total: number;
        files: number;
        history: number;
    };
}

/**
 * Advanced Context Manager with RAG & Token Budgeting
 * Level 4 Context Engineering
 */
export class ContextManager {
    private recentErrors: string[] = [];
    private conversationHistory: Map<string, string[]> = new Map();
    private tokenManager: ContextWindowManager;

    constructor(private workspaceRoot: string = process.cwd()) {
        this.tokenManager = new ContextWindowManager();
    }

    /**
     * Analyze the current state of the project
     */
    async analyzeProjectState(): Promise<ProjectState> {
        // Cached or lightweight analysis
        const files = await this.getAllFiles(this.workspaceRoot);
        const dependencies = await this.getDependencies();
        const structure = await this.generateTreeStructure(this.workspaceRoot);

        return {
            root: this.workspaceRoot,
            files,
            dependencies,
            structure,
        };
    }

    /**
     * Build standard context for AgentRuntime
     */
    async buildContext(
        userId: string,
        projectId: string,
        conversationId: string
    ): Promise<Context> {
        const state = await this.analyzeProjectState();
        const recentHistory = this.conversationHistory.get(conversationId) || [];

        return {
            state,
            relevantFiles: [], // Empty initially, Agent will request via RAG
            recentErrors: this.recentErrors,
            projectInfo: `Project: ${projectId}`,
            recentHistory: recentHistory.slice(-10)
        };
    }

    /**
     * Build RAG-enhanced context for a specific task
     * Uses Hybrid Search (Vector + Keyword) via indexer.ts
     */
    async buildContextWithRAG(query: string, projectId: string): Promise<Context> {
        logger.info(`[ContextManager] 🔍 Retrieving context for: "${query}"`);

        // 1. Retrieve relevant files using RAG (Hybrid Search)
        const searchResults = await searchCodebase(query, 20, projectId);

        // 2. Map to format needed for selection
        const candidates = await Promise.all(
            searchResults.map(async (result) => {
                try {
                    // Always read fresh content from disk to avoid stale embeddings
                    const fullPath = path.isAbsolute(result.path)
                        ? result.path
                        : path.join(this.workspaceRoot, result.path);

                    const content = await fs.readFile(fullPath, "utf-8");
                    return {
                        path: result.path,
                        content,
                        score: result.similarity
                    };
                } catch (e) {
                    return null;
                }
            })
        );

        // Filter valid files
        const validCandidates = candidates.filter((f): f is { path: string; content: string; score: number } => f !== null);

        // 3. Select optimal context fitting token budget
        const selectedFiles = this.tokenManager.selectContext(validCandidates);

        // 4. Get Project State
        const state = await this.analyzeProjectState();

        // 5. Calculate Token Stats
        const tokens = {
            files: selectedFiles.reduce((acc, f) => acc + this.tokenManager.countTokens(f.content), 0),
            history: 0, // Todo: Add history
            total: 0
        };
        tokens.total = tokens.files + tokens.history;

        return {
            state,
            relevantFiles: selectedFiles,
            recentErrors: this.recentErrors,
            recentHistory: [],
            tokenStats: tokens
        };
    }

    /**
     * Update conversation memory
     */
    async updateMemory(
        conversationId: string,
        userMessage: string,
        aiResponse: string
    ): Promise<void> {
        const history = this.conversationHistory.get(conversationId) || [];
        history.push(`User: ${userMessage}`);
        history.push(`MIMI: ${aiResponse}`);

        // Use TokenManager to keep history within budget, not just count
        // For now, simple count limit
        if (history.length > 20) {
            history.splice(0, history.length - 20);
        }

        this.conversationHistory.set(conversationId, history);
    }

    /**
     * Log an error to context memory
     */
    logError(error: string) {
        this.recentErrors.push(error);
        if (this.recentErrors.length > 10) {
            this.recentErrors.shift();
        }
    }

    // --- Helpers ---

    private async getAllFiles(dir: string, fileList: string[] = []): Promise<string[]> {
        try {
            const files = await fs.readdir(dir);
            for (const file of files) {
                if (file.startsWith(".")) continue;
                if (file === "node_modules" || file === "dist" || file === "build") continue;

                const filePath = path.join(dir, file);
                const stat = await fs.stat(filePath);

                if (stat.isDirectory()) {
                    await this.getAllFiles(filePath, fileList);
                } else {
                    fileList.push(path.relative(this.workspaceRoot, filePath));
                }
            }
            return fileList;
        } catch (e) {
            return [];
        }
    }

    private async getDependencies(): Promise<Record<string, string>> {
        try {
            const pkgPath = path.join(this.workspaceRoot, "package.json");
            const content = await fs.readFile(pkgPath, "utf-8");
            const pkg = JSON.parse(content);
            return { ...pkg.dependencies, ...pkg.devDependencies };
        } catch (e) {
            return {};
        }
    }

    private async generateTreeStructure(dir: string, prefix = "", depth = 0): Promise<string> {
        if (depth > 4) return prefix + "... (max depth reached)\n"; // Prevent infinite recursion

        let output = "";
        try {
            const files = await fs.readdir(dir);
            const filteredFiles = files.filter(f => !f.startsWith(".") && f !== "node_modules" && f !== "dist" && f !== "out");

            // Sort: Directories first, then files
            filteredFiles.sort((a, b) => {
                // This is a rough sort without stat, but good enough for display mostly
                if (a.includes('.') && !b.includes('.')) return 1;
                if (!a.includes('.') && b.includes('.')) return -1;
                return a.localeCompare(b);
            });

            const limit = 20; // Max items per directory to show in tree
            const displayFiles = filteredFiles.slice(0, limit);

            for (let i = 0; i < displayFiles.length; i++) {
                const file = displayFiles[i];
                const isLast = i === displayFiles.length - 1 && displayFiles.length === filteredFiles.length;
                const filePath = path.join(dir, file);

                try {
                    const stat = await fs.stat(filePath);
                    output += `${prefix}${isLast ? "└── " : "├── "}${file}\n`;

                    if (stat.isDirectory()) {
                        output += await this.generateTreeStructure(
                            filePath,
                            prefix + (isLast ? "    " : "│   "),
                            depth + 1
                        );
                    }
                } catch { }
            }

            if (filteredFiles.length > limit) {
                output += `${prefix}└── ... (${filteredFiles.length - limit} more)\n`;
            }
        } catch { }
        return output;
    }
}
