import { Err, Events, EventService, Service, Transaction } from '@server/najm';
import { nanoid } from 'nanoid';

import { AuthService, UserService } from '@server/auth';
import { StorageService } from 'najm-storage';
import { resolveUserPassword, isSeeding } from '@server/shared/userPassword';
import { DriverRepository } from '../transport/drivers/DriverRepository';
import { VehicleAssignmentRepository } from '../transport/vehicleAssignments/VehicleAssignmentRepository';
import { StaffAssignmentRepository } from './StaffAssignmentRepository';
import { StaffRepository } from './StaffRepository';
import { StaffValidator } from './StaffValidator';
import type { CreateStaffDto, DeleteBulkStaffDto, UpdateStaffDto } from './StaffDto';

// role -> support sub-resource handler (plan §7). Driver is the only structured
// support table in v1; new roles register a handler here, never a new module.
interface RoleSupportHandler {
  create(staffId: string, profile: Record<string, any>): Promise<void>;
  update(staffId: string, profile: Record<string, any>): Promise<void>;
}

@Service()
export class StaffService {
  @Events() private events!: EventService;

  private readonly roleSupport: Record<string, RoleSupportHandler>;

  constructor(
    private staffRepository: StaffRepository,
    private staffValidator: StaffValidator,
    private userService: UserService,
    private authService: AuthService,
    private storage: StorageService,
    private driverRepository: DriverRepository,
    private staffAssignmentRepository: StaffAssignmentRepository,
    private vehicleAssignmentRepository: VehicleAssignmentRepository,
  ) {
    this.roleSupport = {
      driver: {
        create: async (staffId, profile) => {
          await this.driverRepository.create({
            id: profile.id ?? nanoid(5),
            staffId,
            licenseNumber: profile.licenseNumber,
            licenseType: profile.licenseType,
            licenseExpiry: profile.licenseExpiry,
            yearsOfExperience: profile.yearsOfExperience ?? null,
            notes: profile.notes ?? null,
          });
        },
        update: async (staffId, profile) => {
          const existing = await this.driverRepository.getByStaffId(staffId);
          const patch: Record<string, any> = {};
          for (const key of ['licenseNumber', 'licenseType', 'licenseExpiry', 'yearsOfExperience', 'notes']) {
            if (profile[key] !== undefined) patch[key] = profile[key];
          }
          if (existing) {
            if (Object.keys(patch).length > 0) await this.driverRepository.update(existing.id, patch);
          } else if (patch.licenseNumber) {
            await this.roleSupport.driver.create(staffId, profile);
          }
        },
      },
    };
  }

  private async provisionUser(data: CreateStaffDto, staffId: string) {
    if (!data.email) {
      Err(400, 'Email is required to create a staff login');
    }
    const genderSuffix = data.gender === 'F' ? 'female' : 'male';
    const image = await this.storage.processFile('staff', data.image, {
      filePath: `${staffId}_avatar.png`,
      fallback: `/images/${data.role}_${genderSuffix}.png`,
    });
    const role = await this.staffValidator.ensureRoleExists(data.role);
    if (!role.accessRoleId) {
      Err(400, 'This staff role does not grant app access');
    }
    // Seeding passes a password (account created silently, log-in-able);
    // the dashboard passes none, so the staff member is emailed a set-password
    // invite. The RBAC role comes from the staff role's mapped accessRoleId.
    const user = await this.authService.provisionUser({
      id: data.userId || undefined,
      email: data.email,
      name: data.name,
      image,
      roleId: role.accessRoleId!,
      password: isSeeding() ? resolveUserPassword(data.password) : data.password,
    });
    return user.id as string;
  }

  private ensureDriverProfile(profile?: Record<string, any>, partial = false) {
    if (!profile) {
      if (partial) return;
      Err(400, 'Driver license profile is required');
    }
    const required = ['licenseNumber', 'licenseType', 'licenseExpiry'];
    for (const key of required) {
      if (!partial && !profile![key]) {
        Err(400, `Driver ${key} is required`);
      }
    }
  }

  private ensureAssignments(role: string, assignments?: Record<string, any>[]) {
    if (!assignments?.length) return;

    for (const assignment of assignments) {
      if (role === 'cleaner' && !assignment.zoneId) {
        Err(400, 'Cleaner assignment requires a zone');
      }
      if (role === 'assistant' && !assignment.classId) {
        Err(400, 'Assistant assignment requires a class');
      }
      if (role === 'busAssistant' && !assignment.vehicleId) {
        Err(400, 'Bus assistant assignment requires a vehicle');
      }
      if (role === 'accountant' && !assignment.cycleId) {
        Err(400, 'Accountant assignment requires a cycle');
      }
      if (role === 'security' && !assignment.zoneId) {
        Err(400, 'Security assignment requires a zone');
      }
      if (role === 'driver' && !assignment.vehicleId) {
        Err(400, 'Driver assignment requires a vehicle');
      }
    }
  }

