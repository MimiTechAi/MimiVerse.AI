import express from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Rate limiting configuration for different API endpoints
 */

// General API rate limit - 100 requests per 15 minutes per IP
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict rate limit for auth endpoints - 5 requests per 15 minutes
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true, // Don't count successful logins
});

// AI endpoints - 20 requests per minute (expensive operations)
export const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    message: 'Too many AI requests, please slow down.',
});

// File operations - 50 requests per minute
export const fileLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    message: 'Too many file operations, please slow down.',
});
