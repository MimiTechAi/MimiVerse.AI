export type MCPTransportType = 'http-json';

export interface MCPServerConfig {
  id: string;
  name: string;
  description?: string;
  type: MCPTransportType;
  baseUrl: string;
  toolsEndpoint?: string;
  enabled: boolean;
}

export interface MCPToolDefinition {
  id: string;
  serverId: string;
  name: string;
  description?: string;
  enabled: boolean;
}

export interface MCPInvokeOptions {
  timeoutMs?: number;
}
