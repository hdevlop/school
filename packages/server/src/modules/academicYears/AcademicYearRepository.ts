import { and, desc, eq, isNull, lte, gte, or } from 'drizzle-orm';
import { Repository } from '../../najm';
import type { DB } from '../../database/db';
import { academicYears } from './AcademicYearSchema';
import { settings } from '../settings/settingSchema';
import { auditLogs } from '../../database/schema/coreSchema';

/** How a request names a year: its label, its id, or a date its reporting interval holds. */
export type AcademicYearMatch = { label: string } | { id: string } | { date: string };

@Repository()
export class AcademicYearRepository {
  declare db: DB;

  async list() {
    return this.db.select().from(academicYears).orderBy(academicYears.label);
  }

  /**
   * The Settings active-year pointer and, in the same statement, the year a
   * request names, or the active ID's year when it names none (falling back to
   * the active label only for Settings without an ID). Null when
   * the school has no Settings row; `year` is null when no registered year
   * matches. Year resolution runs on every year-scoped request, so this is
   * one query rather than a Settings read followed by a year lookup.
   */
  async findWithActivePointer(match?: AcademicYearMatch) {
    const pointer = this.db
      .select({
        activeAcademicYearId: settings.activeAcademicYearId,
        currentAcademicYear: settings.currentAcademicYear,
      })
      .from(settings)
      .orderBy(desc(settings.createdAt))
      .limit(1)
      .as('active_pointer');
    const named = !match ? or(
      eq(academicYears.id, pointer.activeAcademicYearId),
      and(isNull(pointer.activeAcademicYearId), eq(academicYears.label, pointer.currentAcademicYear)),
    )
      : 'id' in match ? eq(academicYears.id, match.id)
        : 'label' in match ? eq(academicYears.label, match.label)
          : and(lte(academicYears.reportingStartsOn, match.date), gte(academicYears.reportingEndsOn, match.date));
    const [row] = await this.db
      .select({
        activeAcademicYearId: pointer.activeAcademicYearId,
        currentAcademicYear: pointer.currentAcademicYear,
        year: academicYears,
      })
      .from(pointer)
      .leftJoin(academicYears, named)
      .limit(1);
    return row ?? null;
  }

  async findById(id: string) {
    const [year] = await this.db.select().from(academicYears).where(eq(academicYears.id, id)).limit(1);
    return year ?? null;
  }

  async findByLabel(label: string) {
    const [year] = await this.db.select().from(academicYears).where(eq(academicYears.label, label)).limit(1);
    return year ?? null;
  }

  async findForDate(date: string) {
    const [year] = await this.db.select().from(academicYears)
      .where(and(
        lte(academicYears.reportingStartsOn, date),
        gte(academicYears.reportingEndsOn, date),
      )).limit(1);
    return year ?? null;
  }

  async findOverlapping(startsOn: string, endsOn: string) {
    const [year] = await this.db.select({ id: academicYears.id, label: academicYears.label })
      .from(academicYears)
      .where(and(
        lte(academicYears.reportingStartsOn, endsOn),
        gte(academicYears.reportingEndsOn, startsOn),
      )).limit(1);
    return year ?? null;
  }

  async create(data: typeof academicYears.$inferInsert) {
    const [created] = await this.db.insert(academicYears).values(data).returning();
    return created;
  }

  async setStatus(id: string, status: 'open' | 'closed', actorId: string) {
    const [updated] = await this.db.update(academicYears)
      .set({ status, updatedBy: actorId })
      .where(eq(academicYears.id, id)).returning();
    return updated;
  }

  async verifyCalendar(id: string, evidenceNote: string, actorId: string) {
    const [updated] = await this.db.update(academicYears)
      .set({ provenance: 'verified', provenanceNote: evidenceNote, updatedBy: actorId })
      .where(eq(academicYears.id, id)).returning();
    return updated;
  }

  // The audit record of a year switch: who, from and to which year, and the
  // committed transition it relied on.
  async recordActivation(entry: {
    actorId: string;
    actorRole: string;
    from: { id: string; label: string };
    to: { id: string; label: string };
    transitionRunId: string;
    businessDate: string;
    students: { placed: number; ended: number };
  }) {
    await this.db.insert(auditLogs).values({
      userId: entry.actorId,
      userRole: entry.actorRole,
      action: 'academic-year.activate',
      resource: 'academic-years',
      resourceId: entry.to.id,
      status: 'success',
      ipAddress: null,
      metadata: {
        from: entry.from,
        to: entry.to,
        transitionRunId: entry.transitionRunId,
        businessDate: entry.businessDate,
        students: entry.students,
      },
    });
  }

  async clearForSeedReset() {
    await this.db.delete(academicYears);
  }
}
