import { Router } from 'express';
import { authRoutes } from './auth';
import { projectRoutes } from './projects';
import { filesRoutes } from './files';
import { searchRoutes } from './search';
// Import other route modules as we create them
// import { aiRoutes } from './ai';
// import { gitRoutes } from './git';
import { mcpRoutes } from './mcp';
import { analyticsRoutes } from './analytics';

const v1Router = Router();

// Mount route modules
v1Router.use('/auth', authRoutes);
v1Router.use('/projects', projectRoutes);
v1Router.use('/files', filesRoutes);
v1Router.use('/search', searchRoutes);
v1Router.use('/mcp', mcpRoutes);
v1Router.use('/analytics', analyticsRoutes);
// v1Router.use('/ai', aiRoutes);
// v1Router.use('/git', gitRoutes);

// API version info endpoint
v1Router.get('/', (_req, res) => {
    res.json({
        version: 'v1',
        status: 'stable',
        endpoints: {
            auth: '/api/v1/auth',
            projects: '/api/v1/projects',
            mcp: '/api/v1/mcp',
            analytics: '/api/v1/analytics',
            // ai: '/api/v1/ai',
            // git: '/api/v1/git',
            // files: '/api/v1/files',
        }
    });
});

export default v1Router;
