import { sql } from 'drizzle-orm';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { db, pool } from './db/index.js';
import { flightProvider } from './integrations/duffel/index.js';
import { createBookingsRepository } from './modules/bookings/bookings.repository.js';
import { createBookingsService } from './modules/bookings/bookings.service.js';
import { createFlightsService } from './modules/flights/flights.service.js';
import { createWebhooksService } from './modules/webhooks/webhooks.service.js';
import { logger } from './utils/logger.js';

const repository = createBookingsRepository(db);
const bookings = createBookingsService({
  repository,
  provider: flightProvider,
  bookingsAllowed: env.BOOKINGS_ALLOWED,
});

const app = createApp({
  flights: createFlightsService(flightProvider),
  bookings,
  webhooks: createWebhooksService({
    secret: env.DUFFEL_WEBHOOK_SECRET,
    expectedLiveMode: env.DUFFEL_MODE === 'live',
    repository,
    bookings,
  }),
  allowedOrigins: env.FRONTEND_ORIGINS,
  health: async () => {
    let database = 'ok';
    try {
      await db.execute(sql`select 1`);
    } catch {
      database = 'unavailable';
    }
    return {
      status: 'ok',
      database,
      provider: {
        name: 'duffel',
        mode: env.DUFFEL_MODE,
        configured: Boolean(env.DUFFEL_ACCESS_TOKEN),
        bookingsEnabled: env.BOOKINGS_ALLOWED,
        webhooksConfigured: Boolean(env.DUFFEL_WEBHOOK_SECRET),
      },
    };
  },
});

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}`, { duffelMode: env.DUFFEL_MODE });
  if (!env.DUFFEL_ACCESS_TOKEN) {
    logger.warn(
      'DUFFEL_ACCESS_TOKEN is not set: flight search and booking will return a configuration error.',
    );
  }
  if (env.DUFFEL_MODE === 'live') {
    logger.warn(
      env.BOOKINGS_ALLOWED
        ? 'LIVE MODE: bookings create REAL airline orders and charge your Duffel balance.'
        : 'Live mode with bookings disabled (DUFFEL_LIVE_BOOKINGS_ENABLED=false).',
    );
  }
});

function shutdown() {
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
