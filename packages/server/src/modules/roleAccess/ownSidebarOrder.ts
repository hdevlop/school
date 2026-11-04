import { eq } from 'drizzle-orm';
import type { SidebarOrderId } from '@sms/contracts/access-control';
import { usersTable } from '../../auth';
import type { DB } from '../../database/db';
import { roleSidebarLayouts } from './RoleSidebarSchema';

/**
 * The sidebar order of a user's own role. The caller supplies an authenticated
 * user id, never a requested role. Shared by the own-role route and the first
 * server render, so both answer the same way.
 */
export async function readOwnSidebarOrder(db: DB, userId: string): Promise<SidebarOrderId[]> {
  const [layout] = await db.select({ itemOrder: roleSidebarLayouts.itemOrder })
    .from(usersTable).leftJoin(roleSidebarLayouts, eq(usersTable.roleId, roleSidebarLayouts.roleId))
    .where(eq(usersTable.id, userId));
  return layout?.itemOrder ?? [];
}
