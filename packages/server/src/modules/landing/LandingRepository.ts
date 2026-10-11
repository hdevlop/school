import { eq, inArray } from 'drizzle-orm';
import { Repository } from '../../najm';
import type { DB } from '../../database/db';
import type { LandingContent } from '@sms/contracts';
import { cycles } from '../cycles/cycleSchema';
import { schoolLanding } from './LandingSchema';

@Repository()
export class LandingRepository {
  declare db: DB;
  async get() { const [row] = await this.db.select().from(schoolLanding).where(eq(schoolLanding.id, 'school')); return row; }
  async cycleIds(ids: string[]) { return ids.length ? this.db.select({ id: cycles.id }).from(cycles).where(inArray(cycles.id, ids)) : []; }
  async save(content: LandingContent) {
    const [row] = await this.db.insert(schoolLanding).values({ id: 'school', ...content })
      .onConflictDoUpdate({ target: schoolLanding.id, set: content }).returning();
    return row;
  }
}
