import { Repository } from '@server/najm';
import { DB } from '@server/database/db';
import { refuels, vehicles, drivers, staff, users } from '@server/database/schema';
import { eq, desc, sql, and, gte, lte, isNotNull, avg, sum, max, min, count } from 'drizzle-orm';
import { getBusinessDate, getBusinessDateOnly } from '@server/shared/businessDate';

const refuelSelect = {
  id: refuels.id,
  vehicleId: refuels.vehicleId,
  drivers: refuels.drivers,
  datetime: refuels.datetime,
  liters: refuels.liters,
  costPerLiter: refuels.costPerLiter,
  totalCost: refuels.totalCost,
  fuelLevelAfter: refuels.fuelLevelAfter,
  voucherNumber: refuels.voucherNumber,
  mileageAtRefuel: refuels.mileageAtRefuel,
  attendant: refuels.attendant,
  notes: refuels.notes,
  createdAt: refuels.createdAt,
  updatedAt: refuels.updatedAt,
};

const vehicleSelect = {
  id: vehicles.id,
  name: vehicles.name,
  licensePlate: vehicles.licensePlate,
  type: vehicles.type,
};

const driverSelect = {
  id: drivers.id,
  userId: staff.userId,
  name: staff.name,
  cin: staff.cin,
  licenseNumber: drivers.licenseNumber,
  phone: staff.phone,
  status: staff.status,
  image: users.image,
};

const nestSelect = <T extends Record<string, unknown>>(selection: T) => {
  const nested: Record<string, unknown> = {};
  for (const key in selection) {
    nested[key] = selection[key as keyof T];
  }
  return nested as T;
};

@Repository()
export class RefuelRepository {
  declare db: DB;

  // ========================================
  // QUERY_BUILDERS (Reusable)
  // ========================================

  private buildRefuelQuery() {
    return this.db
      .select({
        ...refuelSelect,
        vehicle: nestSelect(vehicleSelect),
        driver: nestSelect(driverSelect),
      })
      .from(refuels)
      .leftJoin(vehicles, eq(refuels.vehicleId, vehicles.id))
      .leftJoin(drivers, eq(refuels.drivers, drivers.id))
      .leftJoin(staff, eq(drivers.staffId, staff.id))
      .leftJoin(users, eq(staff.userId, users.id));
  }

  // ========================================
  // GET / READ METHODS
  // ========================================

  async getCount() {
    const [result] = await this.db
      .select({ count: count() })
      .from(refuels);
    return result;
  }

  async getAll() {
    return await this.buildRefuelQuery()
      .orderBy(desc(refuels.datetime));
  }

  async getById(id) {
    const [result] = await this.buildRefuelQuery()
      .where(eq(refuels.id, id))
      .limit(1);
    return result || null;
  }

  async getByVehicleId(vehicleId) {
    return await this.buildRefuelQuery()
      .where(eq(refuels.vehicleId, vehicleId))
      .orderBy(desc(refuels.datetime));
  }

  async getByDriverId(driverId) {
    return await this.buildRefuelQuery()
      .where(eq(refuels.drivers, driverId))
      .orderBy(desc(refuels.datetime));
  }

  async getByVoucherNumber(voucherNumber) {
    const [result] = await this.buildRefuelQuery()
      .where(eq(refuels.voucherNumber, voucherNumber))
      .limit(1);
    return result || null;
  }

  async getByDate(date) {
    const startOfDay = `${date} 00:00:00`;
    const endOfDay = `${date} 23:59:59`;

    return await this.buildRefuelQuery()
      .where(
        and(
          gte(refuels.datetime, startOfDay),
          lte(refuels.datetime, endOfDay)
        )
      )
      .orderBy(desc(refuels.datetime));
  }

  async getRecentRecords(limit: number = 20) {
    return await this.buildRefuelQuery()
      .orderBy(desc(refuels.datetime))
      .limit(limit);
  }

  // ========================================
  // CREATE_METHODS
  // ========================================

  async create(data) {
    const [newRefuel] = await this.db
      .insert(refuels)
      .values(data)
      .returning();
    return newRefuel;
  }

  // ========================================
  // UPDATE_METHODS
  // ========================================

  async update(id, data) {
    const [updatedRefuel] = await this.db
      .update(refuels)
      .set(data)
      .where(eq(refuels.id, id))
      .returning();
    return updatedRefuel;
  }

  // ========================================
  // DELETE_METHODS
  // ========================================

