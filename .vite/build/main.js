import { app, BrowserWindow, shell, dialog, Menu, ipcMain } from "electron";
import * as path from "path";
import * as fs from "fs";
import { createRequire } from "node:module";
const require2 = createRequire(import.meta.url);
if (require2("electron-squirrel-startup")) {
  app.quit();
}
app.commandLine.appendSwitch("no-sandbox");
app.commandLine.appendSwitch("disable-gpu-sandbox");
let mainWindow = null;
const isDev = process.env.NODE_ENV === "development";
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1e3,
    minWidth: 1024,
    minHeight: 768,
    title: "Mimiverse IDE",
    icon: path.join(__dirname, "../assets/icon.png"),
    titleBarStyle: "hiddenInset",
    // macOS native look
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: "#0a0a0f",
    // Dark theme background
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true
    },
    show: false
    // Don't show until ready
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow == null ? void 0 : mainWindow.show();
    if (isDev) {
      mainWindow == null ? void 0 : mainWindow.webContents.openDevTools();
    }
  });
  if (isDev) {
    await mainWindow.loadURL("http://localhost:5000");
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
function createMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    // App menu (macOS only)
    ...isMac ? [{
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" }
      ]
    }] : [],
    // File menu
    {
      label: "File",
      submenu: [
        {
          label: "Open Folder...",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ["openDirectory"]
            });
            if (!result.canceled && result.filePaths[0]) {
              mainWindow == null ? void 0 : mainWindow.webContents.send("folder-opened", result.filePaths[0]);
            }
          }
        },
        { type: "separator" },
        {
          label: "Save",
          accelerator: "CmdOrCtrl+S",
          click: () => mainWindow == null ? void 0 : mainWindow.webContents.send("save-file")
        },
        {
          label: "Save All",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => mainWindow == null ? void 0 : mainWindow.webContents.send("save-all-files")
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" }
      ]
    },
    // Edit menu
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    // View menu
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    // AI menu (Mimiverse specific)
    {
      label: "AI",
      submenu: [
        {
          label: "Toggle AI Chat",
          accelerator: "CmdOrCtrl+Shift+A",
          click: () => mainWindow == null ? void 0 : mainWindow.webContents.send("toggle-ai-chat")
        },
        {
          label: "Start Build",
          accelerator: "CmdOrCtrl+Shift+B",
          click: () => mainWindow == null ? void 0 : mainWindow.webContents.send("start-build")
        },
        { type: "separator" },
        {
          label: "Run Tests",
          accelerator: "CmdOrCtrl+Shift+T",
          click: () => mainWindow == null ? void 0 : mainWindow.webContents.send("run-tests")
        },
        {
          label: "Auto-Fix",
          accelerator: "CmdOrCtrl+Shift+F",
          click: () => mainWindow == null ? void 0 : mainWindow.webContents.send("auto-fix")
        }
      ]
    },
    // Help menu
    {
      label: "Help",
      submenu: [
        {
          label: "Documentation",
          click: () => shell.openExternal("https://mimiverse.ai/docs")
        },
        {
          label: "Report Issue",
          click: () => shell.openExternal("https://github.com/mimiverse/ide/issues")
        },
        { type: "separator" },
        {
          label: "About Mimiverse",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About Mimiverse IDE",
              message: "Mimiverse IDE",
              detail: `Version: ${app.getVersion()}
Electron: ${process.versions.electron}
Chrome: ${process.versions.chrome}
Node.js: ${process.versions.node}`
            });
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
function setupIpcHandlers() {
  ipcMain.handle("read-file", async (_event, filePath) => {
    try {
      const content = await fs.promises.readFile(filePath, "utf-8");
      return { success: true, content };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("write-file", async (_event, filePath, content) => {
    try {
      await fs.promises.writeFile(filePath, content, "utf-8");
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("list-directory", async (_event, dirPath) => {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      const files = entries.map((entry) => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        path: path.join(dirPath, entry.name)
      }));
      return { success: true, files };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("show-open-dialog", async (_event, options) => {
    return dialog.showOpenDialog(mainWindow, options);
  });
  ipcMain.handle("show-save-dialog", async (_event, options) => {
    return dialog.showSaveDialog(mainWindow, options);
  });
  ipcMain.handle("open-external", async (_event, url) => {
    await shell.openExternal(url);
  });
  ipcMain.handle("show-item-in-folder", async (_event, fullPath) => {
    shell.showItemInFolder(fullPath);
  });
  ipcMain.handle("get-app-version", () => app.getVersion());
  ipcMain.handle("get-platform", () => process.platform);
}
app.on("ready", async () => {
  createMenu();
  setupIpcHandlers();
  await createWindow();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});
app.on("web-contents-created", (_event, contents) => {
  contents.on("will-navigate", (event, url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "file:" && parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      event.preventDefault();
    }
  });
});
if (isDev) {
  app.on("certificate-error", (event, _webContents, _url, _error, _certificate, callback) => {
    event.preventDefault();
    callback(true);
  });
}
console.log("[Electron] Mimiverse IDE starting...");
//# sourceMappingURL=main.js.map
