// electron/main.ts
import { app, BrowserWindow as BrowserWindow2, ipcMain } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// electron/printing.ts
import { BrowserWindow } from "electron";
var NativePrintingService = class {
  /**
   * Retrieves all installed local and network printers from Windows spooler
   */
  static async getAvailablePrinters(window) {
    try {
      const printers = await window.webContents.getPrintersAsync();
      return printers.map((p) => {
        const anyP = p;
        return {
          name: p.name,
          displayName: p.displayName || p.name,
          description: p.description || "",
          status: typeof anyP.status === "number" ? anyP.status : 0,
          isDefault: Boolean(anyP.isDefault)
        };
      });
    } catch (err) {
      console.error("[NativePrintingService] Failed to get printers:", err);
      return [];
    }
  }
  /**
   * Executes silent thermal receipt printing in an isolated background worker window
   */
  static async printSilent(options) {
    const { html, printerName, paperWidth = "80mm", silent = true, copies = 1 } = options;
    return new Promise((resolve) => {
      let printWorker = null;
      let hasFinished = false;
      const timeoutTimer = setTimeout(() => {
        if (!hasFinished) {
          hasFinished = true;
          if (printWorker && !printWorker.isDestroyed()) {
            printWorker.destroy();
          }
          resolve({
            success: false,
            error: "Print job timed out while sending to Windows spooler (20s timeout)"
          });
        }
      }, 2e4);
      const cleanup = (result) => {
        if (!hasFinished) {
          hasFinished = true;
          clearTimeout(timeoutTimer);
          if (printWorker && !printWorker.isDestroyed()) {
            printWorker.destroy();
          }
          resolve(result);
        }
      };
      try {
        printWorker = new BrowserWindow({
          show: false,
          width: paperWidth === "58mm" ? 384 : paperWidth === "80mm" ? 576 : 800,
          height: 1e3,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
          }
        });
        const styledReceiptHtml = `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
            <head>
              <meta charset="utf-8" />
              <style>
                @page {
                  margin: 0;
                  size: ${paperWidth === "58mm" ? "58mm auto" : paperWidth === "80mm" ? "80mm auto" : "A4"};
                }
                * {
                  box-sizing: border-box;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                body {
                  margin: 0;
                  padding: ${paperWidth === "58mm" ? "4px" : "8px"};
                  font-family: 'Cairo', 'Segoe UI', Arial, sans-serif;
                  width: ${paperWidth === "58mm" ? "54mm" : paperWidth === "80mm" ? "76mm" : "100%"};
                  background: #ffffff;
                  color: #000000;
                }
                img {
                  max-width: 100%;
                  height: auto;
                }
              </style>
            </head>
            <body>
              ${html}
            </body>
          </html>
        `;
        printWorker.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(styledReceiptHtml)}`);
        printWorker.webContents.on("did-finish-load", () => {
          if (!printWorker || printWorker.isDestroyed()) return;
          printWorker.webContents.print(
            {
              silent,
              printBackground: true,
              deviceName: printerName || "",
              copies: Math.max(1, copies),
              margins: {
                marginType: "none"
              }
            },
            (success, failureReason) => {
              if (success) {
                cleanup({ success: true, printerUsed: printerName || "Default System Printer" });
              } else {
                cleanup({
                  success: false,
                  error: failureReason || "Unknown error occurred while printing",
                  printerUsed: printerName
                });
              }
            }
          );
        });
        printWorker.webContents.on("did-fail-load", (_, errorCode, errorDescription) => {
          cleanup({
            success: false,
            error: `Failed to load receipt template: ${errorDescription} (${errorCode})`
          });
        });
      } catch (err) {
        cleanup({
          success: false,
          error: err?.message || "Exception in native printing pipeline"
        });
      }
    });
  }
};

// electron/main.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var APP_FOLDER_NAME = "MosawyatAlBashaPOS";
var SQLITE_FILE_NAME = "mosawyat_albasha.sqlite";
var USER_DATA_PATH = path.join(
  process.env.LOCALAPPDATA || app.getPath("appData"),
  APP_FOLDER_NAME
);
var DATA_DIR = path.join(USER_DATA_PATH, "data");
var LOGS_DIR = path.join(USER_DATA_PATH, "logs");
var BACKUPS_DIR = path.join(USER_DATA_PATH, "backups");
var SQLITE_DB_FILE = path.join(DATA_DIR, SQLITE_FILE_NAME);
function ensureSystemDirectories() {
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
  try {
    if (!fs.existsSync(SQLITE_DB_FILE)) {
      fs.writeFileSync(SQLITE_DB_FILE, Buffer.from("SQLite format 3\0", "utf8"));
    }
  } catch (err) {
    console.error("[Electron] Failed to initialize SQLite header:", err);
  }
}
function logSystemError(message, error) {
  try {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const logFile = path.join(LOGS_DIR, `system-errors-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.log`);
    const logLine = `[${timestamp}] ${message}: ${error?.stack || error?.message || error}
`;
    fs.appendFileSync(logFile, logLine, "utf8");
  } catch (e) {
    console.error("[Electron Logger Error]:", e);
  }
}
var gotTheLock = app.requestSingleInstanceLock();
var mainWindow = null;
if (!gotTheLock) {
  console.warn("[Electron] Another instance of Mosawyat Al Basha POS is already running. Quitting.");
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(() => {
    ensureSystemDirectories();
    createMainWindow();
    app.on("activate", () => {
      if (BrowserWindow2.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });
}
function createMainWindow() {
  const preloadPath = path.join(__dirname, "preload.js");
  mainWindow = new BrowserWindow2({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 700,
    title: "\u0645\u0634\u0648\u064A\u0627\u062A \u0627\u0644\u0628\u0627\u0634\u0627 POS - Commercial Restaurant Management System",
    icon: path.join(__dirname, "..", "public", "favicon.svg"),
    backgroundColor: "#F8F5F0",
    autoHideMenuBar: true,
    show: false,
    // Show once ready-to-show for seamless startup
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      // Required for IPC bridge communication
      spellcheck: false
    }
  });
  mainWindow.once("ready-to-show", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:3000";
  if (isDev) {
    mainWindow.loadURL(devServerUrl).catch(() => {
      setTimeout(() => {
        mainWindow?.loadURL(devServerUrl);
      }, 1e3);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  return mainWindow;
}
ipcMain.handle("get-system-info", () => {
  return {
    os: process.platform,
    arch: process.arch,
    appVersion: app.getVersion(),
    userDataPath: USER_DATA_PATH,
    dataDir: DATA_DIR,
    logsDir: LOGS_DIR,
    backupsDir: BACKUPS_DIR,
    sqliteFile: SQLITE_DB_FILE,
    isWindows: process.platform === "win32",
    isElevated: false
  };
});
ipcMain.handle("sqlite-ensure-path", (_event, _payload) => {
  try {
    ensureSystemDirectories();
    return {
      success: true,
      resolvedPath: SQLITE_DB_FILE,
      dataDir: DATA_DIR,
      exists: fs.existsSync(SQLITE_DB_FILE)
    };
  } catch (err) {
    logSystemError("sqlite-ensure-path error", err);
    return {
      success: false,
      resolvedPath: SQLITE_DB_FILE,
      dataDir: DATA_DIR,
      exists: false,
      error: err?.message || "Unknown error ensuring SQLite path"
    };
  }
});
ipcMain.handle("sqlite-write-snapshot", (_event, { tableName, data }) => {
  try {
    ensureSystemDirectories();
    const tableDumpFile = path.join(DATA_DIR, `sqlite_${tableName}.json`);
    fs.writeFileSync(tableDumpFile, data, "utf8");
    return { success: true };
  } catch (err) {
    logSystemError(`Failed to write snapshot for table ${tableName}`, err);
    return { success: false, error: err?.message };
  }
});
ipcMain.handle("save-app-data", (_event, { key, data }) => {
  try {
    ensureSystemDirectories();
    const filePath = path.join(DATA_DIR, `${key}.json`);
    fs.writeFileSync(filePath, data, "utf8");
    return { success: true };
  } catch (err) {
    logSystemError(`Failed to save app data key: ${key}`, err);
    return { success: false, error: err?.message };
  }
});
ipcMain.handle("backup-database", () => {
  try {
    ensureSystemDirectories();
    const dateTag = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const backupFileName = `basha_pos_backup_${dateTag}.json`;
    const targetFile = path.join(BACKUPS_DIR, backupFileName);
    const files = fs.readdirSync(DATA_DIR);
    const backupData = {};
    files.forEach((file) => {
      if (file.endsWith(".json")) {
        try {
          const content = fs.readFileSync(path.join(DATA_DIR, file), "utf8");
          backupData[file] = JSON.parse(content);
        } catch {
        }
      }
    });
    fs.writeFileSync(targetFile, JSON.stringify(backupData, null, 2), "utf8");
    return { success: true, backupFile: targetFile };
  } catch (err) {
    return { success: false, error: err?.message };
  }
});
ipcMain.handle("get-printers", async () => {
  if (!mainWindow) return [];
  return NativePrintingService.getAvailablePrinters(mainWindow);
});
ipcMain.handle("print-direct", async (_event, options) => {
  try {
    return await NativePrintingService.printSilent(options);
  } catch (err) {
    logSystemError("print-direct handler failed", err);
    return {
      success: false,
      error: err?.message || "Print dispatch failed"
    };
  }
});
ipcMain.on("window-minimize", () => {
  mainWindow?.minimize();
});
ipcMain.on("window-maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});
ipcMain.on("window-close", () => {
  mainWindow?.close();
});
ipcMain.handle("toggle-fullscreen", () => {
  if (mainWindow) {
    const isFullScreen = !mainWindow.isFullScreen();
    mainWindow.setFullScreen(isFullScreen);
    return isFullScreen;
  }
  return false;
});
ipcMain.handle("toggle-kiosk", () => {
  if (mainWindow) {
    const isKiosk = !mainWindow.isKiosk();
    mainWindow.setKiosk(isKiosk);
    return isKiosk;
  }
  return false;
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
process.on("uncaughtException", (err) => {
  console.error("[Electron Uncaught Exception]:", err);
  logSystemError("Process uncaughtException", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[Electron Unhandled Rejection]:", reason);
  logSystemError("Process unhandledRejection", reason);
});
