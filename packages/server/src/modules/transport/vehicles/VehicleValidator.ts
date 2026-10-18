import { Err, I18n, Service } from '../../../najm';
import { VehicleRepository } from './VehicleRepository';
import { getBusinessDate } from '../../../shared/businessDate';


@Service()
export class VehicleValidator {
  @I18n('vehicles.errors') private t!: (key: string, params?: Record<string, unknown>) => string;

  constructor(
    private vehicleRepository: VehicleRepository,
  ) { }

  async checkVehicleIdIsUnique(id) {
    const existingVehicle = await this.vehicleRepository.getById(id);
    if (existingVehicle) {
      Err(409, this.t('idExists'));
    }
  }

  async ensureCanDelete(id: string) {
    if (await this.vehicleRepository.isInUse(id)) Err(409, this.t('hasReferences'));
  }

  async isVehicleExists(id) {
    const existingVehicle = await this.vehicleRepository.getById(id);
    return !!existingVehicle;
  }


  async isLicensePlateExists(licensePlate) {
    if (!licensePlate) return false;
    const existingVehicle = await this.vehicleRepository.getByLicensePlate(licensePlate);
    return !!existingVehicle;
  }

  validateVehicleType(type) {
    const validTypes = ['sedan', 'minibus', 'fullbus', 'shuttle'];
    if (!validTypes.includes(type)) {
      Err(400, this.t('invalidType'));
    }
    return true;
  }

  validateVehicleStatus(status) {
    const validStatuses = ['active', 'maintenance', 'retired']; 
    if (!validStatuses.includes(status)) {
      Err(400, this.t('invalidStatus'));
    }
    return true;
  }

  validateFuelType(fuelType) {
    const validFuelTypes = ['diesel', 'gasoline', 'electric', 'hybrid'];
    if (!validFuelTypes.includes(fuelType)) {
      Err(400, this.t('invalidFuelType'));
    }
    return true;
  }

  checkYearIsValid(year) {
    const currentYear = getBusinessDate().getFullYear();
    const minYear = 1900;

    if (year < minYear || year > currentYear) {
      Err(400, this.t('invalidYear', { minYear, currentYear }));
    }
    return true;
  }

  //======================= Existence Checks (throw errors)

  async checkVehicleExists(id) {
    const vehicleExists = await this.isVehicleExists(id);
    if (!vehicleExists) {
      Err(404, this.t('notFound'));
    }
    return true;
  }


  async checkLicensePlateExists(licensePlate) {
    const vehicle = await this.vehicleRepository.getByLicensePlate(licensePlate);
    if (!vehicle) {
      Err(404, this.t('notFound'));
    }
    return vehicle;
  }

  //======================= Uniqueness Checks (throw errors)

  async checkLicensePlateIsUnique(licensePlate, excludeId = null) {
    if (!licensePlate) return;

    const existingVehicle = await this.vehicleRepository.getByLicensePlate(licensePlate);
    if (existingVehicle && existingVehicle.id !== excludeId) {
      Err(409, this.t('licensePlateExists'));
    }
  }

  //======================= Input Validation Helpers

  validateEngineHours(hours) {
    const numericHours = parseFloat(hours);
    if (isNaN(numericHours) || numericHours < 0) {
      Err(400, this.t('invalidEngineHours'));
    }
    return true;
  }

  validateMileage(mileage) {
    const numericMileage = parseFloat(mileage);
    if (isNaN(numericMileage) || numericMileage < 0) {
      Err(400, this.t('invalidMileage'));
    }
    return true;
  }

  validateFuelCapacity(capacity) {
    if (!capacity) return true;

    const numericCapacity = parseFloat(capacity);
    if (isNaN(numericCapacity) || numericCapacity <= 0) {
      Err(400, this.t('invalidFuelCapacity'));
    }
    return true;
  }

  validatePurchasePrice(price) {
    if (!price) return true;

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      Err(400, this.t('invalidPurchasePrice'));
    }
    return true;
  }

  // ========== UNIFIED VALIDATION ==========

  async validate(data, excludeId = null) {
    const isUpdate = excludeId !== null;
    let existingVehicle = null;

    if (isUpdate) {
      existingVehicle = await this.vehicleRepository.getById(excludeId);
      if (!existingVehicle) Err(404, this.t('notFound'));
    }

    const { id, licensePlate, year, type, status, fuelType, tankCapacity, purchasePrice } = data;

    if (!isUpdate) {
      if (id) await this.checkVehicleIdIsUnique(id);
    }

    if (licensePlate) await this.checkLicensePlateIsUnique(licensePlate, excludeId);
    if (year) this.checkYearIsValid(isUpdate ? parseInt(year) : year);
    if (type) this.validateVehicleType(type);
    if (status) this.validateVehicleStatus(status);
    if (fuelType) this.validateFuelType(fuelType);
    if (tankCapacity) this.validateFuelCapacity(tankCapacity);
    if (purchasePrice) this.validatePurchasePrice(purchasePrice);
    if (data.initialMileage != null || data.currentMileage != null) {
      await this.checkCurrentMileageValid(
        data.initialMileage ?? existingVehicle?.initialMileage,
        data.currentMileage ?? existingVehicle?.currentMileage,
      );
    }

    return data;
  }

  // ========================================
  // VEHICLE_VALIDATIONS
  // ========================================

  async checkCurrentMileageValid(
    initialMileage?: number | string | null,
    currentMileage?: number | string | null
  ) {
    if (
      initialMileage !== undefined &&
      initialMileage !== null &&
      currentMileage !== undefined &&
      currentMileage !== null
    ) {
      if (Number(currentMileage) < Number(initialMileage)) {
        Err(400, this.t('currentMileageLessThanInitial'));
      }
    }
    return true;
  }

}
