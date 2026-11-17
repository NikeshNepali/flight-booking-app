import { createApp } from './app.js';
import { env } from './config/env.js';
import { flightProvider } from './integrations/duffel/index.js';
import { createFlightsService } from './modules/flights/flights.service.js';
import { logger } from './utils/logger.js';

const app = createApp({
  flights: createFlightsService(flightProvider),
  allowedOrigins: env.FRONTEND_ORIGINS,
  health: async () => ({
    status: 'ok',
    provider: {
      name: 'duffel',
      mode: env.DUFFEL_MODE,
      configured: Boolean(env.DUFFEL_ACCESS_TOKEN),
    },
  }),
});

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}`, { duffelMode: env.DUFFEL_MODE });
  if (!env.DUFFEL_ACCESS_TOKEN) {
    logger.warn('DUFFEL_ACCESS_TOKEN is not set: flight search will return a configuration error.');
  }
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
