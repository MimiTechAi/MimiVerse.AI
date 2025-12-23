import NodeCache from 'node-cache';
import crypto from 'crypto';

/**
 * Completion Cache - Cache AI code completions to reduce latency and API costs
 */
export class CompletionCache {
    private cache: NodeCache;

    constructor(ttlSeconds: number = 3600) { // 1 hour default TTL
        this.cache = new NodeCache({
            stdTTL: ttlSeconds,
            checkperiod: 600, // Check for expired keys every 10 minutes
            useClones: false // Better performance
        });
    }

    /**
     * Generate cache key from code context
     */
    getCacheKey(code: string, offset: number, language: string): string {
        // Use context window around cursor position
        const contextStart = Math.max(0, offset - 200);
        const contextEnd = Math.min(code.length, offset + 50);
        const context = code.slice(contextStart, contextEnd);

        // Hash the context for compact key
        const hash = this.hashString(context);

        return `${language}:${offset}:${hash}`;
    }

    /**
     * Get cached completion
     */
    get(key: string): string | undefined {
        const value = this.cache.get<string>(key);
        if (value) {
            console.log(`[Cache] HIT: ${key}`);
        } else {
            console.log(`[Cache] MISS: ${key}`);
        }
        return value;
    }

    /**
     * Store completion in cache
     */
    set(key: string, value: string): void {
        this.cache.set(key, value);
        console.log(`[Cache] SET: ${key}`);
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const stats = this.cache.getStats();
        const keys = this.cache.keys();

        return {
            hits: stats.hits,
            misses: stats.misses,
            keys: stats.keys,
            hitRate: stats.hits / (stats.hits + stats.misses) || 0,
            size: keys.length
        };
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.flushAll();
        console.log('[Cache] Cleared all entries');
    }

    /**
     * Hash string to compact representation
     */
    private hashString(str: string): string {
        return crypto
            .createHash('md5')
            .update(str)
            .digest('hex')
            .substring(0, 12); // First 12 chars enough for uniqueness
    }
}
