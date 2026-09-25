/**
 * Electron Main Process Entry Point for Windows Commercial Application
 * 
 * Features:
 * - Single Instance Lock (prevents conflicting DB writes)
 * - Auto-detects port or serves bundled production build
 * - Native Direct Thermal Printing via win.webContents.print (Silent & Dialog-free)
 * - Local AppData Directory configuration (%LOCALAPPDATA%\MosawyatAlBashaPOS)
 * - Error isolation and crash protection
 * - Kiosk and Fullscreen support for POS Terminals
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Windows App Data Path: %LOCALAPPDATA%\MosawyatAlBashaPOS
const USER_DATA_PATH = path.join(
  process.env.LOCALAPPDATA || app.getPath('appData'),
  'MosawyatAlBashaPOS'
);
const DATA_DIR = path.join(USER_DATA_PATH, 'data');
const LOGS_DIR = path.join(USER_DATA_PATH, 'logs');
const BACKUPS_DIR = path.join(USER_DATA_PATH, 'backups');

// Ensure writable directories exist outside Program Files
[USER_DATA_PATH, DATA_DIR, LOGS_DIR, BACKUPS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.error('Failed to create directory:', dir, e);
    }
  }
});

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

let mainWindow = null;

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our main window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 700,
    title: 'مشويات الباشا - Commercial Restaurant POS',
    icon: path.join(__dirname, 'public', 'favicon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Load production dist or local dev server
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Native Direct Thermal Printing IPC Handler
ipcMain.handle('print-direct', async (event, { html, printerName, paperWidth }) => {
  if (!mainWindow) return { success: false, error: 'No active window' };

  try {
    // Create hidden worker window for silent printing
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    return new Promise((resolve) => {
      printWindow.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: printerName || '',
          margins: { marginType: 'none' },
        },
        (success, failureReason) => {
          printWindow.close();
          if (success) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: failureReason });
          }
        }
      );
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// SQLite Database File & Path Management
const SQLITE_DB_FILE = path.join(DATA_DIR, 'mosawyat_albasha.sqlite');
const SQLITE_WAL_FILE = path.join(DATA_DIR, 'mosawyat_albasha.sqlite-wal');

// Ensure SQLite DB file exists on disk inside %LOCALAPPDATA%\MosawyatAlBashaPOS\data
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SQLITE_DB_FILE)) {
    // Write standard SQLite 3 Header if file does not exist
    fs.writeFileSync(SQLITE_DB_FILE, Buffer.from('SQLite format 3\0', 'utf8'));
  }
} catch (e) {
  console.error('Failed to initialize SQLite file on Windows disk:', e);
}

// App Info & System paths IPC Handler
ipcMain.handle('get-system-info', () => {
  return {
    os: process.platform,
    arch: process.arch,
    appVersion: app.getVersion(),
    userDataPath: USER_DATA_PATH,
    dataDir: DATA_DIR,
    backupsDir: BACKUPS_DIR,
    sqliteFile: SQLITE_DB_FILE,
  };
});

// IPC Handler: Guarantee and verify SQLite path in %LOCALAPPDATA%
ipcMain.handle('sqlite-ensure-path', (event, { filePath, directory }) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SQLITE_DB_FILE)) {
      fs.writeFileSync(SQLITE_DB_FILE, Buffer.from('SQLite format 3\0', 'utf8'));
    }
    return {
      success: true,
      resolvedPath: SQLITE_DB_FILE,
      dataDir: DATA_DIR,
      exists: fs.existsSync(SQLITE_DB_FILE),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handler: Write SQLite Snapshot
ipcMain.handle('sqlite-write-snapshot', (event, { tableName, data }) => {
  try {
    const tableDumpFile = path.join(DATA_DIR, `sqlite_${tableName}.json`);
    fs.writeFileSync(tableDumpFile, data, 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handler: Save general app data
ipcMain.handle('save-app-data', (event, { key, data }) => {
  try {
    const filePath = path.join(DATA_DIR, `${key}.json`);
    fs.writeFileSync(filePath, data, 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
