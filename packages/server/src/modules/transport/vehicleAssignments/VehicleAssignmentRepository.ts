import { DB } from '../../../database/db';
import { vehicleAssignments, vehicles, drivers, staff, users } from '../../../database/schema';
import { count, eq, desc, and, inArray, lte, gt, isNull, or, lt, ne, sql } from 'drizzle-orm';
import { Repository } from '../../../najm';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';
import { assignmentOverlapsYear } from '../assignmentInterval';
import { getBusinessDateOnly } from '../../../shared/businessDate';

@Repository()
export class VehicleAssignmentRepository {
  @Year() private readonly year!: ResolvedAcademicYear;
  declare db: DB;

  /** Driver moves can touch two vehicles. Serialize their interval checks and
   * writes together, including the Staff form, until the transaction ends. */
  async lockAssignmentChanges() {
    await this.db.execute(sql`SELECT pg_advisory_xact_lock(hashtext('vehicle-assignment-changes'))`);
  }

  private inSelectedYear() {
    return assignmentOverlapsYear(
      vehicleAssignments.assignmentDate, vehicleAssignments.unassignmentDate, this.year,
    );
  }

  private activeToday() {
    const today = getBusinessDateOnly();
    return and(eq(vehicleAssignments.status, 'active'),
      lte(vehicleAssignments.assignmentDate, today),
      or(isNull(vehicleAssignments.unassignmentDate), gt(vehicleAssignments.unassignmentDate, today)))!;
  }

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
      .where(this.inSelectedYear())
      .orderBy(desc(vehicleAssignments.createdAt));
  }

  async getByIds(ids: string[]) {
    if (!ids || ids.length === 0) return [];

    return await this.buildAssignmentQuery()
      .where(and(inArray(vehicleAssignments.id, ids), this.inSelectedYear()))
      .orderBy(desc(vehicleAssignments.createdAt));
  }

  async getById(id: string) {
    const [assignment] = await this.buildAssignmentQuery()
      .where(and(eq(vehicleAssignments.id, id), this.inSelectedYear()))
      .limit(1);

    return assignment || null;
  }

  async getByVehicleId(vehicleId: string) {
    return await this.buildAssignmentQuery()
      .where(and(eq(vehicleAssignments.vehicleId, vehicleId), this.inSelectedYear()))
      .orderBy(desc(vehicleAssignments.createdAt));
  }

  async getByDriverId(driverId: string) {
    return await this.buildAssignmentQuery()
      .where(and(eq(vehicleAssignments.driverId, driverId), this.inSelectedYear()))
      .orderBy(desc(vehicleAssignments.createdAt));
  }

  async getActiveAssignmentByVehicleAcrossYears(vehicleId: string) {
    const [assignment] = await this.buildAssignmentQuery()
      .where(
        and(
          eq(vehicleAssignments.vehicleId, vehicleId),
          this.activeToday()
        )
      )
      .limit(1);

    return assignment || null;
  }

  async getActiveAssignmentByDriverAcrossYears(driverId: string) {
    const [assignment] = await this.buildAssignmentQuery()
      .where(
        and(
          eq(vehicleAssignments.driverId, driverId),
          this.activeToday()
        )
      )
      .limit(1);

    return assignment || null;
  }

  async getByStatus(status: string) {
    return await this.buildAssignmentQuery()
      .where(and(eq(vehicleAssignments.status, status), this.inSelectedYear()))
      .orderBy(desc(vehicleAssignments.createdAt));
  }

  async getCount() {
    const [result] = await this.db
      .select({ count: count() })
      .from(vehicleAssignments)
      .where(this.inSelectedYear());
    return result;
  }

  async getOverlappingByVehicleAcrossYears(
    vehicleId: string, start: string, end?: string | null, excludeId?: string,
  ) {
    const [row] = await this.db.select({ id: vehicleAssignments.id }).from(vehicleAssignments)
      .where(and(
        eq(vehicleAssignments.vehicleId, vehicleId), ne(vehicleAssignments.status, 'cancelled'),
        end ? lt(vehicleAssignments.assignmentDate, end) : undefined,
        or(isNull(vehicleAssignments.unassignmentDate), gt(vehicleAssignments.unassignmentDate, start)),
        excludeId ? ne(vehicleAssignments.id, excludeId) : undefined,
      )).limit(1);
    return row ?? null;
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
      .where(and(eq(vehicleAssignments.id, id), this.inSelectedYear()))
      .returning();
    return updatedAssignment;
  }

  // ========================================
  // DELETEMETHODS
  // ========================================

  async delete(id: string) {
    const [deletedAssignment] = await this.db
      .delete(vehicleAssignments)
      .where(and(eq(vehicleAssignments.id, id), this.inSelectedYear()))
      .returning();
    return deletedAssignment;
  }

  async deleteByDriverIdAcrossYears(driverId: string) {
    return await this.db
      .delete(vehicleAssignments)
      .where(eq(vehicleAssignments.driverId, driverId))
      .returning();
  }

  async deleteAll() {
    const deletedAssignments = await this.db
      .delete(vehicleAssignments)
      .where(this.inSelectedYear())
      .returning();

    return {
      deletedCount: deletedAssignments.length,
      deletedAssignments: deletedAssignments
    };
  }

  /** Closing the current assignment can touch a row begun in an earlier year. */
  async closeActiveAssignmentAcrossYears(id: string, unassignmentDate: string) {
    const [row] = await this.db.update(vehicleAssignments)
      .set({ status: 'completed', unassignmentDate })
      .where(and(eq(vehicleAssignments.id, id), this.activeToday()))
      .returning();
    return row ?? null;
  }

  async clearForSeedReset() {
    const rows = await this.db.delete(vehicleAssignments).returning();
    return { deletedCount: rows.length, deletedAssignments: rows };
  }
}
