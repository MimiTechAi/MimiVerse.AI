/**
 * File Content Cache - Production-ready caching for file operations
 * Reduces file system reads and improves editor performance
 */

import { createHash } from 'crypto';
import * as fs from 'fs/promises';

export interface CachedFile {
    path: string;
    content: string;
    hash: string;
    size: number;
    mtime: number;
    cachedAt: number;
    ttl: number;
}

interface FileCacheStats {
    hits: number;
    misses: number;
    entries: number;
    totalSize: number;
    hitRate: number;
}

/**
 * In-memory file content cache with TTL and size limits
 */
export class FileCache {
    private cache: Map<string, CachedFile> = new Map();
    private stats = { hits: 0, misses: 0 };
    private defaultTTL: number = 60000; // 1 minute
    private maxSize: number = 50 * 1024 * 1024; // 50MB max cache size
    private currentSize: number = 0;
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor(options?: { ttl?: number; maxSize?: number; cleanupInterval?: number }) {
        this.defaultTTL = options?.ttl ?? this.defaultTTL;
        this.maxSize = options?.maxSize ?? this.maxSize;
        this.startCleanup(options?.cleanupInterval ?? 60000);
    }

    /**
     * Generate content hash for cache validation
     */
    private generateHash(content: string): string {
        return createHash('sha256').update(content).digest('hex').substring(0, 16);
    }

    /**
     * Get cached file content (with validation against mtime)
     */
    async get(filePath: string): Promise<CachedFile | null> {
        const cached = this.cache.get(filePath);

        if (!cached) {
            this.stats.misses++;
            return null;
        }

        // Check TTL
        if (Date.now() > cached.cachedAt + cached.ttl) {
            this.evict(filePath);
            this.stats.misses++;
            return null;
        }

        // Validate against file mtime
        try {
            const stat = await fs.stat(filePath);
            if (stat.mtimeMs !== cached.mtime) {
                this.evict(filePath);
                this.stats.misses++;
                return null;
            }
        } catch {
            this.evict(filePath);
            this.stats.misses++;
            return null;
        }

        this.stats.hits++;
        return cached;
    }

    /**
     * Store file content in cache
     */
    async set(filePath: string, content: string, ttl?: number): Promise<void> {
        const size = Buffer.byteLength(content, 'utf-8');

        // Don't cache files larger than 10% of max size
        if (size > this.maxSize * 0.1) {
            console.log(`[FileCache] ⚠️ File too large to cache: ${filePath} (${size} bytes)`);
            return;
        }

        // Evict old entries if needed
        while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
            const oldest = this.findOldest();
            if (oldest) {
                this.evict(oldest);
            } else {
                break;
            }
        }

        try {
            const stat = await fs.stat(filePath);
            const cached: CachedFile = {
                path: filePath,
                content,
                hash: this.generateHash(content),
                size,
                mtime: stat.mtimeMs,
                cachedAt: Date.now(),
                ttl: ttl ?? this.defaultTTL
            };

            // Update or add entry
            const existing = this.cache.get(filePath);
            if (existing) {
                this.currentSize -= existing.size;
            }

            this.cache.set(filePath, cached);
            this.currentSize += size;

            console.log(`[FileCache] 💾 Cached: ${filePath} (${size} bytes)`);
        } catch (error) {
            console.error(`[FileCache] Failed to cache: ${filePath}`, error);
        }
    }

    /**
     * Invalidate cache for specific file
     */
    invalidate(filePath: string): boolean {
        return this.evict(filePath);
    }

    /**
     * Invalidate all files in a directory
     */
    invalidateDirectory(dirPath: string): number {
        let count = 0;
        for (const path of this.cache.keys()) {
            if (path.startsWith(dirPath)) {
                this.evict(path);
                count++;
            }
        }
        console.log(`[FileCache] ❌ Invalidated ${count} files in ${dirPath}`);
        return count;
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        const size = this.cache.size;
        this.cache.clear();
        this.currentSize = 0;
        this.stats = { hits: 0, misses: 0 };
        console.log(`[FileCache] 🗑️ Cleared ${size} entries`);
    }

    /**
     * Get cache statistics
     */
    getStats(): FileCacheStats {
        const total = this.stats.hits + this.stats.misses;
        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            entries: this.cache.size,
            totalSize: this.currentSize,
            hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0
        };
    }

    /**
     * Evict entry from cache
     */
    private evict(filePath: string): boolean {
        const cached = this.cache.get(filePath);
        if (cached) {
            this.currentSize -= cached.size;
            this.cache.delete(filePath);
            return true;
        }
        return false;
    }

    /**
     * Find oldest cache entry
     */
    private findOldest(): string | null {
        let oldest: string | null = null;
        let oldestTime = Infinity;

        for (const [path, entry] of this.cache.entries()) {
            if (entry.cachedAt < oldestTime) {
                oldestTime = entry.cachedAt;
                oldest = path;
            }
        }

        return oldest;
    }

    /**
     * Start cleanup interval
     */
    private startCleanup(intervalMs: number): void {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            let cleaned = 0;

            for (const [path, entry] of this.cache.entries()) {
                if (now > entry.cachedAt + entry.ttl) {
                    this.evict(path);
                    cleaned++;
                }
            }

            if (cleaned > 0) {
                console.log(`[FileCache] 🧹 Cleaned ${cleaned} expired entries`);
            }
        }, intervalMs);
    }

    /**
     * Stop cleanup and release resources
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.clear();
        console.log('[FileCache] Destroyed');
    }
}

// Singleton instance
let globalFileCache: FileCache | null = null;

export function getFileCache(): FileCache {
    if (!globalFileCache) {
        globalFileCache = new FileCache();
    }
    return globalFileCache;
}

export function initFileCache(options?: { ttl?: number; maxSize?: number }): FileCache {
    if (globalFileCache) {
        globalFileCache.destroy();
    }
    globalFileCache = new FileCache(options);
    return globalFileCache;
}