  async delete(id) {
    const [deletedRefuel] = await this.db
      .delete(refuels)
      .where(eq(refuels.id, id))
      .returning();
    return deletedRefuel;
  }

  async deleteAll() {
    const deletedRefuels = await this.db
      .delete(refuels)
      .returning();
    return {
      deletedCount: deletedRefuels.length,
      deletedRefuels: deletedRefuels
    };
  }

  // ========================================
  // ANALYTICS METHODS
  // ========================================

  async getFuelConsumptionAnalytics() {
    const consumptionByVehicle = await this.db
      .select({
        vehicleId: refuels.vehicleId,
        vehicleName: vehicles.name,
        vehicleType: vehicles.type,
        totalLiters: sum(refuels.liters),
        totalCost: sum(refuels.totalCost),
        refuelCount: count(),
        avgLitersPerRefuel: avg(refuels.liters),
        avgCostPerLiter: avg(refuels.costPerLiter),
      })
      .from(refuels)
      .leftJoin(vehicles, eq(refuels.vehicleId, vehicles.id))
      .where(isNotNull(refuels.liters))
      .groupBy(refuels.vehicleId, vehicles.name, vehicles.type)
      .orderBy(desc(sum(refuels.liters)));

    const monthlyTrends = await this.db
      .select({
        month: sql<string>`to_char(${refuels.datetime}, 'Mon')`,
        totalLiters: sum(refuels.liters),
        totalCost: sum(refuels.totalCost),
        refuelCount: count(),
        avgCostPerLiter: avg(refuels.costPerLiter),
      })
      .from(refuels)
      .where(isNotNull(refuels.liters))
      .groupBy(sql`to_char(${refuels.datetime}, 'Mon')`)
      .orderBy(sql`to_char(${refuels.datetime}, 'Mon')`);

    return {
      consumptionByVehicle,
      monthlyTrends,
    };
  }

  async getFuelEfficiencyReport() {
    const efficiencyData = await this.db
      .select({
        vehicleId: refuels.vehicleId,
        vehicleName: vehicles.name,
        vehicleType: vehicles.type,
        totalFuelUsed: sum(refuels.liters),
        minMileage: min(refuels.mileageAtRefuel),
        maxMileage: max(refuels.mileageAtRefuel),
        totalMileage: sql<number>`(max(${refuels.mileageAtRefuel}) - min(${refuels.mileageAtRefuel}))`,
        refuelCount: count(),
      })
      .from(refuels)
      .leftJoin(vehicles, eq(refuels.vehicleId, vehicles.id))
      .where(
        and(
          isNotNull(refuels.liters),
          isNotNull(refuels.mileageAtRefuel)
        )
      )
      .groupBy(refuels.vehicleId, vehicles.name, vehicles.type)
      .having(sql`count(*) >= 2`)
      .orderBy(vehicles.name);

    return efficiencyData.map((item) => {
      const totalMileage = Number(item.totalMileage || 0);
      const totalFuelUsed = Number(item.totalFuelUsed || 0);
      const refuelCount = Number(item.refuelCount || 0);

      return {
      ...item,
      fuelEfficiencyKmPerLiter: totalMileage > 0 && totalFuelUsed > 0
        ? Math.round((totalMileage / totalFuelUsed) * 100) / 100
        : 0,
      avgFuelPerRefuel: refuelCount > 0
        ? Math.round((totalFuelUsed / refuelCount) * 100) / 100
        : 0,
    };
    });
  }

  async getFuelCostAnalysis() {
    const result = await this.db
      .select({
        vehicleType: vehicles.type,
        totalCost: sum(refuels.totalCost),
        totalLiters: sum(refuels.liters),
        avgCostPerLiter: avg(refuels.costPerLiter),
        vehicleCount: sql<number>`count(distinct ${refuels.vehicleId})`,
      })
      .from(refuels)
      .leftJoin(vehicles, eq(refuels.vehicleId, vehicles.id))
      .where(isNotNull(refuels.totalCost))
      .groupBy(vehicles.type)
      .orderBy(desc(sum(refuels.totalCost)));

    return result.map(row => ({
      ...row,
      totalCost: Number(row.totalCost),
      totalLiters: Number(row.totalLiters),
      avgCostPerLiter: Number(row.avgCostPerLiter),
      vehicleCount: Number(row.vehicleCount)
    }));
  }

