// Mimiverse IDE - Rust Core Engine
// Production-ready performance layer powered by Mimi Engine

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod mimi_engine;
mod file_indexer;
mod code_analyzer;

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Manager, State};
use serde::{Deserialize, Serialize};

// ==================== STATE ====================

pub struct AppState {
    pub workspace_path: Mutex<Option<PathBuf>>,
    pub file_index: Mutex<file_indexer::FileIndex>,
    pub code_graph: Mutex<mimi_engine::CodeGraph>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            workspace_path: Mutex::new(None),
            file_index: Mutex::new(file_indexer::FileIndex::new()),
            code_graph: Mutex::new(mimi_engine::CodeGraph::new()),
        }
    }
}

// ==================== COMMANDS ====================

/// Open a workspace folder
#[tauri::command]
async fn open_workspace(path: String, state: State<'_, AppState>) -> Result<WorkspaceInfo, String> {
    let path = PathBuf::from(&path);
    
    if !path.exists() || !path.is_dir() {
        return Err("Invalid workspace path".to_string());
    }

    // Update state
    *state.workspace_path.lock().unwrap() = Some(path.clone());

    // Index files in background
    let mut index = state.file_index.lock().unwrap();
    index.index_directory(&path).map_err(|e| e.to_string())?;

    // Build dependency graph
    let mut graph = state.code_graph.lock().unwrap();
    graph.analyze_workspace(&path).map_err(|e| e.to_string())?;

    Ok(WorkspaceInfo {
        path: path.to_string_lossy().to_string(),
        file_count: index.file_count(),
        indexed: true,
    })
}

/// Search files in workspace
#[tauri::command]
async fn search_files(query: String, state: State<'_, AppState>) -> Result<Vec<FileMatch>, String> {
    let index = state.file_index.lock().unwrap();
    Ok(index.search(&query))
}

/// Get file dependencies
#[tauri::command]
async fn get_dependencies(file_path: String, state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let graph = state.code_graph.lock().unwrap();
    Ok(graph.get_dependencies(&file_path))
}

/// Get files that depend on this file
#[tauri::command]
async fn get_dependents(file_path: String, state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let graph = state.code_graph.lock().unwrap();
    Ok(graph.get_dependents(&file_path))
}

/// Analyze code for suggestions
#[tauri::command]
async fn analyze_code(
    file_path: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<Vec<CodeSuggestion>, String> {
    let analyzer = code_analyzer::CodeAnalyzer::new();
    analyzer.analyze(&file_path, &content).map_err(|e| e.to_string())
}

/// Get workspace statistics
#[tauri::command]
async fn get_workspace_stats(state: State<'_, AppState>) -> Result<WorkspaceStats, String> {
    let index = state.file_index.lock().unwrap();
    let graph = state.code_graph.lock().unwrap();

    Ok(WorkspaceStats {
        total_files: index.file_count(),
        total_lines: index.total_lines(),
        by_language: index.files_by_language(),
        dependency_count: graph.edge_count(),
    })
}

// ==================== TYPES ====================

#[derive(Serialize, Deserialize)]
pub struct WorkspaceInfo {
    pub path: String,
    pub file_count: usize,
    pub indexed: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct FileMatch {
    pub path: String,
    pub name: String,
    pub line: Option<usize>,
    pub snippet: Option<String>,
    pub score: f32,
}

#[derive(Serialize, Deserialize)]
pub struct CodeSuggestion {
    pub kind: String,
    pub message: String,
    pub line: usize,
    pub column: usize,
    pub severity: String,
    pub fix: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct WorkspaceStats {
    pub total_files: usize,
    pub total_lines: usize,
    pub by_language: std::collections::HashMap<String, usize>,
    pub dependency_count: usize,
}

// ==================== MAIN ====================

fn main() {
    env_logger::init();

    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            open_workspace,
            search_files,
            get_dependencies,
            get_dependents,
            analyze_code,
            get_workspace_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
