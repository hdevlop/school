import { describe, expect, it, mock } from 'bun:test';

mock.module('najm-event', () => ({
  Events: () => () => undefined,
  EventService: class {},
  On: () => () => undefined,
  events: () => ({ services: () => ({ build: () => ({}) }) }),
  getEventListeners: () => [],
  EVENTS_META: Symbol('events'),
  EVENT_CONFIG: Symbol('event_config'),
  EVENT_SERVICE: Symbol('event_service'),
}));

const { RefuelService } = await import('@server/modules/transport/refuels/RefuelService');

function createMockDeps() {
  return {
    refuelRepository: {
      getAll: mock(() => Promise.resolve([])),
      getById: mock(() => Promise.resolve(null)),
      getByVehicleId: mock(() => Promise.resolve([])),
      getByDriverId: mock(() => Promise.resolve([])),
      getByVoucherNumber: mock(() => Promise.resolve(null)),
      getByDate: mock(() => Promise.resolve([])),
      getRecentRecords: mock(() => Promise.resolve([])),
      getCount: mock(() => Promise.resolve({ count: 0 })),
      create: mock(() => Promise.resolve({ id: 'rfl_01' })),
      update: mock(() => Promise.resolve({ id: 'rfl_01' })),
      delete: mock(() => Promise.resolve({ id: 'rfl_01' })),
      deleteAll: mock(() => Promise.resolve({ deletedCount: 0, deletedRefuels: [] })),
      getFuelConsumptionAnalytics: mock(() => Promise.resolve({})),
      getFuelEfficiencyReport: mock(() => Promise.resolve([])),
      getFuelCostAnalysis: mock(() => Promise.resolve([])),
      getFuelSummary: mock(() => Promise.resolve({})),
      getVehicleFuelEfficiency: mock(() => Promise.resolve([])),
      getVehicleFuelCosts: mock(() => Promise.resolve([])),
      getMonthlyFuelTrends: mock(() => Promise.resolve([])),
      calculateFuelEfficiency: mock(() => Promise.resolve({})),
      predictFuelNeeds: mock(() => Promise.resolve({})),
      getFuelConsumptionByPeriod: mock(() => Promise.resolve([])),
      getFuelCostsByPeriod: mock(() => Promise.resolve([])),
      getFuelEfficiencyByPeriod: mock(() => Promise.resolve([])),
      getFuelTrendsByPeriod: mock(() => Promise.resolve([])),
      getDriverRefuelStats: mock(() => Promise.resolve({})),
    },
    refuelValidator: {
      checkExists: mock(() => Promise.resolve()),
      checkVoucherNumberExists: mock(() => Promise.resolve({ id: 'rfl_01' })),
      checkVoucherNumberIsUnique: mock(() => Promise.resolve(true)),
      validate: mock(() => Promise.resolve()),
      validateDate: mock(() => true),
      validateDateRange: mock(() => true),
    },
  };
}

function createService(deps = createMockDeps()) {
  const service = new RefuelService(
    deps.refuelRepository as any,
    deps.refuelValidator as any,
  );
  return { service, deps };
}

const validCreateData = {
  vehicleId: 'vhl_01',
  drivers: 'drv_01',
  datetime: '2024-09-01T10:00:00',
  liters: '50',
  costPerLiter: '12.50',
};

