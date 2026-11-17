/**
 * Applies pending Drizzle migrations using drizzle-orm's runtime migrator, so production
 * images don't need drizzle-kit. Run automatically when the Docker container starts.
 * Locally you can keep using `npm run db:migrate` (drizzle-kit); both use the same files
 * and the same migrations table, so they are interchangeable.
 */
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index.js';

const migrationsFolder = fileURLToPath(new URL('./migrations', import.meta.url));

try {
  await migrate(db, { migrationsFolder });
  console.log('Database migrations are up to date.');
} catch (error) {
  console.error('Database migration failed:', (error as Error).message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
