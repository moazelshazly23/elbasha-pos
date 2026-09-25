import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker for 100% offline capabilities
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] New update available, refreshing caches in background...');
  },
  onOfflineReady() {
    console.log('[PWA] التطبيق جاهز للعمل دون إنترنت (Offline Ready)');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
