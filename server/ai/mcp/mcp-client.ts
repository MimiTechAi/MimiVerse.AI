import axios from 'axios';
import { MCPInvokeOptions } from './mcp-types';
import { getServerById, getToolById } from './mcp-registry';

export async function invokeMcpTool(
  toolId: string,
  input: unknown,
  options: MCPInvokeOptions = {}
): Promise<unknown> {
  const tool = getToolById(toolId);
  if (!tool || !tool.enabled) {
    throw new Error(`MCP tool "${toolId}" is not registered or not enabled`);
  }

  const server = getServerById(tool.serverId);
  if (!server || !server.enabled) {
    throw new Error(`MCP server "${tool.serverId}" is not available or not enabled`);
  }

  const timeout = options.timeoutMs ?? 60000;
  const endpoint = server.toolsEndpoint || '/tools/invoke';
  const base = server.baseUrl.replace(/\/+$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${base}${path}`;

  const response = await axios.post(
    url,
    {
      tool: tool.name,
      input
    },
    {
      timeout
    }
  );

  return response.data;
}
