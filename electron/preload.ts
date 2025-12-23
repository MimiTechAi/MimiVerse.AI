/**
 * Mimiverse IDE - Electron Preload Script
 * Secure bridge between renderer and main process
 */

import { contextBridge, ipcRenderer } from 'electron';

// ==================== EXPOSED API ====================

/**
 * API exposed to the renderer process via window.electronAPI
 */
const electronAPI = {
    // ==================== FILE OPERATIONS ====================

    /**
     * Read file contents
     */
    readFile: (filePath: string): Promise<{ success: boolean; content?: string; error?: string }> => {
        return ipcRenderer.invoke('read-file', filePath);
    },

    /**
     * Write content to file
     */
    writeFile: (filePath: string, content: string): Promise<{ success: boolean; error?: string }> => {
        return ipcRenderer.invoke('write-file', filePath, content);
    },

    /**
     * List directory contents
     */
    listDirectory: (dirPath: string): Promise<{
        success: boolean;
        files?: Array<{ name: string; isDirectory: boolean; path: string }>;
        error?: string
    }> => {
        return ipcRenderer.invoke('list-directory', dirPath);
    },

    // ==================== DIALOGS ====================

    /**
     * Show file/folder open dialog
     */
    showOpenDialog: (options: {
        title?: string;
        defaultPath?: string;
        filters?: Array<{ name: string; extensions: string[] }>;
        properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'createDirectory'>;
    }): Promise<{ canceled: boolean; filePaths: string[] }> => {
        return ipcRenderer.invoke('show-open-dialog', options);
    },

    /**
     * Show file save dialog
     */
    showSaveDialog: (options: {
        title?: string;
        defaultPath?: string;
        filters?: Array<{ name: string; extensions: string[] }>;
    }): Promise<{ canceled: boolean; filePath?: string }> => {
        return ipcRenderer.invoke('show-save-dialog', options);
    },

    // ==================== SHELL OPERATIONS ====================

    /**
     * Open URL in default browser
     */
    openExternal: (url: string): Promise<void> => {
        return ipcRenderer.invoke('open-external', url);
    },

    /**
     * Show file in system file manager
     */
    showItemInFolder: (fullPath: string): Promise<void> => {
        return ipcRenderer.invoke('show-item-in-folder', fullPath);
    },

    // ==================== APP INFO ====================

    /**
     * Get application version
     */
    getAppVersion: (): Promise<string> => {
        return ipcRenderer.invoke('get-app-version');
    },

    /**
     * Get platform (darwin, win32, linux)
     */
    getPlatform: (): Promise<string> => {
        return ipcRenderer.invoke('get-platform');
    },

    // ==================== EVENT LISTENERS ====================

    /**
     * Listen for folder opened event (from menu)
     */
    onFolderOpened: (callback: (folderPath: string) => void) => {
        ipcRenderer.on('folder-opened', (_event, path) => callback(path));
        return () => ipcRenderer.removeAllListeners('folder-opened');
    },

    /**
     * Listen for save file event (from menu)
     */
    onSaveFile: (callback: () => void) => {
        ipcRenderer.on('save-file', () => callback());
        return () => ipcRenderer.removeAllListeners('save-file');
    },

    /**
     * Listen for save all files event (from menu)
     */
    onSaveAllFiles: (callback: () => void) => {
        ipcRenderer.on('save-all-files', () => callback());
        return () => ipcRenderer.removeAllListeners('save-all-files');
    },

    /**
     * Listen for toggle AI chat event (from menu)
     */
    onToggleAIChat: (callback: () => void) => {
        ipcRenderer.on('toggle-ai-chat', () => callback());
        return () => ipcRenderer.removeAllListeners('toggle-ai-chat');
    },

    /**
     * Listen for start build event (from menu)
     */
    onStartBuild: (callback: () => void) => {
        ipcRenderer.on('start-build', () => callback());
        return () => ipcRenderer.removeAllListeners('start-build');
    },

    /**
     * Listen for run tests event (from menu)
     */
    onRunTests: (callback: () => void) => {
        ipcRenderer.on('run-tests', () => callback());
        return () => ipcRenderer.removeAllListeners('run-tests');
    },

    /**
     * Listen for auto-fix event (from menu)
     */
    onAutoFix: (callback: () => void) => {
        ipcRenderer.on('auto-fix', () => callback());
        return () => ipcRenderer.removeAllListeners('auto-fix');
    },
};

// ==================== EXPOSE TO RENDERER ====================

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declarations for the renderer process
declare global {
    interface Window {
        electronAPI: typeof electronAPI;
    }
}

console.log('[Preload] Mimiverse API exposed to renderer');
