import fs from "fs/promises";
import path from "path";

export interface FileTreeNode {
    name: string;
    path: string;
    type: "file" | "directory";
    children?: FileTreeNode[];
    size?: number;
}

/**
 * Advanced file manipulation tool for the agent
 */
export class FileTool {
    constructor(private workspaceRoot: string = process.cwd()) { }

    /**
     * Get full directory tree
     */
    async getFileTree(dirPath: string = ".", maxDepth: number = 5): Promise<FileTreeNode> {
        const fullPath = path.resolve(this.workspaceRoot, dirPath);
        return this.buildTree(fullPath, 0, maxDepth);
    }

    private async buildTree(fullPath: string, depth: number, maxDepth: number): Promise<FileTreeNode> {
        const stats = await fs.stat(fullPath);
        const name = path.basename(fullPath);
        const relativePath = path.relative(this.workspaceRoot, fullPath);

        if (stats.isFile()) {
            return {
                name,
                path: relativePath || name,
                type: "file",
                size: stats.size
            };
        }

        // Directory
        const node: FileTreeNode = {
            name,
            path: relativePath || ".",
            type: "directory",
            children: []
        };

        if (depth >= maxDepth) {
            return node;
        }

        try {
            const entries = await fs.readdir(fullPath);
            const filteredEntries = entries.filter(e =>
                !e.startsWith(".") && e !== "node_modules" && e !== "dist" && e !== "build"
            );

            for (const entry of filteredEntries) {
                const childPath = path.join(fullPath, entry);
                const childNode = await this.buildTree(childPath, depth + 1, maxDepth);
                node.children!.push(childNode);
            }

            // Sort: directories first, then files
            node.children!.sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === "directory" ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });
        } catch (e) {
            console.error(`Error reading directory ${fullPath}:`, e);
        }

        return node;
    }

    /**
     * Read a file
     */
    async readFile(filePath: string): Promise<string> {
        const fullPath = path.resolve(this.workspaceRoot, filePath);
        return await fs.readFile(fullPath, "utf-8");
    }

    /**
     * Write a file (create or overwrite)
     */
    async writeFile(filePath: string, content: string): Promise<void> {
        const fullPath = path.resolve(this.workspaceRoot, filePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, "utf-8");
    }

    /**
     * Delete a file
     */
    async deleteFile(filePath: string): Promise<void> {
        const fullPath = path.resolve(this.workspaceRoot, filePath);
        await fs.unlink(fullPath);
    }

    /**
     * Rename/move a file
     */
    async renameFile(oldPath: string, newPath: string): Promise<void> {
        const fullOldPath = path.resolve(this.workspaceRoot, oldPath);
        const fullNewPath = path.resolve(this.workspaceRoot, newPath);
        await fs.mkdir(path.dirname(fullNewPath), { recursive: true });
        await fs.rename(fullOldPath, fullNewPath);
    }

    /**
     * Create a directory
     */
    async createDirectory(dirPath: string): Promise<void> {
        const fullPath = path.resolve(this.workspaceRoot, dirPath);
        await fs.mkdir(fullPath, { recursive: true });
    }

    /**
     * Check if file exists
     */
    async fileExists(filePath: string): Promise<boolean> {
        try {
            const fullPath = path.resolve(this.workspaceRoot, filePath);
            await fs.access(fullPath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Generate a simple diff between two strings
     */
    generateDiff(original: string, modified: string, filePath: string): string {
        const originalLines = original.split("\n");
        const modifiedLines = modified.split("\n");

        let diff = `--- ${filePath}\n+++ ${filePath}\n`;

        const maxLines = Math.max(originalLines.length, modifiedLines.length);
        for (let i = 0; i < maxLines; i++) {
            const origLine = originalLines[i] || "";
            const modLine = modifiedLines[i] || "";

            if (origLine !== modLine) {
                if (origLine) diff += `- ${origLine}\n`;
                if (modLine) diff += `+ ${modLine}\n`;
            } else {
                diff += `  ${origLine}\n`;
            }
        }

        return diff;
    }
}
