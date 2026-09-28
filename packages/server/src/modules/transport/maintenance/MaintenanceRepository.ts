import { DB } from '../../../database/db';
import { maintenance, vehicles } from '../../../database/schema';
import { count, eq, desc, sql, and, asc, or, ne, isNull, isNotNull } from 'drizzle-orm';
import { Repository } from '../../../najm';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';
import { inReportingInterval, occurredInReportingInterval } from '../../academicYears/academicRecordYear';


const maintenanceSelect = {
  id: maintenance.id,
  vehicleId: maintenance.vehicleId,
  vehicleName: vehicles.name,
  type: maintenance.type,
  title: maintenance.title,
  status: maintenance.status,
  dueHours: maintenance.dueHours,
  cost: maintenance.cost,
  scheduledDate: maintenance.scheduledDate,
  completedAt: maintenance.completedAt,
  priority: maintenance.priority,
  partsUsed: maintenance.partsUsed,
  assignedTo: maintenance.assignedTo,
  notes: maintenance.notes,
  createdAt: maintenance.createdAt,
  updatedAt: maintenance.updatedAt,
};

@Repository()
export class MaintenanceRepository {
  @Year() private readonly year!: ResolvedAcademicYear;
  declare db: DB;

  private inSelectedYear() {
    return or(
      and(eq(maintenance.status, 'completed'),
        or(occurredInReportingInterval(maintenance.completedAt, this.year),
          and(isNull(maintenance.completedAt), inReportingInterval(maintenance.scheduledDate, this.year)))),
      and(or(ne(maintenance.status, 'completed'), isNull(maintenance.status)),
        or(inReportingInterval(maintenance.scheduledDate, this.year),
          and(isNull(maintenance.scheduledDate), isNull(maintenance.completedAt)))),
    )!;
  }

  async getAll() {
    return await this.db
      .select(maintenanceSelect)
      .from(maintenance)
      .leftJoin(vehicles, eq(maintenance.vehicleId, vehicles.id))
      .where(this.inSelectedYear())
      .orderBy(desc(maintenance.createdAt));
  }

  async getById(id: string) {
    const [m] = await this.db
      .select(maintenanceSelect)
      .from(maintenance)
      .leftJoin(vehicles, eq(maintenance.vehicleId, vehicles.id))
      .where(and(eq(maintenance.id, id), this.inSelectedYear()))
      .limit(1);
    return m;
  }

  async getByVehicleId(vehicleId: string) {
    return await this.db
      .select(maintenanceSelect)
      .from(maintenance)
      .leftJoin(vehicles, eq(maintenance.vehicleId, vehicles.id))
      .where(and(eq(maintenance.vehicleId, vehicleId), this.inSelectedYear()))
      .orderBy(desc(maintenance.createdAt));
  }

  // Duplicate checks and mileage alerts concern the vehicle's live workload.
  async getByVehicleIdAcrossYears(vehicleId: string) {
    return await this.db.select(maintenanceSelect).from(maintenance)
      .leftJoin(vehicles, eq(maintenance.vehicleId, vehicles.id))
      .where(eq(maintenance.vehicleId, vehicleId))
      .orderBy(desc(maintenance.createdAt));
  }

  async getByStatus(status) {
    return await this.db
      .select(maintenanceSelect)
      .from(maintenance)
      .leftJoin(vehicles, eq(maintenance.vehicleId, vehicles.id))
      .where(and(eq(maintenance.status, status), this.inSelectedYear()))
      .orderBy(desc(maintenance.createdAt));
  }

  async getByType(type) {
    return await this.db
      .select(maintenanceSelect)
      .from(maintenance)
      .leftJoin(vehicles, eq(maintenance.vehicleId, vehicles.id))
      .where(and(eq(maintenance.type, type), this.inSelectedYear()))
      .orderBy(desc(maintenance.createdAt));
  }

  async getByPriority(priority: string) {
    return await this.db
      .select(maintenanceSelect)
      .from(maintenance)
      .leftJoin(vehicles, eq(maintenance.vehicleId, vehicles.id))
      .where(and(eq(maintenance.priority, priority), this.inSelectedYear()))
      .orderBy(desc(maintenance.createdAt));
  }

  async getByAssignedTo(assignedTo: string) {
    return await this.db
      .select(maintenanceSelect)
      .from(maintenance)
      .leftJoin(vehicles, eq(maintenance.vehicleId, vehicles.id))
      .where(and(eq(maintenance.assignedTo, assignedTo), this.inSelectedYear()))
      .orderBy(desc(maintenance.createdAt));
  }

  async getScheduledMaintenances() {
    return await this.db
      .select(maintenanceSelect)
      .from(maintenance)
      .leftJoin(vehicles, eq(maintenance.vehicleId, vehicles.id))
      .where(and(eq(maintenance.status, 'scheduled'), this.inSelectedYear()))
      .orderBy(asc(maintenance.scheduledDate), desc(maintenance.priority), desc(maintenance.createdAt));
  }

  async getOverdueMaintenances() {
    return await this.db
      .select({
        ...maintenanceSelect,
        vehicleCurrentHours: vehicles.currentMileage,
        hoursOverdue: sql<number>`CAST(${vehicles.currentMileage} AS NUMERIC) - CAST(${maintenance.dueHours} AS NUMERIC)`,
      })
      .from(maintenance)
      .leftJoin(vehicles, eq(maintenance.vehicleId, vehicles.id))
      .where(
        and(
          eq(maintenance.status, 'scheduled'),
          sql`CAST(${vehicles.currentMileage} AS NUMERIC) >= CAST(${maintenance.dueHours} AS NUMERIC)`
        )
      )
      .orderBy(desc(sql<number>`CAST(${vehicles.currentMileage} AS NUMERIC) - CAST(${maintenance.dueHours} AS NUMERIC)`));
  }

