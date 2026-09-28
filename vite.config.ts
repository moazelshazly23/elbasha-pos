import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
  // Base path resolution:
  // - If VITE_BASE or BASE_URL is set in environment, use it
  // - In dev server ('serve'): use '/' (ensures AI Studio iframe preview runs on port 3000 at root)
  // - In Electron build (ELECTRON_BUILD === 'true'): use './' (supports file:// protocol)
  // - In production build ('build'): use '/elbasha-pos/' (exact GitHub Pages repository path)
  const isDev = command === 'serve';
  const isElectron = process.env.ELECTRON_BUILD === 'true';
  const base = process.env.VITE_BASE || (isDev ? '/' : (isElectron ? './' : '/elbasha-pos/'));

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
