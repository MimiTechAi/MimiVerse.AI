import { type User, type InsertUser } from "@shared/schema";
import { users as pgUsers } from "@shared/schema";
import { users as sqliteUsers } from "@shared/sqlite-schema";
import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as path from 'path';
import * as os from 'os';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import fs from "fs";

/**
 * Production-grade Storage Abstraction
 * Supports:
 * 1. PostgreSQL (Server/Cloud Mode) - SOTA 2025 Standard
 * 2. SQLite (Desktop/Offline Mode) - Portable
 */

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

// Configuration
const isProduction = process.env.NODE_ENV === 'production';
const usePostgres = !!process.env.DATABASE_URL; // Only use PG if URL is provided
// In Desktop app, DATABASE_URL is usually undefined, triggering SQLite mode.

// ==================== POSTGRESQL IMPLEMENTATION ====================
let pool: any = { totalCount: 0, idleCount: 0, waitingCount: 0 }; // Mock for SQLite
let db: any;

if (usePostgres) {
  console.log('[Storage] 🌐 Mode: Server (PostgreSQL)');
  const connectionString = process.env.DATABASE_URL;

  pool = new Pool({
    connectionString,
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err: any) => console.error('[Storage] PG Error:', err));
  db = drizzle(pool);

  // Init PG Schema
  (async () => {
    try {
      await pool.query(`
                CREATE EXTENSION IF NOT EXISTS vector;
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT NOT NULL UNIQUE,
                    password TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                -- Vector tables skipped for offline brevity in this check, assuming full script runs elsewhere
            `);
      console.log('[Storage] ✅ PostgreSQL initialized');
    } catch (e: any) {
      console.error('[Storage] ❌ Initializing PG failed:', e.message);
    }
  })();
}

// ==================== SQLITE IMPLEMENTATION ====================
if (!usePostgres) {
  console.log('[Storage] 💻 Mode: Desktop/Offline (SQLite)');
  const dataDir = path.join(process.cwd(), '.mimiverse_data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const sqlitePath = path.join(dataDir, 'app.db');
  const sqlite = new Database(sqlitePath);
  db = drizzleSqlite(sqlite);

  // Init SQLite Schema
  sqlite.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
  console.log(`[Storage] ✅ SQLite initialzed at ${sqlitePath}`);
}

// ==================== STORAGE CLASSES ====================

export class PostgresStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(pgUsers).where(eq(pgUsers.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(pgUsers).where(eq(pgUsers.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(pgUsers).values(insertUser).returning();
    return result[0];
  }
}

export class SqliteStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(sqliteUsers).where(eq(sqliteUsers.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(sqliteUsers).where(eq(sqliteUsers.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const newUser: User = { ...insertUser, id };
    // SQLite doesn't support 'returning' in all versions easily via Drizzle without configuration
    // So we insert, then return the object
    await db.insert(sqliteUsers).values(newUser);
    return newUser;
  }
}

export const workspaceDir = path.join(os.tmpdir(), 'mimiverse-workspaces');

// Export the correct instance
export const storage: IStorage = usePostgres ? new PostgresStorage() : new SqliteStorage();
export { pool, db };

