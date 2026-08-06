#!/usr/bin/env bun
// One-off: wipe every table (keep schema/enums) so a clean reseed doesn't hit
// misleading FK/duplicate errors from partial prior state.
import { db } from '@server/database/db';
import { sql } from 'drizzle-orm';

await db.execute(sql`
  DO $$ BEGIN
    EXECUTE 'TRUNCATE TABLE ' ||
      (SELECT string_agg(format('%I', tablename), ', ')
         FROM pg_tables WHERE schemaname='public')
      || ' RESTART IDENTITY CASCADE';
  END $$;
`);

console.log('✅ All public tables truncated (RESTART IDENTITY CASCADE).');
process.exit(0);
