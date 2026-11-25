import { createGuard } from 'najm-guard';
import { matchPermission } from 'najm-auth/client';
import { Injectable, Params, User } from '../najm';
import { ROLES } from '../auth';

/**
 * Namespaces whose files a permission manages, not the admin role alone: who
 * may list, import and delete them is then decided in the roles screen. The
 * match is exact, so any other spelling of a name falls back to admin-only.
 */
export const PERMISSION_MANAGED_NAMESPACES: Readonly<Record<string, string>> = {
  'desk-card-backgrounds': 'update:desk-card-backgrounds',
};

/** Storage management (list, info, upload, delete): a namespace's permission, else the admin role. */
@Injectable()
export class StorageManageGuard {
  canActivate(
    @Params('namespace') namespace: string | undefined,
    @User('role') role: string | undefined,
    @User('permissions') permissions: string[] | undefined,
  ) {
    const permission = namespace ? PERMISSION_MANAGED_NAMESPACES[namespace] : undefined;
    if (permission) return matchPermission(permissions ?? [], permission);
    return role?.toLowerCase() === ROLES.ADMIN;
  }
}
export const storageManage = createGuard(StorageManageGuard);
