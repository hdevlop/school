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

const { VehicleAssignmentService } = await import('@server/modules/transport/vehicleAssignments/VehicleAssignmentService');

function createMockDeps() {
  return {
    vehicleAssignmentRepository: {
      getAll: mock(() => Promise.resolve([])),
      getById: mock(() => Promise.resolve(null)),
      getByVehicleId: mock(() => Promise.resolve([])),
      getByDriverId: mock(() => Promise.resolve([])),
      getActiveAssignmentByVehicle: mock(() => Promise.resolve(null)),
      getActiveAssignmentByDriver: mock(() => Promise.resolve(null)),
      getCount: mock(() => Promise.resolve({ count: 0 })),
      create: mock(() => Promise.resolve({ id: 'asg_01' })),
      update: mock(() => Promise.resolve({ id: 'asg_01' })),
      delete: mock(() => Promise.resolve({ id: 'asg_01' })),
      deleteAll: mock(() => Promise.resolve({ deletedCount: 0, deletedAssignments: [] })),
    },
    vehicleAssignmentValidator: {
      checkAssignmentExists: mock(() => Promise.resolve({ id: 'asg_01', status: 'active' })),
      validate: mock(() => Promise.resolve()),
      validateUnassignment: mock(() => Promise.resolve()),
    },
  };
}

function createService(deps = createMockDeps()) {
  const service = new VehicleAssignmentService(
    deps.vehicleAssignmentRepository as any,
    deps.vehicleAssignmentValidator as any,
  );
  return { service, deps };
}