  async getFuelSummary() {
    const [summary] = await this.db
      .select({
        totalRecords: count(),
        totalLiters: sum(refuels.liters),
        totalCost: sum(refuels.totalCost),
        avgCostPerLiter: avg(refuels.costPerLiter),
        uniqueVehicles: sql<number>`count(distinct ${refuels.vehicleId})`,
        uniqueDrivers: sql<number>`count(distinct ${refuels.drivers})`,
      })
      .from(refuels);

    const today = getBusinessDateOnly();
    const [todaySummary] = await this.db
      .select({
        todayRecords: count(),
        todayLiters: sum(refuels.liters),
        todayCost: sum(refuels.totalCost),
      })
      .from(refuels)
      .where(
        sql`date(${refuels.datetime}) = ${today}`
      );

    const monthStart = getBusinessDate();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [monthSummary] = await this.db
      .select({
        monthRecords: count(),
        monthLiters: sum(refuels.liters),
        monthCost: sum(refuels.totalCost),
      })
      .from(refuels)
      .where(
        gte(refuels.datetime, monthStart.toISOString())
      );

    return {
      overall: summary,
      today: todaySummary,
      thisMonth: monthSummary,
    };
  }

  async getVehicleFuelEfficiency(vehicleId) {
    const records = await this.db
      .select({
        datetime: refuels.datetime,
        liters: refuels.liters,
        mileageAtRefuel: refuels.mileageAtRefuel,
      })
      .from(refuels)
      .where(
        and(
          eq(refuels.vehicleId, vehicleId),
          isNotNull(refuels.liters)
        )
      )
      .orderBy(refuels.datetime);

    const efficiencyRecords = [];
    for (let i = 1; i < records.length; i++) {
      const prev = records[i - 1];
      const curr = records[i];

      if (prev.mileageAtRefuel && curr.mileageAtRefuel) {
        const mileageDiff = parseFloat(curr.mileageAtRefuel) - parseFloat(prev.mileageAtRefuel);
        const fuelUsed = parseFloat(curr.liters);

        if (mileageDiff > 0 && fuelUsed > 0) {
          efficiencyRecords.push({
            fromDate: prev.datetime,
            toDate: curr.datetime,
            distanceTraveled: mileageDiff,
            fuelUsed: fuelUsed,
            fuelEfficiency: Math.round((mileageDiff / fuelUsed) * 100) / 100, // km per liter
          });
        }
      }
    }

    return efficiencyRecords;
  }

  async getVehicleFuelCosts(vehicleId) {
    return await this.db
      .select({
        datetime: refuels.datetime,
        liters: refuels.liters,
        costPerLiter: refuels.costPerLiter,
        totalCost: refuels.totalCost,
        voucherNumber: refuels.voucherNumber,
        attendant: refuels.attendant,
      })
      .from(refuels)
      .where(eq(refuels.vehicleId, vehicleId))
      .orderBy(desc(refuels.datetime));
  }

  async getMonthlyFuelTrends() {
    const trends = await this.db
      .select({
        month: sql<string>`to_char(${refuels.datetime}, 'Mon')`,
        monthNumber: sql<number>`extract(month from ${refuels.datetime})`,
        totalLiters: sum(refuels.liters),
        totalCost: sum(refuels.totalCost),
        avgCostPerLiter: avg(refuels.costPerLiter),
        refuelCount: count(),
        uniqueVehicles: sql<number>`count(distinct ${refuels.vehicleId})`,
      })
      .from(refuels)
      .where(isNotNull(refuels.liters))
      .groupBy(
        sql`to_char(${refuels.datetime}, 'Mon')`,
        sql`extract(month from ${refuels.datetime})`
      )
      .orderBy(sql`extract(month from ${refuels.datetime})`)
      .limit(12);

    return trends;
  }

  async calculateFuelEfficiency(vehicleId, startDate, endDate) {
    const records = await this.db
      .select({
        datetime: refuels.datetime,
        liters: refuels.liters,
        mileageAtRefuel: refuels.mileageAtRefuel,
      })
      .from(refuels)
      .where(
        and(
          eq(refuels.vehicleId, vehicleId),
          gte(refuels.datetime, startDate),
          lte(refuels.datetime, endDate),
          isNotNull(refuels.liters)
        )
      )
      .orderBy(refuels.datetime);

    if (records.length < 2) {
      return {
        totalFuelUsed: 0,
        totalDistance: 0,
        fuelEfficiency: 0,
        recordCount: records.length,
      };
    }

    const totalFuel = records.reduce((sum, record) => sum + parseFloat(record.liters), 0);
    const firstRecord = records[0];
    const lastRecord = records[records.length - 1];

    const totalDistance = lastRecord.mileageAtRefuel && firstRecord.mileageAtRefuel
      ? parseFloat(lastRecord.mileageAtRefuel) - parseFloat(firstRecord.mileageAtRefuel)
      : 0;

    return {
      totalFuelUsed: Math.round(totalFuel * 100) / 100,
      totalDistance: Math.round(totalDistance * 100) / 100,
      fuelEfficiency: totalFuel > 0
        ? Math.round((totalDistance / totalFuel) * 100) / 100
        : 0,
      recordCount: records.length,
    };
  }

