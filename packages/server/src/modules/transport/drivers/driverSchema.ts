import { date, integer, pgTable, text } from 'drizzle-orm/pg-core';

import { idField, timestamps } from '@server/database/shared';
import { staff } from '../../staff/staffSchema';

export const drivers = pgTable('drivers', {
  id: idField(),
  licenseNumber: text('license_number').notNull().unique(),
  licenseType: text('license_type').notNull(),
  licenseExpiry: date('license_expiry').notNull(),
  yearsOfExperience: integer('years_of_experience'),
  notes: text('notes'),
  staffId: text('staff_id').notNull().references(() => staff.id, { onDelete: 'restrict' }).unique(),
  ...timestamps,
});
