/**
 * Type-safe error handling for Mimiverse
 * Replaces generic 'any' error catching
 */

export class AppError extends Error {
    constructor(
        message: string,
        public statusCode: number = 500,
        public code?: string,
        public details?: unknown
    ) {
        super(message);
        this.name = 'AppError';
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 400, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(message, 401, 'AUTH_ERROR');
        this.name = 'AuthenticationError';
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Access denied') {
        super(message, 403, 'AUTHZ_ERROR');
        this.name = 'AuthorizationError';
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string) {
        super(`${resource} not found`, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}

export class ConflictError extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 409, 'CONFLICT', details);
        this.name = 'ConflictError';
    }
}

/**
 * Type guard to check if error is AppError
 */
export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'An unknown error occurred';
}
