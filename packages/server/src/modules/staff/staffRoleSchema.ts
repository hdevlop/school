import { boolean, integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { rolesTable as roles } from '@server/auth';
import { timestamps } from '@server/database/shared';

export const staffRoles = pgTable('staff_roles', {
  code: text('code').primaryKey(),
  label: text('label').notNull(),
  labels: jsonb('labels').$type<Record<string, string>>(),
  category: text('category'),
  sortOrder: integer('sort_order').default(0),
  isSystem: boolean('is_system').notNull().default(false),
  active: boolean('active').notNull().default(true),
  // Optional link to the RBAC role (najm-auth) granting app access (plan §5).
  accessRoleId: text('access_role_id').references(() => roles.id, { onDelete: 'set null' }),
  ...timestamps,
});

export type StaffRole = typeof staffRoles.$inferSelect;
export type NewStaffRole = typeof staffRoles.$inferInsert;
