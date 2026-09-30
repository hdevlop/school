import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DB_URL || process.env.DATABASE_URL || 'postgres://localhost:5432/postgres';

/**
 * One pool per connection string per process. Next's dev server evaluates this
 * module again on every hot reload and in each of its module graphs, and a pool
 * made per evaluation is never closed: on 2026-09-29 the dev server held 99 of
 * PostgreSQL's 100 connections and every new client was refused.
 */
const pools = ((globalThis as typeof globalThis & { __schoolPostgresPools?: Map<string, postgres.Sql> })
  .__schoolPostgresPools ??= new Map());

function createClient() {
  const created = postgres(connectionString, {
    prepare: false,
    onnotice: () => {},
    transform: {
      undefined: null,
    },
  });
  created.unsafe('SET client_encoding = \'UTF8\'').catch(() => {});
  return created;
}

let client = pools.get(connectionString);
if (!client) {
  client = createClient();
  pools.set(connectionString, client);
}

export const db = drizzle(client);
export type DB = typeof db;
