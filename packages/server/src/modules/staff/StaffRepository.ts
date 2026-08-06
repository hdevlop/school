import { DB } from '@server/database/db';
import {
  accountantAssignments,
  assistantAssignments,
  busAssistantAssignments,
  cleanerAssignments,
  classes,
  cycles,
  drivers,
  sections,
  securityAssignments,
  staff,
  staffRoles,
  teachers,
  users,
  vehicleAssignments,
  vehicles,
  zones,
} from '@server/database/schema';
import { Repository } from '@server/najm';
import { and, count, desc, eq, gte, inArray, isNull, lte, notInArray, or, sql } from 'drizzle-orm';

// Roles managed on their own dedicated page, excluded from the unified Staff list.
const STAFF_LIST_EXCLUDED_ROLES = ['teacher'];

const staffSelect = {
  id: staff.id,
  userId: staff.userId,
  employeeCode: staff.employeeCode,
  name: staff.name,
  cin: staff.cin,
  gender: staff.gender,
  phone: staff.phone,
  address: staff.address,
  medicalConditions: staff.medicalConditions,
  role: staff.role,
  department: staff.department,
  compensationMode: staff.compensationMode,
  salary: staff.salary,
  hourlyRate: staff.hourlyRate,
  workloadHours: staff.workloadHours,
  shift: staff.shift,
  licenseNumber: drivers.licenseNumber,
  licenseType: drivers.licenseType,
  licenseExpiry: drivers.licenseExpiry,
  yearsOfExperience: drivers.yearsOfExperience,
  notes: drivers.notes,
  employmentType: staff.employmentType,
  hireDate: staff.hireDate,
  endDate: staff.endDate,
  status: staff.status,
  bankAccount: staff.bankAccount,
  emergencyContact: staff.emergencyContact,
  emergencyPhone: staff.emergencyPhone,
  email: sql<string | null>`COALESCE(${staff.email}, ${users.email})`,
  image: users.image,
  createdAt: staff.createdAt,
  updatedAt: staff.updatedAt,
  roleLabel: staffRoles.label,
  roleLabels: staffRoles.labels,
  roleCategory: staffRoles.category,
};

@Repository()
export class StaffRepository {
  declare db: DB;

  private buildQuery() {
    return this.db
      .select(staffSelect)
      .from(staff)
      .leftJoin(users, eq(staff.userId, users.id))
      .leftJoin(staffRoles, eq(staff.role, staffRoles.code))
      .leftJoin(drivers, eq(drivers.staffId, staff.id));
  }

  private async withAssignments<T extends { id: string }>(rows: T[]) {
    if (!rows.length) return rows;

    const staffIds = rows.map((row) => row.id);
    const assignmentMap = new Map<string, any[]>();
    const addAssignment = (staffId: string, assignment: any) => {
      const existing = assignmentMap.get(staffId) || [];
      existing.push(assignment);
      assignmentMap.set(staffId, existing);
    };

    const cleanerRows = await this.db
      .select({
        id: cleanerAssignments.id,
        staffId: cleanerAssignments.staffId,
        status: cleanerAssignments.status,
        startDate: cleanerAssignments.startDate,
        endDate: cleanerAssignments.endDate,
        notes: cleanerAssignments.notes,
        zoneId: cleanerAssignments.zoneId,
        zoneName: zones.name,
        zoneBuilding: zones.building,
        zoneFloor: zones.floor,
      })
      .from(cleanerAssignments)
      .leftJoin(zones, eq(cleanerAssignments.zoneId, zones.id))
      .where(inArray(cleanerAssignments.staffId, staffIds));

    const assistantRows = await this.db
      .select({
        id: assistantAssignments.id,
        staffId: assistantAssignments.staffId,
        status: assistantAssignments.status,
        startDate: assistantAssignments.startDate,
        endDate: assistantAssignments.endDate,
        notes: assistantAssignments.notes,
        classId: assistantAssignments.classId,
        className: classes.name,
        sectionId: assistantAssignments.sectionId,
        sectionName: sections.name,
      })
      .from(assistantAssignments)
      .leftJoin(classes, eq(assistantAssignments.classId, classes.id))
      .leftJoin(sections, eq(assistantAssignments.sectionId, sections.id))
      .where(inArray(assistantAssignments.staffId, staffIds));

    const accountantRows = await this.db
      .select({
        id: accountantAssignments.id,
        staffId: accountantAssignments.staffId,
        status: accountantAssignments.status,
        startDate: accountantAssignments.startDate,
        endDate: accountantAssignments.endDate,
        notes: accountantAssignments.notes,
        cycleId: accountantAssignments.cycleId,
        cycleName: cycles.name,
        cycleLabels: cycles.labels,
      })
      .from(accountantAssignments)
      .leftJoin(cycles, eq(accountantAssignments.cycleId, cycles.id))
      .where(inArray(accountantAssignments.staffId, staffIds));

    const securityRows = await this.db
      .select({
        id: securityAssignments.id,
        staffId: securityAssignments.staffId,
        status: securityAssignments.status,
        startDate: securityAssignments.startDate,
        endDate: securityAssignments.endDate,
        notes: securityAssignments.notes,
        zoneId: securityAssignments.zoneId,
        zoneName: zones.name,
        zoneBuilding: zones.building,
        zoneFloor: zones.floor,
      })
      .from(securityAssignments)
      .leftJoin(zones, eq(securityAssignments.zoneId, zones.id))
      .where(inArray(securityAssignments.staffId, staffIds));

    // Driver vehicle links live in transport.vehicle_assignments, joined back to staff
    // through the drivers row (drivers.staffId).
    const driverRows = await this.db
      .select({
        id: vehicleAssignments.id,
        staffId: drivers.staffId,
        status: vehicleAssignments.status,
        vehicleId: vehicleAssignments.vehicleId,
        vehicleName: vehicles.name,
        vehiclePlate: vehicles.licensePlate,
        notes: vehicleAssignments.notes,
      })
      .from(vehicleAssignments)
      .innerJoin(drivers, eq(vehicleAssignments.driverId, drivers.id))
      .leftJoin(vehicles, eq(vehicleAssignments.vehicleId, vehicles.id))
      .where(inArray(drivers.staffId, staffIds));

    const busAssistantRows = await this.db
      .select({
        id: busAssistantAssignments.id,
        staffId: busAssistantAssignments.staffId,
        status: busAssistantAssignments.status,
        startDate: busAssistantAssignments.startDate,
        endDate: busAssistantAssignments.endDate,
        notes: busAssistantAssignments.notes,
        vehicleId: busAssistantAssignments.vehicleId,
        vehicleName: vehicles.name,
        vehiclePlate: vehicles.licensePlate,
      })
      .from(busAssistantAssignments)
      .leftJoin(vehicles, eq(busAssistantAssignments.vehicleId, vehicles.id))
      .where(inArray(busAssistantAssignments.staffId, staffIds));

    cleanerRows.forEach((row) => addAssignment(row.staffId, { ...row, type: 'cleaner' }));
    assistantRows.forEach((row) => addAssignment(row.staffId, { ...row, type: 'assistant' }));
    accountantRows.forEach((row) => addAssignment(row.staffId, { ...row, type: 'accountant' }));
    securityRows.forEach((row) => addAssignment(row.staffId, { ...row, type: 'security' }));
    busAssistantRows.forEach((row) => addAssignment(row.staffId, { ...row, type: 'busAssistant' }));
    driverRows.forEach((row) => addAssignment(row.staffId, { ...row, type: 'driver' }));

    return rows.map((row) => ({
      ...row,
      assignments: assignmentMap.get(row.id) || [],
    }));
  }

