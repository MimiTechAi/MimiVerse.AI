/**
 * Performance Monitoring - Real-time metrics collection and analysis
 * Production-ready monitoring for Mimiverse IDE
 */

export interface PerformanceMetric {
    name: string;
    value: number;
    unit: string;
    timestamp: number;
    tags?: Record<string, string>;
}

export interface RequestMetrics {
    endpoint: string;
    method: string;
    statusCode: number;
    duration: number;
    timestamp: number;
}

export interface ResourceMetrics {
    cpuUsage: number;
    memoryUsed: number;
    memoryTotal: number;
    heapUsed: number;
    heapTotal: number;
    activeHandles: number;
    activeRequests: number;
    timestamp: number;
}

interface AggregatedMetrics {
    count: number;
    sum: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
}

/**
 * Performance Monitor - Collects and analyzes performance metrics
 */
export class PerformanceMonitor {
    private metrics: PerformanceMetric[] = [];
    private requestMetrics: RequestMetrics[] = [];
    private resourceHistory: ResourceMetrics[] = [];
    private maxEntries: number = 10000;
    private collectionInterval: NodeJS.Timeout | null = null;

    constructor(collectResourcesIntervalMs: number = 30000) {
        this.startResourceCollection(collectResourcesIntervalMs);
        console.log('[Performance] ✅ Monitor initialized');
    }

    // ==================== METRIC RECORDING ====================

    /**
     * Record a generic metric
     */
    recordMetric(name: string, value: number, unit: string, tags?: Record<string, string>): void {
        this.metrics.push({
            name,
            value,
            unit,
            timestamp: Date.now(),
            tags
        });

        this.trimMetrics();
    }

    /**
     * Record request duration
     */
    recordRequest(endpoint: string, method: string, statusCode: number, duration: number): void {
        this.requestMetrics.push({
            endpoint,
            method,
            statusCode,
            duration,
            timestamp: Date.now()
        });

        this.trimRequestMetrics();

        // Log slow requests
        if (duration > 1000) {
            console.warn(`[Performance] ⚠️ Slow request: ${method} ${endpoint} (${duration}ms)`);
        }
    }

    /**
     * Record AI inference timing
     */
    recordAIInference(model: string, duration: number, tokens: number): void {
        this.recordMetric('ai_inference_duration', duration, 'ms', { model });
        this.recordMetric('ai_inference_tokens', tokens, 'tokens', { model });

        const tokensPerSecond = duration > 0 ? (tokens / duration) * 1000 : 0;
        this.recordMetric('ai_tokens_per_second', tokensPerSecond, 'tokens/s', { model });
    }

    /**
     * Record file operation timing
     */
    recordFileOperation(operation: string, path: string, duration: number, size?: number): void {
        this.recordMetric(`file_${operation}_duration`, duration, 'ms', { path: path.substring(0, 50) });
        if (size) {
            this.recordMetric(`file_${operation}_size`, size, 'bytes', { path: path.substring(0, 50) });
        }
    }

    /**
     * Record WebSocket message
     */
    recordWebSocketMessage(type: string, size: number): void {
        this.recordMetric('websocket_message_size', size, 'bytes', { type });
    }

    // ==================== RESOURCE COLLECTION ====================

    /**
     * Collect current resource usage
     */
    private collectResources(): ResourceMetrics {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        const metrics: ResourceMetrics = {
            cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
            memoryUsed: memUsage.rss,
            memoryTotal: memUsage.rss + memUsage.external,
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            activeHandles: (process as any)._getActiveHandles?.()?.length || 0,
            activeRequests: (process as any)._getActiveRequests?.()?.length || 0,
            timestamp: Date.now()
        };

        this.resourceHistory.push(metrics);
        this.trimResourceHistory();

        return metrics;
    }

    /**
     * Start periodic resource collection
     */
    private startResourceCollection(intervalMs: number): void {
        this.collectionInterval = setInterval(() => {
            this.collectResources();
        }, intervalMs);
    }

    // ==================== ANALYSIS ====================

