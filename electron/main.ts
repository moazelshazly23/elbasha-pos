/**
 * Electron Main Process - Mosawyat Al Basha Commercial POS
 * 
 * Handles:
 * 1. Desktop Window Creation (Single-instance lock, POS fullscreen/kiosk, error handling)
 * 2. Local IPC Communication (Windows %LOCALAPPDATA% directory, SQLite sync, hardware info)
 * 3. Native Printing Service (Silent direct thermal receipt printing on 80mm/58mm/A4)
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { NativePrintingService } from './printing.js';
import type { SQLitePathPayload, SQLiteSnapshotPayload, PrintOptions, SystemInfo } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// 1. Windows File System & %LOCALAPPDATA% Path Configuration
// ---------------------------------------------------------------------------
const APP_FOLDER_NAME = 'MosawyatAlBashaPOS';
const SQLITE_FILE_NAME = 'mosawyat_albasha.sqlite';

const USER_DATA_PATH = path.join(
  process.env.LOCALAPPDATA || app.getPath('appData'),
  APP_FOLDER_NAME
);

const DATA_DIR = path.join(USER_DATA_PATH, 'data');
const LOGS_DIR = path.join(USER_DATA_PATH, 'logs');
const BACKUPS_DIR = path.join(USER_DATA_PATH, 'backups');
const SQLITE_DB_FILE = path.join(DATA_DIR, SQLITE_FILE_NAME);

// Ensure directories exist outside Program Files to avoid Windows UAC restrictions
function ensureSystemDirectories(): void {
  const dirs = [USER_DATA_PATH, DATA_DIR, LOGS_DIR, BACKUPS_DIR];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.error(`[Electron] Failed to create directory ${dir}:`, err);
      }
    }
  });

  // Ensure default SQLite 3 database file header if missing
  try {
    if (!fs.existsSync(SQLITE_DB_FILE)) {
      fs.writeFileSync(SQLITE_DB_FILE, Buffer.from('SQLite format 3\0', 'utf8'));
    }
  } catch (err) {
    console.error('[Electron] Failed to initialize SQLite header:', err);
  }
}

// Log unexpected system errors to logs file
function logSystemError(message: string, error?: any): void {
  try {
    const timestamp = new Date().toISOString();
    const logFile = path.join(LOGS_DIR, `system-errors-${new Date().toISOString().slice(0, 10)}.log`);
    const logLine = `[${timestamp}] ${message}: ${error?.stack || error?.message || error}\n`;
    fs.appendFileSync(logFile, logLine, 'utf8');
  } catch (e) {
    console.error('[Electron Logger Error]:', e);
  }
}

// ---------------------------------------------------------------------------
// 2. Single-Instance Lock (Prevents database corruption)
// ---------------------------------------------------------------------------
const gotTheLock = app.requestSingleInstanceLock();
let mainWindow: BrowserWindow | null = null;

if (!gotTheLock) {
  console.warn('[Electron] Another instance of Mosawyat Al Basha POS is already running. Quitting.');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    ensureSystemDirectories();
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });
}

// ---------------------------------------------------------------------------
// 3. Desktop Window Creation
// ---------------------------------------------------------------------------
function createMainWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 700,
    title: 'مشويات الباشا POS - Commercial Restaurant Management System',
    icon: path.join(__dirname, '..', 'public', 'favicon.svg'),
    backgroundColor: '#F8F5F0',
    autoHideMenuBar: true,
    show: false, // Show once ready-to-show for seamless startup
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Required for IPC bridge communication
      spellcheck: false,
    },
  });

  // Reveal window smoothly when content is ready
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Environment-aware loading: dev server vs production static bundle
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';

  if (isDev) {
    mainWindow.loadURL(devServerUrl).catch(() => {
      // Fallback if dev server is not ready yet
      setTimeout(() => {
        mainWindow?.loadURL(devServerUrl);
      }, 1000);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

// ---------------------------------------------------------------------------
// 4. Local IPC Communication & System Information
// ---------------------------------------------------------------------------

// System hardware & path discovery
ipcMain.handle('get-system-info', (): SystemInfo => {
  return {
    os: process.platform,
    arch: process.arch,
    appVersion: app.getVersion(),
    userDataPath: USER_DATA_PATH,
    dataDir: DATA_DIR,
    logsDir: LOGS_DIR,
    backupsDir: BACKUPS_DIR,
    sqliteFile: SQLITE_DB_FILE,
    isWindows: process.platform === 'win32',
    isElevated: false,
  };
});

// Guarantee and verify SQLite path in %LOCALAPPDATA%
ipcMain.handle('sqlite-ensure-path', (_event, _payload: SQLitePathPayload) => {
  try {
    ensureSystemDirectories();
    return {
      success: true,
      resolvedPath: SQLITE_DB_FILE,
      dataDir: DATA_DIR,
      exists: fs.existsSync(SQLITE_DB_FILE),
    };
  } catch (err: any) {
    logSystemError('sqlite-ensure-path error', err);
    return {
      success: false,
      resolvedPath: SQLITE_DB_FILE,
      dataDir: DATA_DIR,
      exists: false,
      error: err?.message || 'Unknown error ensuring SQLite path',
    };
  }
});

// Write SQLite Table Snapshot to disk (%LOCALAPPDATA%\MosawyatAlBashaPOS\data)
ipcMain.handle('sqlite-write-snapshot', (_event, { tableName, data }: SQLiteSnapshotPayload) => {
  try {
    ensureSystemDirectories();
    const tableDumpFile = path.join(DATA_DIR, `sqlite_${tableName}.json`);
    fs.writeFileSync(tableDumpFile, data, 'utf8');
    return { success: true };
  } catch (err: any) {
    logSystemError(`Failed to write snapshot for table ${tableName}`, err);
    return { success: false, error: err?.message };
  }
});

// Save general application settings / profiles
ipcMain.handle('save-app-data', (_event, { key, data }: { key: string; data: string }) => {
  try {
    ensureSystemDirectories();
    const filePath = path.join(DATA_DIR, `${key}.json`);
    fs.writeFileSync(filePath, data, 'utf8');
    return { success: true };
  } catch (err: any) {
    logSystemError(`Failed to save app data key: ${key}`, err);
    return { success: false, error: err?.message };
  }
});

// Export full backup to %LOCALAPPDATA%\MosawyatAlBashaPOS\backups
ipcMain.handle('backup-database', () => {
  try {
    ensureSystemDirectories();
    const dateTag = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `basha_pos_backup_${dateTag}.json`;
    const targetFile = path.join(BACKUPS_DIR, backupFileName);

    // Read all JSON table files in DATA_DIR
    const files = fs.readdirSync(DATA_DIR);
    const backupData: Record<string, any> = {};

    files.forEach((file) => {
      if (file.endsWith('.json')) {
        try {
          const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
          backupData[file] = JSON.parse(content);
        } catch {
          // ignore corrupted individual files
        }
      }
    });

    fs.writeFileSync(targetFile, JSON.stringify(backupData, null, 2), 'utf8');
    return { success: true, backupFile: targetFile };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
});

// ---------------------------------------------------------------------------
// 5. Native Thermal Printing Service
// ---------------------------------------------------------------------------

// Enumerate Windows spooler printers
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  return NativePrintingService.getAvailablePrinters(mainWindow);
});

// Direct Silent Thermal Receipt Printing
ipcMain.handle('print-direct', async (_event, options: PrintOptions) => {
  try {
    return await NativePrintingService.printSilent(options);
  } catch (err: any) {
    logSystemError('print-direct handler failed', err);
    return {
      success: false,
      error: err?.message || 'Print dispatch failed',
    };
  }
});

// ---------------------------------------------------------------------------
// 6. Window Controls (Kiosk Mode, Fullscreen, Minimize, Close)
// ---------------------------------------------------------------------------
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('toggle-fullscreen', () => {
  if (mainWindow) {
    const isFullScreen = !mainWindow.isFullScreen();
    mainWindow.setFullScreen(isFullScreen);
    return isFullScreen;
  }
  return false;
});

ipcMain.handle('toggle-kiosk', () => {
  if (mainWindow) {
    const isKiosk = !mainWindow.isKiosk();
    mainWindow.setKiosk(isKiosk);
    return isKiosk;
  }
  return false;
});

// ---------------------------------------------------------------------------
// 7. Lifecycle & Crash Isolation
// ---------------------------------------------------------------------------
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (err) => {
  console.error('[Electron Uncaught Exception]:', err);
  logSystemError('Process uncaughtException', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Electron Unhandled Rejection]:', reason);
  logSystemError('Process unhandledRejection', reason);
});
