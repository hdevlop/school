import type { Config } from 'drizzle-kit';

export default {
  schema: './packages/server/src/database/schema/index.ts',
  out: './packages/server/src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DB_URL!,
  },
} satisfies Config;
