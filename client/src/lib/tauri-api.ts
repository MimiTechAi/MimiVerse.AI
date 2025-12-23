/**
 * Tauri API Bridge - TypeScript bindings for Rust Tauri commands
 * Exposes Rust performance layer to React frontend
 */

import { invoke } from '@tauri-apps/api/tauri';
import { open, save } from '@tauri-apps/api/dialog';
import { readTextFile, writeTextFile, readDir } from '@tauri-apps/api/fs';
import { appWindow } from '@tauri-apps/api/window';

// ==================== TYPES ====================

export interface WorkspaceInfo {
    path: string;
    file_count: number;
    indexed: boolean;
}

export interface FileMatch {
    path: string;
    name: string;
    line?: number;
    snippet?: string;
    score: number;
}

export interface CodeSuggestion {
    kind: string;
    message: string;
    line: number;
    column: number;
    severity: 'error' | 'warning' | 'info';
    fix?: string;
}

export interface WorkspaceStats {
    total_files: number;
    total_lines: number;
    by_language: Record<string, number>;
    dependency_count: number;
}

// ==================== TAURI COMMANDS ====================

/**
 * Open a workspace folder via Tauri Rust backend
 */
export async function openWorkspace(path: string): Promise<WorkspaceInfo> {
    return invoke<WorkspaceInfo>('open_workspace', { path });
}

/**
 * Search files in indexed workspace
 */
export async function searchFiles(query: string): Promise<FileMatch[]> {
    return invoke<FileMatch[]>('search_files', { query });
}

/**
 * Get file dependencies (imports)
 */
export async function getDependencies(filePath: string): Promise<string[]> {
    return invoke<string[]>('get_dependencies', { filePath });
}

/**
 * Get files that depend on this file (reverse dependencies)
 */
export async function getDependents(filePath: string): Promise<string[]> {
    return invoke<string[]>('get_dependents', { filePath });
}

/**
 * Analyze code for suggestions
 */
export async function analyzeCode(filePath: string, content: string): Promise<CodeSuggestion[]> {
    return invoke<CodeSuggestion[]>('analyze_code', { filePath, content });
}

/**
 * Get workspace statistics
 */
export async function getWorkspaceStats(): Promise<WorkspaceStats> {
    return invoke<WorkspaceStats>('get_workspace_stats');
}

// ==================== FILE OPERATIONS ====================

/**
 * Open folder dialog
 */
export async function openFolderDialog(): Promise<string | null> {
    const selected = await open({
        directory: true,
        multiple: false,
        title: 'Open Workspace Folder',
    });
    return selected as string | null;
}

/**
 * Save file dialog
 */
export async function saveFileDialog(defaultPath?: string): Promise<string | null> {
    return save({
        defaultPath,
        title: 'Save File',
    });
}

/**
 * Read file content
 */
export async function readFile(path: string): Promise<string> {
    return readTextFile(path);
}

/**
 * Write file content
 */
export async function writeFile(path: string, content: string): Promise<void> {
    return writeTextFile(path, content);
}

/**
 * List directory contents
 */
export async function listDirectory(path: string): Promise<Array<{ path: string; name?: string; children?: any[] }>> {
    return readDir(path, { recursive: false });
}

// ==================== WINDOW OPERATIONS ====================

/**
 * Minimize window
 */
export async function minimizeWindow(): Promise<void> {
    return appWindow.minimize();
}

/**
 * Maximize/restore window
 */
export async function toggleMaximize(): Promise<void> {
    const isMaximized = await appWindow.isMaximized();
    if (isMaximized) {
        return appWindow.unmaximize();
    } else {
        return appWindow.maximize();
    }
}

/**
 * Close window
 */
export async function closeWindow(): Promise<void> {
    return appWindow.close();
}

/**
 * Set window title
 */
export async function setWindowTitle(title: string): Promise<void> {
    return appWindow.setTitle(title);
}

// ==================== DETECTION ====================

/**
 * Check if running in Tauri
 */
export function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Check if running in Electron
 */
export function isElectron(): boolean {
    return typeof window !== 'undefined' && 'electronAPI' in window;
}

/**
 * Check if running in browser (web mode)
 */
export function isWeb(): boolean {
    return !isTauri() && !isElectron();
}

/**
 * Get platform name
 */
export function getPlatform(): 'tauri' | 'electron' | 'web' {
    if (isTauri()) return 'tauri';
    if (isElectron()) return 'electron';
    return 'web';
}
