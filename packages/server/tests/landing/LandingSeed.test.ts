import { describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { sql, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DEFAULT_LANDING_CONTENT, LANDING_NEWS_FALLBACKS, LANDING_HERO_FALLBACK } from '@sms/contracts';
import { landingSeedContent, landingSeedPrograms } from '../../src/landingSeed';
import { LandingRepository } from '../../src/modules/landing/LandingRepository';
import { schoolLanding } from '../../src/modules/landing/LandingSchema';
import { cycles } from '../../src/modules/cycles/cycleSchema';
import type { DB } from '../../src/database/db';

describe('packaged landing defaults', () => {
  it('includes the dev page content and bundled photos', () => {
    expect(landingSeedContent.published).toBe(true);
    expect(landingSeedContent.stats).toHaveLength(4);
    expect(landingSeedContent.news).toHaveLength(6);
    expect(landingSeedContent.testimonials).toHaveLength(2);
    expect(landingSeedPrograms).toHaveLength(3);
    expect(JSON.stringify(landingSeedContent)).not.toContain('\uFFFD');
    for (const path of [LANDING_HERO_FALLBACK, ...LANDING_NEWS_FALLBACKS,
      ...landingSeedPrograms.map((_, index) => `/images/landing/program-${index + 1}.webp`)]) {
      expect(existsSync(resolve(import.meta.dir, '../../../../apps/dashboard/public', `.${path}`))).toBe(true);
    }
  });
});

// Opt-in PostgreSQL proof. Session-local temporary tables shadow the real
// tables; no application data is changed and closing the session drops them.
async function fixture(run: (repository: LandingRepository, database: DB) => Promise<void>, rejectCycles = false) {
  const connection = postgres(process.env.DB_URL!, { max: 1, prepare: false, onnotice: () => {} });
  const database = drizzle(connection);
  try {
    await database.execute(sql`CREATE TEMP TABLE school_landing (LIKE public.school_landing INCLUDING ALL)`);
    await database.execute(sql.raw(`CREATE TEMP TABLE cycles (LIKE public.cycles INCLUDING ALL${rejectCycles ? ', CHECK (false)' : ''})`));
    const repository = new LandingRepository();
    repository.db = database;
    await run(repository, database);
  } finally {
    await connection.end();
  }
}

describe.skipIf(process.env.LANDING_SEED_DB_TEST !== '1')('landing seed PostgreSQL preservation', () => {
  it('initializes once and preserves later edits, cleared sections, and disabled programs', async () => {
    await fixture(async (repository, database) => {
      expect(await repository.seedDefaults(landingSeedContent, landingSeedPrograms)).toBe(true);
      const [seeded] = await database.select().from(schoolLanding);
      expect(seeded.published).toBe(true);
      expect(seeded.news).toHaveLength(6);
      expect(Object.keys(seeded.programPhotoSlots)).toHaveLength(3);
      expect(await database.select().from(cycles)).toHaveLength(3);
      await database.update(schoolLanding).set({ ...DEFAULT_LANDING_CONTENT, published: false });
      await database.update(cycles).set({ name: 'Edited by admin', active: false });
      const before = await database.select().from(schoolLanding);
      const programsBefore = await database.select().from(cycles);
      expect(await repository.seedDefaults(landingSeedContent, landingSeedPrograms)).toBe(false);
      expect(await database.select().from(schoolLanding)).toEqual(before);
      expect(await database.select().from(cycles)).toEqual(programsBefore);
    });
  });

  it('leaves a previously saved empty landing row completely untouched', async () => {
    await fixture(async (repository, database) => {
      await database.insert(schoolLanding).values({ id: 'school', ...DEFAULT_LANDING_CONTENT });
      const before = await database.select().from(schoolLanding);
      expect(await repository.seedDefaults(landingSeedContent, landingSeedPrograms)).toBe(false);
      expect(await database.select().from(schoolLanding)).toEqual(before);
      expect(await database.select().from(cycles)).toEqual([]);
    });
  });

  it('reuses current cycle IDs without creating duplicates or enabling inactive cycles', async () => {
    await fixture(async (repository, database) => {
      await database.insert(cycles).values([
        { id: 'existing', name: 'Existing primary', sortOrder: 1 },
        { id: 'disabled', name: 'Disabled program', sortOrder: 2, active: false },
      ]);
      const before = await database.select().from(cycles);
      expect(await repository.seedDefaults(landingSeedContent, landingSeedPrograms)).toBe(true);
      expect(await database.select().from(cycles)).toEqual(before);
      const [content] = await database.select().from(schoolLanding).where(eq(schoolLanding.id, 'school'));
      expect(content.programPhotoSlots).toEqual({ existing: 'landingProgram1' });
    });
  });

  it('rolls back the initialization marker when program creation fails', async () => {
    await fixture(async (repository, database) => {
      let failure: unknown;
      try {
        await repository.seedDefaults(landingSeedContent, landingSeedPrograms);
      } catch (error) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(Error);
      expect(await database.select().from(schoolLanding)).toEqual([]);
      await database.execute(sql`ALTER TABLE pg_temp.cycles DROP CONSTRAINT cycles_check`);
      expect(await repository.seedDefaults(landingSeedContent, landingSeedPrograms)).toBe(true);
      expect(await database.select().from(schoolLanding)).toHaveLength(1);
    }, true);
  });
});
