import { Events, EventService, Service, Transaction } from '../../../najm';
import { StaffRoleValidator } from './StaffRoleValidator';
import { RoleService, PermissionService } from 'najm-auth';
import { StaffRoleRepository } from './StaffRoleRepository';
import type { CreateStaffRoleDto, UpdateStaffRoleDto } from './StaffRoleDto';

@Service()
export class StaffRoleService {
  @Events() private events!: EventService;

  constructor(
    private staffRoleRepository: StaffRoleRepository,
    private roleService: RoleService,
    private permissionService: PermissionService,
    private validator: StaffRoleValidator,
  ) { }

  async list() {
    return this.staffRoleRepository.getAll();
  }

  async listActive() {
    return this.staffRoleRepository.getActive();
  }

  async getByCode(code: string) {
    return this.validator.ensureExists(code);
  }

  @Transaction()
  async create(data: CreateStaffRoleDto) {
    const code = this.validator.normalizeRoleCode(data.code);
    await this.validator.ensureCodeUnique(code);

    // One action → HR catalog row + optional RBAC role granting app access (plan §5).
    let accessRoleId: string | null = null;
    if (data.createAccessRole) {
      const existingRole = await this.roleService.getByName(code);
      const role = existingRole || (await this.roleService.create({ name: code, description: data.label }));
      accessRoleId = role.id;
      const existingPermissions = new Set(
        (await this.permissionService.getPermissionsByRole(role.id)).map((permission) => permission.id),
      );
      for (const permissionId of data.permissions ?? []) {
        if (existingPermissions.has(permissionId)) continue;
        await this.permissionService.assignPermissionToRole(role.id, permissionId);
        existingPermissions.add(permissionId);
      }
    }

    const row = await this.staffRoleRepository.create({
      code,
      label: data.label,
      labels: data.labels ?? null,
      category: data.category ?? null,
      sortOrder: data.sortOrder ?? 0,
      isSystem: false,
      active: data.active ?? true,
      accessRoleId,
    });
    this.events.emit('staffRoles.created', row);
    return row;
  }

  async update(code: string, data: UpdateStaffRoleDto) {
    const existing = await this.validator.ensureExists(code);
    const patch: Record<string, any> = {};
    if (data.label !== undefined) patch.label = data.label;
    if (data.labels !== undefined) patch.labels = data.labels ?? null;
    if (data.category !== undefined) patch.category = data.category ?? null;
    if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
    if (data.active !== undefined) patch.active = data.active;
    if (Object.keys(patch).length === 0) return existing;
    const row = await this.staffRoleRepository.update(code, patch);
    this.events.emit('staffRoles.updated', row);
    return row;
  }

  async remove(code: string) {
    const existing = await this.validator.ensureExists(code);

    const inUse = await this.staffRoleRepository.countStaffUsing(code);
    if (existing!.isSystem || inUse > 0) {
      const updated = await this.staffRoleRepository.update(code, { active: false });
      this.events.emit('staffRoles.deactivated', updated);
      return { deactivated: true, role: updated };
    }

    await this.staffRoleRepository.delete(code);

    // Symmetric with create (§5): the create flow wires the linked RBAC role, so a hard
    // delete unwinds it too. Best-effort — if the RBAC role is still referenced elsewhere,
    // leave it rather than failing the staff-role deletion.
    let accessRoleDeleted = false;
    let accessRoleDeletionSkipped = false;
    let accessRoleUserCount = 0;

    if (existing!.accessRoleId) {
      accessRoleUserCount = await this.staffRoleRepository.countUsersUsingAccessRole(existing!.accessRoleId);
      if (accessRoleUserCount === 0) {
        try {
          await this.roleService.delete(existing!.accessRoleId);
          accessRoleDeleted = true;
        } catch {
          accessRoleDeleted = false;
        }
      } else {
        accessRoleDeletionSkipped = true;
      }
    }

    this.events.emit('staffRoles.deleted', {
      code,
      accessRoleId: existing!.accessRoleId,
      accessRoleDeleted,
      accessRoleDeletionSkipped,
      accessRoleUserCount,
    });
    return { deactivated: false, deleted: true, code, accessRoleDeleted, accessRoleDeletionSkipped, accessRoleUserCount };
  }

  async ensureActive(code: string) {
    return this.validator.ensureActive(code);
  }
}
