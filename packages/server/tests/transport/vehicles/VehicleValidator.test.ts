import { describe, expect, it, mock } from 'bun:test';
import { VehicleValidator } from '@server/modules/transport/vehicles/VehicleValidator';

function createMockDeps() {
  return {
    vehicleRepository: {
      getById: mock(() => Promise.resolve(null)),
      getByLicensePlate: mock(() => Promise.resolve(null)),
    },
  };
}

function createValidator(deps = createMockDeps()) {
  const validator = new VehicleValidator(
    deps.vehicleRepository as any,
  );
  Object.defineProperty(validator, 't', {
    value: (key: string) => key,
    configurable: true,
  });
  return { validator, deps };
}

const mockVehicle = {
  id: 'vhl_01',
  name: 'School Bus 1',
  licensePlate: 'MA-1234-A',
  type: 'fullbus',
  status: 'active',
  fuelType: 'diesel',
  year: 2024,
};

describe('VehicleValidator', () => {
  describe('checkVehicleExists', () => {
    it('passes when vehicle exists', async () => {
      const { validator, deps } = createValidator();
      deps.vehicleRepository.getById.mockImplementation(() => Promise.resolve(mockVehicle));

      const result = await validator.checkVehicleExists('vhl_01');
      expect(result).toBe(true);
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

  describe('checkVehicleIdIsUnique', () => {
    it('passes when no vehicle with that id exists', async () => {
      const { validator } = createValidator();
      await validator.checkVehicleIdIsUnique('new_id');
    });

    it('throws when id already exists', async () => {
      const { validator, deps } = createValidator();
      deps.vehicleRepository.getById.mockImplementation(() => Promise.resolve(mockVehicle));

      try {
        await validator.checkVehicleIdIsUnique('vhl_01');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('idExists');
      }
    });
  });

  describe('checkLicensePlateIsUnique', () => {
    it('skips check when licensePlate is undefined', async () => {
      const { validator, deps } = createValidator();
      await validator.checkLicensePlateIsUnique(undefined);
      expect(deps.vehicleRepository.getByLicensePlate).not.toHaveBeenCalled();
    });

    it('passes when licensePlate is not taken', async () => {
      const { validator } = createValidator();
      await validator.checkLicensePlateIsUnique('MA-NEW-01');
    });

    it('passes when licensePlate belongs to excluded vehicle', async () => {
      const { validator, deps } = createValidator();
      deps.vehicleRepository.getByLicensePlate.mockImplementation(() => Promise.resolve(mockVehicle));
      await validator.checkLicensePlateIsUnique('MA-1234-A', 'vhl_01');
    });

    it('throws when licensePlate belongs to different vehicle', async () => {
      const { validator, deps } = createValidator();
      deps.vehicleRepository.getByLicensePlate.mockImplementation(() => Promise.resolve(mockVehicle));

      try {
        await validator.checkLicensePlateIsUnique('MA-1234-A', 'other_id');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(409);
        expect(error.message).toBe('licensePlateExists');
      }
    });
  });

  describe('checkLicensePlateExists', () => {
    it('returns vehicle when found', async () => {
      const { validator, deps } = createValidator();
      deps.vehicleRepository.getByLicensePlate.mockImplementation(() => Promise.resolve(mockVehicle));
      const result = await validator.checkLicensePlateExists('MA-1234-A');
      expect(result).toEqual(mockVehicle);
    });

    it('throws when not found', async () => {
      const { validator } = createValidator();
      try {
        await validator.checkLicensePlateExists('MISSING');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(404);
      }
    });
  });

  describe('isVehicleExists', () => {
    it('returns true when vehicle exists', async () => {
      const { validator, deps } = createValidator();
      deps.vehicleRepository.getById.mockImplementation(() => Promise.resolve(mockVehicle));
      expect(await validator.isVehicleExists('vhl_01')).toBe(true);
    });

    it('returns false when vehicle not found', async () => {
      const { validator } = createValidator();
      expect(await validator.isVehicleExists('missing')).toBe(false);
    });
  });

  describe('isLicensePlateExists', () => {
    it('returns false when licensePlate is undefined', async () => {
      const { validator } = createValidator();
      expect(await validator.isLicensePlateExists(undefined)).toBe(false);
    });

    it('returns true when licensePlate found', async () => {
      const { validator, deps } = createValidator();
      deps.vehicleRepository.getByLicensePlate.mockImplementation(() => Promise.resolve(mockVehicle));
      expect(await validator.isLicensePlateExists('MA-1234-A')).toBe(true);
    });
  });

  describe('validateVehicleType', () => {
    it('accepts valid types', () => {
      const { validator } = createValidator();
      for (const type of ['sedan', 'minibus', 'fullbus', 'shuttle']) {
        expect(validator.validateVehicleType(type)).toBe(true);
      }
    });

    it('throws for invalid type', () => {
      const { validator } = createValidator();
      try {
        validator.validateVehicleType('truck');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidType');
      }
    });
  });

  describe('validateVehicleStatus', () => {
    it('accepts valid statuses', () => {
      const { validator } = createValidator();
      for (const status of ['active', 'maintenance', 'retired']) {
        expect(validator.validateVehicleStatus(status)).toBe(true);
      }
    });

    it('throws for invalid status', () => {
      const { validator } = createValidator();
      try {
        validator.validateVehicleStatus('unknown');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidStatus');
      }
    });
  });

  describe('validateFuelType', () => {
    it('accepts valid fuel types', () => {
      const { validator } = createValidator();
      for (const fuel of ['diesel', 'gasoline', 'electric', 'hybrid']) {
        expect(validator.validateFuelType(fuel)).toBe(true);
      }
    });

    it('throws for invalid fuel type', () => {
      const { validator } = createValidator();
      try {
        validator.validateFuelType('hydrogen');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidFuelType');
      }
    });
  });

  describe('checkYearIsValid', () => {
    it('accepts current year', () => {
      const { validator } = createValidator();
      const currentYear = new Date().getFullYear();
      expect(validator.checkYearIsValid(currentYear)).toBe(true);
    });

    it('accepts year 1900', () => {
      const { validator } = createValidator();
      expect(validator.checkYearIsValid(1900)).toBe(true);
    });

    it('throws for year below 1900', () => {
      const { validator } = createValidator();
      try {
        validator.checkYearIsValid(1899);
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidYear');
      }
    });

    it('throws for year in future', () => {
      const { validator } = createValidator();
      try {
        validator.checkYearIsValid(new Date().getFullYear() + 2);
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidYear');
      }
    });
  });

  describe('validateEngineHours', () => {
    it('accepts valid hours', () => {
      const { validator } = createValidator();
      expect(validator.validateEngineHours('100')).toBe(true);
    });

    it('accepts zero hours', () => {
      const { validator } = createValidator();
      expect(validator.validateEngineHours('0')).toBe(true);
    });

    it('throws for negative hours', () => {
      const { validator } = createValidator();
      try {
        validator.validateEngineHours('-5');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidEngineHours');
      }
    });

    it('throws for non-numeric hours', () => {
      const { validator } = createValidator();
      try {
        validator.validateEngineHours('abc');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidEngineHours');
      }
    });
  });

  describe('validateMileage', () => {
    it('accepts valid mileage', () => {
      const { validator } = createValidator();
      expect(validator.validateMileage('50000')).toBe(true);
    });

    it('throws for negative mileage', () => {
      const { validator } = createValidator();
      try {
        validator.validateMileage('-100');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidMileage');
      }
    });
  });

  describe('validateFuelCapacity', () => {
    it('returns true when capacity is undefined', () => {
      const { validator } = createValidator();
      expect(validator.validateFuelCapacity(undefined)).toBe(true);
    });

    it('accepts positive capacity', () => {
      const { validator } = createValidator();
      expect(validator.validateFuelCapacity('100')).toBe(true);
    });

    it('throws for zero capacity', () => {
      const { validator } = createValidator();
      try {
        validator.validateFuelCapacity('0');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidFuelCapacity');
      }
    });
  });

  describe('validatePurchasePrice', () => {
    it('returns true when price is undefined', () => {
      const { validator } = createValidator();
      expect(validator.validatePurchasePrice(undefined)).toBe(true);
    });

    it('accepts valid price', () => {
      const { validator } = createValidator();
      expect(validator.validatePurchasePrice('50000')).toBe(true);
    });

    it('throws for negative price', () => {
      const { validator } = createValidator();
      try {
        validator.validatePurchasePrice('-100');
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('invalidPurchasePrice');
      }
    });
  });

  describe('checkCurrentMileageValid', () => {
    it('passes when current mileage >= initial mileage', async () => {
      const { validator } = createValidator();
      const result = await validator.checkCurrentMileageValid(10000, 50000);
      expect(result).toBe(true);
    });

    it('throws when current mileage < initial mileage', async () => {
      const { validator } = createValidator();
      try {
        await validator.checkCurrentMileageValid(50000, 10000);
        expect.unreachable('Should have thrown');
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toBe('currentMileageLessThanInitial');
      }
    });

    it('passes when either value is null', async () => {
      const { validator } = createValidator();
      expect(await validator.checkCurrentMileageValid(null, 50000)).toBe(true);
      expect(await validator.checkCurrentMileageValid(10000, null)).toBe(true);
    });
  });

  describe('validate', () => {
    it('runs full validation for create', async () => {
      const { validator, deps } = createValidator();
      const data = {
        id: 'vhl_01',
        licensePlate: 'MA-1234-A',
        year: 2024,
        type: 'fullbus',
        status: 'active',
        fuelType: 'diesel',
      };

      const result = await validator.validate(data, null);
      expect(result).toEqual(data);
      expect(deps.vehicleRepository.getById).toHaveBeenCalledWith('vhl_01');
      expect(deps.vehicleRepository.getByLicensePlate).toHaveBeenCalledWith('MA-1234-A');
    });

    it('runs full validation for update with excludeId', async () => {
      const { validator, deps } = createValidator();
      deps.vehicleRepository.getById.mockImplementation(() => Promise.resolve(mockVehicle));
      const data = { name: 'Updated', licensePlate: 'MA-1234-A' };

      await validator.validate(data, 'vhl_01');
      expect(deps.vehicleRepository.getByLicensePlate).toHaveBeenCalledWith('MA-1234-A');
    });

    it('skips optional field checks when not provided', async () => {
      const { validator, deps } = createValidator();
      const data = { name: 'Test' };

      await validator.validate(data, null);
      expect(deps.vehicleRepository.getByLicensePlate).not.toHaveBeenCalled();
    });
  });
});
