import { Repository } from '@server/najm';
import { and, eq, gte, lte, or, desc, asc, sql, count } from 'drizzle-orm';
import { events, eventParticipants, users, classes, sections } from '@server/database/schema';
import { DB } from '@server/database/db';

export const eventSelect = {
  id: events.id,
  title: events.title,
  description: events.description,
  type: events.type,
  startDate: events.startDate,
  endDate: events.endDate,
  startTime: events.startTime,
  endTime: events.endTime,
  location: events.location,
  venue: events.venue,
  organizerId: events.organizerId,
  classId: events.classId,
  sectionId: events.sectionId,
  classIds: events.classIds,
  visibility: events.visibility,
  status: events.status,
  capacity: events.capacity,
  registrationRequired: events.registrationRequired,
  registrationDeadline: events.registrationDeadline,
  attachments: events.attachments,
  notes: events.notes,
  createdAt: events.createdAt,
  updatedAt: events.updatedAt,
};

export const userSelect = {
  id: users.id,
  email: users.email,
  roleId: users.roleId,
  image: users.image,
  status: users.status,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export const classSelect = {
  id: classes.id,
  name: classes.name,
  description: classes.description,
  academicYear: classes.academicYear,
  level: classes.level,
  createdAt: classes.createdAt,
  updatedAt: classes.updatedAt,
};

export const sectionSelect = {
  id: sections.id,
  name: sections.name,
  classId: sections.classId,
  maxStudents: sections.maxStudents,
  roomNumber: sections.roomNumber,
  status: sections.status,
  createdAt: sections.createdAt,
  updatedAt: sections.updatedAt,
};

@Repository()
export class EventRepository {
  declare db: DB;
  private readonly statusEnum = events.status.enumValues;
  private readonly typeEnum = events.type.enumValues;
  private readonly visibilityEnum = events.visibility.enumValues;

  private buildEventQuery() {
    return this.db.select({
      ...eventSelect,
      organizer: userSelect,
      class: classSelect,
      section: sectionSelect,
    }).from(events)
      .leftJoin(users, eq(events.organizerId, users.id))
      .leftJoin(classes, eq(events.classId, classes.id))
      .leftJoin(sections, eq(events.sectionId, sections.id));
  }

  async getAll() {
    return await this.buildEventQuery()
      .orderBy(desc(events.startDate));
  }

  async getById(id: string) {
    const [event] = await this.buildEventQuery()
      .where(eq(events.id, id));
    return event;
  }

  async getByStatus(status: string) {
    const normalizedStatus = status as (typeof this.statusEnum)[number];
    return await this.buildEventQuery()
      .where(eq(events.status, normalizedStatus))
      .orderBy(asc(events.startDate));
  }

  async getByType(type: string) {
    const normalizedType = type as (typeof this.typeEnum)[number];
    return await this.buildEventQuery()
      .where(eq(events.type, normalizedType))
      .orderBy(desc(events.startDate));
  }

  async getByOrganizer(organizerId: string) {
    return await this.buildEventQuery()
      .where(eq(events.organizerId, organizerId))
      .orderBy(desc(events.startDate));
  }

  async getByClass(classId: string) {
    return await this.buildEventQuery()
      .where(or(
        eq(events.classId, classId),
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(COALESCE(${events.classIds}, '[]'::jsonb)) AS class_id
          WHERE class_id = ${classId}
        )`,
      ))
      .orderBy(desc(events.startDate));
  }

  async getBySection(sectionId: string) {
    return await this.buildEventQuery()
      .where(eq(events.sectionId, sectionId))
      .orderBy(desc(events.startDate));
  }

  async getByVisibility(visibility: string) {
    const normalizedVisibility = visibility as (typeof this.visibilityEnum)[number];
    return await this.buildEventQuery()
      .where(eq(events.visibility, normalizedVisibility))
      .orderBy(desc(events.startDate));
  }

  async getUpcoming() {
    const today = new Date().toISOString().split('T')[0];
    return await this.buildEventQuery()
      .where(and(
        gte(events.startDate, today),
        or(
          eq(events.status, 'scheduled'),
          eq(events.status, 'ongoing')
        )
      ))
      .orderBy(asc(events.startDate));
  }

  async getPast() {
    const today = new Date().toISOString().split('T')[0];
    return await this.buildEventQuery()
      .where(and(
        lte(events.endDate, today),
        or(
          eq(events.status, 'completed'),
          eq(events.status, 'cancelled')
        )
      ))
      .orderBy(desc(events.startDate));
  }

  async getByDateRange(startDate: string, endDate: string) {
    return await this.buildEventQuery()
      .where(and(
        gte(events.startDate, startDate),
        lte(events.endDate, endDate)
      ))
      .orderBy(asc(events.startDate));
  }

  async getActiveEvents() {
    const today = new Date().toISOString().split('T')[0];
    return await this.buildEventQuery()
      .where(and(
        lte(events.startDate, today),
        gte(events.endDate, today),
        eq(events.status, 'ongoing')
      ))
      .orderBy(asc(events.startDate));
  }

  async getTodayEvents() {
    const today = new Date().toISOString().split('T')[0];
    return await this.buildEventQuery()
      .where(and(
        lte(events.startDate, today),
        gte(events.endDate, today),
        or(
          eq(events.status, 'scheduled'),
          eq(events.status, 'ongoing')
        )
      ))
      .orderBy(asc(events.startDate));
  }

  async create(data: typeof events.$inferInsert) {
    const [newEvent] = await this.db.insert(events)
      .values(data)
      .returning();
    return this.getById(newEvent.id);
  }

  async update(id: string, data: Partial<typeof events.$inferInsert>) {
    await this.db.update(events)
      .set(data)
      .where(eq(events.id, id));
    return this.getById(id);
  }

  async delete(id: string) {
    await this.db.delete(events)
      .where(eq(events.id, id));
    return { success: true };
  }

  async deleteAll() {
    await this.db.delete(events);
    return { success: true };
  }

  // ========== EVENT PARTICIPANTS ==========//

  async getParticipants(eventId: string) {
    return await this.db.select()
      .from(eventParticipants)
      .where(eq(eventParticipants.eventId, eventId))
      .orderBy(desc(eventParticipants.registrationDate));
  }

  async getParticipantsByType(eventId: string, participantType: string) {
    return await this.db.select()
      .from(eventParticipants)
      .where(and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.participantType, participantType)
      ))
      .orderBy(desc(eventParticipants.registrationDate));
  }

  async getEventsByParticipant(participantId: string) {
    const results = await this.db.select({
      ...eventSelect,
      organizer: userSelect,
      class: classSelect,
      section: sectionSelect,
      participation: {
        id: eventParticipants.id,
        registrationDate: eventParticipants.registrationDate,
        attendanceStatus: eventParticipants.attendanceStatus,
        notes: eventParticipants.notes,
      },
    })
      .from(eventParticipants)
      .innerJoin(events, eq(eventParticipants.eventId, events.id))
      .leftJoin(users, eq(events.organizerId, users.id))
      .leftJoin(classes, eq(events.classId, classes.id))
      .leftJoin(sections, eq(events.sectionId, sections.id))
      .where(eq(eventParticipants.participantId, participantId))
      .orderBy(desc(events.startDate));

    return results;
  }

  async addParticipant(data: typeof eventParticipants.$inferInsert) {
    const [participant] = await this.db.insert(eventParticipants)
      .values(data)
      .returning();
    return participant;
  }

  async addParticipantsBulk(participants: Array<typeof eventParticipants.$inferInsert>) {
    return await this.db.insert(eventParticipants)
      .values(participants)
      .returning();
  }

  async updateParticipant(id: string, data: Partial<typeof eventParticipants.$inferInsert>) {
    const [updated] = await this.db.update(eventParticipants)
      .set(data)
      .where(eq(eventParticipants.id, id))
      .returning();
    return updated;
  }

  async removeParticipant(id: string) {
    await this.db.delete(eventParticipants)
      .where(eq(eventParticipants.id, id));
    return { success: true };
  }

  async checkParticipantExists(eventId: string, participantId: string) {
    const [exists] = await this.db.select({ id: eventParticipants.id })
      .from(eventParticipants)
      .where(and(
        eq(eventParticipants.eventId, eventId),
        eq(eventParticipants.participantId, participantId)
      ))
      .limit(1);
    return !!exists;
  }

  async getParticipantCount(eventId: string) {
    const [result] = await this.db.select({
      total: count(),
    })
      .from(eventParticipants)
      .where(eq(eventParticipants.eventId, eventId));
    return result.total;
  }

  // ========== ANALYTICS ==========//

  async getEventAnalytics() {
    const [analytics] = await this.db.select({
      totalEvents: count(),
      upcoming: count(sql`CASE WHEN ${events.status} = 'scheduled' THEN 1 END`),
      ongoing: count(sql`CASE WHEN ${events.status} = 'ongoing' THEN 1 END`),
      completed: count(sql`CASE WHEN ${events.status} = 'completed' THEN 1 END`),
      cancelled: count(sql`CASE WHEN ${events.status} = 'cancelled' THEN 1 END`),
    })
      .from(events);

    return analytics;
  }

  async getEventsByTypeCount() {
    return await this.db.select({
      type: events.type,
      count: count(),
    })
      .from(events)
      .groupBy(events.type)
      .orderBy(desc(count()));
  }
}
