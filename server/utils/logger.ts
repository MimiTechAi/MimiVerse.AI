/**
 * Simple structured logger for production
 * Replaces console.log with JSON formatted logs in production
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
    private isProduction = process.env.NODE_ENV === 'production';

    private format(level: LogLevel, message: string, meta?: any) {
        const timestamp = new Date().toISOString();

        if (this.isProduction) {
            return JSON.stringify({
                timestamp,
                level,
                message,
                ...meta
            });
        }

        // Development formatting
        return `[${timestamp}] ${level.toUpperCase()}: ${message} ${meta ? JSON.stringify(meta) : ''}`;
    }

    info(message: string, meta?: any) {
        console.log(this.format('info', message, meta));
    }

    warn(message: string, meta?: any) {
        console.warn(this.format('warn', message, meta));
    }

    error(message: string, meta?: any) {
        console.error(this.format('error', message, meta));
    }

    debug(message: string, meta?: any) {
        if (!this.isProduction) {
            console.debug(this.format('debug', message, meta));
        }
    }
}

export const logger = new Logger();
