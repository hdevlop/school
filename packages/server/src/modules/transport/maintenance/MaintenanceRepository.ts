import { DB } from '@server/database/db';
import { maintenance, vehicles } from '@server/database/schema';
import { count, eq, desc, sql, and, asc } from 'drizzle-orm';
import { Repository } from '@server/najm';


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
  declare db: DB;

  async getAll() {
    return await this.db
      .select(maintenanceSelect)
      .from(maintenance)
      .leftJoin(vehicles, eq(maintenance.vehicleId, vehicles.id))
      .orderBy(desc(maintenance.createdAt));
  }

  async getById(id: string) {
    const [m] = await this.db
      .select(maintenanceSelect)
      .from(maintenance)
      .leftJoin(vehicles, eq(maintenance.vehicleId, vehicles.id))
      .where(eq(maintenance.id, id))
      .limit(1);
    return m;
  }

  async getByVehicleId(vehicleId: string) {
    return await this.db
      .select(maintenanceSelect)
      .from(maintenance)
      .leftJoin(vehicles, eq(maintenance.vehicleId, vehicles.id))
      .where(eq(maintenance.vehicleId, vehicleId))
      .orderBy(desc(maintenance.createdAt));
  }

  async getByStatus(status) {
    return await this.db
      .select(maintenanceSelect)
      .from(maintenance)
      .leftJoin(vehicles, eq(maintenance.vehicleId, vehicles.id))
      .where(eq(maintenance.status, status))
      .orderBy(desc(maintenance.createdAt));
  }

  async getByType(type) {
    return await this.db
      .select(maintenanceSelect)
      .from(maintenance)
      .leftJoin(vehicles, eq(maintenance.vehicleId, vehicles.id))
      .where(eq(maintenance.type, type))
      .orderBy(desc(maintenance.createdAt));
  }

  async getByPriority(priority: string) {
    return await this.db
      .select(maintenanceSelect)
      .from(maintenance)
      .leftJoin(vehicles, eq(maintenance.vehicleId, vehicles.id))
      .where(eq(maintenance.priority, priority))
      .orderBy(desc(maintenance.createdAt));
  }

  async getByAssignedTo(assignedTo: string) {
    return await this.db
      .select(maintenanceSelect)
      .from(maintenance)
      .leftJoin(vehicles, eq(maintenance.vehicleId, vehicles.id))
      .where(eq(maintenance.assignedTo, assignedTo))
      .orderBy(desc(maintenance.createdAt));
  }

  async getScheduledMaintenances() {
    return await this.db
      .select(maintenanceSelect)
      .from(maintenance)
      .leftJoin(vehicles, eq(maintenance.vehicleId, vehicles.id))
      .where(eq(maintenance.status, 'scheduled'))
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
      .from(maintenance);
    return maintenanceCount;
  }

  async getStatusCounts() {
    const result = await this.db
      .select({
        status: maintenance.status,
        count: sql<number>`count(*)`,
      })
      .from(maintenance)
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
      .where(sql`${maintenance.cost} IS NOT NULL AND ${maintenance.cost} != ''`);

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
      .where(eq(maintenance.id, id))
      .returning();
    return updatedMaintenance;
  }

  async delete(id: string) {
    const [deletedMaintenance] = await this.db
      .delete(maintenance)
      .where(eq(maintenance.id, id))
      .returning();
    return deletedMaintenance;
  }

  async deleteAll() {
    const deletedMaintenances = await this.db
      .delete(maintenance)
      .returning();

    return {
      deletedCount: deletedMaintenances.length,
      deletedMaintenances: deletedMaintenances,
    };
  }

  async markAsCompleted(id: string) {
    const [updatedMaintenance] = await this.db
      .update(maintenance)
      .set({
        status: 'completed',
        completedAt: new Date().toISOString(),
      })
      .where(eq(maintenance.id, id))
      .returning();
    return updatedMaintenance;
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
