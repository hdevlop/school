import { Repository } from '../../najm';
import { Owned, type OwnedWhere } from '../../auth';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { eq, desc, and, count, sql, inArray, or, isNull, type SQL } from 'drizzle-orm';
import { announcements, users, classes } from '../../database/schema';
import { DB } from '../../database/db';
import { alias } from 'drizzle-orm/pg-core';
import { Announcement, AnnouncementByAuthor, AnnouncementForClass, isLive } from './AnnouncementGuards';

export const classSelect = {
  id: classes.id,
  name: classes.name,
  description: classes.description,
  academicYear: classes.academicYear,
  level: classes.level,
  createdAt: classes.createdAt,
  updatedAt: classes.updatedAt,
};

/** Legacy rows without a provable academic year remain outside year views. */
export const announcementInYear = (yearId: string) => eq(announcements.academicYearId, yearId);

/** The announcement names this class, directly or in its class list. */
const targetsClass = (classId: string) => or(
  eq(announcements.classId, classId),
  sql`EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(COALESCE(${announcements.classIds}, '[]'::jsonb)) AS target_class_id
    WHERE target_class_id = ${classId}
  )`,
);

@Repository()
export class AnnouncementRepository {
  @Year() private readonly year!: ResolvedAcademicYear;
  declare db: DB;
  @Owned(Announcement, AnnouncementForClass, AnnouncementByAuthor)
  private ownedWhere!: OwnedWhere;

  // ========================================
  // QUERY_BUILDERS (Reusable)
  // ========================================

  /** What the signed-in reader may see in the selected year, narrowed by a read's own filters. */
  private readCondition(...filters: (SQL | undefined)[]) {
    return and(this.ownedWhere(), announcementInYear(this.year.id), ...filters);
  }

  // Never chain another .where() on this: it would replace the read condition.
  private buildAnnouncementQuery(...filters: (SQL | undefined)[]) {
    const authorUsers = alias(users, 'author_users');

    return this.db
      .select({
        id: announcements.id,
        academicYearId: announcements.academicYearId,
        title: announcements.title,
        content: announcements.content,
        authorId: announcements.authorId,
        targetAudience: announcements.targetAudience,
        classId: announcements.classId,
        classIds: announcements.classIds,
        isPublished: announcements.isPublished,
        publishDate: announcements.publishDate,
        expiryDate: announcements.expiryDate,
        createdAt: announcements.createdAt,
        updatedAt: announcements.updatedAt,
        author: {
          id: authorUsers.id,
          email: authorUsers.email,
          image: authorUsers.image,
        },
        class: classSelect,
      })
      .from(announcements)
      .leftJoin(authorUsers, eq(announcements.authorId, authorUsers.id))
      .leftJoin(classes, eq(announcements.classId, classes.id))
      .where(this.readCondition(...filters));
  }

  // ========================================
  // GET_READ_METHODS
  // ========================================

  async getCount() {
    const [announcementsCount] = await this.db
      .select({ count: count() })
      .from(announcements)
      .where(this.readCondition());
    return announcementsCount;
  }

  async getStats() {
    const now = new Date().toISOString();
    const [stats] = await this.db
      .select({
        total: count(),
        published: count(sql`CASE WHEN ${announcements.isPublished} = true THEN 1 END`),
        draft: count(sql`CASE WHEN ${announcements.isPublished} = false THEN 1 END`),
        active: count(sql`CASE WHEN ${announcements.isPublished} = true
          AND (${announcements.publishDate} IS NULL OR ${announcements.publishDate} <= ${now})
          AND (${announcements.expiryDate} IS NULL OR ${announcements.expiryDate} > ${now})
          THEN 1 END`),
        upcoming: count(sql`CASE WHEN ${announcements.isPublished} = false
          AND ${announcements.publishDate} > ${now}
          THEN 1 END`),
        expired: count(sql`CASE WHEN ${announcements.isPublished} = true
          AND ${announcements.expiryDate} <= ${now}
          THEN 1 END`),
      })
      .from(announcements)
      .where(this.readCondition());

    return stats;
  }

  async getAll() {
    return await this.buildAnnouncementQuery()
      .orderBy(desc(announcements.publishDate), desc(announcements.createdAt));
  }

