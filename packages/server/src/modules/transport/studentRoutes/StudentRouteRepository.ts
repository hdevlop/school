import { DB } from '@server/database/db';
import { students, vehicles, users } from '@server/database/schema';
import { studentRoutes } from './studentRouteSchema';
import { count, eq, desc, and, sql } from 'drizzle-orm';
import { Repository } from '@server/najm';

@Repository()
export class StudentRouteRepository {
  declare db: DB;

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
    return await this.buildQuery().orderBy(desc(studentRoutes.createdAt));
  }

  async getById(id: string) {
    const [row] = await this.buildQuery()
      .where(eq(studentRoutes.id, id))
      .limit(1);
    return row || null;
  }

  async getByVehicleId(vehicleId: string) {
    return await this.buildQuery()
      .where(eq(studentRoutes.vehicleId, vehicleId))
      .orderBy(desc(studentRoutes.createdAt));
  }

  async getActiveByVehicleId(vehicleId: string) {
    return await this.buildQuery()
      .where(and(eq(studentRoutes.vehicleId, vehicleId), eq(studentRoutes.status, 'active')))
      .orderBy(desc(studentRoutes.createdAt));
  }

  async getByStudentId(studentId: string) {
    return await this.buildQuery()
      .where(eq(studentRoutes.studentId, studentId))
      .orderBy(desc(studentRoutes.createdAt));
  }

  async getActiveByStudentId(studentId: string) {
    const [row] = await this.buildQuery()
      .where(and(eq(studentRoutes.studentId, studentId), eq(studentRoutes.status, 'active')))
      .limit(1);
    return row || null;
  }

  async getCount() {
    const [result] = await this.db.select({ count: count() }).from(studentRoutes);
    return result;
  }

  async getActiveCountByVehicleId(vehicleId: string) {
    const [result] = await this.db
      .select({ count: count() })
      .from(studentRoutes)
      .where(and(eq(studentRoutes.vehicleId, vehicleId), eq(studentRoutes.status, 'active')));
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
      .where(eq(studentRoutes.id, id))
      .returning();
    return row;
  }

  async delete(id: string) {
    const [row] = await this.db
      .delete(studentRoutes)
      .where(eq(studentRoutes.id, id))
      .returning();
    return row;
  }

  async deleteAll() {
    return await this.db.delete(studentRoutes).returning();
  }
}
