import { Router } from 'express';

export const workspaceRouter = Router();

workspaceRouter.get('/current', (req, res) => {
    // Return session workspace or global fallback
    const path = req.session.workspacePath || (global as any).currentWorkspacePath;
    res.json({ path, workspace: path });
});

workspaceRouter.post('/set', (req, res) => {
    const { path } = req.body;
    if (!path) {
        return res.status(400).json({ message: 'Path is required' });
    }

    // Set in session and global
    req.session.workspacePath = path;
    (global as any).currentWorkspacePath = path;

    req.session.save((err) => {
        if (err) {
            console.error('Failed to save session:', err);
            return res.status(500).json({ message: 'Failed to save session' });
        }
        res.json({ success: true, path });
    });
});
