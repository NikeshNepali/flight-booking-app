import { env } from '../../config/env.js';
import { DuffelClient } from './duffel.client.js';
import { DuffelFlightProvider } from './duffel.service.js';

/** The app-wide flight provider instance. */
export const flightProvider = new DuffelFlightProvider(
  new DuffelClient({ accessToken: env.DUFFEL_ACCESS_TOKEN, timeoutMs: env.DUFFEL_TIMEOUT_MS }),
  env.DUFFEL_MODE === 'live',
);
