import { Router } from 'express';
import { requireAuth } from '../../auth/middleware';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const projectRoutes = Router();

// GET /api/v1/projects - List user's projects
projectRoutes.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const userWorkspace = path.join(process.cwd(), 'workspaces', `user-${userId}`);

        // Create workspace if it doesn't exist
        if (!fs.existsSync(userWorkspace)) {
            fs.mkdirSync(userWorkspace, { recursive: true });
            return res.json({ projects: [] });
        }

        const projects = fs.readdirSync(userWorkspace, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => ({
                id: dirent.name,
                name: dirent.name,
                path: path.join(userWorkspace, dirent.name)
            }));

        res.json({ projects });
    } catch (error: unknown) {
        console.error('List projects error:', error);
        res.status(500).json({ message: 'Failed to list projects' });
    }
});

// POST /api/v1/projects/clone - Clone a Git repository into the user's workspace
projectRoutes.post('/clone', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { url, name } = req.body as { url?: string; name?: string };

        if (!url || typeof url !== 'string' || !url.trim()) {
            return res.status(400).json({ message: 'Git URL is required' });
        }

        // Derive projectId from optional name or repo name in URL
        let projectId = typeof name === 'string' && name.trim()
            ? name.trim()
            : url.split('/').filter(Boolean).pop() || 'project';

        // Strip .git suffix if present
        if (projectId.endsWith('.git')) {
            projectId = projectId.slice(0, -4);
        }

        // Sanitize projectId to avoid weird characters
        projectId = projectId.replace(/[^a-zA-Z0-9_-]/g, '-');

        const userWorkspace = path.join(process.cwd(), 'workspaces', `user-${userId}`);
        const projectPath = path.join(userWorkspace, projectId);

        if (!fs.existsSync(userWorkspace)) {
            fs.mkdirSync(userWorkspace, { recursive: true });
        }

        if (fs.existsSync(projectPath)) {
            return res.status(409).json({ message: 'Project directory already exists', projectId });
        }

        // Clone repository
        const cloneCmd = `git clone --depth 1 ${JSON.stringify(url)} ${JSON.stringify(projectId)}`;

        try {
            await execAsync(cloneCmd, { cwd: userWorkspace });
        } catch (error: any) {
            console.error('Git clone failed:', error?.stderr || error?.message || error);
            return res.status(500).json({ message: 'Git clone failed', error: error?.message || String(error) });
        }

        // Set active project and workspace in session
        req.session.activeProjectId = projectId;
        (req.session as any).workspacePath = projectPath;
        (global as any).currentWorkspacePath = projectPath;

        await new Promise<void>((resolve, reject) => {
            req.session.save((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        res.json({ success: true, projectId, path: projectPath });
    } catch (error: unknown) {
        console.error('Clone project error:', error);
        const message = error instanceof Error ? error.message : 'Failed to clone project';
        res.status(500).json({ message });
    }
});

// POST /api/v1/projects - Create new project
projectRoutes.post('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Project name required' });
        }

        const userWorkspace = path.join(process.cwd(), 'workspaces', `user-${userId}`);
        const projectPath = path.join(userWorkspace, name);

        if (fs.existsSync(projectPath)) {
            return res.status(409).json({ message: 'Project already exists' });
        }

        fs.mkdirSync(projectPath, { recursive: true });
        res.json({ id: name, name, path: projectPath });
    } catch (error: unknown) {
        console.error('Create project error:', error);
        res.status(500).json({ message: 'Failed to create project' });
    }
});

// POST /api/v1/projects/:id/open - Open project (set active)
projectRoutes.post('/:id/open', requireAuth, async (req, res) => {
    try {
        const userId = req.session.userId;
        const projectId = req.params.id;

        if (!userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const projectPath = path.join(process.cwd(), 'workspaces', `user-${userId}`, projectId);

        if (!fs.existsSync(projectPath)) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Set active project in session
        req.session.activeProjectId = projectId;

        res.json({
            success: true,
            projectId,
            projectPath
        });
    } catch (error: unknown) {
        console.error('Open project error:', error);
        res.status(500).json({ message: 'Failed to open project' });
    }
});
