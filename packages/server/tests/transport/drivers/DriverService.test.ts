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

// deleteAll queries the db singleton for linked staff ids; stub it to return none
// so the unit test stays hermetic (no real Postgres connection).
mock.module('@server/database/db', () => ({
  db: {
    select: () => ({ from: () => ({ innerJoin: () => Promise.resolve([]) }) }),
  },
}));

const { DriverService } = await import('@server/modules/transport/drivers/DriverService');

function createMockDeps() {
  return {
    driverRepository: {
      getAll: mock(() => Promise.resolve([])),
      getById: mock(() => Promise.resolve(null)),
      getByCin: mock(() => Promise.resolve(null)),
      getByLicenseNumber: mock(() => Promise.resolve(null)),
      getByEmail: mock(() => Promise.resolve(null)),
      getByPhone: mock(() => Promise.resolve(null)),
      getByStaffId: mock(() => Promise.resolve({ id: 'drv_01', staffId: 'stf_01' })),
      getByStatus: mock(() => Promise.resolve([])),
      getCount: mock(() => Promise.resolve({ count: 0 })),
      getLicenseExpiringDrivers: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({ id: 'drv_01' })),
      update: mock(() => Promise.resolve({ id: 'drv_01' })),
      delete: mock(() => Promise.resolve({ id: 'drv_01', userId: 'usr_01' })),
      deleteAll: mock(() => Promise.resolve({ deletedCount: 0, deletedDrivers: [] })),
    },
    driverValidator: {
      checkExists: mock(() => Promise.resolve()),
      checkCinExists: mock(() => Promise.resolve({ id: 'drv_01' })),
      checkLicenseNumberExists: mock(() => Promise.resolve({ id: 'drv_01' })),
      checkEmailExists: mock(() => Promise.resolve({ id: 'drv_01' })),
      checkPhoneExists: mock(() => Promise.resolve({ id: 'drv_01' })),
      validateDriverStatus: mock(() => Promise.resolve(true)),
      validate: mock(() => Promise.resolve()),
    },
    userService: {
      create: mock(() => Promise.resolve({ id: 'usr_01', email: 'ahmed@example.com' })),
      update: mock(() => Promise.resolve({ id: 'usr_01' })),
    },
    storage: {
      processFile: mock(() => Promise.resolve('/images/driver_male.png')),
      emitDeleted: mock(() => {}),
    },
    staffService: {
      create: mock(() => Promise.resolve({ id: 'stf_01' })),
      update: mock(() => Promise.resolve({ id: 'stf_01' })),
      delete: mock(() => Promise.resolve({ id: 'stf_01' })),
    },
  };
}

function createService(deps = createMockDeps()) {
  const service = new DriverService(
    deps.driverRepository as any,
    deps.driverValidator as any,
    deps.userService as any,
    deps.storage as any,
    deps.staffService as any,
  );
  return { service, deps };
}

const validCreateData = {
  id: 'drv_01',
  name: 'Ahmed Benali',
  cin: 'AB123456',
  email: 'ahmed@example.com',
  phone: '+212600000000',
  address: '123 Rue Casablanca',
  gender: 'M',
  licenseNumber: 'LIC-12345',
  licenseType: 'B',
  licenseExpiry: '2030-12-31',
  hireDate: '2024-09-01',
  status: 'active',
};

