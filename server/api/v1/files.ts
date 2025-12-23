import { Router } from 'express';
import { requireAuth } from '../../auth/middleware';
import fs from 'fs/promises';
import path from 'path';
import {
    sanitizeFilePath,
    fileSaveSchema,
    fileCreateSchema,
    fileRenameSchema,
    fileDeleteSchema,
    projectIdSchema
} from '../../security/validation';
import { timeline } from '../../timeline';

export const filesRoutes = Router();

/**
 * Get language based on file extension
 */
function getLanguage(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const languageMap: Record<string, string> = {
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.css': 'css',
        '.scss': 'scss',
        '.json': 'json',
        '.md': 'markdown',
        '.html': 'html',
        '.py': 'python',
        '.go': 'go',
        '.rs': 'rust',
        '.yml': 'yaml',
        '.yaml': 'yaml',
        '.xml': 'xml',
        '.svg': 'xml',
        '.sh': 'shell',
        '.bash': 'shell'
    };
    return languageMap[ext] || 'plaintext';
}

/**
 * Recursively build file tree
 */
async function buildFileTree(
    dirPath: string,
    basePath: string = '',
    maxDepth: number = 10,
    currentDepth: number = 0
): Promise<any[]> {
    if (currentDepth >= maxDepth) return [];

    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const nodes: any[] = [];

        for (const entry of entries) {
            // Skip hidden files and common ignore patterns
            if (entry.name.startsWith('.')) continue;
            if (entry.name === 'node_modules') continue;
            if (entry.name === 'dist') continue;
            if (entry.name === 'build') continue;

            const fullPath = path.join(dirPath, entry.name);
            const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;

            if (entry.isDirectory()) {
                const children = await buildFileTree(fullPath, relativePath, maxDepth, currentDepth + 1);
                nodes.push({
                    id: relativePath,
                    name: entry.name,
                    type: 'folder',
                    path: relativePath,
                    children,
                    isOpen: currentDepth === 0 // Only open root folders
                });
            } else {
                // For files, only load content if < 1MB
                const stats = await fs.stat(fullPath);
                let content = '';

                if (stats.size < 1024 * 1024) { // 1MB limit
                    try {
                        content = await fs.readFile(fullPath, 'utf-8');
                    } catch {
                        content = ''; // Binary file or read error
                    }
                }

                const language = getLanguage(entry.name);

                nodes.push({
                    id: relativePath,
                    name: entry.name,
                    type: 'file',
                    path: relativePath,
                    content,
                    language
                });
            }
        }

        return nodes.sort((a, b) => {
            // Folders first, then alphabetically
            if (a.type === 'folder' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });
    } catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error);
        return [];
    }
}

/**
 * GET /api/v1/files/workspace/tree
 * Get file tree for current workspace (workspace-based, not project-based)
 */
filesRoutes.get('/workspace/tree', requireAuth, async (req, res) => {
    try {
        const workspacePath = req.session.workspacePath || (global as any).currentWorkspacePath;

        if (!workspacePath) {
            return res.status(400).json({ message: 'No workspace loaded' });
        }

        // Check if workspace exists
        try {
            await fs.access(workspacePath);
        } catch {
            return res.status(404).json({ message: 'Workspace not found' });
        }

        const files = await buildFileTree(workspacePath);
        res.json({ files });
    } catch (error) {
        console.error('List workspace files error:', error);
        res.status(500).json({ message: 'Failed to list files' });
    }
});

/**
 * GET /api/v1/files/:projectId/tree
 * Get file tree for a project
 */
filesRoutes.get('/:projectId/tree', requireAuth, async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.session.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        // Validate project ID
        const projectValidation = projectIdSchema.safeParse(projectId);
        if (!projectValidation.success) {
            return res.status(400).json({ message: 'Invalid project ID', errors: projectValidation.error });
        }

        const projectPath = path.join(
            process.cwd(),
            'workspaces',
            `user-${userId}`,
            projectId
        );

        // Check if project exists
        try {
            await fs.access(projectPath);
        } catch {
            return res.status(404).json({ message: 'Project not found' });
        }

        const files = await buildFileTree(projectPath);
        res.json({ files });
    } catch (error) {
        console.error('List files error:', error);
        res.status(500).json({ message: 'Failed to list files' });
    }
});

/**
 * POST /api/v1/files/save
 * Save file content
 */
filesRoutes.post('/save', requireAuth, async (req, res) => {
    try {
        // Validate input
        const validation = fileSaveSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ message: 'Invalid input', errors: validation.error });
        }

        const { path: filePath, content } = validation.data;
        const userId = req.session.userId;
        const projectId = req.session.activeProjectId;
        const workspacePath = (req.session as any).workspacePath || (global as any).currentWorkspacePath;

        if (!userId && !workspacePath) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        let projectRoot: string | null = null;

        if (userId && projectId) {
            projectRoot = path.join(
                process.cwd(),
                'workspaces',
                `user-${userId}`,
                projectId
            );
        } else if (workspacePath) {
            projectRoot = workspacePath;
        }

        if (!projectRoot) {
            return res.status(400).json({ message: 'No active project or workspace' });
        }

        // Sanitize path to prevent traversal
        const fullPath = sanitizeFilePath(filePath, projectRoot);

        // Ensure directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });

        // Write file
        await fs.writeFile(fullPath, content, 'utf-8');

        // Log to activity timeline
        timeline.log('file_edit', `Saved file ${filePath}`, {
            path: filePath,
            projectId,
            userId,
            workspacePath: projectId ? undefined : workspacePath
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Save file error:', error);
        const message = error instanceof Error ? error.message : 'Failed to save file';
        res.status(500).json({ message });
    }
});

