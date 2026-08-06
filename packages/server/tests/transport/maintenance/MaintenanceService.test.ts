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

const { MaintenanceService } = await import('@server/modules/transport/maintenance/MaintenanceService');

function createMockDeps() {
  return {
    maintenanceRepository: {
      getAll: mock(() => Promise.resolve([])),
      getById: mock(() => Promise.resolve(null)),
      getByVehicleId: mock(() => Promise.resolve([])),
      getByStatus: mock(() => Promise.resolve([])),
      getByType: mock(() => Promise.resolve([])),
      getByPriority: mock(() => Promise.resolve([])),
      getByAssignedTo: mock(() => Promise.resolve([])),
      getScheduledMaintenances: mock(() => Promise.resolve([])),
      getOverdueMaintenances: mock(() => Promise.resolve([])),
      getUpcomingMaintenances: mock(() => Promise.resolve([])),
      getCount: mock(() => Promise.resolve({ count: 0 })),
      getStatusCounts: mock(() => Promise.resolve([])),
      getPriorityCounts: mock(() => Promise.resolve([])),
      getTypeCounts: mock(() => Promise.resolve([])),
      getMaintenanceCostAnalytics: mock(() => Promise.resolve({ totalCost: 0, avgCost: 0 })),
      create: mock(() => Promise.resolve({ id: 'mnt_01' })),
      update: mock(() => Promise.resolve({ id: 'mnt_01' })),
      delete: mock(() => Promise.resolve({ id: 'mnt_01' })),
      deleteAll: mock(() => Promise.resolve({ deletedCount: 0, deletedMaintenances: [] })),
      markAsCompleted: mock(() => Promise.resolve({ id: 'mnt_01', status: 'completed' })),
      markAsOverdue: mock(() => Promise.resolve([])),
    },
    maintenanceValidator: {
      checkMaintenanceExists: mock(() => Promise.resolve({ id: 'mnt_01', vehicleId: 'vhl_01', status: 'scheduled', type: 'oilChange', dueHours: '5000' })),
      checkVehicleExists: mock(() => Promise.resolve({ id: 'vhl_01' })),
      validateCreateMaintenance: mock(() => Promise.resolve()),
      validateMaintenanceType: mock(() => true),
      validateMaintenanceStatus: mock(() => true),
      validateMaintenancePriority: mock(() => true),
      validateDueHours: mock(() => true),
      validateCost: mock(() => true),
      validateScheduledDate: mock(() => true),
      validateDueHoursAgainstVehicle: mock(() => Promise.resolve(true)),
      checkNoDuplicateMaintenance: mock(() => Promise.resolve(true)),
      checkMaintenanceCanBeModified: mock(() => Promise.resolve({ id: 'mnt_01', vehicleId: 'vhl_01', status: 'scheduled', type: 'oilChange', dueHours: '5000' })),
      checkMaintenanceCanBeDeleted: mock(() => Promise.resolve({ id: 'mnt_01', status: 'scheduled' })),
      checkMaintenanceCanBeCompleted: mock(() => Promise.resolve({ id: 'mnt_01', status: 'scheduled' })),
    },
  };
}

function createService(deps = createMockDeps()) {
  const service = new MaintenanceService(
    deps.maintenanceRepository as any,
    deps.maintenanceValidator as any,
  );
  return { service, deps };
}

const validCreateData = {
  vehicleId: 'vhl_01',
  type: 'oilChange',
  title: 'Oil Change',
  dueHours: 5000,
};

