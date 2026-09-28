import 'reflect-metadata';
import { Container, type Constructor } from 'diject';
import { ScopeContext } from 'najm-auth';
import type { DB } from '../../../src/database/db';
import { academicYears } from '../../../src/modules/academicYears/AcademicYearSchema';
import { registerYearPropertyInjector, runWithResolvedYear } from '../../../src/modules/academicYears/requestYear';

// Reads in a year run as the fixture administrator unless a test names
// another signed-in user, as the seed runs as admin.
const HISTORY_ADMIN = { id: 'history-admin', role: 'admin' };
type Actor = { id: string; role: string };

/** Exercise actual property injection on a singleton against the fixture DB. */
export async function scopedHistoryRepository<T extends { db: DB }>(target: Constructor<T>, db: DB) {
  const container = Container.create();
  registerYearPropertyInjector(container);
  // An @Owned repository reads the signed-in user through ScopeContext.
  container.set(ScopeContext as unknown as Constructor<ScopeContext>);
  container.set(target);
  const repo = await container.resolve(target);
  repo.db = db;
  const years = await db.select().from(academicYears);
  const inYear = <R>(id: string, run: () => R, actor: Actor = HISTORY_ADMIN): R => {
    const year = years.find((item) => item.id === id);
    if (!year) throw new Error(`Unknown fixture year: ${id}`);
    return container.run({ user: actor }, () => runWithResolvedYear(container, year, run));
  };
  return { repo, inYear };
}
