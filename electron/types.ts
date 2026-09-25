/**
 * Electron & Windows IPC Type Definitions
 * Mosawyat Al Basha Commercial POS
 */

export interface SystemInfo {
  os: string;
  arch: string;
  appVersion: string;
  userDataPath: string;
  dataDir: string;
  logsDir: string;
  backupsDir: string;
  sqliteFile: string;
  isWindows: boolean;
  isElevated: boolean;
}

export interface PrintOptions {
  html: string;
  printerName?: string;
  paperWidth?: '80mm' | '58mm' | 'a4';
  silent?: boolean;
  copies?: number;
  openDrawer?: boolean;
  cutPaper?: boolean;
}

export interface PrintResult {
  success: boolean;
  error?: string;
  printerUsed?: string;
}

export interface PrinterDevice {
  name: string;
  displayName: string;
  description: string;
  status: number;
  isDefault: boolean;
}

export interface SQLitePathPayload {
  filePath?: string;
  directory?: string;
}

export interface SQLitePathResult {
  success: boolean;
  resolvedPath: string;
  dataDir: string;
  exists: boolean;
  error?: string;
}

export interface SQLiteSnapshotPayload {
  tableName: string;
  data: string;
}