/**
 * POST /api/v1/files/create
 * Create new file or folder
 */
filesRoutes.post('/create', requireAuth, async (req, res) => {
    try {
        // Validate input
        const validation = fileCreateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ message: 'Invalid input', errors: validation.error });
        }

        const { path: filePath, type } = validation.data;
        const userId = req.session.userId;
        const projectId = req.session.activeProjectId;
        const workspacePath = (req.session as any).workspacePath || (global as any).currentWorkspacePath;

        if (!userId && !workspacePath) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        let projectRoot: string | null = null;

        if (userId && projectId) {
            projectRoot = path.join(
                process.cwd(),
                'workspaces',
                `user-${userId}`,
                projectId
            );
        } else if (workspacePath) {
            projectRoot = workspacePath;
        }

        if (!projectRoot) {
            return res.status(400).json({ message: 'No active project or workspace' });
        }

        // Sanitize path
        const fullPath = sanitizeFilePath(filePath, projectRoot);

        if (type === 'folder') {
            await fs.mkdir(fullPath, { recursive: true });
        } else {
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            await fs.writeFile(fullPath, '', 'utf-8');
        }

        // Log to activity timeline
        timeline.log('file_create', `Created ${type} ${filePath}`, {
            path: filePath,
            projectId,
            userId,
            workspacePath: projectId ? undefined : workspacePath,
            kind: type
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Create file error:', error);
        const message = error instanceof Error ? error.message : 'Failed to create file';
        res.status(500).json({ message });
    }
});

/**
 * POST /api/v1/files/rename
 * Rename file or folder
 */
filesRoutes.post('/rename', requireAuth, async (req, res) => {
    try {
        // Validate input
        const validation = fileRenameSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ message: 'Invalid input', errors: validation.error });
        }

        const { oldPath, newPath } = validation.data;
        const userId = req.session.userId;
        const projectId = req.session.activeProjectId;
        const workspacePath = (req.session as any).workspacePath || (global as any).currentWorkspacePath;

        if (!userId && !workspacePath) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        let projectRoot: string | null = null;

        if (userId && projectId) {
            projectRoot = path.join(process.cwd(), 'workspaces', `user-${userId}`, projectId);
        } else if (workspacePath) {
            projectRoot = workspacePath;
        }

        if (!projectRoot) {
            return res.status(400).json({ message: 'No active project or workspace' });
        }

        // Sanitize both paths
        const oldFullPath = sanitizeFilePath(oldPath, projectRoot);
        const newFullPath = sanitizeFilePath(newPath, projectRoot);

        await fs.rename(oldFullPath, newFullPath);

        // Log to activity timeline (as an edit)
        timeline.log('file_edit', `Renamed ${oldPath} to ${newPath}`, {
            oldPath,
            newPath,
            projectId,
            userId,
            workspacePath: projectId ? undefined : workspacePath
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Rename file error:', error);
        const message = error instanceof Error ? error.message : 'Failed to rename file';
        res.status(500).json({ message });
    }
});

/**
 * POST /api/v1/files/delete
 * Delete file or folder
 */
filesRoutes.post('/delete', requireAuth, async (req, res) => {
    try {
        // Validate input
        const validation = fileDeleteSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ message: 'Invalid input', errors: validation.error });
        }

        const { path: filePath } = validation.data;
        const userId = req.session.userId;
        const projectId = req.session.activeProjectId;
        const workspacePath = (req.session as any).workspacePath || (global as any).currentWorkspacePath;

        if (!userId && !workspacePath) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        let projectRoot: string | null = null;

        if (userId && projectId) {
            projectRoot = path.join(process.cwd(), 'workspaces', `user-${userId}`, projectId);
        } else if (workspacePath) {
            projectRoot = workspacePath;
        }

        if (!projectRoot) {
            return res.status(400).json({ message: 'No active project or workspace' });
        }

        // Sanitize path
        const fullPath = sanitizeFilePath(filePath, projectRoot);

        const stats = await fs.stat(fullPath);
        const isDirectory = stats.isDirectory();
        if (isDirectory) {
            await fs.rm(fullPath, { recursive: true });
        } else {
            await fs.unlink(fullPath);
        }

        // Log to activity timeline
        timeline.log('file_delete', `Deleted ${filePath}`, {
            path: filePath,
            projectId,
            userId,
            workspacePath: projectId ? undefined : workspacePath,
            isDirectory
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Delete file error:', error);
        const message = error instanceof Error ? error.message : 'Failed to delete file';
        res.status(500).json({ message });
    }
});

