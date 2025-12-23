import path from 'path';
import { z } from 'zod';

/**
 * Security utility functions for file operations
 */

/**
 * Sanitize file path to prevent directory traversal attacks
 * @param filePath - User-provided path
 * @param projectRoot - Root directory to restrict access to
 * @returns Sanitized absolute path
 * @throws Error if path attempts to escape project root
 */
export function sanitizeFilePath(filePath: string, projectRoot: string): string {
    // Normalize and resolve the path
    const normalized = path.normalize(filePath);
    const resolved = path.resolve(projectRoot, normalized);

    // Ensure the resolved path is within the project root
    if (!resolved.startsWith(projectRoot)) {
        throw new Error('Invalid path: attempted directory traversal detected');
    }

    // Additional security checks
    if (filePath.includes('\0')) {
        throw new Error('Invalid path: null byte detected');
    }

    return resolved;
}

/**
 * Validate file path doesn't contain dangerous patterns
 */
export function isValidFilePath(filePath: string): boolean {
    // Check for dangerous patterns
    const dangerousPatterns = [
        /\.\./,  // Directory traversal
        /^\//, // AbsolutePaths
        /\0/,  // Null bytes
        /[<>:"|?*]/  // Windows reserved chars
    ];

    return !dangerousPatterns.some(pattern => pattern.test(filePath));
}

/**
 * Zod schemas for file operations
 */
export const fileSaveSchema = z.object({
    path: z.string()
        .min(1, 'Path is required')
        .max(500, 'Path too long')
        .refine(isValidFilePath, 'Invalid file path'),
    content: z.string()
});

export const fileCreateSchema = z.object({
    path: z.string()
        .min(1, 'Path is required')
        .max(500, 'Path too long')
        .refine(isValidFilePath, 'Invalid file path'),
    type: z.enum(['file', 'folder'])
});

export const fileRenameSchema = z.object({
    oldPath: z.string()
        .min(1, 'Old path is required')
        .max(500, 'Path too long')
        .refine(isValidFilePath, 'Invalid old path'),
    newPath: z.string()
        .min(1, 'New path is required')
        .max(500, 'Path too long')
        .refine(isValidFilePath, 'Invalid new path')
});

export const fileDeleteSchema = z.object({
    path: z.string()
        .min(1, 'Path is required')
        .max(500, 'Path too long')
        .refine(isValidFilePath, 'Invalid file path')
});

export const projectIdSchema = z.string()
    .min(1, 'Project ID is required')
    .max(100, 'Project ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid project ID format');
