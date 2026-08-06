import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DB_URL || process.env.DATABASE_URL || 'postgres://localhost:5432/postgres';
const client = postgres(connectionString, {
  prepare: false,
  onnotice: () => {},
  transform: {
    undefined: null,
  },
});

async function ensureUtf8() {
  try {
    await client.unsafe('SET client_encoding = \'UTF8\'');
  } catch {}
}
ensureUtf8();

export const db = drizzle(client);
export type DB = typeof db;
