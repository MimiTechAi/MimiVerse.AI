import axios from 'axios';
import { aiCache } from '../../cache/ai-cache';
import { type ModelPreset, getModelConfig } from '../model-presets';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || 'qwen3-coder:30b';
const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ChatOptions {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    /** Optional logical preset (fast, balanced, deep) to select the underlying model */
    modelPreset?: ModelPreset;
    /** Optional explicit model ID to override both preset and default chat model */
    modelId?: string;
}

export interface CompletionOptions {
    /** Logical preset (fast, balanced, deep) to select the underlying model */
    modelPreset?: ModelPreset;
    /** Explicit model ID to override preset and default chat model */
    modelId?: string;
}

/**
 * Stream chat responses from Ollama
 */
export async function* streamChat(prompt: string, history: Message[] = [], options: ChatOptions = {}) {
    try {
        const messages = [
            ...history,
            { role: 'user' as const, content: prompt }
        ];

        const modelFromPreset = options.modelPreset
            ? getModelConfig(options.modelPreset).id
            : undefined;
        const model = options.modelId || modelFromPreset || CHAT_MODEL;

        const response = await axios.post(
            `${OLLAMA_BASE_URL}/api/chat`,
            {
                model,
                messages,
                stream: true,
                options: {
                    temperature: options.temperature ?? 0.6,
                    top_p: options.top_p ?? 0.9,
                    top_k: options.top_k ?? 40,
                }
            },
            {
                responseType: 'stream'
            }
        );

        for await (const chunk of response.data) {
            const lines = chunk.toString().split('\n').filter((line: string) => line.trim());
            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    if (json.message?.content) {
                        yield json.message.content;
                    }
                } catch (e) {
                    // Skip invalid JSON
                }
            }
        }
    } catch (error) {
        console.error('Ollama Chat Error:', error);
        throw error;
    }
}

/**
 * Generate text completion using Ollama (with caching)
 */
export async function generateCompletion(prompt: string, context: string, options: CompletionOptions = {}): Promise<string> {
    try {
        const modelFromPreset = options.modelPreset
            ? getModelConfig(options.modelPreset).id
            : undefined;
        const model = options.modelId || modelFromPreset || CHAT_MODEL;

        // Cache-Lookup
        const cached = await aiCache.get(prompt, model, context);
        if (cached) {
            return cached;
        }

        const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
            model,
            prompt: `Context:
${context}

Task:
${prompt}`,
            stream: false
        });

        const result = response.data.response || '';
        
        // Cache speichern (TTL: 1 Stunde)
        await aiCache.set(prompt, model, result, context, 3600);

        return result;
    } catch (error) {
        console.error('Ollama Completion Error:', error);
        throw error;
    }
}

/**
 * Generate embeddings using nomic-embed-text (with caching)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        // Truncate text to avoid context length errors (nomic-embed-text has ~8k limit)
        const truncatedText = text.slice(0, 8000);

        // Cache-Lookup (Embeddings ändern sich nicht)
        const cacheKey = `embedding:${truncatedText}`;
        const cached = await aiCache.get(cacheKey, EMBEDDING_MODEL);
        if (cached) {
            return JSON.parse(cached);
        }

        const response = await axios.post(`${OLLAMA_BASE_URL}/api/embeddings`, {
            model: EMBEDDING_MODEL,
            prompt: truncatedText
        });

        const embedding = response.data.embedding || [];
        
        // Cache speichern (TTL: 24 Stunden - Embeddings sind stabil)
        await aiCache.set(cacheKey, EMBEDDING_MODEL, JSON.stringify(embedding), undefined, 86400);

        return embedding;
    } catch (error) {
        console.error('Ollama Embedding Error:', error);
        // Return empty embedding on failure to allow process to continue
        return new Array(768).fill(0);
    }
}

/**
 * Lightweight health check for the Ollama backend
 */
export async function checkOllamaHealth(): Promise<{ healthy: boolean; baseUrl: string; model: string }> {
    try {
        const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
            timeout: 2000
        });

        const healthy = response.status === 200;

        return {
            healthy,
            baseUrl: OLLAMA_BASE_URL,
            model: CHAT_MODEL
        };
    } catch (error: any) {
        console.error('Ollama Health Error:', error?.message || error);
        return {
            healthy: false,
            baseUrl: OLLAMA_BASE_URL,
            model: CHAT_MODEL
        };
    }
}
