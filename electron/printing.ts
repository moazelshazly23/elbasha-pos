/**
 * Native Printing Service for Windows POS Thermal Printers
 * 
 * Handles silent background direct printing, multi-station routing (Cashier / Kitchen / Bar),
 * paper width adjustments (80mm / 58mm / A4), and auto-cut / cash drawer pulses.
 */

import { BrowserWindow } from 'electron';
import { PrintOptions, PrintResult, PrinterDevice } from './types.js';

export class NativePrintingService {
  /**
   * Retrieves all installed local and network printers from Windows spooler
   */
  public static async getAvailablePrinters(window: BrowserWindow): Promise<PrinterDevice[]> {
    try {
      const printers = await window.webContents.getPrintersAsync();
      return printers.map((p) => {
        const anyP = p as any;
        return {
          name: p.name,
          displayName: p.displayName || p.name,
          description: p.description || '',
          status: typeof anyP.status === 'number' ? anyP.status : 0,
          isDefault: Boolean(anyP.isDefault),
        };
      });
    } catch (err) {
      console.error('[NativePrintingService] Failed to get printers:', err);
      return [];
    }
  }

  /**
   * Executes silent thermal receipt printing in an isolated background worker window
   */
  public static async printSilent(options: PrintOptions): Promise<PrintResult> {
    const { html, printerName, paperWidth = '80mm', silent = true, copies = 1 } = options;

    return new Promise((resolve) => {
      let printWorker: BrowserWindow | null = null;
      let hasFinished = false;

      // Timeout safety: close worker window after 20 seconds if Windows spooler hangs
      const timeoutTimer = setTimeout(() => {
        if (!hasFinished) {
          hasFinished = true;
          if (printWorker && !printWorker.isDestroyed()) {
            printWorker.destroy();
          }
          resolve({
            success: false,
            error: 'Print job timed out while sending to Windows spooler (20s timeout)',
          });
        }
      }, 20000);

      const cleanup = (result: PrintResult) => {
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
        // Create an off-screen hidden window for rendering the receipt
        printWorker = new BrowserWindow({
          show: false,
          width: paperWidth === '58mm' ? 384 : paperWidth === '80mm' ? 576 : 800,
          height: 1000,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
          },
        });

        // Wrap the receipt HTML with POS thermal print styling
        const styledReceiptHtml = `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
            <head>
              <meta charset="utf-8" />
              <style>
                @page {
                  margin: 0;
                  size: ${paperWidth === '58mm' ? '58mm auto' : paperWidth === '80mm' ? '80mm auto' : 'A4'};
                }
                * {
                  box-sizing: border-box;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                body {
                  margin: 0;
                  padding: ${paperWidth === '58mm' ? '4px' : '8px'};
                  font-family: 'Cairo', 'Segoe UI', Arial, sans-serif;
                  width: ${paperWidth === '58mm' ? '54mm' : paperWidth === '80mm' ? '76mm' : '100%'};
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

        printWorker.webContents.on('did-finish-load', () => {
          if (!printWorker || printWorker.isDestroyed()) return;

          printWorker.webContents.print(
            {
              silent,
              printBackground: true,
              deviceName: printerName || '',
              copies: Math.max(1, copies),
              margins: {
                marginType: 'none',
              },
            },
            (success, failureReason) => {
              if (success) {
                cleanup({ success: true, printerUsed: printerName || 'Default System Printer' });
              } else {
                cleanup({
                  success: false,
                  error: failureReason || 'Unknown error occurred while printing',
                  printerUsed: printerName,
                });
              }
            }
          );
        });

        printWorker.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
          cleanup({
            success: false,
            error: `Failed to load receipt template: ${errorDescription} (${errorCode})`,
          });
        });
      } catch (err: any) {
        cleanup({
          success: false,
          error: err?.message || 'Exception in native printing pipeline',
        });
      }
    });
  }
}
