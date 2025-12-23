// 🔴 CRITICAL: WebSocket Message Validation - TDD First
import { describe, it, expect, beforeEach } from 'vitest';
import { validateWSMessage, WSMessage, WSMessageSchema } from './message-validator';

describe('WebSocket Message Validation - TDD', () => {
  describe('Required Fields Validation', () => {
    it('should reject messages without id', () => {
      const message = { type: 'test', createdAt: Date.now() };
      
      expect(() => validateWSMessage(message)).toThrow('Message ID is required');
    });

    it('should reject messages without type', () => {
      const message = { id: 'test-123', createdAt: Date.now() };
      
      expect(() => validateWSMessage(message)).toThrow('Message type is required');
    });

    it('should reject messages without timestamp', () => {
      const message = { id: 'test-123', type: 'test' };
      
      expect(() => validateWSMessage(message)).toThrow('Message timestamp is required');
    });

    it('should accept valid minimal message', () => {
      const message = {
        id: 'test-123',
        type: 'test',
        createdAt: Date.now()
      };
      
      const result = validateWSMessage(message);
      expect(result).toEqual(message);
    });
  });

  describe('Message Type Validation', () => {
    it('should reject invalid message types', () => {
      const message = {
        id: 'test-123',
        type: 'invalid_type',
        createdAt: Date.now()
      };
      
      expect(() => validateWSMessage(message)).toThrow('Invalid message type');
    });

    it('should accept all valid message types', () => {
      const validTypes = ['status', 'thinking', 'tool_use', 'file_change', 'test_result', 'error'];
      
      validTypes.forEach(type => {
        const message = {
          id: 'test-123',
          type,
          createdAt: Date.now()
        };
        
        expect(() => validateWSMessage(message)).not.toThrow();
      });
    });
  });

  describe('Data Field Validation', () => {
    it('should accept messages without data field', () => {
      const message = {
        id: 'test-123',
        type: 'status',
        createdAt: Date.now()
      };
      
      const result = validateWSMessage(message);
      expect(result.data).toBeUndefined();
    });

    it('should accept messages with data field', () => {
      const data = { state: 'planning', runId: 'run-123' };
      const message = {
        id: 'test-123',
        type: 'status',
        data,
        createdAt: Date.now()
      };
      
      const result = validateWSMessage(message);
      expect(result.data).toEqual(data);
    });

    it('should reject data field that is too large', () => {
      const largeData = 'x'.repeat(1000000); // 1MB string
      const message = {
        id: 'test-123',
        type: 'status',
        data: { content: largeData },
        createdAt: Date.now()
      };
      
      expect(() => validateWSMessage(message)).toThrow('Message data too large');
    });
  });

  describe('Security Validation', () => {
    it('should reject messages with suspicious content', () => {
      const message = {
        id: 'test-123',
        type: 'status',
        data: { command: 'rm -rf /' },
        createdAt: Date.now()
      };
      
      expect(() => validateWSMessage(message)).toThrow('Suspicious content detected');
    });

    it('should reject messages with script injection attempts', () => {
      const message = {
        id: 'test-123',
        type: 'thinking',
        data: { content: '<script>alert("xss")</script>' },
        createdAt: Date.now()
      };
      
      expect(() => validateWSMessage(message)).toThrow('Script injection detected');
    });
  });

  describe('Timestamp Validation', () => {
    it('should reject timestamps in the future', () => {
      const futureTime = Date.now() + 60000; // 1 minute in future
      const message = {
        id: 'test-123',
        type: 'test',
        createdAt: futureTime
      };
      
      expect(() => validateWSMessage(message)).toThrow('Timestamp cannot be in the future');
    });

    it('should reject very old timestamps', () => {
      const oldTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
      const message = {
        id: 'test-123',
        type: 'test',
        createdAt: oldTime
      };
      
      expect(() => validateWSMessage(message)).toThrow('Timestamp too old');
    });
  });

  describe('Schema Compliance', () => {
    it('should return WSMessage type for valid input', () => {
      const message = {
        id: 'test-123',
        type: 'status',
        data: { state: 'planning' },
        createdAt: Date.now()
      };
      
      const result = validateWSMessage(message);
      
      expect(typeof result.id).toBe('string');
      expect(typeof result.type).toBe('string');
      expect(result.data).toBeDefined();
      expect(typeof result.createdAt).toBe('number');
    });

    it('should validate message size limits', () => {
      const message = {
        id: 'test-123',
        type: 'status',
        data: { large: 'x'.repeat(50000) }, // 50KB
        createdAt: Date.now()
      };
      
      expect(() => validateWSMessage(message)).toThrow('Message exceeds size limit');
    });
  });
});
