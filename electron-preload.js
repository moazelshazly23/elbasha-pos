/**
 * Electron Preload Script
 * Exposes secure IPC API to Windows React UI
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printDirect: (payload) => ipcRenderer.invoke('print-direct', payload),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  sqliteEnsurePath: (payload) => ipcRenderer.invoke('sqlite-ensure-path', payload),
  sqliteWriteSnapshot: (payload) => ipcRenderer.invoke('sqlite-write-snapshot', payload),
  saveAppData: (payload) => ipcRenderer.invoke('save-app-data', payload),
});
