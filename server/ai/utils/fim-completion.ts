import axios from 'axios';
import { aiCache } from '../../cache/ai-cache';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const COMPLETION_MODEL = process.env.OLLAMA_COMPLETION_MODEL || 'qwen2.5-coder:1.5b';

/**
 * Fill-In-Middle (FIM) Inline Completions für DGX Spark
 * Optimiert für <100ms Latenz mit qwen2.5-coder:1.5b
 */

export interface FIMRequest {
  prefix: string;      // Code vor Cursor
  suffix: string;      // Code nach Cursor  
  language?: string;   // Programmiersprache
  maxTokens?: number;  // Max Completion-Länge
}

export interface FIMResponse {
  completion: string;
  latency: number;     // In Millisekunden
  cached: boolean;
}

/**
 * Generiert Inline Code Completion mit FIM
 */
export async function generateFIMCompletion(request: FIMRequest): Promise<FIMResponse> {
  const startTime = Date.now();
  
  try {
    // Cache-Key aus prefix + suffix
    const cacheKey = `fim:${request.prefix}:${request.suffix}`;
    
    // Cache-Lookup
    const cached = await aiCache.get(cacheKey, COMPLETION_MODEL);
    if (cached) {
      return {
        completion: cached,
        latency: Date.now() - startTime,
        cached: true
      };
    }

    // FIM Prompt für Qwen2.5-Coder
    const fimPrompt = constructFIMPrompt(request);

    // Ollama Inference (mit kleinem Modell = schnell)
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: COMPLETION_MODEL,
      prompt: fimPrompt,
      stream: false,
      options: {
        temperature: 0.2,      // Niedrig für deterministische Completions
        top_p: 0.95,
        top_k: 50,
        num_predict: request.maxTokens || 128,
        stop: ['\n\n', '```', '###']  // Stop bei logischen Grenzen
      }
    });

    const completion = response.data.response || '';
    const cleanedCompletion = cleanFIMCompletion(completion, request);

    // Cache speichern (TTL: 5 Minuten - Completions ändern sich häufig)
    await aiCache.set(cacheKey, COMPLETION_MODEL, cleanedCompletion, undefined, 300);

    return {
      completion: cleanedCompletion,
      latency: Date.now() - startTime,
      cached: false
    };
  } catch (error) {
    console.error('[FIM] Completion error:', error);
    return {
      completion: '',
      latency: Date.now() - startTime,
      cached: false
    };
  }
}

/**
 * Konstruiert FIM-Prompt für Qwen2.5-Coder
 */
function constructFIMPrompt(request: FIMRequest): string {
  const { prefix, suffix, language } = request;

  // Qwen2.5-Coder FIM Format:
  // <|fim_prefix|>PREFIX<|fim_suffix|>SUFFIX<|fim_middle|>
  
  return `<|fim_prefix|>${prefix}<|fim_suffix|>${suffix}<|fim_middle|>`;
}

/**
 * Bereinigt FIM Completion (entfernt Artefakte)
 */
function cleanFIMCompletion(completion: string, request: FIMRequest): string {
  let cleaned = completion;

  // Entferne FIM-Tags
  cleaned = cleaned.replace(/<\|fim_prefix\|>/g, '');
  cleaned = cleaned.replace(/<\|fim_suffix\|>/g, '');
  cleaned = cleaned.replace(/<\|fim_middle\|>/g, '');
  cleaned = cleaned.replace(/<\|endoftext\|>/g, '');

  // Entferne führende/trailing Whitespace
  cleaned = cleaned.trim();

  // Stoppe bei doppelter Newline (neue Code-Section)
  const doubleNewline = cleaned.indexOf('\n\n');
  if (doubleNewline !== -1) {
    cleaned = cleaned.substring(0, doubleNewline);
  }

  return cleaned;
}

/**
 * Streaming FIM Completion (für Live-Updates)
 */
export async function* generateFIMCompletionStream(request: FIMRequest): AsyncGenerator<string> {
  try {
    const fimPrompt = constructFIMPrompt(request);

    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model: COMPLETION_MODEL,
        prompt: fimPrompt,
        stream: true,
        options: {
          temperature: 0.2,
          num_predict: request.maxTokens || 128,
          stop: ['\n\n', '```', '###']
        }
      },
      { responseType: 'stream' }
    );

    for await (const chunk of response.data) {
      const lines = chunk.toString().split('\n').filter((line: string) => line.trim());
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
    console.error('[FIM] Stream error:', error);
  }
}

/**
 * Multi-Line Completion (größere Code-Blöcke)
 */
export async function generateMultiLineCompletion(
  prefix: string,
  language: string = 'typescript'
): Promise<string> {
  const startTime = Date.now();

  try {
    // Erkenne Kontext (Funktion, Klasse, etc.)
    const context = detectCodeContext(prefix);
    
    const prompt = `Continue this ${language} code:

\`\`\`${language}
${prefix}
\`\`\`

Complete the ${context}. Write only the code, no explanations.`;

    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: COMPLETION_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 512
      }
    });

    const completion = response.data.response || '';
    console.log(`[FIM] Multi-line completion in ${Date.now() - startTime}ms`);
    
    return extractCodeBlock(completion, language);
  } catch (error) {
    console.error('[FIM] Multi-line error:', error);
    return '';
  }
}

/**
 * Erkennt Code-Kontext (Funktion, Klasse, etc.)
 */
function detectCodeContext(prefix: string): string {
  if (prefix.includes('function ') || prefix.includes('const ') || prefix.includes('async ')) {
    return 'function';
  }
  if (prefix.includes('class ')) {
    return 'class';
  }
  if (prefix.includes('interface ') || prefix.includes('type ')) {
    return 'type definition';
  }
  return 'code';
}

/**
 * Extrahiert Code-Block aus Markdown
 */
function extractCodeBlock(text: string, language: string): string {
  const regex = new RegExp(`\`\`\`${language}\\n([\\s\\S]*?)\\n\`\`\``, 'i');
  const match = text.match(regex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Fallback: Nehme ersten Code-Block
  const genericMatch = text.match(/```[\s\S]*?\n([\s\S]*?)\n```/);
  if (genericMatch && genericMatch[1]) {
    return genericMatch[1].trim();
  }
  
  return text.trim();
}
