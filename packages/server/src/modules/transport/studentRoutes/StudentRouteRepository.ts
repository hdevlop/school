import { DB } from '../../../database/db';
import { students, vehicles, users } from '../../../database/schema';
import { studentRoutes } from './studentRouteSchema';
import { count, eq, desc, and, sql, lte, gt, isNull, or, lt, ne } from 'drizzle-orm';
import { Repository } from '../../../najm';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';
import { assignmentOverlapsYear } from '../assignmentInterval';
import { getBusinessDateOnly } from '../../../shared/businessDate';

@Repository()
export class StudentRouteRepository {
  @Year() private readonly year!: ResolvedAcademicYear;
  declare db: DB;

  private inSelectedYear() {
    return assignmentOverlapsYear(studentRoutes.assignmentDate, studentRoutes.unassignmentDate, this.year);
  }

  private activeToday() {
    const today = getBusinessDateOnly();
    return and(eq(studentRoutes.status, 'active'), lte(studentRoutes.assignmentDate, today),
      or(isNull(studentRoutes.unassignmentDate), gt(studentRoutes.unassignmentDate, today)))!;
  }

  private buildQuery() {
    return this.db
      .select({
        id: studentRoutes.id,
        studentId: studentRoutes.studentId,
        vehicleId: studentRoutes.vehicleId,
        assignmentDate: studentRoutes.assignmentDate,
        unassignmentDate: studentRoutes.unassignmentDate,
        status: studentRoutes.status,
        pickupLocation: studentRoutes.pickupLocation,
        pickupPlaceId: studentRoutes.pickupPlaceId,
        pickupLatitude: studentRoutes.pickupLatitude,
        pickupLongitude: studentRoutes.pickupLongitude,
        dropoffLocation: studentRoutes.dropoffLocation,
        dropoffPlaceId: studentRoutes.dropoffPlaceId,
        dropoffLatitude: studentRoutes.dropoffLatitude,
        dropoffLongitude: studentRoutes.dropoffLongitude,
        notes: studentRoutes.notes,
        assignedBy: studentRoutes.assignedBy,
        createdAt: studentRoutes.createdAt,
        updatedAt: studentRoutes.updatedAt,
        student: {
          id: students.id,
          name: students.name,
          studentCode: students.studentCode,
          image: users.image,
        },
        vehicle: {
          id: vehicles.id,
          name: vehicles.name,
          licensePlate: vehicles.licensePlate,
          type: vehicles.type,
          capacity: vehicles.capacity,
          status: vehicles.status,
          activeStudentCount: sql<number>`(
            SELECT COUNT(*)::int
            FROM student_routes AS active_routes
            WHERE active_routes.vehicle_id = "vehicles"."id"
            AND active_routes.status = 'active'
            AND active_routes.assignment_date <= ${getBusinessDateOnly()}
            AND (active_routes.unassignment_date IS NULL OR active_routes.unassignment_date > ${getBusinessDateOnly()})
          )`,
        },
        driver: sql<{
          id: string;
          name: string;
          image: string | null;
        } | null>`(
          SELECT json_build_object(
            'id', assigned_driver.id,
            'name', assigned_staff.name,
            'image', driver_account.image
          )
          FROM vehicle_assignments AS assignment
          INNER JOIN drivers AS assigned_driver ON assignment.driver_id = assigned_driver.id
          INNER JOIN staff AS assigned_staff ON assigned_driver.staff_id = assigned_staff.id
          LEFT JOIN users AS driver_account ON assigned_staff.user_id = driver_account.id
          WHERE assignment.vehicle_id = "vehicles"."id"
            AND assignment.status = 'active'
            AND assignment.assignment_date <= ${getBusinessDateOnly()}
            AND (assignment.unassignment_date IS NULL OR assignment.unassignment_date > ${getBusinessDateOnly()})
          ORDER BY assignment.assignment_date DESC, assignment.created_at DESC
          LIMIT 1
        )`.as('driver'),
      })
      .from(studentRoutes)
      .leftJoin(students, eq(studentRoutes.studentId, students.id))
      .leftJoin(users, eq(students.userId, users.id))
      .leftJoin(vehicles, eq(studentRoutes.vehicleId, vehicles.id));
  }

  async getAll() {
    return await this.buildQuery().where(this.inSelectedYear()).orderBy(desc(studentRoutes.createdAt));
  }

  async getById(id: string) {
    const [row] = await this.buildQuery()
      .where(and(eq(studentRoutes.id, id), this.inSelectedYear()))
      .limit(1);
    return row || null;
  }

  async getByVehicleId(vehicleId: string) {
    return await this.buildQuery()
      .where(and(eq(studentRoutes.vehicleId, vehicleId), this.inSelectedYear()))
      .orderBy(desc(studentRoutes.createdAt));
  }

  async getActiveByVehicleId(vehicleId: string) {
    return await this.buildQuery()
      .where(and(eq(studentRoutes.vehicleId, vehicleId), eq(studentRoutes.status, 'active'), this.inSelectedYear()))
      .orderBy(desc(studentRoutes.createdAt));
  }

  async getByStudentId(studentId: string) {
    return await this.buildQuery()
      .where(and(eq(studentRoutes.studentId, studentId), this.inSelectedYear()))
      .orderBy(desc(studentRoutes.createdAt));
  }

  async getActiveByStudentIdAcrossYears(studentId: string) {
    const [row] = await this.buildQuery()
      .where(and(eq(studentRoutes.studentId, studentId), this.activeToday()))
      .limit(1);
    return row || null;
  }

  async getCount() {
    const [result] = await this.db.select({ count: count() }).from(studentRoutes).where(this.inSelectedYear());
    return result;
  }

  async getActiveCountByVehicleId(vehicleId: string) {
    const [result] = await this.db
      .select({ count: count() })
      .from(studentRoutes)
      .where(and(eq(studentRoutes.vehicleId, vehicleId), this.activeToday()));
    return Number(result?.count || 0);
  }

  async lockVehicle(vehicleId: string) {
    const [vehicle] = await this.db
      .select({
        id: vehicles.id,
        name: vehicles.name,
        capacity: vehicles.capacity,
        status: vehicles.status,
      })
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1)
      .for('update');
    return vehicle || null;
  }

  async create(data) {
    const [row] = await this.db.insert(studentRoutes).values(data).returning();
    return row;
  }

  async update(id: string, data) {
    const [row] = await this.db
      .update(studentRoutes)
      .set(data)
      .where(and(eq(studentRoutes.id, id), this.inSelectedYear()))
      .returning();
    return row;
  }

  async delete(id: string) {
    const [row] = await this.db
      .delete(studentRoutes)
      .where(and(eq(studentRoutes.id, id), this.inSelectedYear()))
      .returning();
    return row;
  }

  async deleteAll() {
    return await this.db.delete(studentRoutes).where(this.inSelectedYear()).returning();
  }

  async getOverlappingByStudentIdAcrossYears(
    studentId: string, start: string, end?: string | null, excludeId?: string,
  ) {
    const [row] = await this.db.select({ id: studentRoutes.id }).from(studentRoutes)
      .where(and(
        eq(studentRoutes.studentId, studentId),
        ne(studentRoutes.status, 'cancelled'),
        end ? lt(studentRoutes.assignmentDate, end) : undefined,
        or(isNull(studentRoutes.unassignmentDate), gt(studentRoutes.unassignmentDate, start)),
        excludeId ? ne(studentRoutes.id, excludeId) : undefined,
      )).limit(1);
    return row ?? null;
  }

  async clearForSeedReset() {
    return await this.db.delete(studentRoutes).returning();
  }
}
