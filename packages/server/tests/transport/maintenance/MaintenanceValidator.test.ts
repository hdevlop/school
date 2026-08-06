import { describe, expect, it, mock } from 'bun:test';
import { MaintenanceValidator } from '@server/modules/transport/maintenance/MaintenanceValidator';

function createMockDeps() {
  return {
    maintenanceRepository: {
      getById: mock(() => Promise.resolve(null)),
      getByVehicleId: mock(() => Promise.resolve([])),
    },
    vehicleRepository: {
      getById: mock(() => Promise.resolve(null)),
    },
  };
}

function createValidator(deps = createMockDeps()) {
  const validator = new MaintenanceValidator(
    deps.maintenanceRepository as any,
    deps.vehicleRepository as any,
  );
  Object.defineProperty(validator, 'mt', {
    value: (key: string) => key,
    configurable: true,
  });
  Object.defineProperty(validator, 'vt', {
    value: (key: string) => key,
    configurable: true,
  });
  return { validator, deps };
}

const mockMaintenance = {
  id: 'mnt_01',
  vehicleId: 'vhl_01',
  type: 'oilChange',
  title: 'Oil Change',
  status: 'scheduled',
  dueHours: '5000',
};

const mockVehicle = {
  id: 'vhl_01',
  name: 'School Bus 1',
  currentMileage: '3000',
};

