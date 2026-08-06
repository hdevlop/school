import { DB } from '@server/database/db';
import { vehicleAssignments, vehicles, drivers, staff, users } from '@server/database/schema';
import { count, eq, desc, and, inArray } from 'drizzle-orm';
import { Repository } from '@server/najm';

@Repository()
export class VehicleAssignmentRepository {
  declare db: DB;

  // ========================================
  // QUERY BUILDERS (Reusable)
  // ========================================

  private buildAssignmentQuery() {
    return this.db
      .select({
        id: vehicleAssignments.id,
        vehicleId: vehicleAssignments.vehicleId,
        driverId: vehicleAssignments.driverId,
        assignmentDate: vehicleAssignments.assignmentDate,
        unassignmentDate: vehicleAssignments.unassignmentDate,
        status: vehicleAssignments.status,
        notes: vehicleAssignments.notes,
        assignedBy: vehicleAssignments.assignedBy,
        createdAt: vehicleAssignments.createdAt,
        updatedAt: vehicleAssignments.updatedAt,
        vehicle: {
          id: vehicles.id,
          name: vehicles.name,
          licensePlate: vehicles.licensePlate,
          type: vehicles.type,
        },
        driver: {
          id: drivers.id,
          name: staff.name,
          licenseNumber: drivers.licenseNumber,
          image: users.image,
        }
      })
      .from(vehicleAssignments)
      .leftJoin(vehicles, eq(vehicleAssignments.vehicleId, vehicles.id))
      .leftJoin(drivers, eq(vehicleAssignments.driverId, drivers.id))
      .leftJoin(staff, eq(drivers.staffId, staff.id))
      .leftJoin(users, eq(staff.userId, users.id));
  }

  // ========================================
  // GET / READ METHODS
  // ========================================

  async getAll(filter?) {
    if (filter === 'ALL' || !filter) {
      return await this.getAllAssignments();
    }
    return await this.getByIds(filter);
  }

  private async getAllAssignments() {
    return await this.buildAssignmentQuery()
      .orderBy(desc(vehicleAssignments.createdAt));
  }

  async getByIds(ids: string[]) {
    if (!ids || ids.length === 0) return [];

    return await this.buildAssignmentQuery()
      .where(inArray(vehicleAssignments.id, ids))
      .orderBy(desc(vehicleAssignments.createdAt));
  }

  async getById(id: string) {
    const [assignment] = await this.buildAssignmentQuery()
      .where(eq(vehicleAssignments.id, id))
      .limit(1);

    return assignment || null;
  }

  async getByVehicleId(vehicleId: string) {
    return await this.buildAssignmentQuery()
      .where(eq(vehicleAssignments.vehicleId, vehicleId))
      .orderBy(desc(vehicleAssignments.createdAt));
  }

  async getByDriverId(driverId: string) {
    return await this.buildAssignmentQuery()
      .where(eq(vehicleAssignments.driverId, driverId))
      .orderBy(desc(vehicleAssignments.createdAt));
  }

  async getActiveAssignmentByVehicle(vehicleId: string) {
    const [assignment] = await this.buildAssignmentQuery()
      .where(
        and(
          eq(vehicleAssignments.vehicleId, vehicleId),
          eq(vehicleAssignments.status, 'active')
        )
      )
      .limit(1);

    return assignment || null;
  }

  async getActiveAssignmentByDriver(driverId: string) {
    const [assignment] = await this.buildAssignmentQuery()
      .where(
        and(
          eq(vehicleAssignments.driverId, driverId),
          eq(vehicleAssignments.status, 'active')
        )
      )
      .limit(1);

    return assignment || null;
  }

  async getByStatus(status: string) {
    return await this.buildAssignmentQuery()
      .where(eq(vehicleAssignments.status, status))
      .orderBy(desc(vehicleAssignments.createdAt));
  }

  async getCount() {
    const [result] = await this.db
      .select({ count: count() })
      .from(vehicleAssignments);
    return result;
  }

  // ========================================
  // CREATEMETHODS
  // ========================================

  async create(data) {
    const [newAssignment] = await this.db
      .insert(vehicleAssignments)
      .values(data)
      .returning();
    return newAssignment;
  }

  // ========================================
  // UPDATEMETHODS
  // ========================================

  async update(id: string, data) {
    const [updatedAssignment] = await this.db
      .update(vehicleAssignments)
      .set(data)
      .where(eq(vehicleAssignments.id, id))
      .returning();
    return updatedAssignment;
  }

  // ========================================
  // DELETEMETHODS
  // ========================================

  async delete(id: string) {
    const [deletedAssignment] = await this.db
      .delete(vehicleAssignments)
      .where(eq(vehicleAssignments.id, id))
      .returning();
    return deletedAssignment;
  }

  async deleteByDriverId(driverId: string) {
    return await this.db
      .delete(vehicleAssignments)
      .where(eq(vehicleAssignments.driverId, driverId))
      .returning();
  }

  async deleteAll() {
    const deletedAssignments = await this.db
      .delete(vehicleAssignments)
      .returning();

    return {
      deletedCount: deletedAssignments.length,
      deletedAssignments: deletedAssignments
    };
  }
}
