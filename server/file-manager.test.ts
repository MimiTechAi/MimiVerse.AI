import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileManager } from './file-manager';
import fs from 'fs/promises';
import path from 'path';

// Mock WebSocket class
class MockWebSocket {
  private listeners: Map<string, Function[]> = new Map();

  broadcast(message: any) {
    const listeners = this.listeners.get('broadcast') || [];
    listeners.forEach(listener => listener(message));
  }

  sendError(error: string) {
    const listeners = this.listeners.get('error') || [];
    listeners.forEach(listener => listener(error));
  }

  on(event: string, listener: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }
}

describe('FileManager', () => {
  let fileManager: FileManager;
  let mockWs: MockWebSocket;
  let testDir: string;

  beforeEach(async () => {
    mockWs = new MockWebSocket();
    fileManager = new FileManager(mockWs as any);
    
    // Create temporary test directory
    testDir = path.join(process.cwd(), 'test-temp-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup
    fileManager.cleanup();
    
    // Remove test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('writeFile', () => {
    it('should write a file successfully', async () => {
      const filePath = 'test.txt';
      const content = 'Hello, World!';
      
      await fileManager.writeFile(filePath, content);
      
      const result = await fileManager.readFile(filePath);
      expect(result).toBe(content);
    });

    it('should create directory if it does not exist', async () => {
      const filePath = 'subdir/test.txt';
      const content = 'Test content';
      
      await fileManager.writeFile(filePath, content);
      
      const result = await fileManager.readFile(filePath);
      expect(result).toBe(content);
    });

    it('should broadcast file change event', async () => {
      const filePath = 'test.txt';
      const content = 'Hello, World!';
      
      const broadcastSpy = vi.spyOn(mockWs, 'broadcast');
      
      await fileManager.writeFile(filePath, content);
      
      expect(broadcastSpy).toHaveBeenCalledWith({
        type: 'file_change',
        data: {
          path: filePath,
          changeType: expect.stringMatching(/create|update/),
          content,
          timestamp: expect.any(Number)
        }
      });
    });
  });

  describe('readFile', () => {
    it('should read an existing file', async () => {
      const filePath = 'test.txt';
      const content = 'Test content';
      
      await fileManager.writeFile(filePath, content);
      const result = await fileManager.readFile(filePath);
      
      expect(result).toBe(content);
    });

    it('should throw error for non-existent file', async () => {
      const filePath = 'non-existent.txt';
      
      await expect(fileManager.readFile(filePath)).rejects.toThrow('Failed to read file');
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      const filePath = 'test.txt';
      const content = 'Test content';
      
      await fileManager.writeFile(filePath, content);
      await fileManager.deleteFile(filePath);
      
      await expect(fileManager.readFile(filePath)).rejects.toThrow('Failed to read file');
    });

    it('should broadcast deletion event', async () => {
      const filePath = 'test.txt';
      const content = 'Test content';
      
      await fileManager.writeFile(filePath, content);
      
      const broadcastSpy = vi.spyOn(mockWs, 'broadcast');
      
      await fileManager.deleteFile(filePath);
      
      expect(broadcastSpy).toHaveBeenCalledWith({
        type: 'file_change',
        data: {
          path: filePath,
          changeType: 'delete',
          timestamp: expect.any(Number)
        }
      });
    });
  });

  describe('moveFile', () => {
    it('should move/rename a file successfully', async () => {
      const oldPath = 'old.txt';
      const newPath = 'new.txt';
      const content = 'Test content';
      
      await fileManager.writeFile(oldPath, content);
      await fileManager.moveFile(oldPath, newPath);
      
      const result = await fileManager.readFile(newPath);
      expect(result).toBe(content);
      
      await expect(fileManager.readFile(oldPath)).rejects.toThrow('Failed to read file');
    });

    it('should broadcast move events', async () => {
      const oldPath = 'old.txt';
      const newPath = 'new.txt';
      const content = 'Test content';
      
      await fileManager.writeFile(oldPath, content);
      
      const broadcastSpy = vi.spyOn(mockWs, 'broadcast');
      
      await fileManager.moveFile(oldPath, newPath);
      
      expect(broadcastSpy).toHaveBeenCalledWith({
        type: 'file_change',
        data: {
          path: oldPath,
          changeType: 'delete',
          timestamp: expect.any(Number)
        }
      });
      
      expect(broadcastSpy).toHaveBeenCalledWith({
        type: 'file_change',
        data: {
          path: newPath,
          changeType: 'create',
          timestamp: expect.any(Number)
        }
      });
    });
  });

  describe('writeFiles', () => {
    it('should write multiple files successfully', async () => {
      const files = [
        { path: 'file1.txt', content: 'Content 1' },
        { path: 'file2.txt', content: 'Content 2' }
      ];
      
      await fileManager.writeFiles(files);
      
      const result1 = await fileManager.readFile('file1.txt');
      const result2 = await fileManager.readFile('file2.txt');
      
      expect(result1).toBe('Content 1');
      expect(result2).toBe('Content 2');
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const filePath = 'test.txt';
      const content = 'Test content';
      
      await fileManager.writeFile(filePath, content);
      
      const exists = await fileManager.fileExists(filePath);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const filePath = 'non-existent.txt';
      
      const exists = await fileManager.fileExists(filePath);
      expect(exists).toBe(false);
    });
  });

  describe('getFileStats', () => {
    it('should return file stats', async () => {
      const filePath = 'test.txt';
      const content = 'Test content';
      
      await fileManager.writeFile(filePath, content);
      
      const stats = await fileManager.getFileStats(filePath);
      
      expect(stats).toEqual({
        size: expect.any(Number),
        modified: expect.any(Date),
        isFile: true,
        isDirectory: false
      });
    });
  });

  describe('path validation', () => {
    it('should prevent path traversal attacks', async () => {
      const maliciousPath = '../../../etc/passwd';
      
      await expect(fileManager.writeFile(maliciousPath, 'test')).rejects.toThrow('Path traversal detected');
    });

    it('should prevent absolute paths', async () => {
      const absolutePath = '/etc/passwd';
      
      await expect(fileManager.writeFile(absolutePath, 'test')).rejects.toThrow('Path traversal detected');
    });

    it('should allow relative paths within workspace', async () => {
      const validPath = 'subdir/file.txt';
      const content = 'Test content';
      
      await expect(fileManager.writeFile(validPath, content)).resolves.not.toThrow();
    });
  });

  describe('user workspace isolation', () => {
    it('should use user-specific workspace paths', () => {
      const userId = 'test-user-123';
      const workspacePath = fileManager.getUserWorkspacePath(userId);
      
      expect(workspacePath).toContain('user-test-user-123');
    });
  });

  describe('file watching', () => {
    it('should create file watcher', () => {
      const watchPath = 'test-dir';
      
      const watcher = fileManager.createFileWatcher(watchPath);
      
      expect(watcher).toBeDefined();
    });

    it('should stop file watcher', () => {
      const watchPath = 'test-dir';
      const watcher = fileManager.createFileWatcher(watchPath);
      
      fileManager.stopFileWatcher(watchPath);
      
      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', () => {
      fileManager.createFileWatcher('test1');
      fileManager.createFileWatcher('test2');
      
      expect(() => fileManager.cleanup()).not.toThrow();
    });
  });
});
