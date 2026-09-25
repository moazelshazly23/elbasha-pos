// electron/preload.ts
import { contextBridge, ipcRenderer } from "electron";
var electronAPI = {
  // Printing Services
  printDirect: (payload) => ipcRenderer.invoke("print-direct", payload),
  getPrinters: () => ipcRenderer.invoke("get-printers"),
  // System & Path Management
  getSystemInfo: () => ipcRenderer.invoke("get-system-info"),
  // SQLite Persistence Bridge
  sqliteEnsurePath: (payload) => ipcRenderer.invoke("sqlite-ensure-path", payload),
  sqliteWriteSnapshot: (payload) => ipcRenderer.invoke("sqlite-write-snapshot", payload),
  saveAppData: (payload) => ipcRenderer.invoke("save-app-data", payload),
  // Backup & Restore
  backupDatabase: () => ipcRenderer.invoke("backup-database"),
  restoreDatabase: (payload) => ipcRenderer.invoke("restore-database", payload),
  // Window Controls for POS Hardware Terminals
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  toggleFullscreen: () => ipcRenderer.invoke("toggle-fullscreen"),
  toggleKiosk: () => ipcRenderer.invoke("toggle-kiosk")
};
contextBridge.exposeInMainWorld("electronAPI", electronAPI);
