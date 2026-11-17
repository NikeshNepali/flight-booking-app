import { existsSync } from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';
import type { BookingsService } from './modules/bookings/bookings.service.js';
import { createBookingsRouter } from './modules/bookings/bookings.routes.js';
import type { FlightsService } from './modules/flights/flights.service.js';
import { createFlightsRouter } from './modules/flights/flights.routes.js';
import type { WebhooksService } from './modules/webhooks/webhooks.service.js';
import { createWebhooksRouter } from './modules/webhooks/webhooks.routes.js';
import { sendSuccess } from './utils/http.js';

export interface AppDependencies {
  flights: FlightsService;
  bookings: BookingsService;
  webhooks: WebhooksService;
  allowedOrigins: string[];
  health: () => Promise<Record<string, unknown>>;
  /** Absolute path of the built frontend (frontend/dist). When set, the API also serves the web app. */
  frontendDist?: string | null;
}

/** Builds the Express app. Dependencies are injected so tests can use fakes. */
export function createApp(deps: AppDependencies) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          // Airline logos are served by Duffel's asset CDN.
          'img-src': ["'self'", 'data:', 'https://assets.duffel.com'],
          // Render already redirects to HTTPS; this would break plain-http local Docker runs.
          'upgrade-insecure-requests': null,
        },
      },
    }),
  );
  app.use(
    cors({
      origin: (origin, callback) => callback(null, !origin || deps.allowedOrigins.includes(origin)),
      methods: ['GET', 'POST'],
    }),
  );

  // Webhooks first: they need the raw body, and come from Duffel (not browsers).
  app.use('/api', createWebhooksRouter(deps.webhooks));

  app.use(express.json({ limit: '100kb' }));
  app.use('/api', apiLimiter);

  app.get('/api/health', async (_req, res) => {
    sendSuccess(res, await deps.health());
  });
  app.use('/api', createFlightsRouter(deps.flights));
  app.use('/api', createBookingsRouter(deps.bookings));

  // Single-service deployment (Docker/Render): serve the built Vue app from the same origin.
  const dist = deps.frontendDist;
  if (dist && existsSync(path.join(dist, 'index.html'))) {
    // Hashed asset files can be cached forever; index.html must always be revalidated.
    app.use(
      '/assets',
      express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y' }),
    );
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
