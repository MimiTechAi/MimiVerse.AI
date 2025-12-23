import { contextBridge, ipcRenderer } from "electron";
const electronAPI = {
  // ==================== FILE OPERATIONS ====================
  /**
   * Read file contents
   */
  readFile: (filePath) => {
    return ipcRenderer.invoke("read-file", filePath);
  },
  /**
   * Write content to file
   */
  writeFile: (filePath, content) => {
    return ipcRenderer.invoke("write-file", filePath, content);
  },
  /**
   * List directory contents
   */
  listDirectory: (dirPath) => {
    return ipcRenderer.invoke("list-directory", dirPath);
  },
  // ==================== DIALOGS ====================
  /**
   * Show file/folder open dialog
   */
  showOpenDialog: (options) => {
    return ipcRenderer.invoke("show-open-dialog", options);
  },
  /**
   * Show file save dialog
   */
  showSaveDialog: (options) => {
    return ipcRenderer.invoke("show-save-dialog", options);
  },
  // ==================== SHELL OPERATIONS ====================
  /**
   * Open URL in default browser
   */
  openExternal: (url) => {
    return ipcRenderer.invoke("open-external", url);
  },
  /**
   * Show file in system file manager
   */
  showItemInFolder: (fullPath) => {
    return ipcRenderer.invoke("show-item-in-folder", fullPath);
  },
  // ==================== APP INFO ====================
  /**
   * Get application version
   */
  getAppVersion: () => {
    return ipcRenderer.invoke("get-app-version");
  },
  /**
   * Get platform (darwin, win32, linux)
   */
  getPlatform: () => {
    return ipcRenderer.invoke("get-platform");
  },
  // ==================== EVENT LISTENERS ====================
  /**
   * Listen for folder opened event (from menu)
   */
  onFolderOpened: (callback) => {
    ipcRenderer.on("folder-opened", (_event, path) => callback(path));
    return () => ipcRenderer.removeAllListeners("folder-opened");
  },
  /**
   * Listen for save file event (from menu)
   */
  onSaveFile: (callback) => {
    ipcRenderer.on("save-file", () => callback());
    return () => ipcRenderer.removeAllListeners("save-file");
  },
  /**
   * Listen for save all files event (from menu)
   */
  onSaveAllFiles: (callback) => {
    ipcRenderer.on("save-all-files", () => callback());
    return () => ipcRenderer.removeAllListeners("save-all-files");
  },
  /**
   * Listen for toggle AI chat event (from menu)
   */
  onToggleAIChat: (callback) => {
    ipcRenderer.on("toggle-ai-chat", () => callback());
    return () => ipcRenderer.removeAllListeners("toggle-ai-chat");
  },
  /**
   * Listen for start build event (from menu)
   */
  onStartBuild: (callback) => {
    ipcRenderer.on("start-build", () => callback());
    return () => ipcRenderer.removeAllListeners("start-build");
  },
  /**
   * Listen for run tests event (from menu)
   */
  onRunTests: (callback) => {
    ipcRenderer.on("run-tests", () => callback());
    return () => ipcRenderer.removeAllListeners("run-tests");
  },
  /**
   * Listen for auto-fix event (from menu)
   */
  onAutoFix: (callback) => {
    ipcRenderer.on("auto-fix", () => callback());
    return () => ipcRenderer.removeAllListeners("auto-fix");
  }
};
contextBridge.exposeInMainWorld("electronAPI", electronAPI);
console.log("[Preload] Mimiverse API exposed to renderer");
//# sourceMappingURL=preload.js.map
