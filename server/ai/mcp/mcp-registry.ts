import { MCPServerConfig, MCPToolDefinition } from './mcp-types';
import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';

const serverConfigs: MCPServerConfig[] = [
  {
    id: 'local-mcp',
    name: 'Local MCP Server',
    type: 'http-json',
    baseUrl: process.env.MCP_LOCAL_SERVER_URL || 'http://localhost:8080',
    toolsEndpoint: '/tools/invoke',
    enabled: false,
    description: 'Default local MCP-compatible server'
  }
];

const toolConfigs: MCPToolDefinition[] = [];

function loadToolsFromConfig() {
  try {
    const configPath = process.env.MCP_TOOLS_CONFIG_PATH
      || path.join(process.cwd(), 'config', 'mcp-tools.json');

    if (!fs.existsSync(configPath)) {
      return;
    }

    const raw = fs.readFileSync(configPath, 'utf-8');
    if (!raw.trim()) return;

    const parsed = JSON.parse(raw) as MCPToolDefinition[];
    if (!Array.isArray(parsed)) {
      logger.warn('MCP tools config is not an array, ignoring', { configPath });
      return;
    }

    for (const tool of parsed) {
      if (!tool || typeof tool.id !== 'string' || typeof tool.serverId !== 'string') {
        logger.warn('Skipping invalid MCP tool entry from config', { tool });
        continue;
      }
      registerTool(tool);
    }

    logger.info('Loaded MCP tools from config', {
      configPath,
      count: parsed.length,
    });
  } catch (error: any) {
    logger.error('Failed to load MCP tools config', {
      error: error?.message || String(error),
    });
  }
}

export function getServers(): MCPServerConfig[] {
  return serverConfigs.slice();
}

export function getServerById(id: string): MCPServerConfig | undefined {
  return serverConfigs.find((server) => server.id === id);
}

export function getAllTools(): MCPToolDefinition[] {
  return toolConfigs.slice();
}

export function getToolById(id: string): MCPToolDefinition | undefined {
  return toolConfigs.find((tool) => tool.id === id);
}

export function registerTool(tool: MCPToolDefinition): void {
  const existingIndex = toolConfigs.findIndex((t) => t.id === tool.id);
  if (existingIndex >= 0) {
    toolConfigs[existingIndex] = tool;
  } else {
    toolConfigs.push(tool);
  }
}

export function setToolEnabled(id: string, enabled: boolean): MCPToolDefinition | undefined {
  const tool = toolConfigs.find((t) => t.id === id);
  if (!tool) {
    return undefined;
  }
  tool.enabled = enabled;
  return tool;
}

registerTool({
  id: 'local-mcp:example',
  serverId: 'local-mcp',
  name: 'example',
  description: 'Example MCP tool placeholder',
  enabled: false
});

// Optionally extend with tools defined in a JSON config file so that
// real MCP tools from the Docker MCP Catalog (or custom servers) can be
// registered without code changes.
loadToolsFromConfig();
