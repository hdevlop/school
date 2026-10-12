import { db } from '@sms/server/database';
import { roles, staffRoles } from '@sms/server/database/schema';
import { and, eq, isNull } from 'drizzle-orm';

/**
 * The login role each standard job title grants. A staff member created with
 * one of these titles and an email gets that login, and Reset access finds it.
 * The names differ where the HR title and the access role do (`accountant`
 * holds the `accounting` login).
 * Migration 0066 links the same titles in an existing database.
 */
export const STAFF_ROLE_LOGINS: Record<string, string> = {
  teacher: 'teacher',
  driver: 'driver',
  principal: 'principal',
  secretary: 'secretary',
  accountant: 'accounting',
  assistant: 'assistant',
  supervisor: 'supervisor',
};

/** Link each title to its login role, leaving any link already chosen alone. */
export async function linkStaffRoleLogins() {
  let linked = 0;
  for (const [code, roleName] of Object.entries(STAFF_ROLE_LOGINS)) {
    const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, roleName));
    if (!role) continue;
    const rows = await db.update(staffRoles)
      .set({ accessRoleId: role.id })
      .where(and(eq(staffRoles.code, code), isNull(staffRoles.accessRoleId)))
      .returning({ code: staffRoles.code });
    linked += rows.length;
  }
  return linked;
}
