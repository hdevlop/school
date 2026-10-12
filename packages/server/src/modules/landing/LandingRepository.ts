import { asc, eq, inArray } from 'drizzle-orm';
import { Repository } from '../../najm';
import type { DB } from '../../database/db';
import type { LandingContent, LandingProgramSlot, LandingText } from '@sms/contracts';
import { cycles } from '../cycles/cycleSchema';
import { schoolLanding } from './LandingSchema';

export interface LandingSeedProgram {
  name: string;
  labels: Record<string, string>;
  sortOrder: number;
  photoSlot: LandingProgramSlot;
  blurb: LandingText;
}

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

  // The singleton insert is the initialization marker. An existing row, even
  // empty or unpublished, belongs to the administrator and is never reseeded.
  async seedDefaults(content: LandingContent, programs: LandingSeedProgram[]) {
    return this.db.transaction(async tx => {
      const inserted = await tx.insert(schoolLanding).values({ id: 'school', ...content })
        .onConflictDoNothing({ target: schoolLanding.id }).returning({ id: schoolLanding.id });
      if (!inserted.length) return false;

      let existing = await tx.select().from(cycles).orderBy(asc(cycles.sortOrder), asc(cycles.id));
      if (!existing.length) {
        existing = await tx.insert(cycles).values(programs.map(({ name, labels, sortOrder }) => ({ name, labels, sortOrder })))
          .returning();
        existing.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      }
      const active = existing.filter(cycle => cycle.active);
      const programPhotoSlots: LandingContent['programPhotoSlots'] = {};
      const programBlurbs: LandingContent['programBlurbs'] = {};
      active.slice(0, programs.length).forEach((cycle, index) => {
        programPhotoSlots[cycle.id] = programs[index].photoSlot;
        programBlurbs[cycle.id] = programs[index].blurb;
      });
      await tx.update(schoolLanding).set({ programPhotoSlots, programBlurbs }).where(eq(schoolLanding.id, 'school'));
      return true;
    });
  }
}