describe('MaintenanceService', () => {
  describe('getAll', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getAll.mockImplementation(() => Promise.resolve([{ id: 'mnt_01' }]));
      const result = await service.getAll();
      expect(result).toEqual([{ id: 'mnt_01' }]);
    });
  });

  describe('getById', () => {
    it('delegates to validator checkMaintenanceExists', async () => {
      const { service, deps } = createService();
      const mockMaintenance = { id: 'mnt_01', title: 'Oil Change' };
      deps.maintenanceValidator.checkMaintenanceExists.mockImplementation(() => Promise.resolve(mockMaintenance));

      const result = await service.getById('mnt_01');
      expect(result).toEqual(mockMaintenance);
    });
  });

  describe('getByVehicleId', () => {
    it('checks vehicle exists then delegates to repository', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getByVehicleId.mockImplementation(() => Promise.resolve([{ id: 'mnt_01' }]));

      const result = await service.getByVehicleId('vhl_01');
      expect(deps.maintenanceValidator.checkVehicleExists).toHaveBeenCalledWith('vhl_01');
      expect(result).toEqual([{ id: 'mnt_01' }]);
    });
  });

  describe('getByStatus', () => {
    it('validates status then delegates', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getByStatus.mockImplementation(() => Promise.resolve([{ id: 'mnt_01' }]));

      const result = await service.getByStatus('scheduled');
      expect(deps.maintenanceValidator.validateMaintenanceStatus).toHaveBeenCalledWith('scheduled');
      expect(result).toEqual([{ id: 'mnt_01' }]);
    });
  });

  describe('getByType', () => {
    it('validates type then delegates', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getByType.mockImplementation(() => Promise.resolve([{ id: 'mnt_01' }]));

      const result = await service.getByType('oilChange');
      expect(deps.maintenanceValidator.validateMaintenanceType).toHaveBeenCalledWith('oilChange');
      expect(result).toEqual([{ id: 'mnt_01' }]);
    });
  });

  describe('getByPriority', () => {
    it('validates priority then delegates', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getByPriority.mockImplementation(() => Promise.resolve([{ id: 'mnt_01' }]));

      const result = await service.getByPriority('high');
      expect(deps.maintenanceValidator.validateMaintenancePriority).toHaveBeenCalledWith('high');
      expect(result).toEqual([{ id: 'mnt_01' }]);
    });
  });

  describe('getByAssignedTo', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getByAssignedTo.mockImplementation(() => Promise.resolve([{ id: 'mnt_01' }]));

      const result = await service.getByAssignedTo('mech_01');
      expect(result).toEqual([{ id: 'mnt_01' }]);
    });

    it('throws for invalid assignedTo', async () => {
      const { service } = createService();
      try {
        await service.getByAssignedTo('');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });
  });

  describe('getScheduledMaintenances', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getScheduledMaintenances.mockImplementation(() => Promise.resolve([{ id: 'mnt_01' }]));

      const result = await service.getScheduledMaintenances();
      expect(result).toEqual([{ id: 'mnt_01' }]);
    });
  });

  describe('getOverdueMaintenances', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getOverdueMaintenances.mockImplementation(() => Promise.resolve([{ id: 'mnt_01' }]));

      const result = await service.getOverdueMaintenances();
      expect(result).toEqual([{ id: 'mnt_01' }]);
    });
  });

  describe('getUpcomingMaintenances', () => {
    it('delegates to repository with default hours', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getUpcomingMaintenances.mockImplementation(() => Promise.resolve([{ id: 'mnt_01' }]));

      const result = await service.getUpcomingMaintenances();
      expect(deps.maintenanceRepository.getUpcomingMaintenances).toHaveBeenCalledWith(50);
    });

    it('delegates to repository with custom hours', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getUpcomingMaintenances.mockImplementation(() => Promise.resolve([]));

      await service.getUpcomingMaintenances(100);
      expect(deps.maintenanceRepository.getUpcomingMaintenances).toHaveBeenCalledWith(100);
    });
  });

  describe('getCount', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getCount.mockImplementation(() => Promise.resolve({ count: 5 }));

      const result = await service.getCount();
      expect(result).toEqual({ count: 5 });
    });
  });

  describe('getMaintenanceAnalytics', () => {
    it('aggregates all analytics', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getCount.mockImplementation(() => Promise.resolve({ count: 10 }));
      deps.maintenanceRepository.getStatusCounts.mockImplementation(() => Promise.resolve([{ status: 'scheduled', count: 5 }]));
      deps.maintenanceRepository.getPriorityCounts.mockImplementation(() => Promise.resolve([{ priority: 'high', count: 3 }]));
      deps.maintenanceRepository.getTypeCounts.mockImplementation(() => Promise.resolve([{ type: 'oilChange', count: 4 }]));
      deps.maintenanceRepository.getMaintenanceCostAnalytics.mockImplementation(() => Promise.resolve({ totalCost: 5000 }));

      const result = await service.getMaintenanceAnalytics();
      expect(result.total).toBe(10);
      expect(result.statusDistribution).toEqual([{ status: 'scheduled', count: 5 }]);
      expect(result.priorityDistribution).toEqual([{ priority: 'high', count: 3 }]);
      expect(result.typeDistribution).toEqual([{ type: 'oilChange', count: 4 }]);
      expect(result.costAnalytics).toEqual({ totalCost: 5000 });
    });
  });

  describe('create', () => {
    it('creates a maintenance with full validation chain', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.create.mockImplementation((d) => Promise.resolve({ id: 'mnt_01', ...d }));
      deps.maintenanceValidator.checkMaintenanceExists.mockImplementation(() => Promise.resolve({ id: 'mnt_01', title: 'Oil Change' }));

      await service.create(validCreateData);

      expect(deps.maintenanceValidator.checkVehicleExists).toHaveBeenCalledWith('vhl_01');
      expect(deps.maintenanceValidator.validateCreateMaintenance).toHaveBeenCalledWith(validCreateData);
      expect(deps.maintenanceValidator.validateMaintenanceType).toHaveBeenCalledWith('oilChange');
      expect(deps.maintenanceValidator.validateDueHours).toHaveBeenCalledWith(5000);
      expect(deps.maintenanceValidator.checkNoDuplicateMaintenance).toHaveBeenCalledWith('vhl_01', 'oilChange', 5000);
      expect(deps.maintenanceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ vehicleId: 'vhl_01', type: 'oilChange', status: 'scheduled' }),
      );
    });

    it('validates cost when provided', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.create.mockImplementation((d) => Promise.resolve({ id: 'mnt_01', ...d }));
      deps.maintenanceValidator.checkMaintenanceExists.mockImplementation(() => Promise.resolve({ id: 'mnt_01' }));

      await service.create({ ...validCreateData, cost: 500 });
      expect(deps.maintenanceValidator.validateCost).toHaveBeenCalledWith(500);
    });

    it('validates priority when provided', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.create.mockImplementation((d) => Promise.resolve({ id: 'mnt_01', ...d }));
      deps.maintenanceValidator.checkMaintenanceExists.mockImplementation(() => Promise.resolve({ id: 'mnt_01' }));

      await service.create({ ...validCreateData, priority: 'high' });
      expect(deps.maintenanceValidator.validateMaintenancePriority).toHaveBeenCalledWith('high');
    });

    it('validates scheduledDate when provided', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.create.mockImplementation((d) => Promise.resolve({ id: 'mnt_01', ...d }));
      deps.maintenanceValidator.checkMaintenanceExists.mockImplementation(() => Promise.resolve({ id: 'mnt_01' }));

      await service.create({ ...validCreateData, scheduledDate: '2025-06-01' });
      expect(deps.maintenanceValidator.validateScheduledDate).toHaveBeenCalledWith('2025-06-01');
    });
  });

  describe('update', () => {
    it('validates and updates maintenance', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.update.mockImplementation(() => Promise.resolve({ id: 'mnt_01' }));
      deps.maintenanceValidator.checkMaintenanceExists.mockImplementation(() => Promise.resolve({ id: 'mnt_01', title: 'Updated' }));

      await service.update('mnt_01', { title: 'Updated' });
      expect(deps.maintenanceValidator.checkMaintenanceCanBeModified).toHaveBeenCalledWith('mnt_01');
      expect(deps.maintenanceRepository.update).toHaveBeenCalledWith('mnt_01', expect.anything());
    });

    it('sets completedAt when status is completed', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.update.mockImplementation(() => Promise.resolve({ id: 'mnt_01' }));
      deps.maintenanceValidator.checkMaintenanceExists.mockImplementation(() => Promise.resolve({ id: 'mnt_01' }));

      await service.update('mnt_01', { status: 'completed' });
      expect(deps.maintenanceRepository.update).toHaveBeenCalledWith('mnt_01',
        expect.objectContaining({ status: 'completed', completedAt: expect.any(String) }),
      );
    });

    it('validates type when updating type', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.update.mockImplementation(() => Promise.resolve({ id: 'mnt_01' }));
      deps.maintenanceValidator.checkMaintenanceExists.mockImplementation(() => Promise.resolve({ id: 'mnt_01' }));

      await service.update('mnt_01', { type: 'repair' });
      expect(deps.maintenanceValidator.validateMaintenanceType).toHaveBeenCalledWith('repair');
    });

    it('checks for duplicates when type or dueHours changes', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.update.mockImplementation(() => Promise.resolve({ id: 'mnt_01' }));
      deps.maintenanceValidator.checkMaintenanceExists.mockImplementation(() => Promise.resolve({ id: 'mnt_01' }));

      await service.update('mnt_01', { type: 'repair' });
      expect(deps.maintenanceValidator.checkNoDuplicateMaintenance).toHaveBeenCalled();
    });

    it('skips update when no fields changed', async () => {
      const { service, deps } = createService();
      deps.maintenanceValidator.checkMaintenanceExists.mockImplementation(() => Promise.resolve({ id: 'mnt_01' }));

      await service.update('mnt_01', {});
      expect(deps.maintenanceRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('checks existence, validates status, and updates', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.update.mockImplementation(() => Promise.resolve({ id: 'mnt_01', status: 'inProgress' }));

      const result = await service.updateStatus('mnt_01', 'inProgress');
      expect(deps.maintenanceValidator.checkMaintenanceExists).toHaveBeenCalledWith('mnt_01');
      expect(deps.maintenanceValidator.validateMaintenanceStatus).toHaveBeenCalledWith('inProgress');
      expect(deps.maintenanceRepository.update).toHaveBeenCalledWith('mnt_01', { status: 'inProgress' });
    });

    it('sets completedAt when status is completed', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.update.mockImplementation(() => Promise.resolve({ id: 'mnt_01' }));

      await service.updateStatus('mnt_01', 'completed');
      expect(deps.maintenanceRepository.update).toHaveBeenCalledWith('mnt_01',
        expect.objectContaining({ completedAt: expect.any(String) }),
      );
    });
  });

  describe('markAsCompleted', () => {
    it('validates and marks as completed', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.markAsCompleted.mockImplementation(() => Promise.resolve({ id: 'mnt_01', status: 'completed' }));

      const result = await service.markAsCompleted('mnt_01');
      expect(deps.maintenanceValidator.checkMaintenanceCanBeCompleted).toHaveBeenCalledWith('mnt_01');
      expect(deps.maintenanceRepository.markAsCompleted).toHaveBeenCalledWith('mnt_01');
    });
  });

  describe('delete', () => {
    it('validates and deletes', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.delete.mockImplementation(() => Promise.resolve({ id: 'mnt_01' }));

      await service.delete('mnt_01');
      expect(deps.maintenanceValidator.checkMaintenanceCanBeDeleted).toHaveBeenCalledWith('mnt_01');
      expect(deps.maintenanceRepository.delete).toHaveBeenCalledWith('mnt_01');
    });
  });

  describe('deleteAll', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.deleteAll.mockImplementation(() => Promise.resolve({ deletedCount: 3, deletedMaintenances: [] }));

      const result = await service.deleteAll();
      expect(result.deletedCount).toBe(3);
    });
  });

  describe('markOverdueMaintenances', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.markAsOverdue.mockImplementation(() => Promise.resolve([{ id: 'mnt_01' }]));

      const result = await service.markOverdueMaintenances();
      expect(deps.maintenanceRepository.markAsOverdue).toHaveBeenCalled();
    });
  });

  describe('checkMaintenanceAlerts', () => {
    it('returns overdue and upcoming counts', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getOverdueMaintenances.mockImplementation(() => Promise.resolve([{ id: 'mnt_01' }]));
      deps.maintenanceRepository.getUpcomingMaintenances.mockImplementation(() => Promise.resolve([{ id: 'mnt_02' }]));

      const result = await service.checkMaintenanceAlerts();
      expect(result.overdue).toBe(1);
      expect(result.upcoming).toBe(1);
      expect(result.overdueList).toHaveLength(1);
      expect(result.upcomingList).toHaveLength(1);
    });
  });

  describe('checkOverdueMaintenanceAlert', () => {
    it('returns alert when maintenance is overdue', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getByVehicleId.mockImplementation(() => Promise.resolve([
        { id: 'mnt_01', status: 'scheduled', dueHours: '100', title: 'Oil Change' },
      ]));
      deps.maintenanceRepository.update.mockImplementation(() => Promise.resolve({ id: 'mnt_01' }));

      const result = await service.checkOverdueMaintenanceAlert('vhl_01', 150);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('maintenance');
      expect(result!.priority).toBe('medium');
    });

    it('returns critical priority when overdue > 100 hours', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getByVehicleId.mockImplementation(() => Promise.resolve([
        { id: 'mnt_01', status: 'scheduled', dueHours: '100', title: 'Oil Change' },
      ]));
      deps.maintenanceRepository.update.mockImplementation(() => Promise.resolve({ id: 'mnt_01' }));

      const result = await service.checkOverdueMaintenanceAlert('vhl_01', 250);
      expect(result!.priority).toBe('critical');
    });

    it('returns null when no overdue maintenance', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getByVehicleId.mockImplementation(() => Promise.resolve([
        { id: 'mnt_01', status: 'scheduled', dueHours: '5000', title: 'Oil Change' },
      ]));

      const result = await service.checkOverdueMaintenanceAlert('vhl_01', 100);
      expect(result).toBeNull();
    });
  });

  describe('checkDueSoonMaintenanceAlert', () => {
    it('returns alert when maintenance due within 20 hours', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getByVehicleId.mockImplementation(() => Promise.resolve([
        { id: 'mnt_01', status: 'scheduled', dueHours: '110', title: 'Oil Change' },
      ]));

      const result = await service.checkDueSoonMaintenanceAlert('vhl_01', 100);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('maintenance');
      expect(result!.priority).toBe('medium');
    });

    it('returns null when no maintenance due soon', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getByVehicleId.mockImplementation(() => Promise.resolve([
        { id: 'mnt_01', status: 'scheduled', dueHours: '5000', title: 'Oil Change' },
      ]));

      const result = await service.checkDueSoonMaintenanceAlert('vhl_01', 100);
      expect(result).toBeNull();
    });
  });

  describe('checkVehicleMaintenanceAlerts', () => {
    it('returns overdue alert first', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getByVehicleId.mockImplementation(() => Promise.resolve([
        { id: 'mnt_01', status: 'scheduled', dueHours: '100', title: 'Oil Change' },
      ]));
      deps.maintenanceRepository.update.mockImplementation(() => Promise.resolve({ id: 'mnt_01' }));

      const result = await service.checkVehicleMaintenanceAlerts('vhl_01', 150);
      expect(result).not.toBeNull();
      expect(result!.title).toContain('Overdue');
    });

    it('returns due soon alert when no overdue', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.getByVehicleId.mockImplementation(() => Promise.resolve([
        { id: 'mnt_01', status: 'scheduled', dueHours: '110', title: 'Oil Change' },
      ]));

      const result = await service.checkVehicleMaintenanceAlerts('vhl_01', 100);
      expect(result).not.toBeNull();
      expect(result!.title).toContain('Due Soon');
    });
  });

  describe('seedDemoMaintenances', () => {
    it('creates maintenances and skips failures', async () => {
      const { service, deps } = createService();
      deps.maintenanceRepository.create.mockImplementation((d) => Promise.resolve({ id: 'mnt_01', ...d }));
      deps.maintenanceValidator.checkMaintenanceExists.mockImplementation(() => Promise.resolve({ id: 'mnt_01' }));

      const result = await service.seedDemoMaintenances([validCreateData]);
      expect(result).toHaveLength(1);
    });

    it('continues on individual failures', async () => {
      const { service, deps } = createService();
      let callCount = 0;
      deps.maintenanceRepository.create.mockImplementation(() => {
        callCount++;
        if (callCount === 1) throw new Error('DB error');
        return Promise.resolve({ id: 'mnt_02' });
      });
      deps.maintenanceValidator.checkMaintenanceExists.mockImplementation(() => Promise.resolve({ id: 'mnt_02' }));

      const result = await service.seedDemoMaintenances([validCreateData, validCreateData]);
      expect(result).toHaveLength(1);
    });
  });
});