  async getUpcomingMaintenances(withinHours: number = 50) {
    return await this.db
      .select({
        ...maintenanceSelect,
        vehicleCurrentHours: vehicles.currentMileage,
        hoursUntilDue: sql<number>`CAST(${maintenance.dueHours} AS NUMERIC) - CAST(${vehicles.currentMileage} AS NUMERIC)`,
      })
      .from(maintenance)
      .leftJoin(vehicles, eq(maintenance.vehicleId, vehicles.id))
      .where(
        and(
          eq(maintenance.status, 'scheduled'),
          sql`CAST(${maintenance.dueHours} AS NUMERIC) - CAST(${vehicles.currentMileage} AS NUMERIC) <= ${withinHours}`,
          sql`CAST(${vehicles.currentMileage} AS NUMERIC) < CAST(${maintenance.dueHours} AS NUMERIC)`
        )
      )
      .orderBy(asc(sql<number>`CAST(${maintenance.dueHours} AS NUMERIC) - CAST(${vehicles.currentMileage} AS NUMERIC)`));
  }

  async getCount() {
    const [maintenanceCount] = await this.db
      .select({ count: count() })
      .from(maintenance)
      .where(this.inSelectedYear());
    return maintenanceCount;
  }

  async getStatusCounts() {
    const result = await this.db
      .select({
        status: maintenance.status,
        count: sql<number>`count(*)`,
      })
      .from(maintenance)
      .where(this.inSelectedYear())
      .groupBy(maintenance.status)
      .orderBy(maintenance.status);

    return result.map((item) => ({
      status: item.status,
      count: Number(item.count),
    }));
  }

  async getPriorityCounts() {
    const result = await this.db
      .select({
        priority: maintenance.priority,
        count: sql<number>`count(*)`,
      })
      .from(maintenance)
      .where(this.inSelectedYear())
      .groupBy(maintenance.priority)
      .orderBy(maintenance.priority);

    return result.map((item) => ({
      priority: item.priority,
      count: Number(item.count),
    }));
  }

  async getTypeCounts() {
    const result = await this.db
      .select({
        type: maintenance.type,
        count: sql<number>`count(*)`,
      })
      .from(maintenance)
      .where(this.inSelectedYear())
      .groupBy(maintenance.type)
      .orderBy(maintenance.type);

    return result.map((item) => ({
      type: item.type,
      count: Number(item.count),
    }));
  }

  async getMaintenanceCostAnalytics() {
    const result = await this.db
      .select({
        totalCost: sql<number>`SUM(CAST(${maintenance.cost} AS NUMERIC))`,
        avgCost: sql<number>`AVG(CAST(${maintenance.cost} AS NUMERIC))`,
        minCost: sql<number>`MIN(CAST(${maintenance.cost} AS NUMERIC))`,
        maxCost: sql<number>`MAX(CAST(${maintenance.cost} AS NUMERIC))`,
        count: sql<number>`COUNT(*)`
      })
      .from(maintenance)
      .where(and(this.inSelectedYear(), isNotNull(maintenance.cost)));

    const [analytics] = result;
    return {
      totalCost: Number(analytics?.totalCost) || 0,
      avgCost: Number(analytics?.avgCost) || 0,
      minCost: Number(analytics?.minCost) || 0,
      maxCost: Number(analytics?.maxCost) || 0,
      count: Number(analytics?.count) || 0
    };
  }

  async create(data: typeof maintenance.$inferInsert) {
    const [newMaintenance] = await this.db
      .insert(maintenance)
      .values(data)
      .returning();
    return newMaintenance;
  }

  async update(id: string, data: Partial<typeof maintenance.$inferInsert>) {
    const [updatedMaintenance] = await this.db
      .update(maintenance)
      .set(data)
      .where(and(eq(maintenance.id, id), this.inSelectedYear()))
      .returning();
    return updatedMaintenance;
  }

  async delete(id: string) {
    const [deletedMaintenance] = await this.db
      .delete(maintenance)
      .where(and(eq(maintenance.id, id), this.inSelectedYear()))
      .returning();
    return deletedMaintenance;
  }

  async deleteAll() {
    const deletedMaintenances = await this.db
      .delete(maintenance)
      .where(this.inSelectedYear())
      .returning();

    return {
      deletedCount: deletedMaintenances.length,
      deletedMaintenances: deletedMaintenances,
    };
  }

  async clearForSeedReset() {
    return await this.db.delete(maintenance);
  }

  async markAsCompleted(id: string) {
    const [updatedMaintenance] = await this.db
      .update(maintenance)
      .set({
        status: 'completed',
        completedAt: new Date().toISOString(),
      })
      .where(and(eq(maintenance.id, id), this.inSelectedYear()))
      .returning();
    return updatedMaintenance;
  }

  async markOverdueByIdForOperationalAlert(id: string) {
    await this.db.update(maintenance).set({ status: 'overdue' })
      .where(and(eq(maintenance.id, id), eq(maintenance.status, 'scheduled')));
  }

  async markAsOverdue() {
    const overdueMaintenances = await this.db
      .update(maintenance)
      .set({ status: 'overdue' })
      .where(
        and(
          eq(maintenance.status, 'scheduled'),
          sql`CAST(${maintenance.dueHours} AS NUMERIC) < (
            SELECT CAST(${vehicles.currentMileage} AS NUMERIC) 
            FROM ${vehicles} 
            WHERE ${vehicles.id} = ${maintenance.vehicleId}
          )`
        )
      )
      .returning();

    return overdueMaintenances;
  }
}
