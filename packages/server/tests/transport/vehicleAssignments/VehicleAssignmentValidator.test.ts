import { describe, expect, it, mock } from 'bun:test';
import { VehicleAssignmentValidator } from '@server/modules/transport/vehicleAssignments/VehicleAssignmentValidator';

function createMockDeps() {
  return {
    vehicleAssignmentRepository: {
      getById: mock(() => Promise.resolve(null)),
    },
  };
}

function createValidator(deps = createMockDeps()) {
  const validator = new VehicleAssignmentValidator(
    deps.vehicleAssignmentRepository as any,
  );
  Object.defineProperty(validator, 't', {
    value: (key: string) => key,
    configurable: true,
  });
  return { validator, deps };
}

const mockAssignment = {
  id: 'asg_01',
  vehicleId: 'vhl_01',
  driverId: 'drv_01',
  assignmentDate: '2024-09-01',
  status: 'active',
};

describe('VehicleAssignmentValidator', () => {
  describe('checkAssignmentExists', () => {
    it('returns assignment when found', async () => {
      const { validator, deps } = createValidator();
      deps.vehicleAssignmentRepository.getById.mockImplementation(() => Promise.resolve(mockAssignment));

      const result = await validator.checkAssignmentExists('asg_01');
      expect(result).toEqual(mockAssignment);
    });

    it('throws when assignment not found', async () => {
      const { validator } = createValidator();
      try {
        await validator.checkAssignmentExists('missing');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.message).toBe('notFound');
      }
    });
  });

  describe('validateAssignmentDates', () => {
    it('passes when only assignmentDate is provided', async () => {
      const { validator } = createValidator();
      const result = await validator.validateAssignmentDates('2024-09-01');
      expect(result).toBe(true);
    });

    it('passes when unassignmentDate is after assignmentDate', async () => {
      const { validator } = createValidator();
      const result = await validator.validateAssignmentDates('2024-09-01', '2024-12-31');
      expect(result).toBe(true);
    });

    it('passes when unassignmentDate is same as assignmentDate', async () => {
      const { validator } = createValidator();
      const result = await validator.validateAssignmentDates('2024-09-01', '2024-09-01');
      expect(result).toBe(true);
    });

    it('throws when unassignmentDate is before assignmentDate', async () => {
      const { validator } = createValidator();
      try {
        await validator.validateAssignmentDates('2024-12-31', '2024-01-01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidDateRange');
      }
    });

    it('passes when unassignmentDate is null', async () => {
      const { validator } = createValidator();
      const result = await validator.validateAssignmentDates('2024-09-01', null);
      expect(result).toBe(true);
    });
  });

  describe('validateUnassignment', () => {
    it('passes when assignment is active', async () => {
      const { validator, deps } = createValidator();
      deps.vehicleAssignmentRepository.getById.mockImplementation(() => Promise.resolve(mockAssignment));

      const result = await validator.validateUnassignment('asg_01');
      expect(result).toBe(true);
    });

    it('throws when assignment is completed', async () => {
      const { validator, deps } = createValidator();
      deps.vehicleAssignmentRepository.getById.mockImplementation(() => Promise.resolve({ ...mockAssignment, status: 'completed' }));

      try {
        await validator.validateUnassignment('asg_01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('assignmentNotActive');
      }
    });

    it('throws when assignment is cancelled', async () => {
      const { validator, deps } = createValidator();
      deps.vehicleAssignmentRepository.getById.mockImplementation(() => Promise.resolve({ ...mockAssignment, status: 'cancelled' }));

      try {
        await validator.validateUnassignment('asg_01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('assignmentNotActive');
      }
    });
  });

  describe('validateNewAssignment', () => {
    it('always returns true', async () => {
      const { validator } = createValidator();
      const result = await validator.validateNewAssignment('vhl_01', 'drv_01', '2024-09-01');
      expect(result).toBe(true);
    });
  });

  describe('validate', () => {
    it('runs validation for create', async () => {
      const { validator, deps } = createValidator();
      const data = {
        vehicleId: 'vhl_01',
        driverId: 'drv_01',
        assignmentDate: '2024-09-01',
        unassignmentDate: '2024-12-31',
      };

      const result = await validator.validate(data, null);
      expect(result).toEqual(data);
    });

    it('runs validation for update with excludeId', async () => {
      const { validator, deps } = createValidator();
      deps.vehicleAssignmentRepository.getById.mockImplementation(() => Promise.resolve(mockAssignment));
      const data = { notes: 'Updated' };

      await validator.validate(data, 'asg_01');
      expect(deps.vehicleAssignmentRepository.getById).toHaveBeenCalledWith('asg_01');
    });

    it('validates date range when both dates provided', async () => {
      const { validator } = createValidator();
      try {
        await validator.validate({
          vehicleId: 'vhl_01',
          driverId: 'drv_01',
          assignmentDate: '2024-12-31',
          unassignmentDate: '2024-01-01',
        }, null);
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidDateRange');
      }
    });
  });
});
