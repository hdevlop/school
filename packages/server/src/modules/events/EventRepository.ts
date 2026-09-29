import { Repository } from '../../najm';
import { and, eq, gte, inArray, lte, or, desc, asc, sql, count, type SQL } from 'drizzle-orm';
import { events, eventParticipants, users, classes, sections } from '../../database/schema';
import { DB } from '../../database/db';
import { Owned, type OwnedWhere, ownedIds } from '../../auth';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { getBusinessDateOnly } from '../../shared/businessDate';
import { Event } from './EventGuards';

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
  @Year() private readonly year!: ResolvedAcademicYear;
  declare db: DB;
  @Owned(Event)
  private ownedWhere!: OwnedWhere;
  private readonly statusEnum = events.status.enumValues;
  private readonly typeEnum = events.type.enumValues;
  private readonly visibilityEnum = events.visibility.enumValues;

  // An event belongs to every year whose reporting interval its dates overlap,
  // so one spanning the boundary shows in both years.
  private inSelectedYear() {
    return and(lte(events.startDate, this.year.reportingEndsOn), gte(events.endDate, this.year.reportingStartsOn));
  }

  /** What the signed-in reader may see in the selected year, narrowed by a read's own filters. */
  private readCondition(...filters: (SQL | undefined)[]) {
    return and(this.ownedWhere(), this.inSelectedYear(), ...filters);
  }

  /** Whether dates overlap the selected year: a new or moved event must stay in it. */
  overlapsSelectedYear(startDate: string, endDate: string) {
    return startDate <= this.year.reportingEndsOn && endDate >= this.year.reportingStartsOn;
  }

  // Never chain another .where() on this: it would replace the read condition.
  private buildEventQuery(...filters: (SQL | undefined)[]) {
    return this.db.select({
      ...eventSelect,
      organizer: userSelect,
      class: classSelect,
      section: sectionSelect,
    }).from(events)
      .leftJoin(users, eq(events.organizerId, users.id))
      .leftJoin(classes, eq(events.classId, classes.id))
      .leftJoin(sections, eq(events.sectionId, sections.id))
      .where(this.readCondition(...filters));
  }

  async getAll() {
    return await this.buildEventQuery()
      .orderBy(desc(events.startDate));
  }

  async getById(id: string) {
    const [event] = await this.buildEventQuery(eq(events.id, id));
    return event;
  }

  async getByStatus(status: string) {
    const normalizedStatus = status as (typeof this.statusEnum)[number];
    return await this.buildEventQuery(eq(events.status, normalizedStatus))
      .orderBy(asc(events.startDate));
  }

  async getByType(type: string) {
    const normalizedType = type as (typeof this.typeEnum)[number];
    return await this.buildEventQuery(eq(events.type, normalizedType))
      .orderBy(desc(events.startDate));
  }

  async getByOrganizer(organizerId: string) {
    return await this.buildEventQuery(eq(events.organizerId, organizerId))
      .orderBy(desc(events.startDate));
  }

  async getByClass(classId: string) {
    // An unqualified class_id inside a subquery here is ambiguous with the joined
    // tables' columns; containment needs no column name.
    return await this.buildEventQuery(or(
      eq(events.classId, classId),
      sql`coalesce(${events.classIds}, '[]'::jsonb) @> jsonb_build_array(${classId}::text)`,
    ))
      .orderBy(desc(events.startDate));
  }

  async getBySection(sectionId: string) {
    return await this.buildEventQuery(eq(events.sectionId, sectionId))
      .orderBy(desc(events.startDate));
  }

  async getByVisibility(visibility: string) {
    const normalizedVisibility = visibility as (typeof this.visibilityEnum)[number];
    return await this.buildEventQuery(eq(events.visibility, normalizedVisibility))
      .orderBy(desc(events.startDate));
  }

  // Scheduled or ongoing events starting on the business day or later.
  private upcoming() {
    return and(
      gte(events.startDate, getBusinessDateOnly()),
      or(
        eq(events.status, 'scheduled'),
        eq(events.status, 'ongoing')
      )
    );
  }

  async getUpcoming() {
    return await this.buildEventQuery(this.upcoming())
      .orderBy(asc(events.startDate));
  }

  /**
   * The upcoming events one parent account sees by the Event parent rule
   * (their audience, and their children's classes and sections), and only
   * those the reader may read too.
   */
  async getUpcomingForParent(parentUserId: string) {
    return await this.buildEventQuery(
      this.upcoming(),
      inArray(events.id, ownedIds(Event, 'parent', parentUserId)),
    )
      .orderBy(asc(events.startDate));
  }

  async getPast() {
    const today = getBusinessDateOnly();
    return await this.buildEventQuery(and(
      lte(events.endDate, today),
      or(
        eq(events.status, 'completed'),
        eq(events.status, 'cancelled')
      )
    ))
      .orderBy(desc(events.startDate));
  }

  async getByDateRange(startDate: string, endDate: string) {
    return await this.buildEventQuery(and(
      gte(events.startDate, startDate),
      lte(events.endDate, endDate)
    ))
      .orderBy(asc(events.startDate));
  }

  async getActiveEvents() {
    const today = getBusinessDateOnly();
    return await this.buildEventQuery(and(
      lte(events.startDate, today),
      gte(events.endDate, today),
      eq(events.status, 'ongoing')
    ))
      .orderBy(asc(events.startDate));
  }

  async getTodayEvents() {
    const today = getBusinessDateOnly();
    return await this.buildEventQuery(and(
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
      .where(and(eq(events.id, id), this.inSelectedYear()));
    return this.getById(id);
  }

  async delete(id: string) {
    await this.db.delete(events)
      .where(and(eq(events.id, id), this.inSelectedYear()));
    return { success: true };
  }

  async deleteAll() {
    await this.db.delete(events).where(this.inSelectedYear());
    return { success: true };
  }

  /** Trusted full reset; user-facing deletion is limited to the selected year. */
  async clearForSeedReset() {
    await this.db.delete(events);
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
      .where(this.readCondition(eq(eventParticipants.participantId, participantId)))
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
      .from(events)
      .where(this.readCondition());

    return analytics;
  }

  async getEventsByTypeCount() {
    return await this.db.select({
      type: events.type,
      count: count(),
    })
      .from(events)
      .where(this.readCondition())
      .groupBy(events.type)
      .orderBy(desc(count()));
  }
}
