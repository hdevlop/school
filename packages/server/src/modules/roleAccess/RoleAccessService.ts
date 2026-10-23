import { PermissionService } from 'najm-auth';
import {
  SIDEBAR_CONFIGURED_PERMISSION, isSidebarPermission, sidebarPermission,
  type RoleAccessSnapshot,
} from '@sms/contracts/access-control';
import { Service, Transaction } from '../../najm';
import { RoleAccessRepository } from './RoleAccessRepository';
import { RoleAccessValidator } from './RoleAccessValidator';
import type { SaveRoleAccessDto } from './RoleAccessDto';
import { PERMISSION_ACTION_REPLACEMENTS } from './PermissionActionMigration';

@Service()
export class RoleAccessService {
  constructor(
    private repository: RoleAccessRepository,
    private validator: RoleAccessValidator,
    private permissions: PermissionService,
  ) {}

  /** Bounded upgrade for existing installations, including long seed IDs.
   * Uses the same auth write path as the editor, including claim invalidation.
   */
  @Transaction()
  async migrateActions(actorId: string) {
    const roles = await this.repository.lockRoles();
    let catalog = await this.permissions.getAll();
    const retired = catalog.filter((p) => Object.hasOwn(PERMISSION_ACTION_REPLACEMENTS, p.name) || p.name === 'manage:*');
    if (!retired.length) return { retired: 0, rolesChanged: 0 };
    const replacementNames = [...new Set(Object.values(PERMISSION_ACTION_REPLACEMENTS).flat())];
    const manageReplacements = [...new Set(Object.entries(PERMISSION_ACTION_REPLACEMENTS)
      .filter(([name]) => name.startsWith('manage:')).flatMap(([, names]) => names))];
    for (const name of replacementNames) {
      if (catalog.some((p) => p.name === name)) continue;
      const [action, resource] = name.split(':');
      await this.permissions.create({ name, resource, action, description: `Permission to ${action} ${resource}` });
    }
    catalog = await this.permissions.getAll();
    const byName = new Map(catalog.map((p) => [p.name, p]));
    const retiredIds = new Set(retired.map((p) => p.id));
    let rolesChanged = 0;
    for (const role of roles) {
      const current = await this.permissions.getPermissionsByRole(role.id);
      const old = current.filter((p) => retiredIds.has(p.id));
      if (!old.length) continue;
      const existingIds = new Set(current.map((p) => p.id));
      const requiredNames = [...new Set(old.flatMap((p) => p.name === 'manage:*'
        ? manageReplacements : PERMISSION_ACTION_REPLACEMENTS[p.name]))];
      const added: string[] = [];
      for (const name of requiredNames) {
        const replacement = byName.get(name)!;
        if (!existingIds.has(replacement.id)) {
          await this.permissions.assignPermissionToRole(role.id, replacement.id);
          added.push(replacement.id);
        }
      }
      for (const permission of old) await this.permissions.removePermissionFromRole(role.id, permission.id);
      await this.repository.audit(role.id, actorId, added, old.map((p) => p.id));
      rolesChanged++;
    }
    for (const permission of retired) await this.permissions.delete(permission.id);
    return { retired: retired.length, rolesChanged };
  }

  async get(roleId: string): Promise<RoleAccessSnapshot> {
    const [role, permissions, catalog] = await Promise.all([
      this.repository.getRole(roleId), this.permissions.getPermissionsByRole(roleId), this.permissions.getAll(),
    ]);
    this.validator.ensureRole(role);
    return { role, permissions, catalog };
  }

  /** One transaction, stale-editor detection, and Najm's session invalidation. */
  @Transaction()
  async save(roleId: string, body: SaveRoleAccessDto, actorId: string): Promise<RoleAccessSnapshot> {
    const role = await this.repository.getRole(roleId, true);
    this.validator.ensureRole(role);
    this.validator.ensureEditable(role);
    const current = await this.permissions.getPermissionsByRole(roleId);
    this.validator.ensureFresh(current, body.expectedPermissionIds);
    this.validator.ensurePermissions(body.permissionIds, await this.permissions.getAll());

    // Permission-only changes must preserve both explicit sidebar choices and
    // the legacy unconfigured state; do not silently configure navigation.
    let sidebarIds = current.filter((permission) => isSidebarPermission(permission.name)).map((permission) => permission.id);
    if (body.sidebarKeys !== undefined) {
      await this.repository.ensureSidebarCatalog();
      const catalog = await this.permissions.getAll();
      const sidebarNames = new Set([SIDEBAR_CONFIGURED_PERMISSION, ...body.sidebarKeys.map(sidebarPermission)]);
      sidebarIds = catalog.filter((permission) => isSidebarPermission(permission.name) && sidebarNames.has(permission.name)).map((permission) => permission.id);
    }
    const desired = new Set([...body.permissionIds, ...sidebarIds]);
    const existing = new Set(current.map((permission) => permission.id));
    const added = [...desired].filter((id) => !existing.has(id));
    const removed = [...existing].filter((id) => !desired.has(id));

    // Use the auth service rather than SQL writes: it expires permission claims
    // held by existing sessions and participates in the caller's transaction.
    for (const id of removed) await this.permissions.removePermissionFromRole(roleId, id);
    for (const id of added) await this.permissions.assignPermissionToRole(roleId, id);
    if (added.length || removed.length) await this.repository.audit(roleId, actorId, added, removed);
    return this.get(roleId);
  }
}
