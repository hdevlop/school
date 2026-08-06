import { describe, expect, it, mock } from 'bun:test';
import { RefuelValidator } from '@server/modules/transport/refuels/RefuelValidator';

function createMockDeps() {
  return {
    refuelRepository: {
      getById: mock(() => Promise.resolve(null)),
      getByVoucherNumber: mock(() => Promise.resolve(null)),
    },
  };
}

function createValidator(deps = createMockDeps()) {
  const validator = new RefuelValidator(
    deps.refuelRepository as any,
  );
  Object.defineProperty(validator, 't', {
    value: (key: string) => key,
    configurable: true,
  });
  return { validator, deps };
}

const mockRefuel = {
  id: 'rfl_01',
  vehicleId: 'vhl_01',
  drivers: 'drv_01',
  datetime: '2024-09-01T10:00:00',
  liters: '50',
  voucherNumber: 'VCH-001',
};

describe('RefuelValidator', () => {
  describe('checkExists', () => {
    it('passes when refuel exists', async () => {
      const { validator, deps } = createValidator();
      deps.refuelRepository.getById.mockImplementation(() => Promise.resolve(mockRefuel));

      const result = await validator.checkExists('rfl_01');
      expect(result).toBe(true);
    });

    it('throws when refuel not found', async () => {
      const { validator } = createValidator();
      try {
        await validator.checkExists('missing');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
        expect(error.message).toBe('notFound');
      }
    });
  });

  describe('checkVoucherNumberExists', () => {
    it('returns refuel when found', async () => {
      const { validator, deps } = createValidator();
      deps.refuelRepository.getByVoucherNumber.mockImplementation(() => Promise.resolve(mockRefuel));

      const result = await validator.checkVoucherNumberExists('VCH-001');
      expect(result).toEqual(mockRefuel);
    });

    it('throws when not found', async () => {
      const { validator } = createValidator();
      try {
        await validator.checkVoucherNumberExists('MISSING');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
      }
    });
  });

  describe('checkVoucherNumberIsUnique', () => {
    it('passes when voucherNumber is null', async () => {
      const { validator } = createValidator();
      const result = await validator.checkVoucherNumberIsUnique(null);
      expect(result).toBe(true);
    });

    it('passes when voucherNumber is not taken', async () => {
      const { validator } = createValidator();
      const result = await validator.checkVoucherNumberIsUnique('VCH-NEW');
      expect(result).toBe(true);
    });

    it('passes when voucherNumber belongs to excluded refuel', async () => {
      const { validator, deps } = createValidator();
      deps.refuelRepository.getByVoucherNumber.mockImplementation(() => Promise.resolve(mockRefuel));

      const result = await validator.checkVoucherNumberIsUnique('VCH-001', 'rfl_01');
      expect(result).toBe(true);
    });

    it('throws when voucherNumber belongs to different refuel', async () => {
      const { validator, deps } = createValidator();
      deps.refuelRepository.getByVoucherNumber.mockImplementation(() => Promise.resolve(mockRefuel));

      try {
        await validator.checkVoucherNumberIsUnique('VCH-001', 'other_id');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('voucherExists');
      }
    });
  });

  describe('validateDate', () => {
    it('passes for valid date', () => {
      const { validator } = createValidator();
      expect(validator.validateDate('2024-09-01')).toBe(true);
    });

    it('passes for valid datetime', () => {
      const { validator } = createValidator();
      expect(validator.validateDate('2024-09-01T10:00:00')).toBe(true);
    });

    it('throws for null date', () => {
      const { validator } = createValidator();
      try {
        validator.validateDate(null);
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('dateRequired');
      }
    });

    it('throws for invalid date', () => {
      const { validator } = createValidator();
      try {
        validator.validateDate('not-a-date');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidDateFormat');
      }
    });
  });

  describe('validateDateRange', () => {
    it('passes for valid date range', () => {
      const { validator } = createValidator();
      expect(validator.validateDateRange('2024-01-01', '2024-12-31')).toBe(true);
    });

    it('throws when end date is before start date', () => {
      const { validator } = createValidator();
      try {
        validator.validateDateRange('2024-12-31', '2024-01-01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('endDateAfterStart');
      }
    });

    it('throws when end date equals start date', () => {
      const { validator } = createValidator();
      try {
        validator.validateDateRange('2024-01-01', '2024-01-01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('endDateAfterStart');
      }
    });
  });

  describe('validate', () => {
    it('runs validation for create', async () => {
      const { validator, deps } = createValidator();
      const data = {
        vehicleId: 'vhl_01',
        drivers: 'drv_01',
        datetime: '2024-09-01T10:00:00',
        liters: '50',
      };

      const result = await validator.validate(data, null);
      expect(result).toEqual(data);
    });

    it('runs validation for update with excludeId', async () => {
      const { validator, deps } = createValidator();
      deps.refuelRepository.getById.mockImplementation(() => Promise.resolve(mockRefuel));
      const data = { liters: '60' };

      await validator.validate(data, 'rfl_01');
      expect(deps.refuelRepository.getById).toHaveBeenCalledWith('rfl_01');
    });

    it('checks voucher uniqueness when provided', async () => {
      const { validator, deps } = createValidator();
      const data = { vehicleId: 'vhl_01', datetime: '2024-09-01', liters: '50', voucherNumber: 'VCH-001' };

      await validator.validate(data, null);
      expect(deps.refuelRepository.getByVoucherNumber).toHaveBeenCalledWith('VCH-001');
    });

    it('validates datetime when provided', async () => {
      const { validator } = createValidator();
      const data = { vehicleId: 'vhl_01', datetime: '2024-09-01', liters: '50' };

      await validator.validate(data, null);
    });
  });
});
