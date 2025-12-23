import { Router } from 'express';
import { getAllTools, setToolEnabled } from '../../ai/mcp/mcp-registry';
import { listMcpServers, enableMcpServer, disableMcpServer } from '../../ai/mcp/mcp-docker';
import { requireAuth } from '../../auth/middleware';

export const mcpRoutes = Router();

mcpRoutes.get('/tools', (_req, res) => {
  const tools = getAllTools();
  res.json({ tools });
});

mcpRoutes.post('/tools/:id/enable', (req, res) => {
  const toolId = req.params.id;
  const tool = setToolEnabled(toolId, true);

  if (!tool) {
    return res.status(404).json({ message: 'Tool not found' });
  }

  res.json({ tool });
});

// ========= MCP Servers (Docker MCP Catalog) =========

mcpRoutes.get('/servers', requireAuth, async (_req, res) => {
  try {
    const servers = await listMcpServers();
    res.json({ servers });
  } catch (error: any) {
    const message = error?.message || String(error);

    // Graceful degradation: if docker or docker-mcp is not available,
    // don't hard-fail the UI – return an empty list with a warning.
    if (
      (error && (error.code === 'ENOENT' || error.code === 'EACCES')) ||
      /docker.*mcp/i.test(message) ||
      /not\s+found/i.test(message)
    ) {
      return res.json({
        servers: [],
        warning: 'docker mcp is not available on this system. Install docker-mcp to manage MCP servers.',
        error: message,
      });
    }

    res.status(500).json({
      message: 'Failed to list MCP servers via docker mcp',
      error: message,
    });
  }
});

mcpRoutes.post('/servers/:name/enable', requireAuth, async (req, res) => {
  const { name } = req.params;
  try {
    await enableMcpServer(name);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({
      message: `Failed to enable MCP server ${name}`,
      error: error?.message || String(error),
    });
  }
});

mcpRoutes.post('/servers/:name/disable', requireAuth, async (req, res) => {
  const { name } = req.params;
  try {
    await disableMcpServer(name);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({
      message: `Failed to disable MCP server ${name}`,
      error: error?.message || String(error),
    });
  }
});

mcpRoutes.post('/tools/:id/disable', (req, res) => {
  const toolId = req.params.id;
  const tool = setToolEnabled(toolId, false);

  if (!tool) {
    return res.status(404).json({ message: 'Tool not found' });
  }

  res.json({ tool });
});
