import { and, eq, inArray, sql } from 'drizzle-orm';
import { Repository } from '../../najm';
import { Owned, type OwnedWhere } from '../../auth';
import { DB } from '../../database/db';
import { Class } from '../classes/ClassGuards';
import { classes } from '../classes/classSchema';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { examPlanning } from './ExamPlanningSchema';
import type { SaveExamPlanningDto } from './ExamPlanningDto';
import type { ExamPlanningJson } from '@sms/contracts';

@Repository()
export class ExamPlanningRepository {
  declare db: DB;
  @Year() private readonly year!: ResolvedAcademicYear;
  @Owned(Class) private ownedWhere!: OwnedWhere;

  async getAll() {
    return this.db.select({ id: classes.id, name: classes.name, visible: examPlanning.visible, months: examPlanning.months })
      .from(classes)
      .leftJoin(examPlanning, and(eq(examPlanning.classId, classes.id), eq(examPlanning.academicYearId, this.year.id)))
      .where(and(this.ownedWhere(), eq(classes.academicYear, this.year.label)))
      .orderBy(classes.createdAt, classes.name);
  }

  async saveMonth(classId: string, data: SaveExamPlanningDto) {
    await this.db.insert(examPlanning).values({ academicYearId: this.year.id, classId, months: { [data.month]: data.entries } })
      .onConflictDoUpdate({
        target: [examPlanning.academicYearId, examPlanning.classId],
        set: { months: sql`jsonb_set(${examPlanning.months}, ARRAY[${data.month}]::text[], ${JSON.stringify(data.entries)}::jsonb, true)`, updatedAt: sql`CURRENT_TIMESTAMP` },
      });
  }

  async saveVisibility(allClassIds: string[], selectedIds: string[]) {
    if (!allClassIds.length) return;
    const selected = new Set(selectedIds);
    // One statement keeps the class settings atomic and preserves every month's topics.
    await this.db.insert(examPlanning).values(allClassIds.map(classId => ({ academicYearId: this.year.id, classId, visible: selected.has(classId) })))
      .onConflictDoUpdate({ target: [examPlanning.academicYearId, examPlanning.classId], set: { visible: sql`excluded.visible`, updatedAt: sql`CURRENT_TIMESTAMP` } });
  }

  async importDocument(classes: ExamPlanningJson['classes']) {
    // One statement makes the entire import atomic. Merge only the included months.
    await this.db.insert(examPlanning).values(classes.map(cls => ({
      academicYearId: this.year.id, classId: cls.id, visible: cls.visible, months: cls.months,
    }))).onConflictDoUpdate({
      target: [examPlanning.academicYearId, examPlanning.classId],
      set: { visible: sql`excluded.visible`, months: sql`${examPlanning.months} || excluded.months`, updatedAt: sql`CURRENT_TIMESTAMP` },
    });
  }

  async clearContent(classIds: string[]) {
    if (!classIds.length) return;
    await this.db.update(examPlanning).set({ months: {}, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(examPlanning.academicYearId, this.year.id), inArray(examPlanning.classId, classIds)));
  }
}