    /**
     * Get aggregated metrics for a specific metric name
     */
    getAggregatedMetrics(name: string, timeWindowMs: number = 3600000): AggregatedMetrics | null {
        const cutoff = Date.now() - timeWindowMs;
        const values = this.metrics
            .filter(m => m.name === name && m.timestamp >= cutoff)
            .map(m => m.value)
            .sort((a, b) => a - b);

        if (values.length === 0) return null;

        const sum = values.reduce((a, b) => a + b, 0);
        return {
            count: values.length,
            sum,
            min: values[0],
            max: values[values.length - 1],
            avg: sum / values.length,
            p50: values[Math.floor(values.length * 0.5)],
            p95: values[Math.floor(values.length * 0.95)],
            p99: values[Math.floor(values.length * 0.99)]
        };
    }

    /**
     * Get request statistics by endpoint
     */
    getRequestStats(timeWindowMs: number = 3600000): Map<string, AggregatedMetrics> {
        const cutoff = Date.now() - timeWindowMs;
        const byEndpoint = new Map<string, number[]>();

        for (const req of this.requestMetrics) {
            if (req.timestamp < cutoff) continue;
            const key = `${req.method} ${req.endpoint}`;
            if (!byEndpoint.has(key)) {
                byEndpoint.set(key, []);
            }
            byEndpoint.get(key)!.push(req.duration);
        }

        const result = new Map<string, AggregatedMetrics>();
        for (const [endpoint, durations] of byEndpoint.entries()) {
            durations.sort((a, b) => a - b);
            const sum = durations.reduce((a, b) => a + b, 0);
            result.set(endpoint, {
                count: durations.length,
                sum,
                min: durations[0],
                max: durations[durations.length - 1],
                avg: sum / durations.length,
                p50: durations[Math.floor(durations.length * 0.5)],
                p95: durations[Math.floor(durations.length * 0.95)],
                p99: durations[Math.floor(durations.length * 0.99)]
            });
        }

        return result;
    }

    /**
     * Get current resource usage
     */
    getCurrentResources(): ResourceMetrics {
        return this.collectResources();
    }

    /**
     * Get resource usage history
     */
    getResourceHistory(limit: number = 100): ResourceMetrics[] {
        return this.resourceHistory.slice(-limit);
    }

    /**
     * Generate performance report
     */
    generateReport(): object {
        const now = Date.now();
        const oneHourAgo = now - 3600000;

        return {
            timestamp: now,
            currentResources: this.collectResources(),
            requestStats: Object.fromEntries(this.getRequestStats()),
            aiInference: this.getAggregatedMetrics('ai_inference_duration'),
            fileOperations: {
                read: this.getAggregatedMetrics('file_read_duration'),
                write: this.getAggregatedMetrics('file_write_duration')
            },
            websocket: this.getAggregatedMetrics('websocket_message_size'),
            totalMetrics: this.metrics.filter(m => m.timestamp >= oneHourAgo).length,
            totalRequests: this.requestMetrics.filter(r => r.timestamp >= oneHourAgo).length
        };
    }

    // ==================== CLEANUP ====================

    private trimMetrics(): void {
        if (this.metrics.length > this.maxEntries) {
            this.metrics = this.metrics.slice(-this.maxEntries / 2);
        }
    }

    private trimRequestMetrics(): void {
        if (this.requestMetrics.length > this.maxEntries) {
            this.requestMetrics = this.requestMetrics.slice(-this.maxEntries / 2);
        }
    }

    private trimResourceHistory(): void {
        if (this.resourceHistory.length > 1000) {
            this.resourceHistory = this.resourceHistory.slice(-500);
        }
    }

    /**
     * Cleanup and destroy
     */
    destroy(): void {
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
            this.collectionInterval = null;
        }
        this.metrics = [];
        this.requestMetrics = [];
        this.resourceHistory = [];
        console.log('[Performance] Destroyed');
    }
}

// Singleton
let globalPerformanceMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
    if (!globalPerformanceMonitor) {
        globalPerformanceMonitor = new PerformanceMonitor();
    }
    return globalPerformanceMonitor;
}

export function initPerformanceMonitor(intervalMs?: number): PerformanceMonitor {
    if (globalPerformanceMonitor) {
        globalPerformanceMonitor.destroy();
    }
    globalPerformanceMonitor = new PerformanceMonitor(intervalMs);
    return globalPerformanceMonitor;
}