  // Driver assignments live in the transport vehicle_assignments table, keyed by the
  // driver row (not staffId). Resolve the driver row first, then (re)link the vehicle.
  private async syncDriverVehicle(staffId: string, assignments?: Record<string, any>[], replace = false) {
    const vehicleIds = (assignments ?? [])
      .map((assignment) => assignment.vehicleId)
      .filter((id): id is string => Boolean(id));

    if (!replace && vehicleIds.length === 0) return;

    const driver = await this.driverRepository.getByStaffId(staffId);
    if (!driver) return;

    if (replace) {
      await this.vehicleAssignmentRepository.deleteByDriverId(driver.id);
    }

    for (const vehicleId of vehicleIds) {
      await this.vehicleAssignmentRepository.create({
        vehicleId,
        driverId: driver.id,
        status: 'active',
      });
    }
  }

  private async deleteDriverProfile(staffId: string) {
    const driver = await this.driverRepository.getByStaffId(staffId);
    if (!driver) return null;

    await this.vehicleAssignmentRepository.deleteByDriverId(driver.id);
    return await this.driverRepository.delete(driver.id);
  }

  async getAll() {
    return await this.staffRepository.getAll();
  }

  async getAttendanceRoster(date?: string) {
    const rosterDate = date ?? this.localDate();
    return await this.staffRepository.getAttendanceRoster(rosterDate);
  }

