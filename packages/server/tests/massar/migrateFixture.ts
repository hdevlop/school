import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
const url = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!url) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(url);
if (!['localhost','127.0.0.1','[::1]'].includes(target.hostname) || target.pathname !== '/school_history_test') throw new Error('Only local school_history_test is allowed');
const connection = postgres(url, { max: 1 });
try {
  await migrate(drizzle(connection), { migrationsFolder: fileURLToPath(new URL('../../src/database/migrations', import.meta.url)) });
  console.log('Migrated local school_history_test');
} finally { await connection.end(); }
