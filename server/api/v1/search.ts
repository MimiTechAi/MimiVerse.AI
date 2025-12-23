import { Router } from 'express';
import { requireAuth } from '../../auth/middleware';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
export const searchRoutes = Router();

interface SearchResult {
    file: string;
    line: number;
    column: number;
    match: string;
    context: string;
}

// POST /api/v1/search
searchRoutes.post('/', requireAuth, async (req, res) => {
    try {
        const { query, caseSensitive, isRegex, filePattern } = req.body;
        const userId = req.session.userId;
        const projectId = req.session.activeProjectId || 'mimiverse';

        if (!query || query.trim().length === 0) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const projectPath = path.join(process.cwd(), 'workspaces', `user-${userId}`, projectId);

        // Build ripgrep command
        let rgArgs = [
            'rg',
            '--json',
            '--line-number',
            '--column',
            '--max-count', '100', // Limit results per file
        ];

        if (!caseSensitive) {
            rgArgs.push('--ignore-case');
        }

        if (!isRegex) {
            rgArgs.push('--fixed-strings');
        }

        if (filePattern) {
            rgArgs.push('--glob', filePattern);
        }

        // Exclude common directories
        rgArgs.push('--glob', '!node_modules/**');
        rgArgs.push('--glob', '!dist/**');
        rgArgs.push('--glob', '!build/**');
        rgArgs.push('--glob', '!.git/**');

        rgArgs.push('--', query, projectPath);

        const { stdout } = await execAsync(rgArgs.join(' '), {
            maxBuffer: 10 * 1024 * 1024, // 10MB
            timeout: 10000 // 10 seconds timeout
        });

        // Parse ripgrep JSON output
        const results: SearchResult[] = [];
        const lines = stdout.split('\n').filter(l => l.trim());

        for (const line of lines) {
            try {
                const parsed = JSON.parse(line);
                if (parsed.type === 'match') {
                    const data = parsed.data;
                    results.push({
                        file: data.path.text,
                        line: data.line_number,
                        column: data.submatches[0]?.start || 0,
                        match: data.lines.text.trim(),
                        context: data.lines.text
                    });
                }
            } catch (e) {
                // Skip invalid JSON lines
            }
        }

        res.json({
            results,
            total: results.length,
            query
        });
    } catch (error: any) {
        // ripgrep returns exit code 1 when no matches found
        if (error.code === 1) {
            return res.json({ results: [], total: 0, query: req.body.query });
        }

        console.error('Search error:', error);
        res.status(500).json({ message: 'Search failed', error: error.message });
    }
});
