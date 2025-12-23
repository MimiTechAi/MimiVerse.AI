/**
 * Access Control - Granular permissions for file and API operations
 * Production-ready security layer for Mimiverse IDE
 */

import path from 'path';

export type Permission = 'read' | 'write' | 'delete' | 'execute' | 'admin';
export type ResourceType = 'file' | 'directory' | 'api' | 'terminal' | 'ai';

export interface AccessRule {
    pattern: string | RegExp;
    resourceType: ResourceType;
    permissions: Permission[];
    allow: boolean;
    priority?: number;
}

export interface AccessContext {
    userId: string;
    projectId?: string;
    workspacePath?: string;
    sessionId?: string;
    ip?: string;
}

export interface AccessCheckResult {
    allowed: boolean;
    reason?: string;
    matchedRule?: string;
}

/**
 * Default access rules for Mimiverse IDE
 */
const DEFAULT_RULES: AccessRule[] = [
    // Block dangerous paths
    { pattern: /\/etc\//, resourceType: 'file', permissions: ['read', 'write', 'delete'], allow: false, priority: 100 },
    { pattern: /\/root\//, resourceType: 'file', permissions: ['read', 'write', 'delete'], allow: false, priority: 100 },
    { pattern: /\.ssh/, resourceType: 'file', permissions: ['read', 'write', 'delete'], allow: false, priority: 100 },
    { pattern: /\.env/, resourceType: 'file', permissions: ['write', 'delete'], allow: false, priority: 90 },
    { pattern: /node_modules/, resourceType: 'file', permissions: ['write', 'delete'], allow: false, priority: 80 },

    // Allow workspace operations
    { pattern: /^workspaces\//, resourceType: 'file', permissions: ['read', 'write', 'delete'], allow: true, priority: 50 },
    { pattern: /^workspaces\//, resourceType: 'directory', permissions: ['read', 'write', 'delete'], allow: true, priority: 50 },

    // API rate limiting (handled separately, but logged here)
    { pattern: '/api/ai/', resourceType: 'api', permissions: ['execute'], allow: true, priority: 40 },
    { pattern: '/api/tests/', resourceType: 'api', permissions: ['execute'], allow: true, priority: 40 },
];

/**
 * Access Control Manager
 */
export class AccessControl {
    private rules: AccessRule[] = [];
    private auditLog: Array<{ timestamp: number; context: AccessContext; resource: string; result: AccessCheckResult }> = [];
    private maxAuditEntries: number = 10000;

    constructor(customRules?: AccessRule[]) {
        this.rules = [...DEFAULT_RULES, ...(customRules || [])].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    /**
     * Check if access is allowed for a resource
     */
    check(
        resource: string,
        resourceType: ResourceType,
        permission: Permission,
        context: AccessContext
    ): AccessCheckResult {
        // Validate context
        if (!context.userId) {
            return { allowed: false, reason: 'No user context provided' };
        }

        // Check against rules
        for (const rule of this.rules) {
            if (rule.resourceType !== resourceType) continue;
            if (!rule.permissions.includes(permission)) continue;

            const matches = this.matchPattern(resource, rule.pattern);
            if (matches) {
                const result: AccessCheckResult = {
                    allowed: rule.allow,
                    reason: rule.allow ? 'Matched allow rule' : 'Matched deny rule',
                    matchedRule: rule.pattern.toString()
                };

                this.audit(context, resource, result);
                return result;
            }
        }

        // Default: allow for authenticated users within their workspace
        if (context.workspacePath && resource.startsWith(context.workspacePath)) {
            const result: AccessCheckResult = { allowed: true, reason: 'Within user workspace' };
            this.audit(context, resource, result);
            return result;
        }

        // Default deny
        const result: AccessCheckResult = { allowed: false, reason: 'No matching rule, default deny' };
        this.audit(context, resource, result);
        return result;
    }

    /**
     * Check file path access with path traversal protection
     */
    checkFilePath(filePath: string, permission: Permission, context: AccessContext): AccessCheckResult {
        // Normalize and check for traversal
        const normalized = path.normalize(filePath);

        if (normalized.includes('..') || normalized.startsWith('/')) {
            return { allowed: false, reason: 'Path traversal detected' };
        }

        return this.check(normalized, 'file', permission, context);
    }

    /**
     * Add custom rule
     */
    addRule(rule: AccessRule): void {
        this.rules.push(rule);
        this.rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    /**
     * Remove rule by pattern
     */
    removeRule(pattern: string): boolean {
        const index = this.rules.findIndex(r => r.pattern.toString() === pattern);
        if (index >= 0) {
            this.rules.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Get audit log
     */
    getAuditLog(limit: number = 100): typeof this.auditLog {
        return this.auditLog.slice(-limit);
    }

    /**
     * Get denied access attempts
     */
    getDeniedAttempts(limit: number = 100): typeof this.auditLog {
        return this.auditLog.filter(e => !e.result.allowed).slice(-limit);
    }

    /**
     * Clear audit log
     */
    clearAuditLog(): void {
        this.auditLog = [];
    }

    /**
     * Match pattern against resource
     */
    private matchPattern(resource: string, pattern: string | RegExp): boolean {
        if (pattern instanceof RegExp) {
            return pattern.test(resource);
        }
        return resource.includes(pattern) || resource.startsWith(pattern);
    }

    /**
     * Add entry to audit log
     */
    private audit(context: AccessContext, resource: string, result: AccessCheckResult): void {
        this.auditLog.push({
            timestamp: Date.now(),
            context,
            resource,
            result
        });

        // Trim if too large
        if (this.auditLog.length > this.maxAuditEntries) {
            this.auditLog = this.auditLog.slice(-this.maxAuditEntries / 2);
        }

        // Log denied attempts
        if (!result.allowed) {
            console.warn(`[AccessControl] ⚠️ DENIED: ${resource} for user ${context.userId} - ${result.reason}`);
        }
    }
}

// Singleton instance
let globalAccessControl: AccessControl | null = null;

export function getAccessControl(): AccessControl {
    if (!globalAccessControl) {
        globalAccessControl = new AccessControl();
    }
    return globalAccessControl;
}

export function initAccessControl(rules?: AccessRule[]): AccessControl {
    globalAccessControl = new AccessControl(rules);
    return globalAccessControl;
}
