// 🔴 CRITICAL: WebSocket Message Validation Implementation
import { z } from 'zod';

// WebSocket Message Schema with comprehensive validation
export const WSMessageSchema = z.object({
  id: z.string()
    .min(1, 'Message ID is required')
    .max(100, 'Message ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Message ID contains invalid characters'),
  
  type: z.enum([
    'status',           // Agent status updates
    'thinking',         // Agent thinking process
    'tool_use',        // Tool execution
    'file_change',      // File system operations
    'test_result',      // Test execution results
    'error',           // Error notifications
    'completion',       // Task completion
    'heartbeat'        // Connection health
  ], {
    errorMap: (issue) => ({
      message: issue.message || 'Invalid message type'
    })
  }),
  
  createdAt: z.number()
    .int('Timestamp must be integer')
    .min(Date.now() - 24 * 60 * 60 * 1000, 'Timestamp too old (more than 24 hours)')
    .max(Date.now() + 60000, 'Timestamp cannot be more than 1 minute in future'),
  
  data: z.any().optional()
});

// Type definitions
export type WSMessage = z.infer<typeof WSMessageSchema>;
export type MessageType = WSMessage['type'];

// Security patterns for content validation
const SUSPICIOUS_PATTERNS = [
  /rm\s+-rf\s+\//gi,                    // Dangerous file deletion
  /sudo\s+/gi,                               // Privilege escalation
  /chmod\s+777/gi,                         // Dangerous permissions
  />\s*script/gi,                             // XSS attempts
  /javascript:/gi,                             // JavaScript URLs
  /data:text\/html/gi,                         // HTML data URLs
  /eval\s*\(/gi,                              // Code execution
  /exec\s*\(/gi,                              // Command execution
  /\$\(/gi,                                   // Command substitution
];

const SCRIPT_INJECTION_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,                           // Event handlers
  /eval\s*\(/gi,
  /setTimeout\s*\(/gi,
  /setInterval\s*\(/gi,
];

// Message size limits
const MAX_MESSAGE_SIZE = 50 * 1024; // 50KB
const MAX_DATA_SIZE = 10 * 1024;  // 10KB for data field

/**
 * 🔴 CRITICAL: Comprehensive WebSocket Message Validation
 * Validates structure, security, and performance constraints
 */
export function validateWSMessage(message: unknown): WSMessage {
  // Type validation first for security
  if (typeof message !== 'object' || message === null) {
    throw new Error('Message must be an object');
  }

  // Quick security check before schema validation
  performSecurityPreCheck(message);

  // Schema validation
  const result = WSMessageSchema.safeParse(message);
  
  if (!result.success) {
    const errorDetails = result.error.errors.map(err => 
      `${err.path.join('.')}: ${err.message}`
    ).join(', ');
    throw new Error(`Validation failed: ${errorDetails}`);
  }

  const validatedMessage = result.data;

  // Additional security checks
  validateContentSecurity(validatedMessage);
  
  // Performance checks
  validateMessageSize(validatedMessage);

  // Normalize timestamp
  validatedMessage.createdAt = Math.min(validatedMessage.createdAt, Date.now());

  return validatedMessage;
}

/**
 * Pre-validation security check to catch obvious attacks early
 */
function performSecurityPreCheck(message: any): void {
  // Check for suspicious patterns in top-level fields
  const messageStr = JSON.stringify(message);
  
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(messageStr)) {
      throw new Error('Suspicious content detected');
    }
  }
}

/**
 * Content security validation for data field
 */
function validateContentSecurity(message: WSMessage): void {
  if (!message.data) {
    return;
  }

  const dataStr = JSON.stringify(message.data);

  // Check for script injection
  for (const pattern of SCRIPT_INJECTION_PATTERNS) {
    if (pattern.test(dataStr)) {
      throw new Error('Script injection detected');
    }
  }

  // Check for path traversal in data
  if (typeof message.data === 'object' && message.data.path) {
    const path = String(message.data.path);
    if (path.includes('../') || path.includes('..\\') || path.includes('~')) {
      throw new Error('Path traversal detected in message data');
    }
  }

  // Check for command injection
  if (typeof message.data === 'object' && message.data.command) {
    const command = String(message.data.command);
    if (command.includes(';') || command.includes('&&') || command.includes('||')) {
      throw new Error('Command injection detected');
    }
  }
}

/**
 * Message size validation for performance
 */
function validateMessageSize(message: WSMessage): void {
  const messageSize = JSON.stringify(message).length;
  
  if (messageSize > MAX_MESSAGE_SIZE) {
    throw new Error('Message exceeds size limit');
  }

  if (message.data) {
    const dataSize = JSON.stringify(message.data).length;
    if (dataSize > MAX_DATA_SIZE) {
      throw new Error('Message data too large');
    }
  }
}

/**
 * Quick validation for high-throughput scenarios
 * Returns null for invalid messages, validates for valid ones
 */
export function validateWSMessageFast(message: unknown): WSMessage | null {
  try {
    return validateWSMessage(message);
  } catch (error) {
    console.warn('[WebSocket] Fast validation failed:', error);
    return null;
  }
}

/**
 * Batch validation for multiple messages
 */
export function validateWSMessageBatch(messages: unknown[]): WSMessage[] {
  if (!Array.isArray(messages)) {
    throw new Error('Messages must be an array');
  }

  if (messages.length > 100) {
    throw new Error('Too many messages in batch (max: 100)');
  }

  return messages.map((message, index) => {
    try {
      return validateWSMessage(message);
    } catch (error) {
      throw new Error(`Message ${index} validation failed: ${error}`);
    }
  });
}

/**
 * Validate WebSocket connection handshake
 */
export function validateWSHandshake(handshake: unknown): boolean {
  if (typeof handshake !== 'object' || handshake === null) {
    return false;
  }

  const required = ['version', 'sessionId'];
  return required.every(field => field in (handshake as object));
}

/**
 * Get validation statistics for monitoring
 */
export function getValidationStats(message: WSMessage): {
  size: number;
  hasData: boolean;
  complexity: number;
} {
  const size = JSON.stringify(message).length;
  const hasData = !!message.data;
  const complexity = message.data ? Object.keys(message.data).length : 0;

  return { size, hasData, complexity };
}
