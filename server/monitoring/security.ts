/**
 * Security Monitoring - Real-time security event tracking and alerting
 * Production-ready security observability for Mimiverse IDE
 */

export type SecurityEventType =
    | 'auth_failure'
    | 'auth_success'
    | 'rate_limit_exceeded'
    | 'path_traversal_attempt'
    | 'injection_attempt'
    | 'xss_attempt'
    | 'unauthorized_access'
    | 'suspicious_activity'
    | 'session_hijack_attempt'
    | 'brute_force_detected';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEvent {
    id: string;
    type: SecurityEventType;
    severity: SecuritySeverity;
    timestamp: number;
    source: {
        ip?: string;
        userId?: string;
        sessionId?: string;
        userAgent?: string;
    };
    details: {
        endpoint?: string;
        method?: string;
        payload?: string;
        reason: string;
    };
    resolved: boolean;
}

export interface SecurityAlert {
    id: string;
    type: SecurityEventType;
    severity: SecuritySeverity;
    count: number;
    firstSeen: number;
    lastSeen: number;
    sources: string[];
    acknowledged: boolean;
}

/**
 * Security Monitor - Tracks and alerts on security events
 */
export class SecurityMonitor {
    private events: SecurityEvent[] = [];
    private alerts: Map<string, SecurityAlert> = new Map();
    private maxEvents: number = 50000;
    private alertThresholds: Map<SecurityEventType, { count: number; windowMs: number }> = new Map();
    private alertCallbacks: Array<(alert: SecurityAlert) => void> = [];

    constructor() {
        this.initializeThresholds();
        console.log('[Security] ✅ Monitor initialized');
    }

    /**
     * Initialize default alert thresholds
     */
    private initializeThresholds(): void {
        this.alertThresholds.set('auth_failure', { count: 5, windowMs: 300000 }); // 5 failures in 5 min
        this.alertThresholds.set('rate_limit_exceeded', { count: 10, windowMs: 60000 }); // 10 in 1 min
        this.alertThresholds.set('path_traversal_attempt', { count: 3, windowMs: 300000 }); // 3 in 5 min
        this.alertThresholds.set('injection_attempt', { count: 1, windowMs: 60000 }); // Any attempt
        this.alertThresholds.set('xss_attempt', { count: 1, windowMs: 60000 });
        this.alertThresholds.set('brute_force_detected', { count: 1, windowMs: 60000 });
    }

    // ==================== EVENT RECORDING ====================

    /**
     * Record a security event
     */
    recordEvent(
        type: SecurityEventType,
        severity: SecuritySeverity,
        source: SecurityEvent['source'],
        details: SecurityEvent['details']
    ): SecurityEvent {
        const event: SecurityEvent = {
            id: this.generateId(),
            type,
            severity,
            timestamp: Date.now(),
            source,
            details,
            resolved: false
        };

        this.events.push(event);
        this.trimEvents();
        this.checkAlertThreshold(event);

        // Log based on severity
        this.logEvent(event);

        return event;
    }

    /**
     * Record authentication failure
     */
    recordAuthFailure(ip: string, userId?: string, reason: string = 'Invalid credentials'): SecurityEvent {
        return this.recordEvent('auth_failure', 'medium', { ip, userId }, { reason });
    }

    /**
     * Record rate limit exceeded
     */
    recordRateLimitExceeded(ip: string, endpoint: string, userId?: string): SecurityEvent {
        return this.recordEvent('rate_limit_exceeded', 'low', { ip, userId }, {
            endpoint,
            reason: 'Rate limit exceeded'
        });
    }

    /**
     * Record path traversal attempt
     */
    recordPathTraversalAttempt(ip: string, path: string, userId?: string): SecurityEvent {
        return this.recordEvent('path_traversal_attempt', 'high', { ip, userId }, {
            payload: path.substring(0, 200),
            reason: 'Path traversal detected'
        });
    }

    /**
     * Record injection attempt
     */
    recordInjectionAttempt(ip: string, type: 'sql' | 'command', payload: string, userId?: string): SecurityEvent {
        return this.recordEvent('injection_attempt', 'critical', { ip, userId }, {
            payload: payload.substring(0, 200),
            reason: `${type.toUpperCase()} injection attempt detected`
        });
    }

    /**
     * Record XSS attempt
     */
    recordXSSAttempt(ip: string, payload: string, userId?: string): SecurityEvent {
        return this.recordEvent('xss_attempt', 'high', { ip, userId }, {
            payload: payload.substring(0, 200),
            reason: 'XSS attempt detected'
        });
    }

    /**
     * Record unauthorized access attempt
     */
    recordUnauthorizedAccess(ip: string, endpoint: string, method: string, userId?: string): SecurityEvent {
        return this.recordEvent('unauthorized_access', 'medium', { ip, userId }, {
            endpoint,
            method,
            reason: 'Unauthorized access attempt'
        });
    }

    // ==================== ALERT HANDLING ====================

    /**
     * Check if event triggers an alert
     */
    private checkAlertThreshold(event: SecurityEvent): void {
        const threshold = this.alertThresholds.get(event.type);
        if (!threshold) return;

        const cutoff = Date.now() - threshold.windowMs;
        const recentEvents = this.events.filter(
            e => e.type === event.type && e.timestamp >= cutoff
        );

        if (recentEvents.length >= threshold.count) {
            this.createOrUpdateAlert(event.type, recentEvents);
        }
    }

