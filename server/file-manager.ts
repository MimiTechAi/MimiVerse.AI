import { AgentWebSocket } from './websocket';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { workspaceDir } from './storage';

export interface FileChangeEvent {
  path: string;
  changeType: 'create' | 'update' | 'delete' | 'move';
  content?: string;
  oldPath?: string;
  timestamp: number;
}

export interface FileOperation {
  path: string;
  content?: string;
  changeType: FileChangeEvent['changeType'];
}

/**
 * FileManager - Handles file operations with WebSocket broadcasting
 * Provides secure file operations with path validation and real-time updates
 */
export class FileManager {
  private websocket: AgentWebSocket;
  private workspaceBase: string;
  private fileWatchers: Map<string, fsSync.FSWatcher | any> = new Map();

  constructor(websocket: AgentWebSocket, workspaceBase: string = workspaceDir) {
    this.websocket = websocket;
    this.workspaceBase = workspaceBase;
  }

  /**
   * Write a file and broadcast the change
   */
  async writeFile(filePath: string, content: string, userId?: string): Promise<void> {
    try {
      const safePath = this.validateAndResolvePath(filePath, userId);
      
      // Check if file exists to determine change type
      let changeType: 'create' | 'update' = 'update';
      try {
        await fs.access(safePath);
      } catch {
        changeType = 'create';
      }

      // Ensure directory exists
      const dir = path.dirname(safePath);
      await fs.mkdir(dir, { recursive: true });

      // Write the file
      await fs.writeFile(safePath, content, 'utf-8');

      // Broadcast the change
      this.broadcastFileChange({
        path: filePath,
        changeType,
        content,
        timestamp: Date.now()
      });

    } catch (error) {
      this.websocket.sendError(`File operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Read a file
   */
  async readFile(filePath: string, userId?: string): Promise<string> {
    try {
      const safePath = this.validateAndResolvePath(filePath, userId);
      return await fs.readFile(safePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a file and broadcast the change
   */
  async deleteFile(filePath: string, userId?: string): Promise<void> {
    try {
      const safePath = this.validateAndResolvePath(filePath, userId);
      await fs.unlink(safePath);

      // Broadcast the deletion
      this.broadcastFileChange({
        path: filePath,
        changeType: 'delete',
        timestamp: Date.now()
      });

    } catch (error) {
      this.websocket.sendError(`File deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Move/rename a file
   */
  async moveFile(oldPath: string, newPath: string, userId?: string): Promise<void> {
    try {
      const safeOldPath = this.validateAndResolvePath(oldPath, userId);
      const safeNewPath = this.validateAndResolvePath(newPath, userId);

      // Ensure target directory exists
      const newDir = path.dirname(safeNewPath);
      await fs.mkdir(newDir, { recursive: true });

      await fs.rename(safeOldPath, safeNewPath);

      // Broadcast both deletion and creation
      this.broadcastFileChange({
        path: oldPath,
        changeType: 'delete',
        timestamp: Date.now()
      });

      this.broadcastFileChange({
        path: newPath,
        changeType: 'create',
        timestamp: Date.now()
      });

    } catch (error) {
      this.websocket.sendError(`File move failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Write multiple files in batch
   */
  async writeFiles(files: Array<{ path: string; content: string }>, userId?: string): Promise<void> {
    for (const file of files) {
      await this.writeFile(file.path, file.content, userId);
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(filePath: string, userId?: string): Promise<boolean> {
    try {
      const safePath = this.validateAndResolvePath(filePath, userId);
      await fs.access(safePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file stats
   */
  async getFileStats(filePath: string, userId?: string): Promise<{ size: number; modified: Date; isFile: boolean; isDirectory: boolean }> {
    try {
      const safePath = this.validateAndResolvePath(filePath, userId);
      const stats = await fs.stat(safePath);
      
      return {
        size: stats.size,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      throw new Error(`Failed to get file stats for ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a file watcher for a directory
   */
  createFileWatcher(watchPath: string, userId?: string): any {
    try {
      const safePath = this.validateAndResolvePath(watchPath, userId);
      
      // Try to use chokidar if available, fallback to fs.watch
      try {
        const chokidar = require('chokidar');
        const watcher = chokidar.watch(safePath, {
          ignored: [
            /(^|[\/\\])\../,  // ignore dotfiles
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/.git/**'
          ],
          persistent: true
        });

        watcher
          .on('change', (filePath: string) => {
            this.handleFileWatchEvent('change', filePath, watchPath);
          })
          .on('add', (filePath: string) => {
            this.handleFileWatchEvent('add', filePath, watchPath);
          })
          .on('unlink', (filePath: string) => {
            this.handleFileWatchEvent('unlink', filePath, watchPath);
          });

        this.fileWatchers.set(watchPath, watcher);
        return watcher;

      } catch {
        // Fallback to native fs.watch
        const watcher = fsSync.watch(safePath, { recursive: true }, (eventType: string, filename: string | null) => {
          if (filename) {
            const fullPath = path.join(safePath, filename);
            this.handleFileWatchEvent(eventType, fullPath, watchPath);
          }
        });

        this.fileWatchers.set(watchPath, watcher);
        return watcher;
      }

    } catch (error) {
      throw new Error(`Failed to create file watcher for ${watchPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop a file watcher
   */
  stopFileWatcher(watchPath: string): void {
    const watcher = this.fileWatchers.get(watchPath);
    if (watcher) {
      if (typeof watcher.close === 'function') {
        watcher.close();
      }
      this.fileWatchers.delete(watchPath);
    }
  }

  /**
   * Get user workspace path for isolation
   */
  getUserWorkspacePath(userId: string): string {
    return path.join(this.workspaceBase, `user-${userId}`);
  }

  /**
   * Validate and resolve path to prevent directory traversal
   */
  private validateAndResolvePath(filePath: string, userId?: string): string {
    // Normalize the path
    const normalizedPath = path.normalize(filePath);

    // Check for path traversal attempts
    if (normalizedPath.includes('..') || normalizedPath.includes('~') || path.isAbsolute(normalizedPath)) {
      throw new Error('Path traversal detected');
    }

    // Resolve within user workspace if userId provided
    const basePath = userId ? this.getUserWorkspacePath(userId) : this.workspaceBase;
    const resolvedPath = path.join(basePath, normalizedPath);

    // Ensure the resolved path is still within the base path
    if (!resolvedPath.startsWith(basePath)) {
      throw new Error('Path validation failed');
    }

    return resolvedPath;
  }

  /**
   * Broadcast file change event via WebSocket
   */
  private broadcastFileChange(change: FileChangeEvent): void {
    this.websocket.broadcast({
      type: 'file_change',
      data: change
    });
  }

  /**
   * Handle file system watcher events
   */
  private async handleFileWatchEvent(eventType: string, fullPath: string, watchBase: string): Promise<void> {
    try {
      // Convert full path to relative path
      const relativePath = path.relative(watchBase, fullPath);
      
      let changeType: FileChangeEvent['changeType'];
      let content: string | undefined;

      switch (eventType) {
        case 'add':
          changeType = 'create';
          content = await fs.readFile(fullPath, 'utf-8');
          break;
        case 'change':
          changeType = 'update';
          content = await fs.readFile(fullPath, 'utf-8');
          break;
        case 'unlink':
          changeType = 'delete';
          break;
        default:
          return; // Ignore other events
      }

      this.broadcastFileChange({
        path: relativePath,
        changeType,
        content,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error(`File watcher error for ${fullPath}:`, error);
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    // Stop all file watchers
    this.fileWatchers.forEach((watcher) => {
      if (typeof watcher.close === 'function') {
        watcher.close();
      }
    });
    this.fileWatchers.clear();
  }
}

// Singleton instance for global use
let globalFileManager: FileManager | null = null;

export function getFileManager(websocket?: AgentWebSocket): FileManager {
  if (!globalFileManager) {
    if (!websocket) {
      throw new Error('WebSocket instance required for first-time initialization');
    }
    globalFileManager = new FileManager(websocket);
  }
  return globalFileManager;
}

export function initFileManager(websocket: AgentWebSocket): FileManager {
  globalFileManager = new FileManager(websocket);
  return globalFileManager;
}