describe('DriverService', () => {
  describe('getAll', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.driverRepository.getAll.mockImplementation(() => Promise.resolve([{ id: 'drv_01' }]));
      const result = await service.getAll();
      expect(result).toEqual([{ id: 'drv_01' }]);
    });
  });

  describe('getCount', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.driverRepository.getCount.mockImplementation(() => Promise.resolve({ count: 5 }));
      const result = await service.getCount();
      expect(result).toEqual({ count: 5 });
    });
  });

  describe('getById', () => {
    it('checks existence then delegates to repository', async () => {
      const { service, deps } = createService();
      const mockDriver = { id: 'drv_01', name: 'Ahmed' };
      deps.driverRepository.getById.mockImplementation(() => Promise.resolve(mockDriver));
      const result = await service.getById('drv_01');
      expect(deps.driverValidator.checkExists).toHaveBeenCalledWith('drv_01');
      expect(result).toEqual(mockDriver);
    });
  });

  describe('getByCin', () => {
    it('checks cin exists then delegates to repository', async () => {
      const { service, deps } = createService();
      const mockDriver = { id: 'drv_01' };
      deps.driverRepository.getByCin.mockImplementation(() => Promise.resolve(mockDriver));
      const result = await service.getByCin('AB123456');
      expect(deps.driverValidator.checkCinExists).toHaveBeenCalledWith('AB123456');
      expect(result).toEqual(mockDriver);
    });
  });

  describe('getByLicenseNumber', () => {
    it('checks license exists then delegates to repository', async () => {
      const { service, deps } = createService();
      const mockDriver = { id: 'drv_01' };
      deps.driverRepository.getByLicenseNumber.mockImplementation(() => Promise.resolve(mockDriver));
      const result = await service.getByLicenseNumber('LIC-12345');
      expect(deps.driverValidator.checkLicenseNumberExists).toHaveBeenCalledWith('LIC-12345');
      expect(result).toEqual(mockDriver);
    });
  });

  describe('getByEmail', () => {
    it('checks email exists then delegates to repository', async () => {
      const { service, deps } = createService();
      const mockDriver = { id: 'drv_01' };
      deps.driverRepository.getByEmail.mockImplementation(() => Promise.resolve(mockDriver));
      const result = await service.getByEmail('ahmed@example.com');
      expect(deps.driverValidator.checkEmailExists).toHaveBeenCalledWith('ahmed@example.com');
      expect(result).toEqual(mockDriver);
    });
  });

  describe('getByPhone', () => {
    it('checks phone exists then delegates to repository', async () => {
      const { service, deps } = createService();
      const mockDriver = { id: 'drv_01' };
      deps.driverRepository.getByPhone.mockImplementation(() => Promise.resolve(mockDriver));
      const result = await service.getByPhone('+212600000000');
      expect(deps.driverValidator.checkPhoneExists).toHaveBeenCalledWith('+212600000000');
      expect(result).toEqual(mockDriver);
    });
  });

  describe('getByStatus', () => {
    it('validates status then delegates to repository', async () => {
      const { service, deps } = createService();
      deps.driverRepository.getByStatus.mockImplementation(() => Promise.resolve([{ id: 'drv_01' }]));
      const result = await service.getByStatus('active');
      expect(deps.driverValidator.validateDriverStatus).toHaveBeenCalledWith('active');
      expect(result).toEqual([{ id: 'drv_01' }]);
    });
  });

  describe('getLicenseExpiringDrivers', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.driverRepository.getLicenseExpiringDrivers.mockImplementation(() => Promise.resolve([{ id: 'drv_01' }]));
      const result = await service.getLicenseExpiringDrivers();
      expect(result).toEqual([{ id: 'drv_01' }]);
    });
  });

  describe('create', () => {
    it('creates a driver with user and storage', async () => {
      const { service, deps } = createService();
      deps.driverRepository.create.mockImplementation((d) => Promise.resolve(d));

      await service.create(validCreateData);

      expect(deps.driverValidator.validate).toHaveBeenCalledWith(validCreateData);
      expect(deps.storage.processFile).toHaveBeenCalled();
      expect(deps.userService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'driver', email: 'ahmed@example.com' }),
      );
      // Common HR fields (cin, userId) now live on the staff row (inverted write path).
      expect(deps.staffService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'driver',
          userId: 'usr_01',
          cin: 'AB123456',
          profile: expect.objectContaining({ id: 'drv_01', licenseNumber: 'LIC-12345' }),
        }),
      );
      expect(deps.driverRepository.getByStaffId).toHaveBeenCalledWith('stf_01');
    });

    it('uses male fallback image for male driver', async () => {
      const { service, deps } = createService();
      deps.driverRepository.create.mockImplementation((d) => Promise.resolve(d));
      const data = { ...validCreateData, gender: 'M' };

      await service.create(data);
      expect(deps.storage.processFile).toHaveBeenCalledWith(
        'drv_01', undefined,
        expect.objectContaining({ fallback: '/images/driver_male.png' }),
      );
    });

    it('uses female fallback image for female driver', async () => {
      const { service, deps } = createService();
      deps.driverRepository.create.mockImplementation((d) => Promise.resolve(d));
      const data = { ...validCreateData, gender: 'F' };

      await service.create(data);
      expect(deps.storage.processFile).toHaveBeenCalledWith(
        'drv_01', undefined,
        expect.objectContaining({ fallback: '/images/driver_female.png' }),
      );
    });
  });

  describe('update', () => {
    it('updates user and driver data', async () => {
      const { service, deps } = createService();
      deps.driverRepository.getById.mockImplementation(() => Promise.resolve({ id: 'drv_01', userId: 'usr_01', staffId: 'stf_01' }));
      deps.driverRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'drv_01', ...d }));

      await service.update('drv_01', { name: 'Updated', email: 'updated@example.com' });

      expect(deps.driverValidator.validate).toHaveBeenCalledWith({ name: 'Updated', email: 'updated@example.com' }, 'drv_01');
      expect(deps.userService.update).toHaveBeenCalledWith('usr_01', expect.objectContaining({ name: 'Updated' }));
      // Shared HR fields route through staffService; the driver row only changes for license fields.
      expect(deps.staffService.update).toHaveBeenCalledWith('stf_01', expect.objectContaining({ name: 'Updated', role: 'driver' }));
    });

    it('processes image when provided', async () => {
      const { service, deps } = createService();
      deps.driverRepository.getById.mockImplementation(() => Promise.resolve({ id: 'drv_01', userId: 'usr_01' }));
      deps.driverRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'drv_01', ...d }));

      await service.update('drv_01', { image: '/images/new.png' });
      expect(deps.storage.processFile).toHaveBeenCalled();
    });

    it('does not process image when not provided', async () => {
      const { service, deps } = createService();
      deps.driverRepository.getById.mockImplementation(() => Promise.resolve({ id: 'drv_01', userId: 'usr_01', staffId: 'stf_01' }));
      deps.driverRepository.update.mockImplementation((_id, d) => Promise.resolve({ id: 'drv_01', ...d }));

      await service.update('drv_01', { name: 'Updated' });
      expect(deps.storage.processFile).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('checks exists, validates status, then updates', async () => {
      const { service, deps } = createService();
      deps.driverRepository.getById.mockImplementation(() => Promise.resolve({ id: 'drv_01', staffId: 'stf_01' }));

      await service.updateStatus('drv_01', 'inactive');
      expect(deps.driverValidator.checkExists).toHaveBeenCalledWith('drv_01');
      expect(deps.driverValidator.validateDriverStatus).toHaveBeenCalledWith('inactive');
      // Status lives on staff now, so it is updated through staffService.
      expect(deps.staffService.update).toHaveBeenCalledWith('stf_01', { status: 'inactive', role: 'driver' });
    });
  });

  describe('delete', () => {
    it('checks exists, deletes, and emits storage cleanup', async () => {
      const { service, deps } = createService();
      deps.driverRepository.getById.mockImplementation(() => Promise.resolve({ id: 'drv_01', staffId: 'stf_01' }));
      deps.driverRepository.delete.mockImplementation(() => Promise.resolve({ id: 'drv_01', userId: 'usr_01' }));

      await service.delete('drv_01');
      expect(deps.driverValidator.checkExists).toHaveBeenCalledWith('drv_01');
      expect(deps.driverRepository.delete).toHaveBeenCalledWith('drv_01');
      expect(deps.staffService.delete).toHaveBeenCalledWith('stf_01');
      expect(deps.storage.emitDeleted).toHaveBeenCalledWith('drv_01');
    });

    it('propagates staff cleanup failures', async () => {
      const { service, deps } = createService();
      deps.driverRepository.getById.mockImplementation(() => Promise.resolve({ id: 'drv_01', staffId: 'stf_01' }));
      deps.staffService.delete.mockImplementation(() => {
        throw new Error('staff cleanup failed');
      });

      await expect(service.delete('drv_01')).rejects.toThrow('staff cleanup failed');
    });
  });

  describe('deleteAll', () => {
    it('delegates to repository', async () => {
      const { service, deps } = createService();
      deps.driverRepository.deleteAll.mockImplementation(() => Promise.resolve({ deletedCount: 3, deletedDrivers: [] }));

      const result = await service.deleteAll();
      expect(result.deletedCount).toBe(3);
    });
  });

  describe('deleteBulk', () => {
    it('deletes multiple drivers', async () => {
      const { service, deps } = createService();
      deps.driverRepository.delete.mockImplementation(() => Promise.resolve({ id: 'drv_01', userId: 'usr_01' }));

      const result = await service.deleteBulk(['drv_01', 'drv_02']);
      expect(result.deletedCount).toBe(2);
      expect(result.deletedDrivers).toHaveLength(2);
    });
  });

  describe('createBulk', () => {
    it('creates multiple drivers successfully', async () => {
      const { service, deps } = createService();
      deps.driverRepository.create.mockImplementation((d) => Promise.resolve(d));

      const result = await service.createBulk([validCreateData, { ...validCreateData, id: 'drv_02', licenseNumber: 'LIC-67890' }]);
      expect(result).toHaveLength(2);
    });

    it('wraps individual errors with context using licenseNumber', async () => {
      const { service, deps } = createService();
      deps.driverValidator.validate.mockImplementation(() => {
        throw new Error('License exists');
      });

      try {
        await service.createBulk([validCreateData]);
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('LIC-12345');
        expect(error.message).toContain('License exists');
      }
    });

    it('uses name in error when licenseNumber is missing', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, licenseNumber: undefined, id: undefined };
      deps.driverValidator.validate.mockImplementation(() => {
        throw new Error('fail');
      });

      try {
        await service.createBulk([data]);
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.message).toContain('Ahmed Benali');
      }
    });

    it('uses index as last resort identifier', async () => {
      const { service, deps } = createService();
      const data = { ...validCreateData, licenseNumber: undefined, id: undefined, name: undefined };
      deps.driverValidator.validate.mockImplementation(() => {
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
