import Redis from 'ioredis';
import { createHash } from 'crypto';

/**
 * AI Inference Cache für DGX Spark
 * Cached Ollama-Responses basierend auf Prompt-Hash
 */
export class AICache {
  private redis: Redis;
  private prefix: string = 'ai:';
  private defaultTTL: number = 3600; // 1 Stunde

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true
    });

    this.redis.on('error', (err) => {
      console.error('[AI Cache] Redis error:', err);
    });

    this.redis.on('connect', () => {
      console.log('[AI Cache] ✅ Connected to Redis');
    });

    // Lazy connect
    this.redis.connect().catch(err => {
      console.error('[AI Cache] Failed to connect:', err);
    });
  }

  /**
   * Generiert Hash aus Prompt + Model + Context
   */
  private generateHash(prompt: string, model: string, context?: string): string {
    const input = `${model}:${prompt}:${context || ''}`;
    return createHash('sha256').update(input).digest('hex');
  }

  /**
   * Cache-Lookup für AI-Response
   */
  async get(prompt: string, model: string, context?: string): Promise<string | null> {
    try {
      const hash = this.generateHash(prompt, model, context);
      const key = `${this.prefix}${hash}`;
      
      const cached = await this.redis.get(key);
      
      if (cached) {
        console.log(`[AI Cache] ✅ HIT: ${hash.substring(0, 8)}...`);
        await this.redis.incr(`${this.prefix}stats:hits`);
        return cached;
      }
      
      console.log(`[AI Cache] ❌ MISS: ${hash.substring(0, 8)}...`);
      await this.redis.incr(`${this.prefix}stats:misses`);
      return null;
    } catch (error) {
      console.error('[AI Cache] Get error:', error);
      return null; // Fallback: kein Cache
    }
  }

  /**
   * Cache speichern
   */
  async set(
    prompt: string, 
    model: string, 
    response: string, 
    context?: string, 
    ttl: number = this.defaultTTL
  ): Promise<void> {
    try {
      const hash = this.generateHash(prompt, model, context);
      const key = `${this.prefix}${hash}`;
      
      await this.redis.setex(key, ttl, response);
      console.log(`[AI Cache] 💾 Cached: ${hash.substring(0, 8)}... (TTL: ${ttl}s)`);
    } catch (error) {
      console.error('[AI Cache] Set error:', error);
      // Nicht werfen - Cache-Fehler sollten nicht die App crashen
    }
  }

  /**
   * Cache-Statistiken
   */
  async getStats(): Promise<{ hits: number; misses: number; hitRate: number; keys: number }> {
    try {
      const hits = parseInt(await this.redis.get(`${this.prefix}stats:hits`) || '0');
      const misses = parseInt(await this.redis.get(`${this.prefix}stats:misses`) || '0');
      const total = hits + misses;
      const hitRate = total > 0 ? hits / total : 0;
      
      // Anzahl der Cache-Keys
      const keys = await this.redis.dbsize();
      
      return {
        hits,
        misses,
        hitRate: parseFloat((hitRate * 100).toFixed(2)),
        keys
      };
    } catch (error) {
      console.error('[AI Cache] Stats error:', error);
      return { hits: 0, misses: 0, hitRate: 0, keys: 0 };
    }
  }

  /**
   * Cache leeren
   */
  async clear(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`[AI Cache] 🗑️  Cleared ${keys.length} keys`);
      }
    } catch (error) {
      console.error('[AI Cache] Clear error:', error);
    }
  }

  /**
   * Invalidate spezifischen Cache-Eintrag
   */
  async invalidate(prompt: string, model: string, context?: string): Promise<void> {
    try {
      const hash = this.generateHash(prompt, model, context);
      const key = `${this.prefix}${hash}`;
      await this.redis.del(key);
      console.log(`[AI Cache] ❌ Invalidated: ${hash.substring(0, 8)}...`);
    } catch (error) {
      console.error('[AI Cache] Invalidate error:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
    console.log('[AI Cache] Disconnected');
  }
}

// Singleton instance
export const aiCache = new AICache();
