export type ModelPreset = 'fast' | 'balanced' | 'deep';

export interface ModelConfig {
    id: string;
    context: number;
}

export const MODEL_MAP: Record<ModelPreset, ModelConfig> = {
    fast: {
        id: process.env.OLLAMA_FAST_MODEL || 'qwen2.5-coder:1.5b',
        context: 16_000,
    },
    balanced: {
        id: process.env.OLLAMA_CHAT_MODEL || 'qwen3-coder:30b',
        context: 32_000,
    },
    deep: {
        id: process.env.OLLAMA_DEEP_MODEL || 'gpt-oss:120b',
        context: 64_000,
    },
};

export const DEFAULT_MODEL_PRESET: ModelPreset = 'balanced';

export function normalizeModelPreset(value: unknown): ModelPreset {
    if (typeof value !== 'string') return DEFAULT_MODEL_PRESET;
    const v = value.toLowerCase();
    if (v === 'fast' || v === 'balanced' || v === 'deep') {
        return v;
    }
    return DEFAULT_MODEL_PRESET;
}

export function getModelConfig(preset: ModelPreset = DEFAULT_MODEL_PRESET): ModelConfig {
    return MODEL_MAP[preset];
}
