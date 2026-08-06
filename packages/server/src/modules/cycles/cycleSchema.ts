import { boolean, integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import { createRef, idField, timestamps } from '@server/database/shared';

export const cycles = pgTable('cycles', {
  id: idField(),
  name: text('name').notNull(),
  labels: jsonb('labels').$type<Record<string, string>>(),
  sortOrder: integer('sort_order').default(0),
  active: boolean('active').notNull().default(true),
  ...timestamps,
});

export const cycleRef = createRef('cycle_id', () => cycles.id, 'set null');

export type Cycle = typeof cycles.$inferSelect;
export type NewCycle = typeof cycles.$inferInsert;
