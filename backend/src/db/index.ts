import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import * as schema from './schema/index.js';

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5_000,
  // Needed for external/managed database URLs that require TLS (not for Render's internal URL).
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
});

// An idle connection can be closed by the server (database restart, network blip, failover).
// Without this listener, pg emits an unhandled 'error' event and the whole process crashes.
// The pool discards the broken connection and opens a new one on the next query.
pool.on('error', (error) => {
  logger.warn('Idle database connection lost; it will be replaced on the next query', {
    code: (error as { code?: string }).code,
    error: error.message,
  });
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;
