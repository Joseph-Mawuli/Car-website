import express, { type RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { corsOrigins, env } from './config/env.js';
import { publicRoutes } from './routes/publicRoutes.js';
import { adminRoutes } from './routes/adminRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createRateLimiters } from './middleware/rateLimit.js';
import type { AuthDeps } from './middleware/auth.js';
import * as seo from './controllers/seoController.js';
import { getPublicSettings } from './controllers/publicController.js';
import { getMedia } from './controllers/mediaController.js';
import { MEDIA_ROUTE_PREFIX } from './services/storage.js';

export interface AppDeps {
  auth: AuthDeps;
  isDatabaseReady: () => boolean;
}

export function createApp(deps: AppDeps) {
  const app = express();
  const limiters = createRateLimiters();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);
  app.set('query parser', 'simple');

  app.use(
    helmet({
      // The API serves JSON (plus a tiny share page); images are loaded cross-origin by the SPA.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: (origin, cb) => {
        // Non-browser requests (no Origin header) are allowed; browsers are limited to the allowlist.
        if (!origin || corsOrigins.includes(origin.replace(/\/+$/, ''))) cb(null, true);
        else cb(null, false);
      },
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
      credentials: false,
      maxAge: 600,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    const db = deps.isDatabaseReady();
    res.status(db ? 200 : 503).json({ status: db ? 'ok' : 'degraded', database: db ? 'connected' : 'disconnected' });
  });

  const requireDatabase: RequestHandler = (_req, res, next) => {
    if (deps.isDatabaseReady()) return next();
    res.status(503).json({ error: { code: 'database_unavailable', message: 'The service is temporarily unavailable. Please try again shortly.' } });
  };

  app.get('/sitemap.xml', requireDatabase, seo.sitemap);
  app.get('/share/cars/:slug', requireDatabase, seo.shareVehicle);

  app.get(`${MEDIA_ROUTE_PREFIX}/*key`, limiters.media, requireDatabase, (req, res, next) => {
    getMedia(req, res).catch(next);
  });
  app.use('/api/v1/admin', requireDatabase, adminRoutes(deps.auth, limiters));
  // Settings still load during a database outage (defaults + live rates) so prices and currency switching keep working.
  app.get('/api/v1/settings/public', limiters.publicApi, (req, res, next) => {
    getPublicSettings(req, res, deps.isDatabaseReady()).catch(next);
  });
  app.use('/api/v1', limiters.publicApi, requireDatabase, publicRoutes(limiters));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
