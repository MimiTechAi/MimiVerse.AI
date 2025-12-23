import { z } from 'zod';

/**
 * Environment variable validation schema
 * Validates required environment variables at application startup
 */
const envSchema = z.object({
    // Node Environment
    // Database (optional in development since we might not use postgres immediately)
    DATABASE_URL: z.string().url().optional(),
    POSTGRES_PASSWORD: z.string().min(8).optional(),

    // Session (use a default in development)
    SESSION_SECRET: z.string().min(32).default('dev_session_secret_change_in_production_minimum_32_chars_long'),

    // AI Configuration - Local Ollama on DGX Spark
    OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
    OLLAMA_CHAT_MODEL: z.string().default('qwen3-coder:30b'),
    OLLAMA_COMPLETION_MODEL: z.string().default('qwen2.5-coder:1.5b'),
    OLLAMA_EMBEDDING_MODEL: z.string().default('nomic-embed-text'),

    // MCP Configuration - Optional local MCP server
    MCP_LOCAL_SERVER_URL: z.string().url().optional(),

    // Server configuration
    PORT: z.string().regex(/^\d+$/).transform(Number).default('5000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // CORS (for production)
    ALLOWED_ORIGINS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables
 * Throws detailed errors if validation fails
 */
export function validateEnv(): Env {
    try {
        const parsed = envSchema.parse(process.env);

        // Production-specific validations
        if (parsed.NODE_ENV === 'production') {
            // Ensure strong session secret in production
            if (parsed.SESSION_SECRET === 'generate_a_random_32_character_string_here' ||
                parsed.SESSION_SECRET === 'super_secret_session_key_change_me' ||
                parsed.SESSION_SECRET === 'dev_session_secret_change_in_production_minimum_32_chars_long') {
                throw new Error('SESSION_SECRET must be changed from default value in production!');
            }

            // Ensure production database is not using default password
            if (parsed.DATABASE_URL?.includes('mimiverse_dev_password')) {
                throw new Error('DATABASE_URL contains default dev password - change for production!');
            }
        }

        return parsed;
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('❌ Environment variable validation failed:\n');
            error.errors.forEach((err) => {
                console.error(`  - ${err.path.join('.')}: ${err.message}`);
            });
            console.error('\nPlease check your .env file and ensure all required variables are set correctly.');
        } else {
            console.error('❌ Environment validation error:', error);
        }
        process.exit(1);
    }
}

/**
 * Validated environment variables
 * Import this instead of process.env for type safety
 */
export const env = validateEnv();
