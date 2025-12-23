/**
 * Cognitive Memory - Persistent context and learning system
 */

export interface MemoryEntry {
    id: string;
    type: 'conversation' | 'code_pattern' | 'user_preference' | 'project_context';
    content: string;
    embedding?: number[]; // For future vector search
    metadata: Record<string, any>;
    timestamp: number;
}

class CognitiveMemoryManager {
    private memory: Map<string, MemoryEntry> = new Map();
    private maxEntries = 1000;

    /**
     * Store a memory entry
     */
    store(type: MemoryEntry['type'], content: string, metadata: Record<string, any> = {}) {
        const entry: MemoryEntry = {
            id: Math.random().toString(36).substring(7),
            type,
            content,
            metadata,
            timestamp: Date.now()
        };

        this.memory.set(entry.id, entry);

        // Prune old entries if limit exceeded
        if (this.memory.size > this.maxEntries) {
            const oldest = Array.from(this.memory.values())
                .sort((a, b) => a.timestamp - b.timestamp)[0];
            if (oldest) {
                this.memory.delete(oldest.id);
            }
        }

        return entry.id;
    }

    /**
     * Retrieve memory by ID
     */
    get(id: string): MemoryEntry | undefined {
        return this.memory.get(id);
    }

    /**
     * Search memory by type
     */
    search(type?: MemoryEntry['type'], limit: number = 10): MemoryEntry[] {
        let results = Array.from(this.memory.values());

        if (type) {
            results = results.filter(e => e.type === type);
        }

        return results
            .sort((a, b) => b.timestamp - a.timestamp) // Most recent first
            .slice(0, limit);
    }

    /**
     * Get memory stats
     */
    getStats() {
        const byType: Record<string, number> = {};

        const entries = Array.from(this.memory.values());
        for (const entry of entries) {
            byType[entry.type] = (byType[entry.type] || 0) + 1;
        }

        return {
            total: this.memory.size,
            byType,
            maxEntries: this.maxEntries
        };
    }

    /**
     * Clear all memory
     */
    clear() {
        this.memory.clear();
    }
}

// Global singleton
export const cognitiveMemory = new CognitiveMemoryManager();
