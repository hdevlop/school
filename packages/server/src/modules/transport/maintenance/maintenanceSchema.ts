import { date, numeric, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { idField, timestamps } from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';
import { vehicles } from '../vehicles/vehicleSchema';

export const maintenanceTypeEnum = pgEnum('maintenanceType', getEnumValues('maintenanceType'));
export const maintenanceStatusEnum = pgEnum('maintenanceStatus', getEnumValues('maintenanceStatus'));

export const maintenance = pgTable('maintenance', {
  id: idField(),
  vehicleId: text('vehicle_id').references(() => vehicles.id).notNull(),
  type: maintenanceTypeEnum('type').notNull(),
  title: text('title').notNull(),
  status: maintenanceStatusEnum('status').default('scheduled'),
  dueHours: numeric('due_hours', { precision: 10, scale: 2 }),
  cost: numeric('cost', { precision: 8, scale: 2 }),
  scheduledDate: date('scheduled_date'),
  completedAt: timestamp('completed_at', { mode: 'string' }),
  priority: text('priority').default('normal'),
  partsUsed: text('parts_used'),
  assignedTo: text('assigned_to'),
  notes: text('notes'),
  ...timestamps,
});
