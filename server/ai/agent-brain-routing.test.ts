import { describe, it, expect, vi } from 'vitest';
import { AgentBrain } from './brain';

vi.mock('./utils/ollama', () => ({
  generateCompletion: vi.fn(),
  streamChat: vi.fn(),
  generateEmbedding: vi.fn(),
}));

vi.mock('./mcp/mcp-registry', () => ({
  getAllTools: vi.fn(() => []),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('./mentions', () => ({
  MentionsParser: vi.fn().mockImplementation(() => ({
    processMessage: vi.fn((msg: string) => Promise.resolve(msg)),
  })),
}));

describe('AgentBrain.routeToTool', () => {
  it('falls back to chat when routing model call fails', async () => {
    const { generateCompletion } = await import('./utils/ollama');
    (generateCompletion as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('routing failed'),
    );

    const brain = new AgentBrain(process.cwd());
    const result = await (brain as any).routeToTool('test message');

    expect(result.tool).toBe('chat');
  });

  it('uses selected core tool when known', async () => {
    const { generateCompletion } = await import('./utils/ollama');
    (generateCompletion as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify({
        thinking: 't',
        tool: 'edit_file',
        reasoning: 'need to modify files',
      }),
    );

    const brain = new AgentBrain(process.cwd());
    const result = await (brain as any).routeToTool('please edit this file', 'BUILD');

    expect(result.tool).toBe('edit_file');
  });

  it('never returns destructive build tools in CHAT mode even if model suggests them', async () => {
    const { generateCompletion } = await import('./utils/ollama');
    (generateCompletion as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify({
        thinking: 't',
        tool: 'edit_file',
        reasoning: 'wants to modify files',
      }),
    );

    const brain = new AgentBrain(process.cwd());
    const result = await (brain as any).routeToTool('please edit this file', 'CHAT');

    expect(result.tool).toBe('chat');
  });

  it('allows create_project in BUILD mode when suggested by the model', async () => {
    const { generateCompletion } = await import('./utils/ollama');
    (generateCompletion as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify({
        thinking: 't',
        tool: 'create_project',
        reasoning: 'user asked to build a new app',
      }),
    );

    const brain = new AgentBrain(process.cwd());
    const result = await (brain as any).routeToTool('Bau mir ein neues Next.js-Projekt', 'BUILD');

    expect(result.tool).toBe('create_project');
  });

  it('falls back to chat when model suggests unknown tool', async () => {
    const { generateCompletion } = await import('./utils/ollama');
    (generateCompletion as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify({
        thinking: 't',
        tool: 'unknown_tool',
        reasoning: 'invalid suggestion',
      }),
    );

    const brain = new AgentBrain(process.cwd());
    const result = await (brain as any).routeToTool('some message');

    expect(result.tool).toBe('chat');
  });

  it('falls back to chat when response contains no JSON', async () => {
    const { generateCompletion } = await import('./utils/ollama');
    (generateCompletion as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      'some non-JSON response without braces',
    );

    const brain = new AgentBrain(process.cwd());
    const result = await (brain as any).routeToTool('just talk to me');

    expect(result.tool).toBe('chat');
    expect(result.thinking).toContain('Failed to parse routing decision');
  });

  it('logs routing decision for MCP tools', async () => {
    const { generateCompletion } = await import('./utils/ollama');
    (generateCompletion as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify({
        thinking: 't',
        tool: 'serverA:fs',
        reasoning: 'needs filesystem access',
      }),
    );

    const { getAllTools } = await import('./mcp/mcp-registry');
    (getAllTools as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      { id: 'serverA:fs', description: 'Filesystem MCP tool', serverId: 'serverA', enabled: true },
    ]);

    const { logger } = await import('../utils/logger');

    const brain = new AgentBrain(process.cwd());
    const result = await (brain as any).routeToTool('list project files');

    expect(result.tool).toBe('serverA:fs');
    expect(logger.info).toHaveBeenCalledWith(
      'Routing decision',
      expect.objectContaining({
        tool: 'serverA:fs',
        pickedTool: 'serverA:fs',
        hasMcpTool: true,
      }),
    );
  });

  it('prefers search_codebase before edit_file for broad refactors in BUILD mode', async () => {
    const { generateCompletion } = await import('./utils/ollama');
    (generateCompletion as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify({
        thinking: 't',
        tool: 'edit_file',
        reasoning: 'needs global refactor across the codebase',
      }),
    );

    const brain = new AgentBrain(process.cwd());
    const result = await (brain as any).routeToTool(
      'Refactor this pattern in all files of the project',
      'BUILD',
    );

    expect(result.tool).toBe('search_codebase');
  });

  it('processMessage uses chat when routing selects chat', async () => {
    const { generateCompletion } = await import('./utils/ollama');
    (generateCompletion as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      JSON.stringify({
        thinking: 't',
        tool: 'chat',
        reasoning: 'simple conversation',
      }),
    );

    const brain = new AgentBrain(process.cwd());
    const result = await brain.processMessage('hello');

    expect(result.tool).toBeUndefined();
    expect(result.message).toBe('simple conversation');
    expect(result.thinking).toBe('t');
  });
});