    /**
     * Create or update security alert
     */
    private createOrUpdateAlert(type: SecurityEventType, events: SecurityEvent[]): void {
        const alertKey = `${type}-${Math.floor(Date.now() / 3600000)}`; // Group by hour

        const existing = this.alerts.get(alertKey);
        const sources = [...new Set(events.map(e => e.source.ip || e.source.userId || 'unknown'))];
        const severity = this.getAlertSeverity(type, events.length);

        if (existing) {
            existing.count = events.length;
            existing.lastSeen = Date.now();
            existing.sources = sources;
        } else {
            const alert: SecurityAlert = {
                id: this.generateId(),
                type,
                severity,
                count: events.length,
                firstSeen: events[0].timestamp,
                lastSeen: Date.now(),
                sources,
                acknowledged: false
            };

            this.alerts.set(alertKey, alert);
            this.notifyAlert(alert);
        }
    }

    /**
     * Get severity based on event type and count
     */
    private getAlertSeverity(type: SecurityEventType, count: number): SecuritySeverity {
        if (type === 'injection_attempt' || type === 'brute_force_detected') {
            return 'critical';
        }
        if (type === 'path_traversal_attempt' || type === 'xss_attempt') {
            return count > 5 ? 'critical' : 'high';
        }
        if (type === 'auth_failure') {
            return count > 10 ? 'high' : 'medium';
        }
        return 'low';
    }

    /**
     * Register alert callback
     */
    onAlert(callback: (alert: SecurityAlert) => void): void {
        this.alertCallbacks.push(callback);
    }

    /**
     * Notify alert callbacks
     */
    private notifyAlert(alert: SecurityAlert): void {
        console.error(`[Security] 🚨 ALERT: ${alert.type} - ${alert.count} events from ${alert.sources.length} sources`);

        for (const callback of this.alertCallbacks) {
            try {
                callback(alert);
            } catch (error) {
                console.error('[Security] Alert callback error:', error);
            }
        }
    }

    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId: string): boolean {
        for (const alert of this.alerts.values()) {
            if (alert.id === alertId) {
                alert.acknowledged = true;
                console.log(`[Security] Alert ${alertId} acknowledged`);
                return true;
            }
        }
        return false;
    }

    // ==================== QUERYING ====================

    /**
     * Get recent events
     */
    getRecentEvents(limit: number = 100, type?: SecurityEventType): SecurityEvent[] {
        let events = this.events;
        if (type) {
            events = events.filter(e => e.type === type);
        }
        return events.slice(-limit);
    }

    /**
     * Get events by source IP
     */
    getEventsByIP(ip: string, limit: number = 100): SecurityEvent[] {
        return this.events.filter(e => e.source.ip === ip).slice(-limit);
    }

    /**
     * Get active alerts
     */
    getActiveAlerts(): SecurityAlert[] {
        return Array.from(this.alerts.values()).filter(a => !a.acknowledged);
    }

    /**
     * Get all alerts
     */
    getAllAlerts(): SecurityAlert[] {
        return Array.from(this.alerts.values());
    }

    /**
     * Generate security report
     */
    generateReport(timeWindowMs: number = 86400000): object {
        const cutoff = Date.now() - timeWindowMs;
        const recentEvents = this.events.filter(e => e.timestamp >= cutoff);

        const byType = new Map<SecurityEventType, number>();
        const bySeverity = new Map<SecuritySeverity, number>();
        const byIP = new Map<string, number>();

        for (const event of recentEvents) {
            byType.set(event.type, (byType.get(event.type) || 0) + 1);
            bySeverity.set(event.severity, (bySeverity.get(event.severity) || 0) + 1);
            if (event.source.ip) {
                byIP.set(event.source.ip, (byIP.get(event.source.ip) || 0) + 1);
            }
        }

        return {
            period: {
                start: cutoff,
                end: Date.now()
            },
            totalEvents: recentEvents.length,
            byType: Object.fromEntries(byType),
            bySeverity: Object.fromEntries(bySeverity),
            topIPs: Array.from(byIP.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10),
            activeAlerts: this.getActiveAlerts().length,
            criticalEvents: recentEvents.filter(e => e.severity === 'critical').length
        };
    }

    // ==================== UTILITIES ====================

    private generateId(): string {
        return `sec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    private logEvent(event: SecurityEvent): void {
        const logFn = event.severity === 'critical' ? console.error :
            event.severity === 'high' ? console.warn :
                console.log;

        logFn(`[Security] ${event.severity.toUpperCase()}: ${event.type} - ${event.details.reason}`);
    }

    private trimEvents(): void {
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents / 2);
        }
    }

    /**
     * Cleanup
     */
    destroy(): void {
        this.events = [];
        this.alerts.clear();
        this.alertCallbacks = [];
        console.log('[Security] Destroyed');
    }
}

// Singleton
let globalSecurityMonitor: SecurityMonitor | null = null;

export function getSecurityMonitor(): SecurityMonitor {
    if (!globalSecurityMonitor) {
        globalSecurityMonitor = new SecurityMonitor();
    }
    return globalSecurityMonitor;
}

export function initSecurityMonitor(): SecurityMonitor {
    if (globalSecurityMonitor) {
        globalSecurityMonitor.destroy();
    }
    globalSecurityMonitor = new SecurityMonitor();
    return globalSecurityMonitor;
}
