import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    const hmrConfig = process.env.DISABLE_HMR === 'true' ? false : { server };
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrConfig,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[El Basha Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