describe('RefuelService', () => {
  describe('getAll', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.getAll.mockImplementation(() => Promise.resolve([{ id: 'rfl_01' }]));
      const result = await service.getAll();
      expect(result).toEqual([{ id: 'rfl_01' }]);
    });
  });

  describe('getCount', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.getCount.mockImplementation(() => Promise.resolve({ count: 10 }));
      const result = await service.getCount();
      expect(result).toEqual({ count: 10 });
    });
  });

  describe('getById', () => {
    it('checks existence then delegates to repository', async () => {
      const { service, deps } = createService();
      const mockRefuel = { id: 'rfl_01', liters: '50' };
      deps.refuelRepository.getById.mockImplementation(() => Promise.resolve(mockRefuel));

      const result = await service.getById('rfl_01');
      expect(deps.refuelValidator.checkExists).toHaveBeenCalledWith('rfl_01');
      expect(result).toEqual(mockRefuel);
    });
  });

  describe('getByVehicleId', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.getByVehicleId.mockImplementation(() => Promise.resolve([{ id: 'rfl_01' }]));
      const result = await service.getByVehicleId('vhl_01');
      expect(result).toEqual([{ id: 'rfl_01' }]);
    });
  });

  describe('getByDriverId', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.getByDriverId.mockImplementation(() => Promise.resolve([{ id: 'rfl_01' }]));
      const result = await service.getByDriverId('drv_01');
      expect(result).toEqual([{ id: 'rfl_01' }]);
    });
  });

  describe('getByVoucherNumber', () => {
    it('checks voucher exists then delegates to repository', async () => {
      const { service, deps } = createService();
      const mockRefuel = { id: 'rfl_01' };
      deps.refuelRepository.getByVoucherNumber.mockImplementation(() => Promise.resolve(mockRefuel));

      const result = await service.getByVoucherNumber('VCH-001');
      expect(deps.refuelValidator.checkVoucherNumberExists).toHaveBeenCalledWith('VCH-001');
      expect(result).toEqual(mockRefuel);
    });
  });

  describe('getByDate', () => {
    it('validates date then delegates to repository', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.getByDate.mockImplementation(() => Promise.resolve([{ id: 'rfl_01' }]));

      const result = await service.getByDate('2024-09-01');
      expect(deps.refuelValidator.validateDate).toHaveBeenCalledWith('2024-09-01');
      expect(result).toEqual([{ id: 'rfl_01' }]);
    });
  });

  describe('getRecentRecords', () => {
    it('delegates to repository with default limit', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.getRecentRecords.mockImplementation(() => Promise.resolve([{ id: 'rfl_01' }]));

      const result = await service.getRecentRecords();
      expect(deps.refuelRepository.getRecentRecords).toHaveBeenCalledWith(20);
      expect(result).toEqual([{ id: 'rfl_01' }]);
    });

    it('delegates to repository with custom limit', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.getRecentRecords.mockImplementation(() => Promise.resolve([]));

      await service.getRecentRecords(5);
      expect(deps.refuelRepository.getRecentRecords).toHaveBeenCalledWith(5);
    });
  });

  describe('getTodayRecords', () => {
    it('delegates to repository with today date', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.getByDate.mockImplementation(() => Promise.resolve([{ id: 'rfl_01' }]));

      const result = await service.getTodayRecords();
      expect(deps.refuelRepository.getByDate).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('create', () => {
    it('validates and creates refuel with auto-calculated totalCost', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.create.mockImplementation((d) => Promise.resolve({ id: 'rfl_01', ...d }));

      await service.create(validCreateData);
      expect(deps.refuelValidator.validate).toHaveBeenCalledWith(validCreateData);
      expect(deps.refuelRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ totalCost: '625.00', fuelLevelAfter: '100' }),
      );
    });

    it('uses provided totalCost when available', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.create.mockImplementation((d) => Promise.resolve({ id: 'rfl_01', ...d }));

      const data = { ...validCreateData, totalCost: '700.00' };
      await service.create(data);
      expect(deps.refuelRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ totalCost: '700.00' }),
      );
    });

    it('checks voucher uniqueness when provided', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.create.mockImplementation((d) => Promise.resolve({ id: 'rfl_01', ...d }));

      const data = { ...validCreateData, voucherNumber: 'VCH-001' };
      await service.create(data);
      expect(deps.refuelValidator.checkVoucherNumberIsUnique).toHaveBeenCalledWith('VCH-001');
    });

    it('defaults fuelLevelAfter to 100', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.create.mockImplementation((d) => Promise.resolve({ id: 'rfl_01', ...d }));

      await service.create(validCreateData);
      expect(deps.refuelRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ fuelLevelAfter: '100' }),
      );
    });
  });

  describe('update', () => {
    it('validates, checks existence, and updates', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.getById.mockImplementation(() => Promise.resolve({ id: 'rfl_01', liters: '50', costPerLiter: '12.50' }));
      deps.refuelRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'rfl_01', ...d }));

      await service.update('rfl_01', { liters: '60' });
      expect(deps.refuelValidator.validate).toHaveBeenCalled();
      expect(deps.refuelValidator.checkExists).toHaveBeenCalledWith('rfl_01');
      expect(deps.refuelRepository.update).toHaveBeenCalledWith('rfl_01', expect.anything());
    });

    it('recalculates totalCost when liters or costPerLiter changes', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.getById.mockImplementation(() => Promise.resolve({ id: 'rfl_01', liters: '50', costPerLiter: '12.50' }));
      deps.refuelRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'rfl_01', ...d }));

      await service.update('rfl_01', { liters: '60' });
      expect(deps.refuelRepository.update).toHaveBeenCalledWith('rfl_01', expect.objectContaining({ totalCost: '750.00' }));
    });

    it('checks voucher uniqueness when updating voucherNumber', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.getById.mockImplementation(() => Promise.resolve({ id: 'rfl_01', liters: '50', costPerLiter: '12.50' }));
      deps.refuelRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'rfl_01', ...d }));

      await service.update('rfl_01', { voucherNumber: 'VCH-002' });
      expect(deps.refuelValidator.checkVoucherNumberIsUnique).toHaveBeenCalledWith('VCH-002', 'rfl_01');
    });
  });

  describe('delete', () => {
    it('checks existence then deletes', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.delete.mockImplementation(() => Promise.resolve({ id: 'rfl_01' }));

      await service.delete('rfl_01');
      expect(deps.refuelValidator.checkExists).toHaveBeenCalledWith('rfl_01');
      expect(deps.refuelRepository.delete).toHaveBeenCalledWith('rfl_01');
    });
  });

  describe('deleteAll', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.deleteAll.mockImplementation(() => Promise.resolve({ deletedCount: 3, deletedRefuels: [] }));

      const result = await service.deleteAll();
      expect(result.deletedCount).toBe(3);
    });
  });

  describe('seedDemoRefuels', () => {
    it('creates refuels and skips failures', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.create.mockImplementation((d) => Promise.resolve({ id: 'rfl_01', ...d }));

      const result = await service.seedDemoRefuels([validCreateData, { ...validCreateData, vehicleId: 'vhl_02' }]);
      expect(result).toHaveLength(2);
    });

    it('continues on individual failures', async () => {
      const { service, deps } = createService();
      let callCount = 0;
      deps.refuelRepository.create.mockImplementation(() => {
        callCount++;
        if (callCount === 1) throw new Error('DB error');
        return Promise.resolve({ id: 'rfl_02' });
      });

      const result = await service.seedDemoRefuels([validCreateData, validCreateData]);
      expect(result).toHaveLength(1);
    });
  });

  describe('analytics methods', () => {
    it('getFuelConsumptionAnalytics delegates to repository', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.getFuelConsumptionAnalytics.mockImplementation(() => Promise.resolve({ data: 'analytics' }));

      const result = await service.getFuelConsumptionAnalytics();
      expect(result).toEqual({ data: 'analytics' });
    });

    it('getFuelEfficiencyReport delegates to repository', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.getFuelEfficiencyReport.mockImplementation(() => Promise.resolve([{ vehicleId: 'vhl_01' }]));

      const result = await service.getFuelEfficiencyReport();
      expect(result).toEqual([{ vehicleId: 'vhl_01' }]);
    });

    it('getFuelCostAnalysis delegates to repository', async () => {
      const { service, deps } = createService();
      const result = await service.getFuelCostAnalysis();
      expect(deps.refuelRepository.getFuelCostAnalysis).toHaveBeenCalled();
    });

    it('getFuelSummary delegates to repository', async () => {
      const { service, deps } = createService();
      const result = await service.getFuelSummary();
      expect(deps.refuelRepository.getFuelSummary).toHaveBeenCalled();
    });

    it('getMonthlyFuelTrends delegates to repository', async () => {
      const { service, deps } = createService();
      const result = await service.getMonthlyFuelTrends();
      expect(deps.refuelRepository.getMonthlyFuelTrends).toHaveBeenCalled();
    });

    it('getDriverRefuelStats delegates to repository', async () => {
      const { service, deps } = createService();
      const result = await service.getDriverRefuelStats('drv_01');
      expect(deps.refuelRepository.getDriverRefuelStats).toHaveBeenCalledWith('drv_01');
    });
  });

  describe('predictFuelNeeds', () => {
    it('delegates to repository for valid days', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.predictFuelNeeds.mockImplementation(() => Promise.resolve({ predictedFuelNeeded: 500 }));

      const result = await service.predictFuelNeeds('vhl_01', 30);
      expect(deps.refuelRepository.predictFuelNeeds).toHaveBeenCalledWith('vhl_01', 30);
    });

    it('throws for days below 1', async () => {
      const { service } = createService();
      try {
        await service.predictFuelNeeds('vhl_01', 0);
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('1 and 365');
      }
    });

    it('throws for days above 365', async () => {
      const { service } = createService();
      try {
        await service.predictFuelNeeds('vhl_01', 366);
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('1 and 365');
      }
    });
  });

  describe('generateFuelReport', () => {
    it('validates date range and fetches all report data', async () => {
      const { service, deps } = createService();

      const result = await service.generateFuelReport('2024-01-01', '2024-12-31');
      expect(deps.refuelValidator.validateDateRange).toHaveBeenCalledWith('2024-01-01', '2024-12-31');
      expect(deps.refuelRepository.getFuelConsumptionByPeriod).toHaveBeenCalledWith('2024-01-01', '2024-12-31');
      expect(deps.refuelRepository.getFuelCostsByPeriod).toHaveBeenCalledWith('2024-01-01', '2024-12-31');
      expect(deps.refuelRepository.getFuelEfficiencyByPeriod).toHaveBeenCalledWith('2024-01-01', '2024-12-31');
      expect(deps.refuelRepository.getFuelTrendsByPeriod).toHaveBeenCalledWith('2024-01-01', '2024-12-31');
      expect(result.period).toEqual({ startDate: '2024-01-01', endDate: '2024-12-31' });
      expect(result.generatedAt).toBeDefined();
    });
  });

  describe('calculateFuelEfficiency', () => {
    it('validates date range and delegates', async () => {
      const { service, deps } = createService();
      deps.refuelRepository.calculateFuelEfficiency.mockImplementation(() => Promise.resolve({ fuelEfficiency: 8.5 }));

      const result = await service.calculateFuelEfficiency('vhl_01', '2024-01-01', '2024-12-31');
      expect(deps.refuelValidator.validateDateRange).toHaveBeenCalledWith('2024-01-01', '2024-12-31');
      expect(deps.refuelRepository.calculateFuelEfficiency).toHaveBeenCalledWith('vhl_01', '2024-01-01', '2024-12-31');
    });
  });
});
