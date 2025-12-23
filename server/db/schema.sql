-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  full_name TEXT,
  avatar_url TEXT,
  workspace_path TEXT UNIQUE,
  tier TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  subscription_id TEXT,
  subscription_status TEXT,
  storage_used_mb INTEGER DEFAULT 0,
  storage_limit_mb INTEGER DEFAULT 500,
  prompts_used_this_month INTEGER DEFAULT 0,
  prompts_limit INTEGER DEFAULT 25,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. User Projects Table
CREATE TABLE IF NOT EXISTS user_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  path TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'created',
  size_mb INTEGER DEFAULT 0,
  file_count INTEGER DEFAULT 0,
  last_indexed_at TIMESTAMP,
  git_repo_url TEXT,
  git_branch TEXT DEFAULT 'main',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Project Files Table
CREATE TABLE IF NOT EXISTS project_files (
  id SERIAL PRIMARY KEY,
  project_id UUID REFERENCES user_projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  extension TEXT,
  size_bytes INTEGER DEFAULT 0,
  last_modified TIMESTAMP,
  is_indexed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, path)
);

-- 4. Usage Logs
CREATE TABLE IF NOT EXISTS usage_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES user_projects(id),
  action_type TEXT NOT NULL,
  model_used TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON user_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_logs(user_id, created_at);
