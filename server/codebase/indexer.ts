
import { pool } from "../storage";
import { generateEmbedding as ollamaEmbedding } from "../ai/utils/ollama";
import { tritonEmbeddings } from "../ai/utils/triton-embeddings";
import fs from "fs/promises";
import path from "path";

/**
 * Production-grade codebase indexer with pgvector
 * SOTA 2025: Semantic code search using embeddings
 */

export async function initVectorExtension() {
    try {
        await pool.query("CREATE EXTENSION IF NOT EXISTS vector;");
        await pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");  // FTS Extension
        await pool.query(`
            CREATE TABLE IF NOT EXISTS file_embeddings (
                id SERIAL PRIMARY KEY,
                project_id TEXT NOT NULL,
                path TEXT NOT NULL,
                content TEXT NOT NULL,
                embedding vector(768),
                content_tsvector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id, path)
            );
            
            -- Vector Index (Cosine Similarity)
            CREATE INDEX IF NOT EXISTS file_embeddings_embedding_idx 
            ON file_embeddings USING ivfflat (embedding vector_cosine_ops) 
            WITH (lists = 100);

            -- Full-Text Search Index
            CREATE INDEX IF NOT EXISTS file_embeddings_fts_idx 
            ON file_embeddings USING GIN (content_tsvector);

            CREATE INDEX IF NOT EXISTS file_embeddings_project_id_idx ON file_embeddings(project_id);
        `);
        console.log("[Indexer] ✅ Vector extension, FTS and indexes initialized");
    } catch (error: any) {
        console.error("[Indexer] Failed to init vector extension:", error.message);
    }
}

/**
 * Smart Embedding Function (Auto-Routing)
 * Nutzt Triton (CUDA) wenn verfügbar, sonst Ollama (CPU)
 */
async function getEmbedding(text: string): Promise<number[]> {
    // Triton Health Check (cached)
    const healthy = await tritonEmbeddings.checkHealth();
    
    if (healthy) {
        // CUDA-beschleunigt (3-5ms)
        return await tritonEmbeddings.generateEmbedding(text);
    } else {
        // CPU Fallback (300ms)
        return await ollamaEmbedding(text);
    }
}

export async function indexFile(projectId: string, filePath: string, content: string) {
    try {
        const embedding = await getEmbedding(content);

        // Skip if embedding failed
        if (embedding.every(v => v === 0)) {
            console.warn(`[Indexer] Skipping ${filePath}: embedding failed`);
            return;
        }

        const embeddingString = `[${embedding.join(",")}]`;

        await pool.query(
            `INSERT INTO file_embeddings(project_id, path, content, embedding, updated_at)
             VALUES($1, $2, $3, $4, NOW())
             ON CONFLICT(project_id, path) DO UPDATE 
             SET content = $3, embedding = $4, updated_at = NOW()`,
            [projectId, filePath, content, embeddingString]
        );

        console.log(`[Indexer] ✅ Indexed ${filePath} for project ${projectId}`);
    } catch (error: any) {
        if (!error.message?.includes('password') && !error.message?.includes('connect')) {
            console.error(`[Indexer] Failed to index ${filePath}:`, error.message);
        }
    }
}

export async function searchCodebase(query: string, limit = 5, projectId: string) {
    try {
        const embedding = await getEmbedding(query);

        if (embedding.every(v => v === 0)) {
            console.warn("[Indexer] Search skipped: embedding failed");
            return [];
        }

        const embeddingString = `[${embedding.join(",")}]`;

        // Hybrid Search: Vector (70%) + FTS (30%)
        const result = await pool.query(
            `WITH vector_results AS (
                SELECT 
                    path, 
                    content, 
                    1 - (embedding <=> $1::vector) as vec_similarity
                FROM file_embeddings
                WHERE project_id = $3 AND embedding IS NOT NULL
                ORDER BY embedding <=> $1::vector
                LIMIT 20
            ),
            fts_results AS (
                SELECT 
                    path, 
                    content,
                    ts_rank(content_tsvector, plainto_tsquery('english', $4)) as fts_score
                FROM file_embeddings
                WHERE project_id = $3 
                  AND content_tsvector @@ plainto_tsquery('english', $4)
                ORDER BY fts_score DESC
                LIMIT 20
            ),
            combined AS (
                SELECT DISTINCT ON (path)
                    COALESCE(v.path, f.path) as path,
                    COALESCE(v.content, f.content) as content,
                    COALESCE(v.vec_similarity, 0) * 0.7 + COALESCE(f.fts_score, 0) * 0.3 as hybrid_score
                FROM vector_results v
                FULL OUTER JOIN fts_results f ON v.path = f.path
            )
            SELECT path, content, hybrid_score as similarity
            FROM combined
            ORDER BY hybrid_score DESC
            LIMIT $2`,
            [embeddingString, limit, projectId, query]
        );

        console.log(`[Indexer] 🔍 Hybrid Search: ${result.rows.length} results for "${query}" in project ${projectId}`);
        return result.rows;
    } catch (error: any) {
        console.error("[Indexer] Search failed:", error.message);
        return [];
    }
}

export async function indexProject(rootDir: string, projectId: string) {
    console.log(`[Indexer] 🚀 Starting project indexing for ${projectId}...`);
    await initVectorExtension();

    let indexed = 0;
    let skipped = 0;

    async function scanDir(dir: string) {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(rootDir, fullPath);

            if (entry.isDirectory()) {
                // Skip common directories and .cursor-server
                if (["node_modules", "dist", ".git", "data", ".cursor-server", ".vscode", "build", "out"].includes(entry.name)) {
                    skipped++;
                    continue;
                }
                await scanDir(fullPath);
            } else {
                if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") ||
                    entry.name.endsWith(".js") || entry.name.endsWith(".jsx")) {
                    try {
                        const content = await fs.readFile(fullPath, "utf-8");
                        // Skip empty files or files larger than 20KB (to avoid context limit)
                        if (content.length > 0 && content.length < 20000) {
                            await indexFile(projectId, relativePath, content);
                            indexed++;
                        } else {
                            if (content.length >= 20000) {
                                console.log(`[Indexer] ⏭️  Skipping ${relativePath} (too large: ${content.length} chars)`);
                            }
                            skipped++;
                        }
                    } catch (error) {
                        skipped++;
                    }
                }
            }
        }
    }

    await scanDir(rootDir);
    console.log(`[Indexer] ✅ Indexing complete: ${indexed} files indexed, ${skipped} skipped`);
}
