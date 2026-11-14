import { and, asc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import { Repository } from '../../najm';
import { DB } from '../../database/db';
import { homework, homeworkAttachments, settings, teacherAssignments } from '../../database/schema';

export type HomeworkAttachmentRow = typeof homeworkAttachments.$inferSelect;

/**
 * Attachment rows and the storage settings beside them. Nothing here applies
 * ownership or a year: a request reaches a row only after HomeworkService read
 * its homework through both, and maintenance runs across every year.
 */
@Repository()
export class HomeworkAttachmentRepository {
  declare db: DB;

  async listForHomework(homeworkId: string) {
    return this.db.select().from(homeworkAttachments)
      .where(eq(homeworkAttachments.homeworkId, homeworkId))
      .orderBy(asc(homeworkAttachments.position), asc(homeworkAttachments.createdAt));
  }

  async findInHomework(homeworkId: string, attachmentId: string) {
    const [row] = await this.db.select().from(homeworkAttachments)
      .where(and(eq(homeworkAttachments.id, attachmentId), eq(homeworkAttachments.homeworkId, homeworkId)))
      .limit(1);
    return row;
  }

  async insert(rows: Array<typeof homeworkAttachments.$inferInsert>) {
    return this.db.insert(homeworkAttachments).values(rows).returning();
  }

  async remove(homeworkId: string, attachmentId: string) {
    const [row] = await this.db.delete(homeworkAttachments)
      .where(and(eq(homeworkAttachments.id, attachmentId), eq(homeworkAttachments.homeworkId, homeworkId)))
      .returning();
    return row;
  }

  /** Bytes of the files a teacher still holds in one academic year. */
  async liveBytesOfTeacher(teacherId: string, academicYearId: string) {
    const [row] = await this.db
      .select({ bytes: sql<number>`coalesce(sum(${homeworkAttachments.size}), 0)::float8` })
      .from(homeworkAttachments)
      .innerJoin(homework, eq(homeworkAttachments.homeworkId, homework.id))
      .innerJoin(teacherAssignments, eq(homework.teacherAssignmentId, teacherAssignments.id))
      .where(and(
        isNull(homeworkAttachments.purgedAt),
        eq(teacherAssignments.teacherId, teacherId),
        eq(homework.academicYearId, academicYearId),
      ));
    return Number(row?.bytes ?? 0);
  }

  /** The hashes among these that a live row still points at. */
  async liveHashesAmong(hashes: string[]) {
    if (!hashes.length) return new Set<string>();
    const rows = await this.db.selectDistinct({ fileHash: homeworkAttachments.fileHash }).from(homeworkAttachments)
      .where(and(inArray(homeworkAttachments.fileHash, hashes), isNull(homeworkAttachments.purgedAt)));
    return new Set(rows.map((row) => row.fileHash));
  }

  async storageSettings() {
    const [row] = await this.db
      .select({ quotaMb: settings.homeworkQuotaMb, retentionDays: settings.homeworkRetentionDays })
      .from(settings).orderBy(sql`${settings.createdAt} desc`).limit(1);
    return row;
  }

  // Maintenance, across every academic year.

  /** Live attachments whose homework was due (or, without a due date, given) before the day. */
  async expiredBefore(day: string) {
    return this.db
      .select({ id: homeworkAttachments.id, fileHash: homeworkAttachments.fileHash, kind: homeworkAttachments.kind })
      .from(homeworkAttachments)
      .innerJoin(homework, eq(homeworkAttachments.homeworkId, homework.id))
      .where(and(
        isNull(homeworkAttachments.purgedAt),
        lt(sql`coalesce(${homework.dueOn}, ${homework.date})`, day),
      ));
  }

  async markPurged(ids: string[], at: string) {
    if (!ids.length) return;
    await this.db.update(homeworkAttachments).set({ purgedAt: at })
      .where(and(inArray(homeworkAttachments.id, ids), isNull(homeworkAttachments.purgedAt)));
  }

  /** Every file a live row points at. */
  async liveFiles() {
    return this.db
      .selectDistinct({ fileHash: homeworkAttachments.fileHash, kind: homeworkAttachments.kind })
      .from(homeworkAttachments)
      .where(isNull(homeworkAttachments.purgedAt));
  }
}
