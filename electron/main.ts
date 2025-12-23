/**
 * Mimiverse IDE - Electron Main Process
 * Production-ready desktop application entry point
 */

import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
    app.quit();
}

// Fix for SUID sandbox helper binary issue on some Linux environments
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');

let mainWindow: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV === 'development';

// ==================== WINDOW CREATION ====================

async function createWindow(): Promise<void> {
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 1000,
        minWidth: 1024,
        minHeight: 768,
        title: 'Mimiverse IDE',
        icon: path.join(__dirname, '../assets/icon.png'),
        titleBarStyle: 'hiddenInset', // macOS native look
        trafficLightPosition: { x: 15, y: 15 },
        backgroundColor: '#0a0a0f', // Dark theme background
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true,
        },
        show: false, // Don't show until ready
    });

    // Show window when ready to prevent white flash
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
        if (isDev) {
            mainWindow?.webContents.openDevTools();
        }
    });

    // Load the app
    if (isDev) {
        // Development: load from Vite dev server
        await mainWindow.loadURL('http://localhost:5000');
    } else {
        // Production: load built files
        await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Cleanup on close
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// ==================== APPLICATION MENU ====================

function createMenu(): void {
    const isMac = process.platform === 'darwin';

    const template: Electron.MenuItemConstructorOptions[] = [
        // App menu (macOS only)
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' as const },
                { type: 'separator' as const },
                { role: 'services' as const },
                { type: 'separator' as const },
                { role: 'hide' as const },
                { role: 'hideOthers' as const },
                { role: 'unhide' as const },
                { type: 'separator' as const },
                { role: 'quit' as const },
            ],
        }] : []),
        // File menu
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open Folder...',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const result = await dialog.showOpenDialog(mainWindow!, {
                            properties: ['openDirectory'],
                        });
                        if (!result.canceled && result.filePaths[0]) {
                            mainWindow?.webContents.send('folder-opened', result.filePaths[0]);
                        }
                    },
                },
                { type: 'separator' },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => mainWindow?.webContents.send('save-file'),
                },
                {
                    label: 'Save All',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => mainWindow?.webContents.send('save-all-files'),
                },
                { type: 'separator' },
                isMac ? { role: 'close' as const } : { role: 'quit' as const },
            ],
        },
        // Edit menu
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' as const },
                { role: 'redo' as const },
                { type: 'separator' as const },
                { role: 'cut' as const },
                { role: 'copy' as const },
                { role: 'paste' as const },
                { role: 'selectAll' as const },
            ],
        },
        // View menu
        {
            label: 'View',
            submenu: [
                { role: 'reload' as const },
                { role: 'forceReload' as const },
                { role: 'toggleDevTools' as const },
                { type: 'separator' as const },
                { role: 'resetZoom' as const },
                { role: 'zoomIn' as const },
                { role: 'zoomOut' as const },
                { type: 'separator' as const },
                { role: 'togglefullscreen' as const },
            ],
        },
        // AI menu (Mimiverse specific)
        {
            label: 'AI',
            submenu: [
                {
                    label: 'Toggle AI Chat',
                    accelerator: 'CmdOrCtrl+Shift+A',
                    click: () => mainWindow?.webContents.send('toggle-ai-chat'),
                },
                {
                    label: 'Start Build',
                    accelerator: 'CmdOrCtrl+Shift+B',
                    click: () => mainWindow?.webContents.send('start-build'),
                },
                { type: 'separator' },
                {
                    label: 'Run Tests',
                    accelerator: 'CmdOrCtrl+Shift+T',
                    click: () => mainWindow?.webContents.send('run-tests'),
                },
                {
                    label: 'Auto-Fix',
                    accelerator: 'CmdOrCtrl+Shift+F',
                    click: () => mainWindow?.webContents.send('auto-fix'),
                },
            ],
        },
        // Help menu
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Documentation',
                    click: () => shell.openExternal('https://mimiverse.ai/docs'),
                },
                {
                    label: 'Report Issue',
                    click: () => shell.openExternal('https://github.com/mimiverse/ide/issues'),
                },
                { type: 'separator' },
                {
                    label: 'About Mimiverse',
                    click: () => {
                        dialog.showMessageBox(mainWindow!, {
                            type: 'info',
                            title: 'About Mimiverse IDE',
                            message: 'Mimiverse IDE',
                            detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode.js: ${process.versions.node}`,
                        });
                    },
                },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// ==================== IPC HANDLERS ====================

function setupIpcHandlers(): void {
    // File operations
    ipcMain.handle('read-file', async (_event, filePath: string) => {
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            return { success: true, content };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('write-file', async (_event, filePath: string, content: string) => {
        try {
            await fs.promises.writeFile(filePath, content, 'utf-8');
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('list-directory', async (_event, dirPath: string) => {
        try {
            const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
            const files = entries.map(entry => ({
                name: entry.name,
                isDirectory: entry.isDirectory(),
                path: path.join(dirPath, entry.name),
            }));
            return { success: true, files };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // Dialog operations
    ipcMain.handle('show-open-dialog', async (_event, options) => {
        return dialog.showOpenDialog(mainWindow!, options);
    });

    ipcMain.handle('show-save-dialog', async (_event, options) => {
        return dialog.showSaveDialog(mainWindow!, options);
    });

    // Shell operations
    ipcMain.handle('open-external', async (_event, url: string) => {
        await shell.openExternal(url);
    });

    ipcMain.handle('show-item-in-folder', async (_event, fullPath: string) => {
        shell.showItemInFolder(fullPath);
    });

    // App info
    ipcMain.handle('get-app-version', () => app.getVersion());
    ipcMain.handle('get-platform', () => process.platform);
}

// ==================== APP LIFECYCLE ====================

app.on('ready', async () => {
    createMenu();
    setupIpcHandlers();
    await createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (_event, contents) => {
    contents.on('will-navigate', (event, url) => {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== 'file:' && parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            event.preventDefault();
        }
    });
});

// Handle certificate errors in development
if (isDev) {
    app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
        event.preventDefault();
        callback(true);
    });
}

console.log('[Electron] Mimiverse IDE starting...');
