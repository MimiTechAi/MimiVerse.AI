import axios from 'axios';
import { aiCache } from '../../cache/ai-cache';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

/**
 * Task-spezifische Model-Auswahl für DGX Spark
 * Optimiert für verschiedene Use-Cases
 */
export class ModelRouter {
  private models = {
    // Haupt-Chat: Qwen3-Coder 30B (Q4_K_M) - Komplexe Code-Aufgaben
    chat: process.env.OLLAMA_CHAT_MODEL || 'qwen3-coder:30b',
    
    // Inline Completions: Qwen2.5-Coder 1.5B - Schnelle Responses (<100ms)
    completion: process.env.OLLAMA_COMPLETION_MODEL || 'qwen2.5-coder:1.5b',
    
    // Embeddings: Nomic Embed Text - Semantic Search
    embedding: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
    
    // Reasoning (optional): DeepSeek R1 - Complex Planning
    reasoning: process.env.OLLAMA_REASONING_MODEL || 'qwen3-coder:30b',
    
    // Vision (optional): Llama3.2-Vision - UI Analysis
    vision: process.env.OLLAMA_VISION_MODEL || 'llama3:70b'
  };

  /**
   * Wählt das optimale Modell basierend auf Task-Typ
   */
  selectModel(taskType: TaskType): string {
    switch (taskType) {
      case 'inline_completion':
        return this.models.completion; // Schnell: 1.5B Modell
      
      case 'code_explanation':
      case 'code_generation':
      case 'debugging':
        return this.models.chat; // Qualität: 30B Modell
      
      case 'project_planning':
      case 'architecture_design':
        return this.models.reasoning; // Reasoning: 30B+ Modell
      
      case 'ui_analysis':
      case 'screenshot_to_code':
        return this.models.vision; // Vision: Multimodal
      
      case 'embedding':
        return this.models.embedding; // Embeddings: Nomic
      
      default:
        return this.models.chat; // Fallback: Haupt-Modell
    }
  }

  /**
   * Inference mit automatischer Model-Auswahl
   */
  async generate(
    prompt: string,
    taskType: TaskType = 'code_generation',
    options: GenerateOptions = {}
  ): Promise<string> {
    const model = this.selectModel(taskType);
    const { useCache, cacheTtlSeconds, contextKey, ...ollamaOptions } = options;
    const cacheContext = contextKey ?? taskType;

    if (useCache) {
      const cached = await aiCache.get(prompt, model, String(cacheContext));
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await axios.post(
        `${OLLAMA_BASE_URL}/api/generate`,
        {
          model,
          prompt,
          stream: false,
          options: {
            temperature: ollamaOptions.temperature ?? 0.7,
            top_p: ollamaOptions.top_p ?? 0.8,
            top_k: ollamaOptions.top_k ?? 20,
            ...ollamaOptions
          }
        },
        {
          timeout: 60000
        }
      );

      const result = response.data.response || '';

      if (useCache) {
        await aiCache.set(prompt, model, result, String(cacheContext), cacheTtlSeconds ?? 3600);
      }

      return result;
    } catch (error) {
      console.error(`[Model Router] Error with model ${model}:`, error);
      throw error;
    }
  }

  /**
   * Streaming Inference mit Model-Auswahl
   */
  async *generateStream(
    prompt: string,
    taskType: TaskType = 'code_generation',
    options: GenerateOptions = {}
  ): AsyncGenerator<string> {
    const model = this.selectModel(taskType);
    
    try {
      const response = await axios.post(
        `${OLLAMA_BASE_URL}/api/generate`,
        {
          model,
          prompt,
          stream: true,
          options: {
            temperature: options.temperature ?? 0.7,
            ...options
          }
        },
        {
          responseType: 'stream'
        }
      );

      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\\n').filter((line: string) => line.trim());
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.response) {
              yield json.response;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    } catch (error) {
      console.error(`[Model Router] Stream error with model ${model}:`, error);
      throw error;
    }
  }

  /**
   * Zeigt verfügbare Modelle an
   */
  getAvailableModels() {
    return {
      chat: { model: this.models.chat, use: 'Complex code tasks, debugging, explanations' },
      completion: { model: this.models.completion, use: 'Fast inline completions (<100ms)' },
      reasoning: { model: this.models.reasoning, use: 'Architecture design, planning' },
      vision: { model: this.models.vision, use: 'Screenshot analysis, UI to code' },
      embedding: { model: this.models.embedding, use: 'Semantic search, RAG' }
    };
  }

  /**
   * Model-Statistiken (VRAM, Latenz)
   */
  async getModelStats() {
    try {
      const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
      return response.data.models || [];
    } catch (error) {
      console.error('[Model Router] Failed to get model stats:', error);
      return [];
    }
  }
}

// Types
export type TaskType =
  | 'inline_completion'
  | 'code_generation'
  | 'code_explanation'
  | 'debugging'
  | 'project_planning'
  | 'architecture_design'
  | 'ui_analysis'
  | 'screenshot_to_code'
  | 'embedding';

export interface GenerateOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  stop?: string[];
  useCache?: boolean;
  cacheTtlSeconds?: number;
  contextKey?: string | TaskType;
}

// Singleton Export
export const modelRouter = new ModelRouter();
