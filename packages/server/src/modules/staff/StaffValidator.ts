import { Err, I18n, Service } from '../../najm';
import { StaffRepository } from './StaffRepository';
import { StaffRoleRepository } from './roles/StaffRoleRepository';

@Service()
export class StaffValidator {
  @I18n('staff.errors') private t!: (key: string, params?: Record<string, unknown>) => string;
  @I18n('staffRoles.errors') private roleT!: (key: string) => string;

  constructor(
    private staffRepository: StaffRepository,
    private staffRoleRepository: StaffRoleRepository,
  ) { }

  ensureLoginEmail(email?: string) {
    if (!email) Err(400, this.t('emailRequiredForLogin'));
  }

  ensureAppAccessRole(accessRoleId: string | null) {
    if (!accessRoleId) Err(400, this.t('roleHasNoAppAccess'));
  }

  ensureDriverProfile(profile?: Record<string, any>, partial = false) {
    if (!profile) {
      if (partial) return;
      Err(400, this.t('driverLicenseRequired'));
    }
    for (const key of ['licenseNumber', 'licenseType', 'licenseExpiry']) {
      if (!partial && !profile[key]) Err(400, this.t('driverFieldRequired', { field: key }));
    }
  }

  ensureAssignments(role: string, assignments?: Record<string, any>[]) {
    if (!assignments?.length) return;
    for (const assignment of assignments) {
      if (role === 'cleaner' && !assignment.zoneId) Err(400, this.t('cleanerZoneRequired'));
      if (role === 'assistant' && !assignment.classId) Err(400, this.t('assistantClassRequired'));
      if (role === 'busAssistant' && !assignment.vehicleId) Err(400, this.t('busAssistantVehicleRequired'));
      if (role === 'accountant' && !assignment.cycleId) Err(400, this.t('accountantCycleRequired'));
      if (role === 'security' && !assignment.zoneId) Err(400, this.t('securityZoneRequired'));
      if (role === 'driver' && !assignment.vehicleId) Err(400, this.t('driverVehicleRequired'));
    }
  }

  ensureStaffRecord<T>(staff: T | null | undefined): T {
    if (!staff) Err(404, this.t('staffNotFound'));
    return staff;
  }

  ensureDeletionAllowed(hasLinkedProfile: boolean, allowLinked?: boolean) {
    if (hasLinkedProfile && !allowLinked) Err(409, this.t('linkedToTeacherOrDriver'));
  }

  // Payslips, attendance marks and timetable duties restrict the delete in the
  // database; say why instead of failing on the foreign key.
  ensureNoRecordedHistory(history: { payslips: number; attendance: number; duties: number }) {
    if (history.payslips || history.attendance || history.duties) {
      Err(409, this.t('hasHistory'));
    }
  }

  // Leaving the driver role deletes the driver profile, and its vehicle
  // assignments with it, in every year.
  ensureDriverRoleChangeKeepsHistory(vehicleAssignments: number) {
    if (vehicleAssignments) {
      Err(409, this.t('driverKeepsRole'));
    }
  }

  ensureOneCurrentVehicle(vehicleIds: string[]) {
    if (vehicleIds.length > 1) Err(400, this.t('driverOneVehicle'));
  }

  async ensureExists(id: string) {
    const row = await this.staffRepository.getById(id);
    if (!row) {
      Err(404, this.t('notFound'));
    }
    return row;
  }

  async checkExists(id: string) {
    return this.ensureExists(id);
  }

  async ensureEmployeeCodeUnique(employeeCode?: string, excludeId?: string) {
    if (!employeeCode) return;
    const existing = await this.staffRepository.getByEmployeeCode(employeeCode);
    if (existing && existing.id !== excludeId) {
      Err(409, this.t('employeeCodeExists'));
    }
  }

  async ensureCinUnique(cin?: string, excludeId?: string) {
    if (!cin) return;
    const existing = await this.staffRepository.getByCin(cin);
    if (existing && existing.id !== excludeId) {
      Err(409, this.t('cinExists'));
    }
  }

  async ensureEmailUnique(email?: string, excludeId?: string) {
    if (!email) return;
    const existing = await this.staffRepository.getByEmail(email);
    if (existing && existing.id !== excludeId) {
      Err(409, this.t('emailExists'));
    }
  }

  async checkEmployeeCodeIsUnique(employeeCode?: string, excludeId: string | null = null) {
    return this.ensureEmployeeCodeUnique(employeeCode, excludeId ?? undefined);
  }

  async checkCinIsUnique(cin?: string, excludeId: string | null = null) {
    return this.ensureCinUnique(cin, excludeId ?? undefined);
  }

  async ensureRoleExists(code: string) {
    if (!code) {
      Err(400, this.roleT('invalidRole'));
    }
    const role = await this.staffRoleRepository.getByCode(code);
    if (!role || !role.active) {
      Err(400, this.roleT('invalidRole'));
    }
    return role;
  }
}
