/**
 * Test Result Cache - Production-ready caching for test results
 * Reduces redundant test runs and improves performance
 */

import { createHash } from 'crypto';

export interface CachedTestResult {
    runId: string;
    framework: string;
    testPath: string;
    results: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        duration: number;
        coverage?: {
            lines: number;
            functions: number;
            branches: number;
            statements: number;
        };
    };
    timestamp: number;
    fileHash: string;
    ttl: number;
}

interface CacheStats {
    hits: number;
    misses: number;
    entries: number;
    hitRate: number;
}

/**
 * In-memory test result cache with TTL support
 */
export class TestCache {
    private cache: Map<string, CachedTestResult> = new Map();
    private stats = { hits: 0, misses: 0 };
    private defaultTTL: number = 3600000; // 1 hour in ms
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor(cleanupIntervalMs: number = 300000) { // 5 min cleanup
        this.startCleanup(cleanupIntervalMs);
    }

    /**
     * Generate cache key from framework and test path
     */
    private generateKey(framework: string, testPath: string): string {
        return createHash('sha256')
            .update(`${framework}:${testPath}`)
            .digest('hex')
            .substring(0, 16);
    }

    /**
     * Get cached test results
     */
    get(framework: string, testPath: string): CachedTestResult | null {
        const key = this.generateKey(framework, testPath);
        const cached = this.cache.get(key);

        if (!cached) {
            this.stats.misses++;
            return null;
        }

        // Check if expired
        if (Date.now() > cached.timestamp + cached.ttl) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }

        this.stats.hits++;
        console.log(`[TestCache] ✅ HIT: ${key} (${framework})`);
        return cached;
    }

    /**
     * Store test results in cache
     */
    set(
        framework: string,
        testPath: string,
        results: CachedTestResult['results'],
        fileHash: string,
        ttl: number = this.defaultTTL
    ): void {
        const key = this.generateKey(framework, testPath);
        const cached: CachedTestResult = {
            runId: `cache-${Date.now()}`,
            framework,
            testPath,
            results,
            timestamp: Date.now(),
            fileHash,
            ttl
        };

        this.cache.set(key, cached);
        console.log(`[TestCache] 💾 Stored: ${key} (TTL: ${ttl}ms)`);
    }

    /**
     * Invalidate cache for specific test
     */
    invalidate(framework: string, testPath: string): boolean {
        const key = this.generateKey(framework, testPath);
        const deleted = this.cache.delete(key);
        if (deleted) {
            console.log(`[TestCache] ❌ Invalidated: ${key}`);
        }
        return deleted;
    }

    /**
     * Invalidate all cache entries for a framework
     */
    invalidateFramework(framework: string): number {
        let count = 0;
        for (const [key, value] of this.cache.entries()) {
            if (value.framework === framework) {
                this.cache.delete(key);
                count++;
            }
        }
        console.log(`[TestCache] ❌ Invalidated ${count} entries for ${framework}`);
        return count;
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        const size = this.cache.size;
        this.cache.clear();
        this.stats = { hits: 0, misses: 0 };
        console.log(`[TestCache] 🗑️ Cleared ${size} entries`);
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        const total = this.stats.hits + this.stats.misses;
        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            entries: this.cache.size,
            hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0
        };
    }

    /**
     * Start cleanup interval for expired entries
     */
    private startCleanup(intervalMs: number): void {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            let cleaned = 0;

            for (const [key, value] of this.cache.entries()) {
                if (now > value.timestamp + value.ttl) {
                    this.cache.delete(key);
                    cleaned++;
                }
            }

            if (cleaned > 0) {
                console.log(`[TestCache] 🧹 Cleaned ${cleaned} expired entries`);
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
        console.log('[TestCache] Destroyed');
    }
}

// Singleton instance
let globalTestCache: TestCache | null = null;

export function getTestCache(): TestCache {
    if (!globalTestCache) {
        globalTestCache = new TestCache();
    }
    return globalTestCache;
}

export function initTestCache(cleanupIntervalMs?: number): TestCache {
    if (globalTestCache) {
        globalTestCache.destroy();
    }
    globalTestCache = new TestCache(cleanupIntervalMs);
    return globalTestCache;
}
