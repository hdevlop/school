import { describe, expect, it, mock } from 'bun:test';
import { DriverValidator } from '@server/modules/transport/drivers/DriverValidator';

function createMockDeps() {
  return {
    driverRepository: {
      getById: mock(() => Promise.resolve(null)),
      getByCin: mock(() => Promise.resolve(null)),
      getByLicenseNumber: mock(() => Promise.resolve(null)),
      getByEmail: mock(() => Promise.resolve(null)),
      getByPhone: mock(() => Promise.resolve(null)),
    },
    userValidator: {
      checkUserIdIsUnique: mock(() => Promise.resolve()),
    },
  };
}

function createValidator(deps = createMockDeps()) {
  const validator = new DriverValidator(
    deps.driverRepository as any,
    deps.userValidator as any,
  );
  Object.defineProperty(validator, 't', {
    value: (key: string) => key,
    configurable: true,
  });
  return { validator, deps };
}

const mockDriver = {
  id: 'drv_01',
  userId: 'usr_01',
  cin: 'AB123456',
  name: 'Ahmed Benali',
  email: 'ahmed@example.com',
  phone: '+212600000000',
  licenseNumber: 'LIC-12345',
  status: 'active',
};

describe('DriverValidator', () => {
  describe('checkExists', () => {
    it('passes when driver exists', async () => {
      const { validator, deps } = createValidator();
      deps.driverRepository.getById.mockImplementation(() => Promise.resolve(mockDriver));

      const result = await validator.checkExists('drv_01');
      expect(result).toBe(true);
    });

    it('throws when driver not found', async () => {
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

  describe('checkIdIsUnique', () => {
    it('passes when no driver with that id exists', async () => {
      const { validator } = createValidator();
      await validator.checkIdIsUnique('new_id');
    });

    it('throws when id already exists', async () => {
      const { validator, deps } = createValidator();
      deps.driverRepository.getById.mockImplementation(() => Promise.resolve(mockDriver));

      try {
        await validator.checkIdIsUnique('drv_01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('idExists');
      }
    });
  });

  describe('checkCinIsUnique', () => {
    it('skips check when cin is undefined', async () => {
      const { validator, deps } = createValidator();
      await validator.checkCinIsUnique(undefined);
      expect(deps.driverRepository.getByCin).not.toHaveBeenCalled();
    });

    it('passes when cin is not taken', async () => {
      const { validator } = createValidator();
      await validator.checkCinIsUnique('NEW12345');
    });

    it('passes when cin belongs to excluded driver', async () => {
      const { validator, deps } = createValidator();
      deps.driverRepository.getByCin.mockImplementation(() => Promise.resolve(mockDriver));
      await validator.checkCinIsUnique('AB123456', 'drv_01');
    });

    it('throws when cin belongs to different driver', async () => {
      const { validator, deps } = createValidator();
      deps.driverRepository.getByCin.mockImplementation(() => Promise.resolve(mockDriver));

      try {
        await validator.checkCinIsUnique('AB123456', 'other_id');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('cinExists');
      }
    });
  });

  describe('checkLicenseNumberIsUnique', () => {
    it('skips check when licenseNumber is undefined', async () => {
      const { validator, deps } = createValidator();
      await validator.checkLicenseNumberIsUnique(undefined);
      expect(deps.driverRepository.getByLicenseNumber).not.toHaveBeenCalled();
    });

    it('passes when licenseNumber is not taken', async () => {
      const { validator } = createValidator();
      await validator.checkLicenseNumberIsUnique('NEW-LIC');
    });

    it('throws when licenseNumber belongs to different driver', async () => {
      const { validator, deps } = createValidator();
      deps.driverRepository.getByLicenseNumber.mockImplementation(() => Promise.resolve(mockDriver));

      try {
        await validator.checkLicenseNumberIsUnique('LIC-12345', 'other_id');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('licenseExists');
      }
    });
  });

  describe('checkCinExists', () => {
    it('returns driver when found', async () => {
      const { validator, deps } = createValidator();
      deps.driverRepository.getByCin.mockImplementation(() => Promise.resolve(mockDriver));
      const result = await validator.checkCinExists('AB123456');
      expect(result).toEqual(mockDriver);
    });

    it('throws when not found', async () => {
      const { validator } = createValidator();
      try {
        await validator.checkCinExists('MISSING');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
      }
    });
  });

  describe('checkLicenseNumberExists', () => {
    it('returns driver when found', async () => {
      const { validator, deps } = createValidator();
      deps.driverRepository.getByLicenseNumber.mockImplementation(() => Promise.resolve(mockDriver));
      const result = await validator.checkLicenseNumberExists('LIC-12345');
      expect(result).toEqual(mockDriver);
    });

    it('throws when not found', async () => {
      const { validator } = createValidator();
      try {
        await validator.checkLicenseNumberExists('MISSING');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
      }
    });
  });

  describe('checkEmailExists', () => {
    it('returns driver when found', async () => {
      const { validator, deps } = createValidator();
      deps.driverRepository.getByEmail.mockImplementation(() => Promise.resolve(mockDriver));
      const result = await validator.checkEmailExists('ahmed@example.com');
      expect(result).toEqual(mockDriver);
    });

    it('throws when not found', async () => {
      const { validator } = createValidator();
      try {
        await validator.checkEmailExists('missing@example.com');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
      }
    });
  });

  describe('checkPhoneExists', () => {
    it('returns driver when found', async () => {
      const { validator, deps } = createValidator();
      deps.driverRepository.getByPhone.mockImplementation(() => Promise.resolve(mockDriver));
      const result = await validator.checkPhoneExists('+212600000000');
      expect(result).toEqual(mockDriver);
    });

    it('throws when not found', async () => {
      const { validator } = createValidator();
      try {
        await validator.checkPhoneExists('+212000000000');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
      }
    });
  });

  describe('checkEmailIsUnique', () => {
    it('skips check when email is undefined', async () => {
      const { validator, deps } = createValidator();
      await validator.checkEmailIsUnique(undefined);
      expect(deps.driverRepository.getByEmail).not.toHaveBeenCalled();
    });

    it('throws when email belongs to different driver', async () => {
      const { validator, deps } = createValidator();
      deps.driverRepository.getByEmail.mockImplementation(() => Promise.resolve(mockDriver));

      try {
        await validator.checkEmailIsUnique('ahmed@example.com', 'other_id');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('emailExists');
      }
    });
  });

  describe('checkPhoneIsUnique', () => {
    it('skips check when phone is undefined', async () => {
      const { validator, deps } = createValidator();
      await validator.checkPhoneIsUnique(undefined);
      expect(deps.driverRepository.getByPhone).not.toHaveBeenCalled();
    });

    it('throws when phone belongs to different driver', async () => {
      const { validator, deps } = createValidator();
      deps.driverRepository.getByPhone.mockImplementation(() => Promise.resolve(mockDriver));

      try {
        await validator.checkPhoneIsUnique('+212600000000', 'other_id');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('phoneExists');
      }
    });
  });

  describe('validateDriverStatus', () => {
    it('accepts valid statuses', async () => {
      const { validator } = createValidator();
      for (const status of ['active', 'inactive', 'onLeave', 'suspended']) {
        const result = await validator.validateDriverStatus(status);
        expect(result).toBe(true);
      }
    });

    it('throws for invalid status', async () => {
      const { validator } = createValidator();
      try {
        await validator.validateDriverStatus('unknown');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidStatus');
      }
    });
  });

  describe('validateLicenseExpiry', () => {
    it('passes for future date', async () => {
      const { validator } = createValidator();
      const result = await validator.validateLicenseExpiry('2030-12-31');
      expect(result).toBe(true);
    });

    it('throws for past date', async () => {
      const { validator } = createValidator();
      try {
        await validator.validateLicenseExpiry('2020-01-01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('licenseExpired');
      }
    });
  });

  describe('isExists', () => {
    it('returns true when driver exists', async () => {
      const { validator, deps } = createValidator();
      deps.driverRepository.getById.mockImplementation(() => Promise.resolve(mockDriver));
      expect(await validator.isExists('drv_01')).toBe(true);
    });

    it('returns false when driver not found', async () => {
      const { validator } = createValidator();
      expect(await validator.isExists('missing')).toBe(false);
    });
  });

  describe('isCinExists', () => {
    it('returns false when cin is undefined', async () => {
      const { validator } = createValidator();
      expect(await validator.isCinExists(undefined)).toBe(false);
    });

    it('returns true when cin found', async () => {
      const { validator, deps } = createValidator();
      deps.driverRepository.getByCin.mockImplementation(() => Promise.resolve(mockDriver));
      expect(await validator.isCinExists('AB123456')).toBe(true);
    });
  });

  describe('isLicenseNumberExists', () => {
    it('returns false when licenseNumber is undefined', async () => {
      const { validator } = createValidator();
      expect(await validator.isLicenseNumberExists(undefined)).toBe(false);
    });
  });

  describe('isEmailExists', () => {
    it('returns false when email is undefined', async () => {
      const { validator } = createValidator();
      expect(await validator.isEmailExists(undefined)).toBe(false);
    });
  });

  describe('isPhoneExists', () => {
    it('returns false when phone is undefined', async () => {
      const { validator } = createValidator();
      expect(await validator.isPhoneExists(undefined)).toBe(false);
    });
  });

  describe('checkUserIdIsUnique', () => {
    it('delegates to userValidator', async () => {
      const { validator, deps } = createValidator();
      await validator.checkUserIdIsUnique('usr_01');
      expect(deps.userValidator.checkUserIdIsUnique).toHaveBeenCalledWith('usr_01');
    });
  });

  describe('validate', () => {
    it('runs full validation for create', async () => {
      const { validator, deps } = createValidator();
      const data = {
        cin: 'AB123456',
        licenseNumber: 'LIC-12345',
        email: 'ahmed@example.com',
        phone: '+212600000000',
        status: 'active',
        licenseExpiry: '2030-12-31',
      };

      const result = await validator.validate(data, null);
      expect(result).toEqual(data);
      expect(deps.driverRepository.getByCin).toHaveBeenCalledWith('AB123456');
      expect(deps.driverRepository.getByLicenseNumber).toHaveBeenCalledWith('LIC-12345');
      expect(deps.driverRepository.getByEmail).toHaveBeenCalledWith('ahmed@example.com');
      expect(deps.driverRepository.getByPhone).toHaveBeenCalledWith('+212600000000');
    });

    it('runs full validation for update with excludeId', async () => {
      const { validator, deps } = createValidator();
      deps.driverRepository.getById.mockImplementation(() => Promise.resolve(mockDriver));
      const data = { name: 'Updated', cin: 'AB123456' };

      await validator.validate(data, 'drv_01');
      expect(deps.driverRepository.getByCin).toHaveBeenCalledWith('AB123456');
    });

    it('checks id uniqueness on create when id is provided', async () => {
      const { validator, deps } = createValidator();
      const data = { id: 'drv_01', name: 'Test' };

      await validator.validate(data, null);
      expect(deps.driverRepository.getById).toHaveBeenCalledWith('drv_01');
    });

    it('skips optional field checks when not provided', async () => {
      const { validator, deps } = createValidator();
      const data = { name: 'Test' };

      await validator.validate(data, null);
      expect(deps.driverRepository.getByCin).not.toHaveBeenCalled();
      expect(deps.driverRepository.getByLicenseNumber).not.toHaveBeenCalled();
      expect(deps.driverRepository.getByEmail).not.toHaveBeenCalled();
      expect(deps.driverRepository.getByPhone).not.toHaveBeenCalled();
    });
  });
});
