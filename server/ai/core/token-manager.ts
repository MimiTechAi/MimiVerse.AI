import { encoding_for_model, TiktokenModel } from "tiktoken";
import { logger } from "../../utils/logger";

export interface TokenBudget {
    system: number;    // Instructions & Personality
    history: number;   // Chat history
    context: number;   // Retrieved docs & code (RAG)
    output: number;    // Reserved for model response
    total: number;     // Total window size (e.g., 128k)
}

/**
 * Intelligent Context Window Manager
 * Manages token budgets to prevent context overflow and "Lost in the Middle"
 */
export class ContextWindowManager {
    private model: TiktokenModel;
    private budget: TokenBudget;

    constructor(modelName: string = "gpt-4-turbo", totalLimit: number = 128000) {
        // Fallback to gpt-4 encoding if model not found
        this.model = (modelName.startsWith("gpt") ? modelName : "gpt-4") as TiktokenModel;

        // Default Budget Allocation (Golden Ratio for Coding)
        this.budget = {
            system: 2000,                  // Approx 5%
            history: 20000,                // Approx 15%
            context: totalLimit - 26000,   // Remaining (~80%) for Code/RAG
            output: 4000,                  // Reserved for completion
            total: totalLimit
        };
    }

    /**
     * Calculate token count for a string
     */
    countTokens(text: string): number {
        try {
            const enc = encoding_for_model(this.model);
            const count = enc.encode(text).length;
            enc.free();
            return count;
        } catch (e) {
            // Fallback estimation (char count / 4)
            return Math.ceil(text.length / 4);
        }
    }

    /**
     * Truncate text to fit token limit
     */
    truncate(text: string, limit: number): string {
        const tokens = this.countTokens(text);
        if (tokens <= limit) return text;

        // Naive char truncation first for speed
        const ratio = limit / tokens;
        const newLength = Math.floor(text.length * ratio);
        return text.slice(0, newLength) + "... [truncated]";
    }

    /**
     * Optimize chat history to fit budget
     * Prioritizes recent messages and system prompt
     */
    optimizeHistory(messages: { role: string, content: string }[]): { role: string, content: string }[] {
        const optimized: { role: string, content: string }[] = [];
        let usedTokens = 0;

        // Always keep system prompt(s)
        const systemMsgs = messages.filter(m => m.role === 'system');
        for (const msg of systemMsgs) {
            usedTokens += this.countTokens(msg.content);
            optimized.push(msg);
        }

        // Process remaining messages in reverse (newest first)
        const chatMsgs = messages.filter(m => m.role !== 'system').reverse();

        for (const msg of chatMsgs) {
            const tokens = this.countTokens(msg.content);
            if (usedTokens + tokens > this.budget.history) {
                break; // Stop if budget exceeded
            }
            usedTokens += tokens;
            optimized.unshift(msg); // Prepend to keep chronological order
        }

        return optimized;
    }

    /**
     * Prioritize and select code context
     * Selects files based on relevance score until budget is full
     */
    selectContext(files: { path: string, content: string, score: number }[]): { path: string, content: string }[] {
        // Sort by relevance score (descending)
        const sorted = [...files].sort((a, b) => b.score - a.score);

        const selected: { path: string, content: string }[] = [];
        let usedTokens = 0;

        for (const file of sorted) {
            const tokens = this.countTokens(file.content);

            // If file fits entirely
            if (usedTokens + tokens <= this.budget.context) {
                selected.push(file);
                usedTokens += tokens;
            }
            // If file is large but highly relevant, truncate it
            else if (usedTokens < this.budget.context) {
                const remaining = this.budget.context - usedTokens;
                if (remaining > 500) { // Only if reasonable space left
                    selected.push({
                        path: file.path,
                        content: this.truncate(file.content, remaining)
                    });
                    usedTokens += remaining;
                }
                break; // Context full
            }
        }

        logger.info(`[ContextManager] Selected ${selected.length} files (${usedTokens} tokens) from ${files.length} candidates`);
        return selected;
    }
}
