import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import type { SidebarOrderId } from '@sms/contracts/access-control';
import { rolesTable } from '../../auth';

export const roleSidebarLayouts = pgTable('role_sidebar_layouts', {
  roleId: text('role_id').primaryKey().references(() => rolesTable.id, { onDelete: 'cascade' }),
  itemOrder: jsonb('item_order').$type<SidebarOrderId[]>().notNull().default([]),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
});
