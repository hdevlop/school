import type { AccessPermission, AccessRole } from '@sms/contracts/access-control';
import { isSidebarPermission } from '@sms/contracts/access-control';
import { Err, I18n, Service } from '../../najm';

@Service()
export class RoleAccessValidator {
  @I18n('roleAccess.errors') private t!: (key: string) => string;

  ensureRole(role: AccessRole | undefined): asserts role is AccessRole {
    if (!role) Err(404, this.t('notFound'));
  }

  ensureEditable(role: AccessRole) {
    if (role.name.toLowerCase() === 'admin') Err(403, this.t('adminLocked'));
  }

  ensureFresh(current: AccessPermission[], expected: string[]) {
    const actual = new Set(current.map((permission) => permission.id));
    if (actual.size !== expected.length || expected.some((id) => !actual.has(id))) {
      Err(409, this.t('conflict'));
    }
  }

  ensurePermissions(ids: string[], catalog: AccessPermission[]) {
    const assignable = new Set(catalog.filter((permission) => !isSidebarPermission(permission.name)).map((permission) => permission.id));
    if (ids.some((id) => !assignable.has(id))) Err(422, this.t('invalidPermissions'));
  }
}
