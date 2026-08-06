import { Err, Events, EventService, I18n, Service } from '@server/najm';
import { RoleService, PermissionService } from 'najm-auth';
import { StaffRoleRepository } from './StaffRoleRepository';
import type { CreateStaffRoleDto, UpdateStaffRoleDto } from './StaffRoleDto';

const normalizeRoleCode = (value: string) => {
  const cleaned = value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const parts = cleaned.match(/[a-zA-Z0-9]+/g) ?? [];
  if (parts.length === 0) Err(400, 'Invalid role code');

  const code = parts
    .map((part, index) => {
      const word = /^[A-Z0-9]+$/.test(part) ? part.toLowerCase() : `${part.charAt(0).toLowerCase()}${part.slice(1)}`;
      return index === 0 ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    })
    .join('');

  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(code)) Err(400, 'Invalid role code');
  return code;
};

@Service()
export class StaffRoleService {
  @Events() private events!: EventService;
  @I18n('staffRoles.errors') private t!: (key: string) => string;

  constructor(
    private staffRoleRepository: StaffRoleRepository,
    private roleService: RoleService,
    private permissionService: PermissionService,
  ) { }

  async list() {
    return this.staffRoleRepository.getAll();
  }

  async listActive() {
    return this.staffRoleRepository.getActive();
  }

  async getByCode(code: string) {
    const row = await this.staffRoleRepository.getByCode(code);
    if (!row) Err(404, this.t('notFound'));
    return row!;
  }

  async create(data: CreateStaffRoleDto) {
    const code = normalizeRoleCode(data.code);
    const existing = await this.staffRoleRepository.getByCode(code);
    if (existing) {
      Err(409, this.t('codeExists'));
    }

    // One action → HR catalog row + optional RBAC role granting app access (plan §5).
    let accessRoleId: string | null = null;
    if (data.createAccessRole) {
      const existingRole = await this.roleService.getByName(code).catch(() => null);
      const role = existingRole || (await this.roleService.create({ name: code, description: data.label }));
      accessRoleId = role.id;
      for (const permissionId of data.permissions ?? []) {
        await this.permissionService.assignPermissionToRole(role.id, permissionId).catch(() => {});
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
    const existing = await this.staffRoleRepository.getByCode(code);
    if (!existing) {
      Err(404, this.t('notFound'));
    }
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
    const existing = await this.staffRoleRepository.getByCode(code);
    if (!existing) {
      Err(404, this.t('notFound'));
    }

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
    const row = await this.staffRoleRepository.getByCode(code);
    if (!row || !row.active) {
      Err(400, this.t('invalidRole'));
    }
    return row!;
  }
}
