import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const url = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!url) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(url);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || target.pathname !== '/school_history_test') {
  throw new Error('Expected local school_history_test');
}
const client = postgres(url, { prepare: false, onnotice: () => {} });
try {
  const [before] = await client`select current_database() as name`;
  if (before.name !== 'school_history_test') throw new Error('Unexpected migration target');
  await migrate(drizzle(client), { migrationsFolder: 'packages/server/src/database/migrations' });
  const [after] = await client`select current_database() as name`;
  if (after.name !== 'school_history_test') throw new Error('Unexpected migration target');
  console.log('school_history_test migrations applied and target verified');
} finally { await client.end(); }
