/**
 * Enhanced Validation - Advanced input validation and sanitization
 * Production-ready security layer with comprehensive validation rules
 */

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ==================== VALIDATION SCHEMAS ====================

/**
 * AI Chat Request Validation
 */
export const aiChatSchema = z.object({
    message: z.string()
        .min(1, 'Message is required')
        .max(50000, 'Message too long (max 50000 chars)')
        .refine(val => !containsSQLInjection(val), 'Potentially malicious content detected')
        .refine(val => !containsXSS(val), 'Potentially malicious content detected'),
    model: z.string()
        .max(100, 'Model name too long')
        .optional(),
    context: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().max(50000)
    })).optional(),
    options: z.object({
        temperature: z.number().min(0).max(2).optional(),
        maxTokens: z.number().min(1).max(100000).optional(),
        stream: z.boolean().optional()
    }).optional()
});

/**
 * Test Run Request Validation
 */
export const testRunSchema = z.object({
    framework: z.enum(['jest', 'vitest', 'mocha', 'playwright']),
    testPath: z.string()
        .max(500, 'Test path too long')
        .refine(val => !val.includes('..'), 'Path traversal not allowed')
        .optional(),
    options: z.object({
        coverage: z.boolean().optional(),
        watch: z.boolean().optional(),
        timeout: z.number().min(1000).max(600000).optional(),
        parallel: z.boolean().optional()
    }).optional()
});

/**
 * Terminal Command Validation
 */
export const terminalCommandSchema = z.object({
    command: z.string()
        .min(1, 'Command is required')
        .max(1000, 'Command too long')
        .refine(val => !containsDangerousCommands(val), 'Dangerous command detected'),
    cwd: z.string()
        .max(500, 'Path too long')
        .refine(val => !val.includes('..'), 'Path traversal not allowed')
        .optional()
});

// ==================== DETECTION FUNCTIONS ====================

/**
 * Detect SQL injection patterns
 */
function containsSQLInjection(input: string): boolean {
    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER)\b.*\b(FROM|INTO|TABLE|WHERE)\b)/i,
        /(--|#|\/\*|\*\/)/,
        /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
        /(\bEXEC\b|\bEXECUTE\b|\bxp_)/i
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Detect XSS patterns
 */
function containsXSS(input: string): boolean {
    const xssPatterns = [
        /<script\b[^>]*>[\s\S]*?<\/script>/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /<object/i,
        /<embed/i,
        /data:text\/html/i
    ];

    return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Detect dangerous shell commands
 */
function containsDangerousCommands(input: string): boolean {
    const dangerousPatterns = [
        /\brm\s+-rf\s+\//i,
        /\b(sudo|su)\b/i,
        /\b(chmod|chown)\s+777/i,
        /\b(mkfs|dd\s+if=)/i,
        /\b(shutdown|reboot|halt)\b/i,
        />\s*\/dev\/(sda|hda|null)/i,
        /\|\s*bash/i,
        /curl.*\|\s*(sh|bash)/i,
        /wget.*\|\s*(sh|bash)/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(input));
}

// ==================== SANITIZATION FUNCTIONS ====================

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(input: string): string {
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize file path
 */
export function sanitizePath(input: string): string {
    return input
        .replace(/\.\./g, '')
        .replace(/^\/+/, '')
        .replace(/[\0\x00-\x1f\x7f]/g, '') // Remove control characters
        .replace(/[<>:"|?*]/g, ''); // Remove Windows reserved chars
}

/**
 * Sanitize shell argument
 */
export function sanitizeShellArg(input: string): string {
    return input
        .replace(/[;&|`$(){}[\]<>\\!#*?~^]/g, '')
        .replace(/\n/g, '')
        .replace(/\r/g, '');
}

// ==================== EXPRESS MIDDLEWARE ====================

/**
 * Create validation middleware from Zod schema
 */
export function validateBody<T>(schema: z.ZodType<T>) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = schema.safeParse(req.body);
            if (!result.success) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: result.error.issues.map(i => ({
                        field: i.path.join('.'),
                        message: i.message
                    }))
                });
            }
            req.body = result.data;
            next();
        } catch (error) {
            console.error('[Validation] Error:', error);
            res.status(500).json({ error: 'Validation error' });
        }
    };
}

/**
 * Validate query parameters
 */
export function validateQuery<T>(schema: z.ZodType<T>) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = schema.safeParse(req.query);
            if (!result.success) {
                return res.status(400).json({
                    error: 'Invalid query parameters',
                    details: result.error.issues
                });
            }
            req.query = result.data as any;
            next();
        } catch (error) {
            res.status(500).json({ error: 'Query validation error' });
        }
    };
}

/**
 * Request size limiter middleware
 */
export function limitRequestSize(maxBytes: number = 10 * 1024 * 1024) {
    return (req: Request, res: Response, next: NextFunction) => {
        const contentLength = parseInt(req.headers['content-length'] || '0');
        if (contentLength > maxBytes) {
            return res.status(413).json({
                error: 'Request too large',
                maxSize: maxBytes
            });
        }
        next();
    };
}

/**
 * Input sanitization middleware
 */
export function sanitizeInputs() {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.body && typeof req.body === 'object') {
            req.body = deepSanitize(req.body);
        }
        next();
    };
}

/**
 * Deep sanitize object values
 */
function deepSanitize(obj: any): any {
    if (typeof obj === 'string') {
        return sanitizeHtml(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(deepSanitize);
    }
    if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            result[sanitizeHtml(key)] = deepSanitize(value);
        }
        return result;
    }
    return obj;
}

// ==================== EXPORTS ====================

export {
    containsSQLInjection,
    containsXSS,
    containsDangerousCommands
};