  async getAll() {
    const rows = await this.buildQuery()
      .where(notInArray(staff.role, STAFF_LIST_EXCLUDED_ROLES))
      .orderBy(desc(staff.createdAt));
    return this.withAssignments(rows);
  }

  async getAttendanceRoster(date: string) {
    const rows = await this.buildQuery()
      .where(and(
        lte(staff.hireDate, date),
        or(isNull(staff.endDate), gte(staff.endDate, date)),
        inArray(staff.status, ['active', 'onLeave']),
      ))
      .orderBy(desc(staff.createdAt));
    return this.withAssignments(rows);
  }

  async getCount() {
    const [row] = await this.db.select({ count: count() }).from(staff);
    return row;
  }

  async getById(id: string) {
    const [row] = await this.buildQuery().where(eq(staff.id, id)).limit(1);
    if (!row) return null;
    const [enriched] = await this.withAssignments([row]);
    return enriched || null;
  }

  async getByEmployeeCode(employeeCode: string) {
    const [row] = await this.buildQuery()
      .where(eq(staff.employeeCode, employeeCode))
      .limit(1);
    if (!row) return null;
    const [enriched] = await this.withAssignments([row]);
    return enriched || null;
  }

  async getByCin(cin: string) {
    if (!cin) return null;
    const [row] = await this.buildQuery().where(eq(staff.cin, cin)).limit(1);
    if (!row) return null;
    const [enriched] = await this.withAssignments([row]);
    return enriched || null;
  }

  async getByEmail(email: string) {
    if (!email) return null;
    const [row] = await this.buildQuery()
      .where(or(eq(staff.email, email), eq(users.email, email)))
      .limit(1);
    if (!row) return null;
    const [enriched] = await this.withAssignments([row]);
    return enriched || null;
  }

  async getByUserId(userId: string) {
    const [row] = await this.buildQuery().where(eq(staff.userId, userId)).limit(1);
    if (!row) return null;
    const [enriched] = await this.withAssignments([row]);
    return enriched || null;
  }

  async getByRole(role: string) {
    const rows = await this.buildQuery()
      .where(eq(staff.role, role))
      .orderBy(desc(staff.createdAt));
    return this.withAssignments(rows);
  }

  async getByStatus(status: string) {
    const rows = await this.buildQuery()
      .where(eq(staff.status, status))
      .orderBy(desc(staff.createdAt));
    return this.withAssignments(rows);
  }

  async getByIds(ids: string[]) {
    if (!ids || ids.length === 0) return [];
    const rows = await this.buildQuery().where(inArray(staff.id, ids));
    return this.withAssignments(rows);
  }

  async getLinkedTeacher(staffId: string) {
    const [row] = await this.db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.staffId, staffId))
      .limit(1);
    return row ?? null;
  }

  async getLinkedDriver(staffId: string) {
    const [row] = await this.db
      .select({ id: drivers.id })
      .from(drivers)
      .where(eq(drivers.staffId, staffId))
      .limit(1);
    return row ?? null;
  }

  async create(data: typeof staff.$inferInsert) {
    const [row] = await this.db.insert(staff).values(data).returning();
    return row;
  }

  async update(id: string, data: Partial<typeof staff.$inferInsert>) {
    const [row] = await this.db
      .update(staff)
      .set(data)
      .where(eq(staff.id, id))
      .returning();
    return row;
  }

  async delete(id: string) {
    const [row] = await this.db.delete(staff).where(eq(staff.id, id)).returning();
    return row;
  }

  async deleteAll() {
    return await this.db.delete(staff).returning();
  }
}
