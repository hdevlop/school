import { Err, I18n, Service } from '@server/najm';
import { StaffRepository } from './StaffRepository';
import { StaffRoleRepository } from './roles/StaffRoleRepository';

@Service()
export class StaffValidator {
  @I18n('staff.errors') private t!: (key: string) => string;
  @I18n('staffRoles.errors') private roleT!: (key: string) => string;

  constructor(
    private staffRepository: StaffRepository,
    private staffRoleRepository: StaffRoleRepository,
  ) { }

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
      Err(409, this.t('emailExists') || 'Email already exists');
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
