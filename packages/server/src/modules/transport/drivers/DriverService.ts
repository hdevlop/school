import { Service, Transaction, Events, EventService } from '@server/najm';
import { DriverRepository } from './DriverRepository';
import { DriverValidator } from './DriverValidator';
import { UserService } from '@server/auth';
import { StorageService } from 'najm-storage';
import { pickProps } from '@server/shared';
import { resolveUserPassword } from '@server/shared/userPassword';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { StaffService } from '../../staff/StaffService';
import { drivers as driversTable, staff as staffTable } from '@server/database/schema';
import { db } from '@server/database/db';
import type {
  CreateDriverDto,
  CreateDriversBulkDto,
  DeleteDriversBulkDto,
  UpdateDriverDto,
} from './DriverDto';

@Service()
export class DriverService {
  @Events() private events!: EventService;


  constructor(
    private driverRepository: DriverRepository,
    private driverValidator: DriverValidator,
    private userService: UserService,
    private storage: StorageService,
    private staffService: StaffService,
  ) { }

  // ========== RETRIEVAL METHODS ==========

  async getAll() {
    return await this.driverRepository.getAll();
  }

  async getCount() {
    return await this.driverRepository.getCount();
  }

  async getById(id: string) {
    await this.driverValidator.checkExists(id);
    return await this.driverRepository.getById(id);
  }

  async getByCin(cin: string) {
    await this.driverValidator.checkCinExists(cin);
    return await this.driverRepository.getByCin(cin);
  }

  async getByLicenseNumber(licenseNumber: string) {
    await this.driverValidator.checkLicenseNumberExists(licenseNumber);
    return await this.driverRepository.getByLicenseNumber(licenseNumber);
  }

  async getByEmail(email: string) {
    await this.driverValidator.checkEmailExists(email);
    return await this.driverRepository.getByEmail(email);
  }

  async getByPhone(phone: string) {
    await this.driverValidator.checkPhoneExists(phone);
    return await this.driverRepository.getByPhone(phone);
  }

  async getByStatus(status: string) {
    await this.driverValidator.validateDriverStatus(status);
    return await this.driverRepository.getByStatus(status);
  }

  async getLicenseExpiringDrivers() {
    return await this.driverRepository.getLicenseExpiringDrivers();
  }

  // ========== CREATE-METHOD ==========

  @Transaction()
  async create(data: CreateDriverDto) {
    await this.driverValidator.validate(data);

    const driverId = data.id || nanoid(5);

    const genderSuffix = data.gender === 'F' ? 'female' : 'male';
    const image = await this.storage.processFile(driverId, data?.image, {
      filePath: 'avatar.png',
      fallback: `/images/driver_${genderSuffix}.png`,
    });

    const user = await this.userService.create({
      id: data.userId,
      email: data.email,
      name: data.name,
      image,
      password: resolveUserPassword(data.password),
      role: 'driver',
    });

    const staffMember = await this.staffService.create({
      userId: user.id,
      name: data.name,
      cin: data.cin,
      gender: data.gender,
      phone: data.phone,
      address: data.address,
      role: 'driver',
      salary: data.salary,
      compensationMode: data.compensationMode || 'monthly',
      hourlyRate: data.hourlyRate,
      workloadHours: data.workloadHours,
      hireDate: data.hireDate,
      status: data.status,
      emergencyContact: data.emergencyContact,
      emergencyPhone: data.emergencyPhone,
      // Staff-centric flow: StaffService owns the driver-row create via its
      // driver roleSupport handler. Pass the license profile (and the desired
      // driver id) so it's created once — not duplicated here.
      profile: {
        id: driverId,
        licenseNumber: data.licenseNumber,
        licenseType: data.licenseType,
        licenseExpiry: data.licenseExpiry,
        yearsOfExperience: data.yearsOfExperience,
        notes: data.notes,
      },
    });

    const driver = await this.driverRepository.getByStaffId(staffMember.id);
    return await this.driverRepository.getById(driver.id);
  }

  // ========== UPDATE-METHOD ==========

  async update(id: string, data: UpdateDriverDto) {
    const USER_UPDATE_KEYS = [
      'name', 'email', 'image', 'password'
    ];

    const STAFF_UPDATE_KEYS = [
      'name', 'cin', 'phone', 'address', 'gender', 'hireDate', 'salary',
      'compensationMode', 'hourlyRate', 'workloadHours', 'emergencyContact',
      'emergencyPhone', 'status'
    ];

    const DRIVER_UPDATE_KEYS = [
      'licenseNumber', 'licenseType', 'licenseExpiry', 'yearsOfExperience', 'notes'
    ];

    await this.driverValidator.validate(data, id);

    const driver = await this.driverRepository.getById(id);
    const userData = pickProps(data, USER_UPDATE_KEYS);
    const staffData = pickProps(data, STAFF_UPDATE_KEYS);
    const driverData = pickProps(data, DRIVER_UPDATE_KEYS);

    if (data.image !== undefined) {
      const genderSuffix = data.gender === 'F' ? 'female' : 'male';
      userData.image = await this.storage.processFile(id, data.image, {
        filePath: 'avatar.png',
        fallback: `/images/driver_${genderSuffix}.png`,
      });
    }

    if (Object.keys(userData).length > 0) {
      await this.userService.update(driver.userId, userData);
    }

    if (Object.keys(staffData).length > 0) {
      await this.staffService.update(driver.staffId, { ...staffData, role: 'driver' });
    }

    if (Object.keys(driverData).length > 0) {
      await this.driverRepository.update(id, driverData);
    }

    return await this.driverRepository.getById(id);
  }

  // ========== STATUS-UPDATE-METHOD ==========

  async updateStatus(id: string, status: string) {
    await this.driverValidator.checkExists(id);
    await this.driverValidator.validateDriverStatus(status);
    const driver = await this.driverRepository.getById(id);
    await this.staffService.update(driver.staffId, { status, role: 'driver' });
    return await this.driverRepository.getById(id);
  }

  // ========== DELETE-METHODS ==========

  @Transaction()
  async delete(id: string) {
    const driver = await this.driverRepository.getById(id);
    await this.driverValidator.checkExists(id);
    const deletedDriver = await this.driverRepository.delete(id);
    if (driver?.staffId) await this.staffService.delete(driver.staffId);
    this.storage.emitDeleted(id);
    return deletedDriver;
  }

  @Transaction()
  async deleteAll() {
    const linkedStaffIds = await db
      .select({ id: staffTable.id })
      .from(staffTable)
      .innerJoin(driversTable, eq(driversTable.staffId, staffTable.id));
    const result = await this.driverRepository.deleteAll();
    for (const { id } of linkedStaffIds) {
      await this.staffService.delete(id);
    }
    return result;
  }

  async deleteBulk(ids: DeleteDriversBulkDto) {
    const results = await Promise.all(
      ids.map((id) => this.delete(id))
    );
    return {
      deletedCount: results.length,
      deletedDrivers: results,
      deletedFees: results,
    };
  }

  // ========== SEED METHOD ==========

  async createBulk(driversData: CreateDriversBulkDto) {
    const createdDrivers = [];

    for (const [index, driverData] of driversData.entries()) {
      try {
        const driver = await this.create(driverData);
        createdDrivers.push(driver);
      } catch (error: any) {
        if (error?.status === 409) continue;
        const identifier = driverData.licenseNumber || driverData.id || driverData.name || `at index ${index}`;
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to create driver ${identifier}: ${message}`);
      }
    }
    return createdDrivers;
  }
}
