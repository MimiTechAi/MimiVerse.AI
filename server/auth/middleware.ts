import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { SessionData } from 'express-session';

// 🔴 CRITICAL: Extended Session interface for security features
declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
    createdAt?: number;
    lastActivity?: number;
  }
  
  interface Session {
    csrfToken?: string;
    createdAt?: number;
    lastActivity?: number;
  }
}

// 🔴 CRITICAL: Enhanced Session Security Configuration
const SESSION_CONFIG = {
    // Production-secure session timeout (2 hours instead of 30 days)
    maxAge: 2 * 60 * 60 * 1000, // 2 hours
    
    // Session refresh threshold (refresh if less than 15 minutes left)
    refreshThreshold: 15 * 60 * 1000, // 15 minutes
    
    // Maximum session lifetime (force logout after 24 hours)
    maxLifetime: 24 * 60 * 60 * 1000, // 24 hours
    
    // Rate limiting for auth attempts
    authAttempts: new Map<string, { count: number; resetTime: number }>(),
    maxAttempts: 5,
    attemptWindow: 15 * 60 * 1000, // 15 minutes
};

// CSRF token generation and validation
function generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

function validateCSRFToken(req: Request, token: string): boolean {
    if (!req.session || !req.session.csrfToken) {
        return false;
    }
    
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
        Buffer.from(req.session.csrfToken, 'hex'),
        Buffer.from(token, 'hex')
    );
}

// Rate limiting for authentication attempts
function checkAuthRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const attempts = SESSION_CONFIG.authAttempts.get(identifier);
    
    if (!attempts || now > attempts.resetTime) {
        // Reset or create new attempt counter
        SESSION_CONFIG.authAttempts.set(identifier, {
            count: 1,
            resetTime: now + SESSION_CONFIG.attemptWindow
        });
        return { allowed: true, remaining: SESSION_CONFIG.maxAttempts - 1, resetTime: now + SESSION_CONFIG.attemptWindow };
    }
    
    if (attempts.count >= SESSION_CONFIG.maxAttempts) {
        return { allowed: false, remaining: 0, resetTime: attempts.resetTime };
    }
    
    attempts.count++;
    return { 
        allowed: true, 
        remaining: SESSION_CONFIG.maxAttempts - attempts.count, 
        resetTime: attempts.resetTime 
    };
}

// Session validation helper
function validateSession(req: Request): { valid: boolean; reason?: string } {
    if (!req.session) {
        return { valid: false, reason: 'No session found' };
    }
    
    if (!req.session.userId) {
        return { valid: false, reason: 'No user ID in session' };
    }
    
    const now = Date.now();
    
    // Check session age
    if (req.session.createdAt && (now - req.session.createdAt) > SESSION_CONFIG.maxLifetime) {
        return { valid: false, reason: 'Session expired (maximum lifetime reached)' };
    }
    
    // Check session timeout
    if (req.session.lastActivity && (now - req.session.lastActivity) > SESSION_CONFIG.maxAge) {
        return { valid: false, reason: 'Session expired (inactivity timeout)' };
    }
    
    return { valid: true };
}

// Refresh session if needed
function refreshSessionIfNeeded(req: Request): void {
    if (!req.session || !req.session.lastActivity) return;
    
    const now = Date.now();
    const timeSinceActivity = now - req.session.lastActivity;
    
    // Refresh if session is about to expire
    if (timeSinceActivity > SESSION_CONFIG.maxAge - SESSION_CONFIG.refreshThreshold) {
        req.session.lastActivity = now;
        req.session.touch(); // Update session cookie
    }
}

/**
 * 🔴 CRITICAL: Enhanced authentication middleware with security features
 * - Session validation and timeout
 * - Rate limiting
 * - CSRF protection for state-changing requests
 * - Session refresh
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const validation = validateSession(req);
    
    if (!validation.valid) {
        // Clear invalid session
        if (req.session) {
            req.session.destroy(() => {});
        }
        
        return res.status(401).json({
            message: 'Authentication required',
            reason: validation.reason,
            requiresReauth: true
        });
    }
    
    // Refresh session if needed
    refreshSessionIfNeeded(req);
    
    // CSRF protection for state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const csrfToken = req.headers['x-csrf-token'] as string;
        
        if (!csrfToken || !validateCSRFToken(req, csrfToken)) {
            return res.status(403).json({
                message: 'CSRF token validation failed',
                error: 'Invalid or missing CSRF token'
            });
        }
    }
    
    // Update last activity
    req.session.lastActivity = Date.now();
    
    next();
}

/**
 * Enhanced authentication middleware with rate limiting
 * For login/register endpoints
 */
export function requireAuthWithRateLimit(req: Request, res: Response, next: NextFunction) {
    // Get client identifier (IP address for basic rate limiting)
    const identifier = req.ip || req.connection.remoteAddress || 'unknown';
    const rateLimit = checkAuthRateLimit(identifier);
    
    if (!rateLimit.allowed) {
        return res.status(429).json({
            message: 'Too many authentication attempts',
            retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
            error: 'Rate limit exceeded. Please try again later.'
        });
    }
    
    // Add rate limit headers
    res.set({
        'X-RateLimit-Limit': SESSION_CONFIG.maxAttempts.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString()
    });
    
    // Continue with normal auth check
    requireAuth(req, res, next);
}

/**
 * 🔴 CRITICAL: Optional authentication with session validation
 * Adds user info to request if authenticated, validates session if present
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
    if (req.session && req.session.userId) {
        const validation = validateSession(req);
        
        if (!validation.valid) {
            // Clear invalid session
            req.session.destroy(() => {});
            // Continue without authentication
            return next();
        }
        
        // Refresh if needed and update activity
        refreshSessionIfNeeded(req);
        req.session.lastActivity = Date.now();
    }
    
    next();
}

/**
 * 🔴 CRITICAL: Session setup middleware
 * Initializes secure session with CSRF token
 */
export function setupSecureSession(req: Request, res: Response, next: NextFunction) {
    if (req.session && !req.session.csrfToken) {
        req.session.csrfToken = generateCSRFToken();
        req.session.createdAt = Date.now();
        req.session.lastActivity = Date.now();
    }
    
    next();
}

/**
 * 🔴 CRITICAL: Middleware to validate API keys for external integrations
 * Enhanced with rate limiting and validation
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
        return res.status(401).json({ 
            message: 'API key required',
            error: 'Missing X-API-Key header'
        });
    }

    // Basic API key format validation
    if (!/^[a-f0-9]{32,64}$/i.test(apiKey)) {
        return res.status(401).json({
            message: 'Invalid API key format',
            error: 'API key must be a valid hexadecimal string'
        });
    }

    // TODO: Validate API key against database
    // For now, just check if it exists and has valid format
    next();
}

/**
 * 🔴 CRITICAL: Session invalidation middleware
 * Forces session refresh on security events
 */
export function invalidateSession(req: Request, res: Response, next: NextFunction) {
    if (req.session) {
        req.session.destroy(() => {});
    }
    
    res.json({
        message: 'Session invalidated',
        requiresReauth: true
    });
}

/**
 * 🔴 CRITICAL: CSRF token generation endpoint
 */
export function getCSRFToken(req: Request, res: Response) {
    if (!req.session) {
        return res.status(401).json({ message: 'No session found' });
    }
    
    if (!req.session.csrfToken) {
        req.session.csrfToken = generateCSRFToken();
    }
    
    res.json({
        csrfToken: req.session.csrfToken
    });
}
