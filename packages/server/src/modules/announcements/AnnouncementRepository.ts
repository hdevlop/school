import { Repository } from '@server/najm';
import { eq, desc, and, count, sql, inArray, or, isNull } from 'drizzle-orm';
import { announcements, users, classes } from '@server/database/schema';
import { DB } from '@server/database/db';
import { alias } from 'drizzle-orm/pg-core';

export const classSelect = {
  id: classes.id,
  name: classes.name,
  description: classes.description,
  academicYear: classes.academicYear,
  level: classes.level,
  createdAt: classes.createdAt,
  updatedAt: classes.updatedAt,
};

@Repository()
export class AnnouncementRepository {
  declare db: DB;

  // ========================================
  // QUERY_BUILDERS (Reusable)
  // ========================================

  private buildAnnouncementQuery() {
    const authorUsers = alias(users, 'author_users');

    return this.db
      .select({
        id: announcements.id,
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
      .leftJoin(classes, eq(announcements.classId, classes.id));
  }

  // ========================================
  // GET_READ_METHODS
  // ========================================

  async getCount() {
    const [announcementsCount] = await this.db
      .select({ count: count() })
      .from(announcements);
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
      .from(announcements);

    return stats;
  }

  async getAll() {
    return await this.buildAnnouncementQuery()
      .orderBy(desc(announcements.publishDate), desc(announcements.createdAt));
  }

  async getRecent(limit = 10) {
    return await this.buildAnnouncementQuery()
      .orderBy(desc(announcements.createdAt))
      .limit(limit);
  }

  async getById(id: string) {
    const [announcement] = await this.buildAnnouncementQuery()
      .where(eq(announcements.id, id))
      .limit(1);

    return announcement;
  }

  async getByAuthor(authorId: string) {
    return await this.buildAnnouncementQuery()
      .where(eq(announcements.authorId, authorId))
      .orderBy(desc(announcements.createdAt));
  }

  async getByTargetAudience(targetAudience: string) {
    return await this.buildAnnouncementQuery()
      .where(eq(announcements.targetAudience, targetAudience))
      .orderBy(desc(announcements.publishDate));
  }

  async getByClass(classId: string) {
    return await this.buildAnnouncementQuery()
      .where(or(
        eq(announcements.classId, classId),
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(COALESCE(${announcements.classIds}, '[]'::jsonb)) AS target_class_id
          WHERE target_class_id = ${classId}
        )`,
      ))
      .orderBy(desc(announcements.publishDate));
  }

  async getPublished() {
    const now = new Date().toISOString();

    return await this.buildAnnouncementQuery()
      .where(
        and(
          eq(announcements.isPublished, true),
          or(
            isNull(announcements.publishDate),
            sql`${announcements.publishDate} <= ${now}`
          ),
          or(
            isNull(announcements.expiryDate),
            sql`${announcements.expiryDate} > ${now}`
          )
        )
      )
      .orderBy(desc(announcements.publishDate));
  }

  async getActiveForAudience(targetAudience: string, classId?: string) {
    const now = new Date().toISOString();

    const whereConditions = [
      eq(announcements.isPublished, true),
      or(
        eq(announcements.targetAudience, targetAudience),
        eq(announcements.targetAudience, 'all')
      ),
      or(
        isNull(announcements.publishDate),
        sql`${announcements.publishDate} <= ${now}`
      ),
      or(
        isNull(announcements.expiryDate),
        sql`${announcements.expiryDate} > ${now}`
      )
    ];

    if (classId) {
      whereConditions.push(
        or(
          isNull(announcements.classIds),
          eq(announcements.classId, classId),
          sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(COALESCE(${announcements.classIds}, '[]'::jsonb)) AS target_class_id
            WHERE target_class_id = ${classId}
          )`,
        )
      );
    }

    return await this.buildAnnouncementQuery()
      .where(and(...whereConditions))
      .orderBy(desc(announcements.publishDate));
  }

  async getUpcoming() {
    const now = new Date().toISOString();

    return await this.buildAnnouncementQuery()
      .where(
        and(
          eq(announcements.isPublished, false),
          sql`${announcements.publishDate} > ${now}`
        )
      )
      .orderBy(announcements.publishDate);
  }

  async getExpired() {
    const now = new Date().toISOString();

    return await this.buildAnnouncementQuery()
      .where(
        and(
          eq(announcements.isPublished, true),
          sql`${announcements.expiryDate} <= ${now}`
        )
      )
      .orderBy(desc(announcements.expiryDate));
  }

  // ========================================
  // CREATE_METHODS
  // ========================================

  async create(data) {
    const [newAnnouncement] = await this.db
      .insert(announcements)
      .values(data)
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
      .where(eq(announcements.id, id))
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
      .where(eq(announcements.id, id))
      .returning();
    return published;
  }

  async unpublish(id) {
    const [unpublished] = await this.db
      .update(announcements)
      .set({ isPublished: false })
      .where(eq(announcements.id, id))
      .returning();
    return unpublished;
  }

  // ========================================
  // DELETE_METHODS
  // ========================================

  async delete(id) {
    const [deletedAnnouncement] = await this.db
      .delete(announcements)
      .where(eq(announcements.id, id))
      .returning();
    return deletedAnnouncement;
  }

  async deleteAll() {
    const deletedAnnouncements = await this.db
      .delete(announcements)
      .returning();

    return {
      deletedCount: deletedAnnouncements.length,
      deletedAnnouncements: deletedAnnouncements
    };
  }

  async deleteBulk(ids: string[]) {
    const deletedAnnouncements = await this.db
      .delete(announcements)
      .where(inArray(announcements.id, ids))
      .returning();

    return {
      deletedCount: deletedAnnouncements.length,
      deletedAnnouncements: deletedAnnouncements
    };
  }
}
