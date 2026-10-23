import { eq } from 'drizzle-orm';
import {
  SIDEBAR_CONFIGURED_PERMISSION, SIDEBAR_ENTRIES, sidebarPermission,
} from '@sms/contracts/access-control';
import { permissionsTable, rolesTable } from '../../auth';
import { auditLogs } from '../../database/schema/coreSchema';
import type { DB } from '../../database/db';
import { Repository } from '../../najm';

@Repository()
export class RoleAccessRepository {
  declare db: DB;

  async lockRoles() {
    return this.db.select().from(rolesTable).orderBy(rolesTable.id).for('update');
  }

  async getRole(id: string, lock = false) {
    const query = this.db.select().from(rolesTable).where(eq(rolesTable.id, id));
    const [role] = await (lock ? query.for('update') : query);
    return role;
  }

  /** On save only; no seeding/reset of existing role grants or navigation. */
  async ensureSidebarCatalog() {
    await this.db.insert(permissionsTable).values([
      { name: SIDEBAR_CONFIGURED_PERMISSION, resource: 'sidebar', action: 'configure', description: 'Explicit sidebar configuration' },
      ...SIDEBAR_ENTRIES.map(([key]) => ({
        name: sidebarPermission(key), resource: 'sidebar', action: 'show', description: `Show ${key} in sidebar`,
      })),
    ]).onConflictDoNothing({ target: permissionsTable.name });
  }

  async audit(roleId: string, actorId: string, added: string[], removed: string[]) {
    await this.db.insert(auditLogs).values({
      userId: actorId, userRole: 'admin', action: 'role.permissions.update', resource: 'roles',
      resourceId: roleId, status: 'success', metadata: { added, removed },
    });
  }
}