describe('VehicleAssignmentService', () => {
  describe('getAll', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.vehicleAssignmentRepository.getAll.mockImplementation(() => Promise.resolve([{ id: 'asg_01' }]));
      const result = await service.getAll();
      expect(result).toEqual([{ id: 'asg_01' }]);
    });
  });

  describe('getById', () => {
    it('checks existence then delegates to repository', async () => {
      const { service, deps } = createService();
      const mockAssignment = { id: 'asg_01', vehicleId: 'vhl_01', driverId: 'drv_01' };
      deps.vehicleAssignmentRepository.getById.mockImplementation(() => Promise.resolve(mockAssignment));

      const result = await service.getById('asg_01');
      expect(deps.vehicleAssignmentValidator.checkAssignmentExists).toHaveBeenCalledWith('asg_01');
      expect(result).toEqual(mockAssignment);
    });
  });

  describe('getByVehicleId', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.vehicleAssignmentRepository.getByVehicleId.mockImplementation(() => Promise.resolve([{ id: 'asg_01' }]));
      const result = await service.getByVehicleId('vhl_01');
      expect(result).toEqual([{ id: 'asg_01' }]);
    });
  });

  describe('getByDriverId', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.vehicleAssignmentRepository.getByDriverId.mockImplementation(() => Promise.resolve([{ id: 'asg_01' }]));
      const result = await service.getByDriverId('drv_01');
      expect(result).toEqual([{ id: 'asg_01' }]);
    });
  });

  describe('getCount', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.vehicleAssignmentRepository.getCount.mockImplementation(() => Promise.resolve({ count: 5 }));
      const result = await service.getCount();
      expect(result).toEqual({ count: 5 });
    });
  });

  describe('create', () => {
    it('validates and creates assignment', async () => {
      const { service, deps } = createService();
      deps.vehicleAssignmentRepository.create.mockImplementation((d) => Promise.resolve({ id: 'asg_01', ...d }));

      const data = {
        vehicleId: 'vhl_01',
        driverId: 'drv_01',
        assignmentDate: '2024-09-01',
      };

      await service.create(data);
      expect(deps.vehicleAssignmentValidator.validate).toHaveBeenCalledWith(data);
      expect(deps.vehicleAssignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ vehicleId: 'vhl_01', driverId: 'drv_01', status: 'active' }),
      );
    });

    it('defaults status to active when omitted', async () => {
      const { service, deps } = createService();
      deps.vehicleAssignmentRepository.create.mockImplementation((d) => Promise.resolve({ id: 'asg_01', ...d }));

      await service.create({ vehicleId: 'vhl_01', driverId: 'drv_01', assignmentDate: '2024-09-01' });
      expect(deps.vehicleAssignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' }),
      );
    });
  });

  describe('update', () => {
    it('validates and updates assignment', async () => {
      const { service, deps } = createService();
      deps.vehicleAssignmentRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'asg_01', ...d }));

      await service.update('asg_01', { notes: 'Updated' });
      expect(deps.vehicleAssignmentValidator.validate).toHaveBeenCalledWith({ notes: 'Updated' }, 'asg_01');
      expect(deps.vehicleAssignmentRepository.update).toHaveBeenCalledWith('asg_01', { notes: 'Updated' });
    });
  });

  describe('unassign', () => {
    it('validates unassignment and sets status to completed', async () => {
      const { service, deps } = createService();
      deps.vehicleAssignmentRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'asg_01', ...d }));

      await service.unassign('asg_01', '2024-12-31');
      expect(deps.vehicleAssignmentValidator.validateUnassignment).toHaveBeenCalledWith('asg_01');
      expect(deps.vehicleAssignmentRepository.update).toHaveBeenCalledWith('asg_01', {
        status: 'completed',
        unassignmentDate: '2024-12-31',
      });
    });

    it('uses current date when unassignmentDate not provided', async () => {
      const { service, deps } = createService();
      deps.vehicleAssignmentRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'asg_01', ...d }));

      await service.unassign('asg_01');
      expect(deps.vehicleAssignmentRepository.update).toHaveBeenCalledWith('asg_01', {
        status: 'completed',
        unassignmentDate: expect.any(String),
      });
    });
  });

  describe('delete', () => {
    it('checks existence then deletes', async () => {
      const { service, deps } = createService();
      deps.vehicleAssignmentRepository.delete.mockImplementation(() => Promise.resolve({ id: 'asg_01' }));

      await service.delete('asg_01');
      expect(deps.vehicleAssignmentValidator.checkAssignmentExists).toHaveBeenCalledWith('asg_01');
      expect(deps.vehicleAssignmentRepository.delete).toHaveBeenCalledWith('asg_01');
    });
  });

  describe('deleteAll', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.vehicleAssignmentRepository.deleteAll.mockImplementation(() => Promise.resolve({ deletedCount: 2, deletedAssignments: [] }));

      const result = await service.deleteAll();
      expect(result.deletedCount).toBe(2);
    });
  });

  describe('assignDriver', () => {
    it('updates existing active assignment', async () => {
      const { service, deps } = createService();
      const existingAssignment = { id: 'asg_01', driverId: 'drv_old', assignmentDate: '2024-01-01' };
      deps.vehicleAssignmentRepository.getActiveAssignmentByVehicle.mockImplementation(() => Promise.resolve(existingAssignment));
      deps.vehicleAssignmentRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'asg_01', ...d }));

      const result = await service.assignDriver('vhl_01', 'drv_new');
      expect(deps.vehicleAssignmentRepository.update).toHaveBeenCalledWith('asg_01', expect.objectContaining({ driverId: 'drv_new' }));
    });

    it('creates new assignment when no active exists', async () => {
      const { service, deps } = createService();
      deps.vehicleAssignmentRepository.create.mockImplementation((d) => Promise.resolve({ id: 'asg_01', ...d }));

      const result = await service.assignDriver('vhl_01', 'drv_01', '2024-09-01', 'admin');
      expect(deps.vehicleAssignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ vehicleId: 'vhl_01', driverId: 'drv_01', status: 'active' }),
      );
    });

    it('uses current date when assignmentDate not provided for new assignment', async () => {
      const { service, deps } = createService();
      deps.vehicleAssignmentRepository.create.mockImplementation((d) => Promise.resolve({ id: 'asg_01', ...d }));

      await service.assignDriver('vhl_01', 'drv_01');
      expect(deps.vehicleAssignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ assignmentDate: expect.any(String) }),
      );
    });
  });

  describe('unassignDriver', () => {
    it('gets active assignment and unassigns', async () => {
      const { service, deps } = createService();
      const activeAssignment = { id: 'asg_01', status: 'active' };
      deps.vehicleAssignmentRepository.getActiveAssignmentByVehicle.mockImplementation(() => Promise.resolve(activeAssignment));
      deps.vehicleAssignmentRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'asg_01', ...d }));

      await service.unassignDriver('vhl_01', '2024-12-31');
      expect(deps.vehicleAssignmentRepository.getActiveAssignmentByVehicle).toHaveBeenCalledWith('vhl_01');
      expect(deps.vehicleAssignmentValidator.validateUnassignment).toHaveBeenCalledWith('asg_01');
    });
  });

  describe('processDriver', () => {
    it('returns empty array when driverData is null', async () => {
      const { service } = createService();
      const result = await service.processDriver('vhl_01', null);
      expect(result).toEqual([]);
    });

    it('returns empty array when driverData is undefined', async () => {
      const { service } = createService();
      const result = await service.processDriver('vhl_01', undefined);
      expect(result).toEqual([]);
    });

    it('processes single driverId string', async () => {
      const { service, deps } = createService();
      deps.vehicleAssignmentRepository.create.mockImplementation((d) => Promise.resolve({ id: 'asg_01', ...d }));

      const result = await service.processDriver('vhl_01', 'drv_01', '2024-09-01');
      expect(result).toHaveLength(1);
    });

    it('processes array of driverIds', async () => {
      const { service, deps } = createService();
      deps.vehicleAssignmentRepository.create.mockImplementation((d) => Promise.resolve({ id: 'asg_01', ...d }));

      const result = await service.processDriver('vhl_01', ['drv_01', 'drv_02'], '2024-09-01');
      expect(result).toHaveLength(2);
    });

    it('deduplicates driverIds', async () => {
      const { service, deps } = createService();
      deps.vehicleAssignmentRepository.create.mockImplementation((d) => Promise.resolve({ id: 'asg_01', ...d }));

      const result = await service.processDriver('vhl_01', ['drv_01', 'drv_01'], '2024-09-01');
      expect(result).toHaveLength(1);
    });
  });
});
