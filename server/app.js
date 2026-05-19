import path from 'node:path';
import fs from 'fs-extra';
import express from 'express';
import torrentRoutes from './routes/torrent.routes.js';
import mediaRoutes from './routes/media.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import healthRoutes from './routes/health.routes.js';
import systemRoutes from './routes/system.routes.js';
import { createControlHttpProxy } from './services/proxy.service.js';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware.js';

const publicDirectory = path.resolve(process.cwd(), 'public');
const publicIndexFile = path.join(publicDirectory, 'index.html');

export function createApp({ workerRole = 'control', controlPort = null } = {}) {
  const app = express();
  const isWebWorker = workerRole === 'web';
  const proxyToControl = isWebWorker && controlPort ? createControlHttpProxy(controlPort) : null;

  app.disable('x-powered-by');

  if (proxyToControl) {
    app.use('/socket.io', proxyToControl);
    app.use('/api', (request, response, next) => {
      const method = String(request.method || 'GET').toUpperCase();

      if (request.path.startsWith('/system')) {
        proxyToControl(request, response, next);
        return;
      }

      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        proxyToControl(request, response, next);
        return;
      }

      next();
    });
  }

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Placeholder: add rate limiting middleware before exposing OpenFlux publicly.
  // Placeholder: add authentication middleware before exposing OpenFlux publicly.

  app.use('/api/health', healthRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/system', systemRoutes);
  app.use('/api/torrents', torrentRoutes);
  app.use('/api/media', mediaRoutes);

  app.use(express.static(publicDirectory));

  app.get(/^(?!\/api\/).*/, async (_request, response, next) => {
    try {
      const hasBuiltFrontend = await fs.pathExists(publicIndexFile);

      if (!hasBuiltFrontend) {
        response.status(503).json({
          success: false,
          message: 'Frontend build is missing. Run npm run build before starting the packaged app.'
        });
        return;
      }

      response.sendFile(publicIndexFile);
    } catch (error) {
      next(error);
    }
  });

  app.use('/api', notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