  private localDate(date: Date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async getById(id: string) {
    return this.staffValidator.ensureExists(id);
  }

  async getByEmployeeCode(employeeCode: string) {
    const row = await this.staffRepository.getByEmployeeCode(employeeCode);
    if (!row) Err(404, 'Staff not found');
    return row;
  }

  async getByRole(role: string) {
    return await this.staffRepository.getByRole(role);
  }

  async getByCin(cin: string) {
    const row = await this.staffRepository.getByCin(cin);
    if (!row) Err(404, 'Staff not found');
    return row;
  }

  async getByUserId(userId: string) {
    return await this.staffRepository.getByUserId(userId);
  }

  async generateEmployeeCode() {
    return `EMP-${nanoid(6).toUpperCase()}`;
  }

  @Transaction()
  async create(data: CreateStaffDto) {
    await this.staffValidator.ensureCinUnique(data.cin);
    await this.staffValidator.ensureEmployeeCodeUnique(data.employeeCode);
    await this.staffValidator.ensureEmailUnique(data.email);
    await this.staffValidator.ensureRoleExists(data.role);

    const employeeCode = data.employeeCode || (await this.generateEmployeeCode());

    const staffId = data.id || nanoid(5);
    if (data.role === 'driver') {
      this.ensureDriverProfile(data.profile);
    }
    this.ensureAssignments(data.role, data.assignments);

    // Auto-provision a login when the role grants app access and there's an email
    // to invite. Roles without an accessRoleId (e.g. cleaner) stay login-less.
    // A supplied userId (e.g. teachers, which create their user first) is used as-is.
    let userId: string | null = null;
    if (data.userId) {
      userId = data.userId;
    } else if (data.email) {
      const accessRole = await this.staffValidator.ensureRoleExists(data.role);
      if (accessRole.accessRoleId) {
        userId = await this.provisionUser(data, staffId);
      }
    }

    const staffRow = await this.staffRepository.create({
      id: staffId,
      userId,
      employeeCode,
      name: data.name,
      email: data.email || null,
      cin: data.cin || null,
      gender: data.gender,
      phone: data.phone || null,
      address: data.address,
      medicalConditions: data.medicalConditions || null,
      role: data.role,
      department: data.department || null,
      compensationMode: data.compensationMode || 'monthly',
      salary: data.salary != null ? String(data.salary) : null,
      hourlyRate: data.hourlyRate != null ? String(data.hourlyRate) : null,
      workloadHours: data.workloadHours ?? null,
      shift: data.shift ?? null,
      employmentType: data.employmentType,
      hireDate: data.hireDate,
      endDate: data.endDate || null,
      status: data.status,
      bankAccount: data.bankAccount || null,
      emergencyContact: data.emergencyContact,
      emergencyPhone: data.emergencyPhone || null,
    });

    const support = this.roleSupport[data.role];
    if (support && data.profile && Object.keys(data.profile).length > 0) {
      await support.create(staffRow.id, data.profile);
    }

    if (data.role === 'driver') {
      await this.syncDriverVehicle(staffRow.id, data.assignments);
    } else if (data.assignments?.length) {
      await this.staffAssignmentRepository.createForRole(data.role, staffRow.id, data.assignments);
    }

    return staffRow;
  }

  @Transaction()
  async update(id: string, data: UpdateStaffDto) {
    const existing = await this.staffValidator.ensureExists(id);
    if (data.employeeCode) {
      await this.staffValidator.ensureEmployeeCodeUnique(data.employeeCode, id);
    }
    if (data.cin) {
      await this.staffValidator.ensureCinUnique(data.cin, id);
    }
    if (data.email) {
      await this.staffValidator.ensureEmailUnique(data.email, id);
    }
    if (data.role) {
      await this.staffValidator.ensureRoleExists(data.role);
    }
    if (data.assignments) {
      this.ensureAssignments(data.role ?? existing.role, data.assignments);
    }
    const roleChanged = data.role !== undefined && data.role !== existing.role;

    const update: Record<string, any> = {};
    if (data.userId !== undefined) update.userId = data.userId || null;
    if (data.name !== undefined) update.name = data.name;
    if (data.email !== undefined) update.email = data.email || null;
    if (data.cin !== undefined) update.cin = data.cin || null;
    if (data.gender !== undefined) update.gender = data.gender;
    if (data.phone !== undefined) update.phone = data.phone || null;
    if (data.address !== undefined) update.address = data.address;
    if (data.medicalConditions !== undefined) update.medicalConditions = data.medicalConditions || null;
    if (data.role !== undefined) update.role = data.role;
    if (data.department !== undefined) update.department = data.department || null;
    if (data.compensationMode !== undefined) update.compensationMode = data.compensationMode;
    if (data.salary !== undefined) update.salary = data.salary != null ? String(data.salary) : null;
    if (data.hourlyRate !== undefined) update.hourlyRate = data.hourlyRate != null ? String(data.hourlyRate) : null;
    if (data.workloadHours !== undefined) update.workloadHours = data.workloadHours ?? null;
    if (data.shift !== undefined) update.shift = data.shift ?? null;
    if (data.employmentType !== undefined) update.employmentType = data.employmentType;
    if (data.hireDate !== undefined) update.hireDate = data.hireDate;
    if (data.endDate !== undefined) update.endDate = data.endDate || null;
    if (data.status !== undefined) update.status = data.status;
    if (data.bankAccount !== undefined) update.bankAccount = data.bankAccount || null;
    if (data.emergencyContact !== undefined) update.emergencyContact = data.emergencyContact;
    if (data.emergencyPhone !== undefined) update.emergencyPhone = data.emergencyPhone || null;
    if (data.employeeCode !== undefined) update.employeeCode = data.employeeCode;

    if (roleChanged) {
      if (existing.role === 'driver') {
        await this.deleteDriverProfile(id);
      } else {
        await this.staffAssignmentRepository.deleteForRole(existing.role, id);
      }
    }

    if (existing.userId && data.email && data.email !== existing.email) {
      await this.userService.update(existing.userId, { email: data.email });
    }

    const row = await this.staffRepository.update(id, update);

    const support = this.roleSupport[data.role ?? row.role];
    if (support && data.profile && Object.keys(data.profile).length > 0) {
      if ((data.role ?? row.role) === 'driver') {
        const existing = await this.driverRepository.getByStaffId(id);
        this.ensureDriverProfile(data.profile, Boolean(existing));
      }
      await support.update(id, data.profile);
    }

    if (data.assignments) {
      const effectiveRole = data.role ?? row.role;
      if (effectiveRole === 'driver') {
        await this.syncDriverVehicle(id, data.assignments, true);
      } else {
        await this.staffAssignmentRepository.replaceForRole(effectiveRole, id, data.assignments);
      }
    }

    return row;
  }

  @Transaction()
  async delete(id: string, options: { allowLinked?: boolean } = {}) {
    const staffMember = await this.staffValidator.ensureExists(id);

    // Repository access resolves to the active Najm transaction. This matters when
    // TeacherService/DriverService has just removed the linked profile in that same
    // transaction; a raw database connection would still see the uncommitted row.
    const linkedTeacher = await this.staffRepository.getLinkedTeacher(id);
    const linkedDriver = await this.staffRepository.getLinkedDriver(id);

    if ((linkedTeacher || linkedDriver) && !options.allowLinked) {
      Err(409, 'Cannot delete staff linked to an active teacher or driver');
    }

    // Role assignment FKs are onDelete: 'restrict', so clear them first.
    await this.staffAssignmentRepository.deleteAllForStaff(id);
    if (linkedDriver) {
      await this.deleteDriverProfile(id);
    }

    const deleted = await this.staffRepository.delete(id);
    if (staffMember.userId) {
      await this.userService.delete(staffMember.userId);
    }
    this.storage.delete('staff', `${id}_avatar.png`).catch(() => {});
    return deleted;
  }

  async deleteBulk(ids: DeleteBulkStaffDto) {
    const results = await Promise.all(ids.map((id) => this.delete(id)));
    return { deletedCount: results.length };
  }

  async deleteAll() {
    return await this.staffRepository.deleteAll();
  }
}