describe('MaintenanceValidator', () => {
  describe('checkMaintenanceExists', () => {
    it('returns maintenance when found', async () => {
      const { validator, deps } = createValidator();
      deps.maintenanceRepository.getById.mockImplementation(() => Promise.resolve(mockMaintenance));

      const result = await validator.checkMaintenanceExists('mnt_01');
      expect(result).toEqual(mockMaintenance);
    });

    it('throws when maintenance not found', async () => {
      const { validator } = createValidator();
      try {
        await validator.checkMaintenanceExists('missing');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.message).toBe('notFound');
      }
    });
  });

  describe('checkVehicleExists', () => {
    it('returns vehicle when found', async () => {
      const { validator, deps } = createValidator();
      deps.vehicleRepository.getById.mockImplementation(() => Promise.resolve(mockVehicle));

      const result = await validator.checkVehicleExists('vhl_01');
      expect(result).toEqual(mockVehicle);
    });

    it('throws when vehicle not found', async () => {
      const { validator } = createValidator();
      try {
        await validator.checkVehicleExists('missing');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.message).toBe('notFound');
      }
    });
  });

  describe('validateMaintenanceType', () => {
    it('accepts valid types', () => {
      const { validator } = createValidator();
      for (const type of ['scheduled', 'repair', 'inspection', 'oilChange', 'filterChange', 'other']) {
        expect(validator.validateMaintenanceType(type)).toBe(true);
      }
    });

    it('throws for invalid type', () => {
      const { validator } = createValidator();
      try {
        validator.validateMaintenanceType('invalid');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidType');
      }
    });
  });

  describe('validateMaintenanceStatus', () => {
    it('accepts valid statuses', () => {
      const { validator } = createValidator();
      for (const status of ['scheduled', 'inProgress', 'completed', 'cancelled', 'overdue']) {
        expect(validator.validateMaintenanceStatus(status)).toBe(true);
      }
    });

    it('throws for invalid status', () => {
      const { validator } = createValidator();
      try {
        validator.validateMaintenanceStatus('unknown');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidStatus');
      }
    });
  });

  describe('validateMaintenancePriority', () => {
    it('accepts valid priorities', () => {
      const { validator } = createValidator();
      for (const priority of ['low', 'normal', 'high', 'critical']) {
        expect(validator.validateMaintenancePriority(priority)).toBe(true);
      }
    });

    it('throws for invalid priority', () => {
      const { validator } = createValidator();
      try {
        validator.validateMaintenancePriority('urgent');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidPriority');
      }
    });
  });

  describe('validateDueHours', () => {
    it('accepts valid hours', () => {
      const { validator } = createValidator();
      expect(validator.validateDueHours('5000')).toBe(true);
    });

    it('accepts zero hours', () => {
      const { validator } = createValidator();
      expect(validator.validateDueHours('0')).toBe(true);
    });

    it('returns true for empty value', () => {
      const { validator } = createValidator();
      expect(validator.validateDueHours('')).toBe(true);
    });

    it('throws for negative hours', () => {
      const { validator } = createValidator();
      try {
        validator.validateDueHours('-5');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidDueHours');
      }
    });

    it('throws for non-numeric hours', () => {
      const { validator } = createValidator();
      try {
        validator.validateDueHours('abc');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidDueHours');
      }
    });
  });

  describe('validateCost', () => {
    it('accepts valid cost', () => {
      const { validator } = createValidator();
      expect(validator.validateCost('500')).toBe(true);
    });

    it('accepts zero cost', () => {
      const { validator } = createValidator();
      expect(validator.validateCost('0')).toBe(true);
    });

    it('returns true for empty value', () => {
      const { validator } = createValidator();
      expect(validator.validateCost('')).toBe(true);
    });

    it('throws for negative cost', () => {
      const { validator } = createValidator();
      try {
        validator.validateCost('-100');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidCost');
      }
    });
  });

  describe('validateScheduledDate', () => {
    it('returns true for empty value', () => {
      const { validator } = createValidator();
      expect(validator.validateScheduledDate('')).toBe(true);
    });

    it('accepts future date', () => {
      const { validator } = createValidator();
      expect(validator.validateScheduledDate('2030-01-01')).toBe(true);
    });

    it('throws for past date', () => {
      const { validator } = createValidator();
      try {
        validator.validateScheduledDate('2020-01-01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('scheduledDateInPast');
      }
    });

    it('throws for invalid date', () => {
      const { validator } = createValidator();
      try {
        validator.validateScheduledDate('not-a-date');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
      }
    });
  });

  describe('validateDueHoursAgainstVehicle', () => {
    it('passes when dueHours > vehicle currentHours', async () => {
      const { validator, deps } = createValidator();
      deps.vehicleRepository.getById.mockImplementation(() => Promise.resolve({ ...mockVehicle, currentHours: '3000' }));

      const result = await validator.validateDueHoursAgainstVehicle('vhl_01', '5000');
      expect(result).toBe(true);
    });

    it('throws when dueHours <= vehicle currentHours', async () => {
      const { validator, deps } = createValidator();
      deps.vehicleRepository.getById.mockImplementation(() => Promise.resolve({ ...mockVehicle, currentHours: '5000' }));

      try {
        await validator.validateDueHoursAgainstVehicle('vhl_01', '3000');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('dueHoursPastCurrent');
      }
    });

    it('returns true for empty dueHours', async () => {
      const { validator } = createValidator();
      expect(await validator.validateDueHoursAgainstVehicle('vhl_01', '')).toBe(true);
    });
  });

  describe('checkMaintenanceCanBeModified', () => {
    it('returns maintenance when status is not completed', async () => {
      const { validator, deps } = createValidator();
      deps.maintenanceRepository.getById.mockImplementation(() => Promise.resolve(mockMaintenance));

      const result = await validator.checkMaintenanceCanBeModified('mnt_01');
      expect(result).toEqual(mockMaintenance);
    });

    it('throws when status is completed', async () => {
      const { validator, deps } = createValidator();
      deps.maintenanceRepository.getById.mockImplementation(() => Promise.resolve({ ...mockMaintenance, status: 'completed' }));

      try {
        await validator.checkMaintenanceCanBeModified('mnt_01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('cannotModifyCompleted');
      }
    });
  });

  describe('checkMaintenanceCanBeDeleted', () => {
    it('passes when status is not inProgress', async () => {
      const { validator, deps } = createValidator();
      deps.maintenanceRepository.getById.mockImplementation(() => Promise.resolve(mockMaintenance));

      const result = await validator.checkMaintenanceCanBeDeleted('mnt_01');
      expect(result).toEqual(mockMaintenance);
    });

    it('throws when status is inProgress', async () => {
      const { validator, deps } = createValidator();
      deps.maintenanceRepository.getById.mockImplementation(() => Promise.resolve({ ...mockMaintenance, status: 'inProgress' }));

      try {
        await validator.checkMaintenanceCanBeDeleted('mnt_01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('cannotDeleteInProgress');
      }
    });
  });

  describe('checkMaintenanceCanBeCompleted', () => {
    it('passes when status is scheduled', async () => {
      const { validator, deps } = createValidator();
      deps.maintenanceRepository.getById.mockImplementation(() => Promise.resolve(mockMaintenance));

      const result = await validator.checkMaintenanceCanBeCompleted('mnt_01');
      expect(result).toEqual(mockMaintenance);
    });

    it('throws when already completed', async () => {
      const { validator, deps } = createValidator();
      deps.maintenanceRepository.getById.mockImplementation(() => Promise.resolve({ ...mockMaintenance, status: 'completed' }));

      try {
        await validator.checkMaintenanceCanBeCompleted('mnt_01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('alreadyCompleted');
      }
    });

    it('throws when cancelled', async () => {
      const { validator, deps } = createValidator();
      deps.maintenanceRepository.getById.mockImplementation(() => Promise.resolve({ ...mockMaintenance, status: 'cancelled' }));

      try {
        await validator.checkMaintenanceCanBeCompleted('mnt_01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('cannotCompleteCancelled');
      }
    });
  });

  describe('checkNoDuplicateMaintenance', () => {
    it('passes when no duplicate found', async () => {
      const { validator, deps } = createValidator();
      deps.maintenanceRepository.getByVehicleId.mockImplementation(() => Promise.resolve([]));

      const result = await validator.checkNoDuplicateMaintenance('vhl_01', 'oilChange', '5000');
      expect(result).toBe(true);
    });

    it('passes when duplicate is completed', async () => {
      const { validator, deps } = createValidator();
      deps.maintenanceRepository.getByVehicleId.mockImplementation(() => Promise.resolve([
        { id: 'mnt_02', type: 'oilChange', dueHours: '5000', status: 'completed' },
      ]));

      const result = await validator.checkNoDuplicateMaintenance('vhl_01', 'oilChange', '5000');
      expect(result).toBe(true);
    });

    it('passes when duplicate is cancelled', async () => {
      const { validator, deps } = createValidator();
      deps.maintenanceRepository.getByVehicleId.mockImplementation(() => Promise.resolve([
        { id: 'mnt_02', type: 'oilChange', dueHours: '5000', status: 'cancelled' },
      ]));

      const result = await validator.checkNoDuplicateMaintenance('vhl_01', 'oilChange', '5000');
      expect(result).toBe(true);
    });

    it('passes when excluded by id', async () => {
      const { validator, deps } = createValidator();
      deps.maintenanceRepository.getByVehicleId.mockImplementation(() => Promise.resolve([
        { id: 'mnt_01', type: 'oilChange', dueHours: '5000', status: 'scheduled' },
      ]));

      const result = await validator.checkNoDuplicateMaintenance('vhl_01', 'oilChange', '5000', 'mnt_01');
      expect(result).toBe(true);
    });

    it('throws when duplicate found', async () => {
      const { validator, deps } = createValidator();
      deps.maintenanceRepository.getByVehicleId.mockImplementation(() => Promise.resolve([
        { id: 'mnt_02', type: 'oilChange', dueHours: '5000', status: 'scheduled' },
      ]));

      try {
        await validator.checkNoDuplicateMaintenance('vhl_01', 'oilChange', '5000');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('duplicateMaintenanceExists');
      }
    });
  });

  describe('validateCreateMaintenance', () => {
    it('passes data through', async () => {
      const { validator } = createValidator();
      const data = { vehicleId: 'vhl_01', type: 'oilChange', title: 'Test' };
      const result = await validator.validateCreateMaintenance(data);
      expect(result).toEqual(data);
    });
  });
});
