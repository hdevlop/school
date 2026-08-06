import { Err, I18n, Service } from '@server/najm';
import { DriverRepository } from './DriverRepository';
import { UserValidator } from '@server/auth';
import { getBusinessDate } from '@server/shared/businessDate';

@Service()
export class DriverValidator {
  @I18n('drivers.errors') private t!: (key: string) => string;

  constructor(
    private driverRepository: DriverRepository,
    private userValidator: UserValidator,
  ) { }


  // ========== UNIQUENESS CHECKS ==========

  async checkUserIdIsUnique(id: string) {
    await this.userValidator.checkUserIdIsUnique(id);
  }

  async checkIdIsUnique(id: string) {
    const existingDriver = await this.driverRepository.getById(id);
    if (existingDriver) {
      Err(409, this.t('idExists'));
    }
  }

  async checkCinIsUnique(cin, excludeId = null) {
    if (!cin) return;
    const existingDriver = await this.driverRepository.getByCin(cin);
    if (existingDriver && existingDriver.id !== excludeId) {
      Err(409, this.t('cinExists'));
    }
  }

  async checkLicenseNumberIsUnique(licenseNumber, excludeId = null) {
    if (!licenseNumber) return;
    const existingDriver = await this.driverRepository.getByLicenseNumber(licenseNumber);
    if (existingDriver && existingDriver.id !== excludeId) {
      Err(409, this.t('licenseExists'));
    }
  }

  // ========== EXISTENCE CHECKS ==========

  async isExists(id) {
    const existingDriver = await this.driverRepository.getById(id);
    return !!existingDriver;
  }

  async isCinExists(cin) {
    if (!cin) return false;
    const existingDriver = await this.driverRepository.getByCin(cin);
    return !!existingDriver;
  }

  async isLicenseNumberExists(licenseNumber) {
    if (!licenseNumber) return false;
    const existingDriver = await this.driverRepository.getByLicenseNumber(licenseNumber);
    return !!existingDriver;
  }

  async isEmailExists(email) {
    if (!email) return false;
    const existingDriver = await this.driverRepository.getByEmail(email);
    return !!existingDriver;
  }

  async isPhoneExists(phone) {
    if (!phone) return false;
    const existingDriver = await this.driverRepository.getByPhone(phone);
    return !!existingDriver;
  }

  async checkExists(id) {
    const driverExists = await this.isExists(id);
    if (!driverExists) {
      Err(404, this.t('notFound'));
    }
    return true;
  }

  async checkCinExists(cin) {
    const driver = await this.driverRepository.getByCin(cin);
    if (!driver) {
      Err(404, this.t('notFound'));
    }
    return driver;
  }

  async checkLicenseNumberExists(licenseNumber) {
    const driver = await this.driverRepository.getByLicenseNumber(licenseNumber);
    if (!driver) {
      Err(404, this.t('notFound'));
    }
    return driver;
  }

  async checkEmailExists(email) {
    const driver = await this.driverRepository.getByEmail(email);
    if (!driver) {
      Err(404, this.t('notFound'));
    }
    return driver;
  }

  async checkPhoneExists(phone) {
    const driver = await this.driverRepository.getByPhone(phone);
    if (!driver) {
      Err(404, this.t('notFound'));
    }
    return driver;
  }

  // ========== UNIQUENESS CHECKS (throw errors) ==========

  async checkEmailIsUnique(email, excludeId = null) {
    if (!email) return;
    const existingDriver = await this.driverRepository.getByEmail(email);
    if (existingDriver && existingDriver.id !== excludeId) {
      Err(409, this.t('emailExists'));
    }
  }

  async checkPhoneIsUnique(phone, excludeId = null) {
    if (!phone) return;
    const existingDriver = await this.driverRepository.getByPhone(phone);
    if (existingDriver && existingDriver.id !== excludeId) {
      Err(409, this.t('phoneExists'));
    }
  }

  // ========== FIELD VALIDATION ==========

  async validateDriverStatus(status) {
    const validStatuses = ['active', 'inactive', 'onLeave', 'suspended'];
    if (!validStatuses.includes(status)) {
      Err(400, this.t('invalidStatus'));
    }
    return true;
  }

  async validateLicenseExpiry(licenseExpiry) {
    const expiryDate = new Date(licenseExpiry);
    const today = getBusinessDate();

    if (expiryDate < today) {
      Err(400, this.t('licenseExpired'));
    }
    return true;
  }


  async validate(data, excludeId = null) {
    const isUpdate = excludeId !== null;

    if (isUpdate) {
      await this.checkExists(excludeId);
    }

    const { id, userId, cin, licenseNumber, status, licenseExpiry, phone, email } = data;

    if (!isUpdate) {
      if (userId) await this.checkUserIdIsUnique(userId);
      if (id) await this.checkIdIsUnique(id);
    }

    if (isUpdate) {
      await this.checkExists(excludeId);
    }

    if (cin) await this.checkCinIsUnique(cin, excludeId);
    if (licenseNumber) await this.checkLicenseNumberIsUnique(licenseNumber, excludeId);
    if (phone) await this.checkPhoneIsUnique(phone, excludeId);
    if (email) await this.checkEmailIsUnique(email, excludeId);
    if (licenseExpiry) await this.validateLicenseExpiry(licenseExpiry);
    if (status) await this.validateDriverStatus(status);

    return data;
  }
}