  async getRecent(limit = 10) {
    return await this.buildAnnouncementQuery().orderBy(desc(announcements.createdAt)).limit(limit);
  }

  async getById(id: string) {
    const [announcement] = await this.buildAnnouncementQuery(eq(announcements.id, id)).limit(1);
    return announcement;
  }

  async getByAuthor(authorId: string) {
    return await this.buildAnnouncementQuery(eq(announcements.authorId, authorId))
      .orderBy(desc(announcements.createdAt));
  }

  async getByTargetAudience(targetAudience: string) {
    return await this.buildAnnouncementQuery(eq(announcements.targetAudience, targetAudience))
      .orderBy(desc(announcements.publishDate));
  }

  async getByClass(classId: string) {
    return await this.buildAnnouncementQuery(targetsClass(classId))
      .orderBy(desc(announcements.publishDate));
  }

  async getPublished() {
    return await this.buildAnnouncementQuery(isLive()).orderBy(desc(announcements.publishDate));
  }

  async getActiveForAudience(targetAudience: string, classId: string | undefined) {
    return await this.buildAnnouncementQuery(
      isLive(),
      or(eq(announcements.targetAudience, targetAudience), eq(announcements.targetAudience, 'all')),
      classId ? or(isNull(announcements.classIds), targetsClass(classId)) : undefined,
    ).orderBy(desc(announcements.publishDate));
  }

  async getUpcoming() {
    const now = new Date().toISOString();
    return await this.buildAnnouncementQuery(
      eq(announcements.isPublished, false),
      sql`${announcements.publishDate} > ${now}`,
    ).orderBy(announcements.publishDate);
  }

  async getExpired() {
    const now = new Date().toISOString();
    return await this.buildAnnouncementQuery(
      eq(announcements.isPublished, true),
      sql`${announcements.expiryDate} <= ${now}`,
    ).orderBy(desc(announcements.expiryDate));
  }

  // ========================================
  // CREATE_METHODS
  // ========================================

  async create(data) {
    const [newAnnouncement] = await this.db
      .insert(announcements)
      .values({ ...data, academicYearId: this.year.id })
      .returning();
    return await this.getById(newAnnouncement.id);
  }

  // ========================================
  // UPDATE_METHODS
  // ========================================

  async update(id, data) {
    const [updatedAnnouncement] = await this.db
      .update(announcements)
      .set(data)
      .where(and(eq(announcements.id, id), announcementInYear(this.year.id)))
      .returning();
    return updatedAnnouncement;
  }

  async publish(id) {
    const [published] = await this.db
      .update(announcements)
      .set({
        isPublished: true,
        publishDate: new Date().toISOString()
      })
      .where(and(eq(announcements.id, id), announcementInYear(this.year.id)))
      .returning();
    return published;
  }

  async unpublish(id) {
    const [unpublished] = await this.db
      .update(announcements)
      .set({ isPublished: false })
      .where(and(eq(announcements.id, id), announcementInYear(this.year.id)))
      .returning();
    return unpublished;
  }

  // ========================================
  // DELETE_METHODS
  // ========================================

  async delete(id) {
    const [deletedAnnouncement] = await this.db
      .delete(announcements)
      .where(and(eq(announcements.id, id), announcementInYear(this.year.id)))
      .returning();
    return deletedAnnouncement;
  }

  async deleteAll() {
    const deletedAnnouncements = await this.db
      .delete(announcements)
      .where(announcementInYear(this.year.id))
      .returning();

    return {
      deletedCount: deletedAnnouncements.length,
      deletedAnnouncements: deletedAnnouncements
    };
  }

  async deleteBulk(ids: string[]) {
    const deletedAnnouncements = await this.db
      .delete(announcements)
      .where(and(inArray(announcements.id, ids), announcementInYear(this.year.id)))
      .returning();

    return {
      deletedCount: deletedAnnouncements.length,
      deletedAnnouncements: deletedAnnouncements
    };
  }

  async classesInYear(classIds: string[]) {
    if (classIds.length === 0) return true;
    const rows = await this.db.select({ id: classes.id }).from(classes)
      .where(and(inArray(classes.id, classIds), eq(classes.academicYear, this.year.label)));
    return rows.length === classIds.length;
  }

  /** Trusted full seed reset; user-facing deletion always names a year. */
  async clearForSeedReset() {
    await this.db.delete(announcements);
  }
}
