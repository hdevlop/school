import { Service } from '@server/najm';
import { RefuelRepository } from './RefuelRepository';
import { RefuelValidator } from './RefuelValidator';
import type { CreateRefuelDto, UpdateRefuelDto } from './RefuelDto';
import { getBusinessDateOnly } from '@server/shared/businessDate';

@Service()
export class RefuelService {
  constructor(
    private refuelRepository: RefuelRepository,
    private refuelValidator: RefuelValidator
  ) { }

  async getAll() {
    return await this.refuelRepository.getAll();
  }

  async getCount() {
    return await this.refuelRepository.getCount();
  }

  async getById(id: string) {
    await this.refuelValidator.checkExists(id);
    return await this.refuelRepository.getById(id);
  }

  async getByVehicleId(vehicleId: string) {
    return await this.refuelRepository.getByVehicleId(vehicleId);
  }

  async getByDriverId(driverId: string) {
    return await this.refuelRepository.getByDriverId(driverId);
  }

  async getByVoucherNumber(voucherNumber: string) {
    await this.refuelValidator.checkVoucherNumberExists(voucherNumber);
    return await this.refuelRepository.getByVoucherNumber(voucherNumber);
  }

  async getByDate(date: string) {
    await this.refuelValidator.validateDate(date);
    return await this.refuelRepository.getByDate(date);
  }

  async getRecentRecords(limit = 20) {
    return await this.refuelRepository.getRecentRecords(limit);
  }

  async getTodayRecords() {
    const today = getBusinessDateOnly();
    return await this.refuelRepository.getByDate(today);
  }

  async create(data: CreateRefuelDto) {
    await this.refuelValidator.validate(data);
    const validatedData = { ...data };

    if (validatedData.voucherNumber) {
      await this.refuelValidator.checkVoucherNumberIsUnique(validatedData.voucherNumber);
    }

    const calculatedTotalCost = validatedData.totalCost ||
      (validatedData.costPerLiter
        ? (parseFloat(validatedData.costPerLiter) * parseFloat(validatedData.liters)).toFixed(2)
        : null);

    const refuelData = {
      ...validatedData,
      totalCost: calculatedTotalCost,
      fuelLevelAfter: validatedData.fuelLevelAfter || '100',
    };

    return await this.refuelRepository.create(refuelData);
  }

  async update(id: string, data: UpdateRefuelDto) {
    const validatedData = { ...data };
    await this.refuelValidator.validate(validatedData, id);
    await this.refuelValidator.checkExists(id);

    if (validatedData.voucherNumber) {
      await this.refuelValidator.checkVoucherNumberIsUnique(validatedData.voucherNumber, id);
    }

    if (validatedData.liters || validatedData.costPerLiter) {
      const currentRecord = await this.refuelRepository.getById(id);
      const liters = validatedData.liters || currentRecord.liters;
      const costPerLiter = validatedData.costPerLiter || currentRecord.costPerLiter;

      if (liters && costPerLiter && !validatedData.totalCost) {
        validatedData.totalCost = (parseFloat(costPerLiter) * parseFloat(liters)).toFixed(2);
      }
    }

    return await this.refuelRepository.update(id, validatedData);
  }

  async delete(id: string) {
    await this.refuelValidator.checkExists(id);
    return await this.refuelRepository.delete(id);
  }

  async deleteAll() {
    return await this.refuelRepository.deleteAll();
  }

  async seedDemoRefuels(refuelsData: CreateRefuelDto[]) {
    const createdRefuels = [];

    for (const refuelData of refuelsData) {
      try {
        const refuel = await this.create(refuelData);
        createdRefuels.push(refuel);
      } catch (error) {
        continue;
      }
    }

    return createdRefuels;
  }

  // ========== ANALYTICS METHODS ==========//

  async getFuelConsumptionAnalytics() {
    return await this.refuelRepository.getFuelConsumptionAnalytics();
  }

  async getFuelEfficiencyReport() {
    return await this.refuelRepository.getFuelEfficiencyReport();
  }

  async getFuelCostAnalysis() {
    return await this.refuelRepository.getFuelCostAnalysis();
  }

  async getFuelSummary() {
    return await this.refuelRepository.getFuelSummary();
  }

  async getVehicleFuelEfficiency(vehicleId: string) {
    return await this.refuelRepository.getVehicleFuelEfficiency(vehicleId);
  }

  async getVehicleFuelCosts(vehicleId: string) {
    return await this.refuelRepository.getVehicleFuelCosts(vehicleId);
  }

  async getMonthlyFuelTrends() {
    return await this.refuelRepository.getMonthlyFuelTrends();
  }

  async calculateFuelEfficiency(vehicleId: string, startDate: string, endDate: string) {
    await this.refuelValidator.validateDateRange(startDate, endDate);
    return await this.refuelRepository.calculateFuelEfficiency(vehicleId, startDate, endDate);
  }

  async predictFuelNeeds(vehicleId: string, days = 30) {
    if (days < 1 || days > 365) {
      throw new Error('Prediction period must be between 1 and 365 days');
    }
    return await this.refuelRepository.predictFuelNeeds(vehicleId, days);
  }

  async generateFuelReport(startDate: string, endDate: string) {
    await this.refuelValidator.validateDateRange(startDate, endDate);

    const [
      consumption,
      costs,
      efficiency,
      trends
    ] = await Promise.all([
      this.refuelRepository.getFuelConsumptionByPeriod(startDate, endDate),
      this.refuelRepository.getFuelCostsByPeriod(startDate, endDate),
      this.refuelRepository.getFuelEfficiencyByPeriod(startDate, endDate),
      this.refuelRepository.getFuelTrendsByPeriod(startDate, endDate)
    ]);

    return {
      period: { startDate, endDate },
      consumption,
      costs,
      efficiency,
      trends,
      generatedAt: new Date().toISOString()
    };
  }

  async getDriverRefuelStats(driverId: string) {
    return await this.refuelRepository.getDriverRefuelStats(driverId);
  }
}
