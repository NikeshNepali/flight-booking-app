import 'dotenv/config';
import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DUFFEL_ACCESS_TOKEN: z.string().trim().default(''),
  DUFFEL_MODE: z.enum(['test', 'live']).default('test'),
  DUFFEL_LIVE_BOOKINGS_ENABLED: booleanString,
  DUFFEL_WEBHOOK_SECRET: z.string().trim().default(''),
  DUFFEL_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(30_000),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const raw = parsed.data;

/**
 * Safety check: a token must match the configured mode. This makes it impossible
 * to accidentally create real airline orders with a live token while you think you
 * are in test mode (and vice versa).
 */
if (raw.DUFFEL_ACCESS_TOKEN) {
  const isTestToken = raw.DUFFEL_ACCESS_TOKEN.startsWith('duffel_test_');
  const isLiveToken = raw.DUFFEL_ACCESS_TOKEN.startsWith('duffel_live_');
  if (raw.DUFFEL_MODE === 'test' && !isTestToken) {
    console.error(
      'DUFFEL_MODE=test but DUFFEL_ACCESS_TOKEN is not a test token (expected prefix "duffel_test_"). Refusing to start.',
    );
    process.exit(1);
  }
  if (raw.DUFFEL_MODE === 'live' && !isLiveToken) {
    console.error(
      'DUFFEL_MODE=live but DUFFEL_ACCESS_TOKEN is not a live token (expected prefix "duffel_live_"). Refusing to start.',
    );
    process.exit(1);
  }
}

export const env = {
  ...raw,
  FRONTEND_ORIGINS: raw.FRONTEND_URL.split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
  /** Bookings may only be created in test mode, or in live mode with the explicit switch on. */
  BOOKINGS_ALLOWED: raw.DUFFEL_MODE === 'test' || raw.DUFFEL_LIVE_BOOKINGS_ENABLED,
};

export type Env = typeof env;
