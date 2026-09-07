import express from 'express';
import http from 'http';
import path from 'path';
import apiRoutes from './src/backend/routes/api.routes';
import { errorHandler, notFoundHandler } from './src/backend/middleware/error.middleware';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const server = http.createServer(app);

  // Basic Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
  });

  // API Routes
  app.use('/api', apiRoutes);

  // 404 handler for unmatched /api routes
  app.use('/api/*', notFoundHandler);

  // Global error handler for API routes
  app.use(errorHandler);

  // Vite middleware for dev OR static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const { createServer: createViteServer } = await import('vite');

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled
          ? false
          : {
              server,
            },
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    console.log(`⚡ Vite dev middleware mounted (HMR: ${isHmrDisabled ? 'disabled' : 'enabled'})`);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('📦 Serving production static assets from dist/');
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Apex Academy LMS server running on http://0.0.0.0:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  });
}

startServer().catch((error) => {
  console.error('Fatal error starting Apex Academy server:', error);
  process.exit(1);
});
