import { execFile } from 'child_process';
import util from 'util';
import { logger } from '../../utils/logger';

const execFileAsync = util.promisify(execFile);

export interface McpServerInfo {
  name: string;
  enabled: boolean;
  rawStatus: string;
}

async function runDockerMcp(args: string[]): Promise<string> {
  const { stdout, stderr } = await execFileAsync('docker', ['mcp', ...args], {
    maxBuffer: 10 * 1024 * 1024,
  });

  if (stderr && stderr.trim()) {
    logger.debug('docker mcp stderr', { stderr: stderr.trim(), args });
  }

  return stdout.toString();
}

export async function listMcpServers(): Promise<McpServerInfo[]> {
  try {
    const stdout = await runDockerMcp(['server', 'ls']);
    const lines = stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const servers: McpServerInfo[] = [];

    for (const line of lines) {
      // Skip obvious headers or separators
      if (/^name/i.test(line) || /^server/i.test(line) || /^-+$/.test(line)) continue;

      const [name, statusRaw] = line.split(/\s+/);
      if (!name) continue;

      const rawStatus = statusRaw || '';
      const enabled = /enabled|active|true/i.test(rawStatus);

      servers.push({ name, enabled, rawStatus });
    }

    return servers;
  } catch (error: any) {
    logger.error('Failed to list MCP servers via docker mcp', {
      error: error?.message || String(error),
    });
    throw error;
  }
}

export async function enableMcpServer(name: string): Promise<void> {
  try {
    await runDockerMcp(['server', 'enable', name]);
    logger.info('Enabled MCP server', { name });
  } catch (error: any) {
    logger.error('Failed to enable MCP server', {
      name,
      error: error?.message || String(error),
    });
    throw error;
  }
}

export async function disableMcpServer(name: string): Promise<void> {
  try {
    await runDockerMcp(['server', 'disable', name]);
    logger.info('Disabled MCP server', { name });
  } catch (error: any) {
    logger.error('Failed to disable MCP server', {
      name,
      error: error?.message || String(error),
    });
    throw error;
  }
}