  async predictFuelNeeds(vehicleId, days) {
    const historical = await this.db
      .select({
        avgDailyFuel: avg(refuels.liters),
        refuelFrequency: sql<number>`
          count(*) / NULLIF(
            EXTRACT(days FROM (max(${refuels.datetime}) - min(${refuels.datetime}))), 0
          )
        `,
      })
      .from(refuels)
      .where(
        and(
          eq(refuels.vehicleId, vehicleId),
          gte(refuels.datetime, sql`current_date - interval '90 days'`)
        )
      );

    const prediction = historical[0] as unknown as { avgDailyFuel: string | null; refuelFrequency: number | null };

    return {
      predictedFuelNeeded: Number(prediction.avgDailyFuel || 0) * days,
      estimatedRefuels: Math.ceil(Number(prediction.refuelFrequency || 0) * days),
      basedOnDays: 90,
      predictionPeriod: days,
    };
  }

  async getFuelConsumptionByPeriod(startDate, endDate) {
    return await this.db
      .select({
        totalLiters: sum(refuels.liters),
        refuelCount: count(),
        uniqueVehicles: sql<number>`count(distinct ${refuels.vehicleId})`,
        avgLitersPerRefuel: avg(refuels.liters),
      })
      .from(refuels)
      .where(
        and(
          gte(refuels.datetime, startDate),
          lte(refuels.datetime, endDate)
        )
      );
  }

  async getFuelCostsByPeriod(startDate, endDate) {
    return await this.db
      .select({
        totalCost: sum(refuels.totalCost),
        avgCostPerLiter: avg(refuels.costPerLiter),
        minCostPerLiter: min(refuels.costPerLiter),
        maxCostPerLiter: max(refuels.costPerLiter),
      })
      .from(refuels)
      .where(
        and(
          gte(refuels.datetime, startDate),
          lte(refuels.datetime, endDate),
          isNotNull(refuels.totalCost)
        )
      );
  }

  async getFuelEfficiencyByPeriod(startDate, endDate) {
    return await this.db
      .select({
        vehicleId: refuels.vehicleId,
        vehicleName: vehicles.name,
        totalFuel: sum(refuels.liters),
        totalDistance: sql<number>`
          max(${refuels.mileageAtRefuel}) - min(${refuels.mileageAtRefuel})
        `,
      })
      .from(refuels)
      .leftJoin(vehicles, eq(refuels.vehicleId, vehicles.id))
      .where(
        and(
          gte(refuels.datetime, startDate),
          lte(refuels.datetime, endDate),
          isNotNull(refuels.mileageAtRefuel)
        )
      )
      .groupBy(refuels.vehicleId, vehicles.name)
      .having(sql`count(*) >= 2`);
  }

  async getFuelTrendsByPeriod(startDate, endDate) {
    return await this.db
      .select({
        date: sql<string>`date(${refuels.datetime})`,
        dailyLiters: sum(refuels.liters),
        dailyCost: sum(refuels.totalCost),
        refuelCount: count(),
      })
      .from(refuels)
      .where(
        and(
          gte(refuels.datetime, startDate),
          lte(refuels.datetime, endDate)
        )
      )
      .groupBy(sql`date(${refuels.datetime})`)
      .orderBy(sql`date(${refuels.datetime})`);
  }

  async getDriverRefuelStats(driverId) {
    const [stats] = await this.db
      .select({
        totalRefuels: count(),
        avgLitersPerRefuel: avg(refuels.liters),
        avgCostPerRefuel: avg(refuels.totalCost),
        totalLiters: sum(refuels.liters),
        totalCost: sum(refuels.totalCost),
      })
      .from(refuels)
      .where(
        and(
          eq(refuels.drivers, driverId),
          isNotNull(refuels.liters)
        )
      );
    return stats;
  }
}
