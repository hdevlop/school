import { DB } from '@server/database/db';
import { vehicles } from '@server/database/schema';
import { count, eq, desc, sql } from 'drizzle-orm';
import { Repository } from '@server/najm';
import { getVehicleBaseFields, getVehicleComputedFields } from './VehicleUtils';

@Repository()
export class VehicleRepository {
  declare db: DB;

  // ========================================
  // QUERY BUILDERS (Reusable)
  // ========================================

  private buildVehicleQuery() {
    return this.db
      .select({
        ...getVehicleBaseFields(),
        ...getVehicleComputedFields(),
        activeAssignment: sql<{
          id: string;
          driverId: string;
          assignmentDate: string;
        } | null>`(
          SELECT json_build_object(
            'id', assignment.id,
            'driverId', assignment.driver_id,
            'assignmentDate', assignment.assignment_date
          )
          FROM vehicle_assignments AS assignment
          WHERE assignment.vehicle_id = "vehicles"."id"
            AND assignment.status = 'active'
          ORDER BY assignment.assignment_date DESC, assignment.created_at DESC
          LIMIT 1
        )`.as('active_assignment'),
        driver: sql<{
          id: string;
          name: string;
          image: string | null;
        } | null>`(
          SELECT json_build_object(
            'id', assigned_driver.id,
            'name', assigned_staff.name,
            'image', assigned_user.image
          )
          FROM vehicle_assignments AS assignment
          INNER JOIN drivers AS assigned_driver ON assignment.driver_id = assigned_driver.id
          INNER JOIN staff AS assigned_staff ON assigned_driver.staff_id = assigned_staff.id
          LEFT JOIN users AS assigned_user ON assigned_staff.user_id = assigned_user.id
          WHERE assignment.vehicle_id = "vehicles"."id"
            AND assignment.status = 'active'
          ORDER BY assignment.assignment_date DESC, assignment.created_at DESC
          LIMIT 1
        )`.as('driver'),
      })
      .from(vehicles);
  }

  // ========================================
  // GET / READ METHODS
  // ========================================

  async getAll() {
    return await this.buildVehicleQuery()
      .orderBy(desc(vehicles.createdAt));
  }

  async getById(id) {
    const [vehicle] = await this.buildVehicleQuery()
      .where(eq(vehicles.id, id))
      .limit(1);

    return vehicle || null;
  }

  async getByLicensePlate(plate) {
    const [vehicle] = await this.buildVehicleQuery()
      .where(eq(vehicles.licensePlate, plate))
      .limit(1);

    return vehicle || null;
  }

  async getByStatus(status) {
    return await this.buildVehicleQuery()
      .where(eq(vehicles.status, status))
      .orderBy(desc(vehicles.createdAt));
  }

  async getCount() {
    const [vehiclesCount] = await this.db
      .select({ count: count() })
      .from(vehicles);
    return vehiclesCount;
  }

  // ========================================
  // CREATEMETHODS
  // ========================================

  async create(data) {
    const [newVehicle] = await this.db
      .insert(vehicles)
      .values(data)
      .returning();
    return newVehicle;
  }

  // ========================================
  // UPDATEMETHODS
  // ========================================

  async update(id, data) {
    const [updatedVehicle] = await this.db
      .update(vehicles)
      .set(data)
      .where(eq(vehicles.id, id))
      .returning();
    return updatedVehicle;
  }

  // ========================================
  // DELETEMETHODS
  // ========================================

  async delete(id) {
    const [deletedVehicle] = await this.db
      .delete(vehicles)
      .where(eq(vehicles.id, id))
      .returning();
    return deletedVehicle;
  }

  async deleteAll() {
    const deletedVehicles = await this.db
      .delete(vehicles)
      .returning();

    return {
      deletedCount: deletedVehicles.length,
      deletedVehicles: deletedVehicles
    };
  }
}
