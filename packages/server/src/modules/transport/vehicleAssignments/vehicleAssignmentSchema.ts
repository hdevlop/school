import { sql } from 'drizzle-orm';
import { date, pgEnum, pgTable, text } from 'drizzle-orm/pg-core';

import { assignedByRef, idField, timestamps } from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';
import { drivers } from '../drivers/driverSchema';
import { vehicles } from '../vehicles/vehicleSchema';

export const assignmentStatusEnum = pgEnum('assignmentStatus', getEnumValues('assignmentStatus'));

export const vehicleAssignments = pgTable('vehicle_assignments', {
  id: idField(),
  vehicleId: text('vehicle_id').references(() => vehicles.id, { onDelete: 'cascade' }).notNull(),
  driverId: text('driver_id').references(() => drivers.id, { onDelete: 'cascade' }).notNull(),
  assignmentDate: date('assignment_date').notNull().default(sql`CURRENT_DATE`),
  unassignmentDate: date('unassignment_date'),
  status: assignmentStatusEnum('status').notNull().default('active'),
  notes: text('notes'),
  assignedBy: assignedByRef(),
  ...timestamps,
});
