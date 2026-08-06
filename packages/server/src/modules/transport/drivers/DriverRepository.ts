import { DB } from '@server/database/db';
import { drivers, staff, users, vehicles } from '@server/database/schema';
import { count, eq, desc, and, gte, lte, inArray } from 'drizzle-orm';
import { Repository } from '@server/najm';
import { getBusinessDate, getBusinessDateOnly } from '@server/shared/businessDate';

const driverSelect = {
  id: drivers.id,
  staffId: drivers.staffId,
  userId: staff.userId,
  cin: staff.cin,
  name: staff.name,
  phone: staff.phone,
  address: staff.address,
  gender: staff.gender,
  licenseNumber: drivers.licenseNumber,
  licenseType: drivers.licenseType,
  licenseExpiry: drivers.licenseExpiry,
  hireDate: staff.hireDate,
  salary: staff.salary,
  compensationMode: staff.compensationMode,
  hourlyRate: staff.hourlyRate,
  workloadHours: staff.workloadHours,
  yearsOfExperience: drivers.yearsOfExperience,
  emergencyContact: staff.emergencyContact,
  emergencyPhone: staff.emergencyPhone,
  status: staff.status,
  notes: drivers.notes,
  createdAt: drivers.createdAt,
  updatedAt: drivers.updatedAt,
  email: users.email,
  image: users.image,
};

@Repository()
export class DriverRepository {

  declare db: DB;

  // ========================================
  // QUERY_BUILDERS (Reusable)
  // ========================================

  private buildDriverQuery() {
    return this.db
      .select(driverSelect)
      .from(drivers)
      .innerJoin(staff, eq(drivers.staffId, staff.id))
      .leftJoin(users, eq(staff.userId, users.id));
  }

  // ========================================
  // GET / READ METHODS
  // ========================================

  async getCount() {
    const [driverCount] = await this.db
      .select({ count: count() })
      .from(drivers);
    return driverCount;
  }

  async getAll() {
    return await this.getAllDrivers();
  }

  async getAllDrivers() {
    return await this.buildDriverQuery()
      .orderBy(desc(drivers.createdAt));
  }

  async getByIds(ids) {
    if (!ids || ids.length === 0) return [];

    return await this.buildDriverQuery()
      .where(inArray(drivers.id, ids))
      .orderBy(desc(drivers.createdAt));
  }

  async getById(id) {
    const [existingDriver] = await this.buildDriverQuery()
      .where(eq(drivers.id, id))
      .limit(1);

    return existingDriver || null;
  }

  async getByStaffId(staffId: string) {
    const [existingDriver] = await this.buildDriverQuery()
      .where(eq(drivers.staffId, staffId))
      .limit(1);
    return existingDriver || null;
  }

  async getByStatus(status) {
    return await this.buildDriverQuery()
      .where(eq(staff.status, status))
      .orderBy(desc(drivers.createdAt));
  }

  async getByCin(cin) {
    const [existingDriver] = await this.buildDriverQuery()
      .where(eq(staff.cin, cin))
      .limit(1);
    return existingDriver;
  }

  async getByLicenseNumber(licenseNumber) {
    const [existingDriver] = await this.buildDriverQuery()
      .where(eq(drivers.licenseNumber, licenseNumber))
      .limit(1);
    return existingDriver;
  }

  async getLicenseExpiringDrivers(daysAhead: number = 30) {
    const futureDate = getBusinessDate();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return await this.buildDriverQuery()
      .where(
        and(
          eq(staff.status, 'active'),
          lte(drivers.licenseExpiry, futureDate.toISOString().split('T')[0]),
          gte(drivers.licenseExpiry, getBusinessDateOnly())
        )
      )
      .orderBy(drivers.licenseExpiry);
  }

  async getByEmail(email) {
    const [existingDriver] = await this.buildDriverQuery()
      .where(eq(users.email, email))
      .limit(1);
    return existingDriver;
  }

  async getByPhone(phone) {
    const [existingDriver] = await this.buildDriverQuery()
      .where(eq(staff.phone, phone))
      .limit(1);
    return existingDriver;
  }

  // ========================================
  // CREATE_METHODS
  // ========================================

  async create(data) {
    const [newDriver] = await this.db
      .insert(drivers)
      .values(data)
      .returning();
    return newDriver;
  }

  // ========================================
  // UPDATE_METHODS
  // ========================================

  async update(id, data) {
    const [updatedDriver] = await this.db
      .update(drivers)
      .set(data)
      .where(eq(drivers.id, id))
      .returning();
    return updatedDriver;
  }

  // ========================================
  // DELETE_METHODS
  // ========================================

  async delete(id) {
    const [deletedDriver] = await this.db
      .delete(drivers)
      .where(eq(drivers.id, id))
      .returning();
    return deletedDriver;
  }

  async deleteAll() {
    const allDrivers = await this.buildDriverQuery()
      .orderBy(desc(drivers.createdAt));
    const userIds = allDrivers
      .map(driver => driver.userId)
      .filter(userId => userId !== null);

    const deletedDrivers = await this.db
      .delete(drivers)
      .returning();

    let deletedUsers = [];

    if (userIds.length > 0) {
      deletedUsers = await this.db
        .delete(users)
        .where(inArray(users.id, userIds))
        .returning();
    }

    return {
      deletedCount: deletedDrivers.length,
      deletedDrivers: deletedDrivers
    };
  }
}
