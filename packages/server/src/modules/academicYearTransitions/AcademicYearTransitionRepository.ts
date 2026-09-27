import { eq, inArray, sql } from 'drizzle-orm';
import { Repository } from '../../najm';
import type { DB } from '../../database/db';
import { students } from '../students/studentSchema';
import { studentEnrollments } from '../studentEnrollments/StudentEnrollmentSchema';
import { settings } from '../settings/settingSchema';
import { academicYears } from '../academicYears/AcademicYearSchema';
import { academicYearTransitionRuns } from './AcademicYearTransitionSchema';

@Repository()
export class AcademicYearTransitionRepository {
  declare db: DB;

  async lockScope(sourceYearId: string, targetYearId: string) {
    // The year locks also serialize new enrollment inserts through their FK checks.
    await this.db.select({ id: academicYears.id }).from(academicYears)
      .where(inArray(academicYears.id, [sourceYearId, targetYearId]))
      .orderBy(academicYears.id).for('update');
    await this.db.select({ id: settings.id }).from(settings)
      .orderBy(settings.id).for('update');
    // Lock structure before the roster: profile inserts reference these rows.
    await this.db.execute(sql`
      SELECT c.id FROM classes c
      WHERE c.academic_year IN (
        SELECT y.label FROM academic_years y WHERE y.id IN (${sourceYearId}, ${targetYearId})
      ) ORDER BY c.id FOR UPDATE OF c
    `);
    await this.db.execute(sql`
      SELECT s.id FROM sections s JOIN classes c ON c.id = s.class_id
      WHERE c.academic_year IN (
        SELECT y.label FROM academic_years y WHERE y.id IN (${sourceYearId}, ${targetYearId})
      ) ORDER BY s.id FOR UPDATE OF s
    `);
    await this.db.select({ id: students.id }).from(students)
      .where(eq(students.status, 'active')).orderBy(students.id).for('update');
    await this.db.select({ id: studentEnrollments.id }).from(studentEnrollments)
      .where(inArray(studentEnrollments.academicYearId, [sourceYearId, targetYearId]))
      .orderBy(studentEnrollments.id).for('update');
  }

  async findByKey(key: string) {
    const [run] = await this.db.select().from(academicYearTransitionRuns)
      .where(eq(academicYearTransitionRuns.idempotencyKey, key)).limit(1);
    return run ?? null;
  }

  async findById(id: string) {
    const [run] = await this.db.select().from(academicYearTransitionRuns)
      .where(eq(academicYearTransitionRuns.id, id)).limit(1);
    return run ?? null;
  }

  async findByTarget(targetYearId: string) {
    const [run] = await this.db.select().from(academicYearTransitionRuns)
      .where(eq(academicYearTransitionRuns.targetAcademicYearId, targetYearId)).limit(1);
    return run ?? null;
  }

  async create(data: typeof academicYearTransitionRuns.$inferInsert) {
    const [run] = await this.db.insert(academicYearTransitionRuns).values(data).returning();
    return run;
  }

  async clearForSeedReset() {
    await this.db.delete(academicYearTransitionRuns);
  }
}
