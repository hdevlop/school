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

const { VehicleService } = await import('@server/modules/transport/vehicles/VehicleService');

function createMockDeps() {
  return {
    vehicleRepository: {
      getAll: mock(() => Promise.resolve([])),
      getById: mock(() => Promise.resolve(null)),
      getByLicensePlate: mock(() => Promise.resolve(null)),
      getCount: mock(() => Promise.resolve({ count: 0 })),
      create: mock(() => Promise.resolve({ id: 'vhl_01' })),
      update: mock(() => Promise.resolve({ id: 'vhl_01' })),
      delete: mock(() => Promise.resolve({ id: 'vhl_01' })),
      deleteAll: mock(() => Promise.resolve({ deletedCount: 0, deletedVehicles: [] })),
    },
    vehicleValidator: {
      checkVehicleExists: mock(() => Promise.resolve()),
      validate: mock(() => Promise.resolve()),
    },
    vehicleAssignmentService: {
      processDriver: mock(() => Promise.resolve([])),
    },
  };
}

function createService(deps = createMockDeps()) {
  const service = new VehicleService(
    deps.vehicleRepository as any,
    deps.vehicleValidator as any,
    deps.vehicleAssignmentService as any,
  );
  return { service, deps };
}

const validCreateData = {
  id: 'vhl_01',
  name: 'School Bus 1',
  brand: 'Mercedes',
  model: 'Sprinter',
  year: 2024,
  type: 'fullbus',
  capacity: 50,
  licensePlate: 'MA-1234-A',
  status: 'active',
  fuelType: 'diesel',
};

describe('VehicleService', () => {
  describe('getAll', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.vehicleRepository.getAll.mockImplementation(() => Promise.resolve([{ id: 'vhl_01' }]));
      const result = await service.getAll();
      expect(result).toEqual([{ id: 'vhl_01' }]);
    });
  });

  describe('getById', () => {
    it('checks existence then delegates to repository', async () => {
      const { service, deps } = createService();
      const mockVehicle = { id: 'vhl_01', name: 'Bus 1' };
      deps.vehicleRepository.getById.mockImplementation(() => Promise.resolve(mockVehicle));
      const result = await service.getById('vhl_01');
      expect(deps.vehicleValidator.checkVehicleExists).toHaveBeenCalledWith('vhl_01');
      expect(result).toEqual(mockVehicle);
    });
  });

  describe('getCount', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.vehicleRepository.getCount.mockImplementation(() => Promise.resolve({ count: 5 }));
      const result = await service.getCount();
      expect(result).toEqual({ count: 5 });
    });
  });

  describe('create', () => {
    it('creates a vehicle and delegates to repository', async () => {
      const { service, deps } = createService();
      deps.vehicleRepository.create.mockImplementation((d) => Promise.resolve({ ...d, id: 'vhl_01' }));

      await service.create(validCreateData);

      expect(deps.vehicleValidator.validate).toHaveBeenCalledWith(validCreateData);
      expect(deps.vehicleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'fullbus', name: 'School Bus 1', licensePlate: 'MA-1234-A' }),
      );
    });

    it('processes driver assignment when driverId provided', async () => {
      const { service, deps } = createService();
      deps.vehicleRepository.create.mockImplementation((d) => Promise.resolve({ ...d, id: 'vhl_01' }));

      const data = { ...validCreateData, driverId: 'drv_01', assignmentDate: '2024-09-01', assignedBy: 'admin' };
      await service.create(data);

      expect(deps.vehicleAssignmentService.processDriver).toHaveBeenCalledWith(
        'vhl_01', 'drv_01', '2024-09-01', 'admin',
      );
    });

    it('processes driver assignment when drivers array provided', async () => {
      const { service, deps } = createService();
      deps.vehicleRepository.create.mockImplementation((d) => Promise.resolve({ ...d, id: 'vhl_01' }));

      const data = { ...validCreateData, drivers: ['drv_01', 'drv_02'], assignmentDate: '2024-09-01' };
      await service.create(data);

      expect(deps.vehicleAssignmentService.processDriver).toHaveBeenCalledWith(
        'vhl_01', ['drv_01', 'drv_02'], '2024-09-01', undefined,
      );
    });

    it('skips driver assignment when no driver provided', async () => {
      const { service, deps } = createService();
      deps.vehicleRepository.create.mockImplementation((d) => Promise.resolve({ ...d, id: 'vhl_01' }));

      await service.create(validCreateData);
      expect(deps.vehicleAssignmentService.processDriver).not.toHaveBeenCalled();
    });

    it('defaults status to active and fuelType to diesel when omitted', async () => {
      const { service, deps } = createService();
      deps.vehicleRepository.create.mockImplementation((d) => Promise.resolve({ ...d, id: 'vhl_01' }));

      const data = { ...validCreateData, status: undefined, fuelType: undefined };
      await service.create(data);

      expect(deps.vehicleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active', fuelType: 'diesel' }),
      );
    });
  });

  describe('update', () => {
    it('validates and updates vehicle', async () => {
      const { service, deps } = createService();
      deps.vehicleRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'vhl_01', ...d }));

      await service.update('vhl_01', { name: 'Updated Bus' });

      expect(deps.vehicleValidator.validate).toHaveBeenCalledWith({ name: 'Updated Bus' }, 'vhl_01');
      expect(deps.vehicleRepository.update).toHaveBeenCalledWith('vhl_01', { name: 'Updated Bus' });
    });
  });

  describe('delete', () => {
    it('checks existence then deletes', async () => {
      const { service, deps } = createService();
      deps.vehicleRepository.delete.mockImplementation(() => Promise.resolve({ id: 'vhl_01' }));

      await service.delete('vhl_01');
      expect(deps.vehicleValidator.checkVehicleExists).toHaveBeenCalledWith('vhl_01');
      expect(deps.vehicleRepository.delete).toHaveBeenCalledWith('vhl_01');
    });
  });

  describe('deleteAll', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.vehicleRepository.deleteAll.mockImplementation(() => Promise.resolve({ deletedCount: 3, deletedVehicles: [] }));

      const result = await service.deleteAll();
      expect(result.deletedCount).toBe(3);
    });
  });

  describe('createBulk', () => {
    it('creates multiple vehicles successfully', async () => {
      const { service, deps } = createService();
      deps.vehicleRepository.create.mockImplementation((d) => Promise.resolve({ ...d, id: 'vhl_01' }));

      const result = await service.createBulk([validCreateData, { ...validCreateData, id: 'vhl_02', licensePlate: 'MA-5678-B' }]);
      expect(result).toHaveLength(2);
    });

    it('wraps individual errors with context using licensePlate', async () => {
      const { service, deps } = createService();
      deps.vehicleValidator.validate.mockImplementation(() => {
        throw new Error('Validation failed');
      });

      try {
        await service.createBulk([validCreateData]);
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('MA-1234-A');
        expect(error.message).toContain('Validation failed');
      }
    });

    it('uses index as last resort identifier', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, licensePlate: undefined, id: undefined, name: undefined };
      deps.vehicleValidator.validate.mockImplementation(() => {
        throw new Error('fail');
      });

      try {
        await service.createBulk([data]);
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('at index 0');
      }
    });

    it('returns empty array for empty input', async () => {
      const { service, deps } = createService();
      const result = await service.createBulk([]);
      expect(result).toEqual([]);
    });
  });
});
