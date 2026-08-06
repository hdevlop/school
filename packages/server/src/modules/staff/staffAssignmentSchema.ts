import { date, pgTable, text } from 'drizzle-orm/pg-core';

import { classRef } from '../classes/classSchema';
import { sectionRef } from '../sections/sectionSchema';
import { cycleRef } from '../cycles/cycleSchema';
import { staff } from './staffSchema';
import { idField, timestamps } from '@server/database/shared';
import { assignmentStatusEnum } from '../transport/vehicleAssignments/vehicleAssignmentSchema';
import { vehicles } from '../transport/vehicles/vehicleSchema';

export const zones = pgTable('zones', {
  id: idField(),
  name: text('name').notNull(),
  building: text('building'),
  floor: text('floor'),
  description: text('description'),
  ...timestamps,
});

export const zoneRef = (onDelete: 'cascade' | 'restrict' | 'no action' | 'set null' | 'set default' = 'set null') => {
  const ref = text('zone_id').references(() => zones.id, { onDelete });
  return onDelete === 'set null' ? ref : ref.notNull();
};

const staffAssignmentFields = () => ({
  id: idField(),
  staffId: text('staff_id').notNull().references(() => staff.id, { onDelete: 'restrict' }),
  status: assignmentStatusEnum('status').notNull().default('active'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  notes: text('notes'),
  ...timestamps,
});

export const staffCredentials = pgTable('staff_credentials', {
  id: idField(),
  staffId: text('staff_id').notNull().references(() => staff.id, { onDelete: 'restrict' }),
  credentialType: text('credential_type').notNull(),
  number: text('number'),
  label: text('label'),
  issuedBy: text('issued_by'),
  issuedAt: date('issued_at'),
  expiresAt: date('expires_at'),
  filePath: text('file_path'),
  ...timestamps,
});

export const cleanerAssignments = pgTable('cleaner_assignments', {
  ...staffAssignmentFields(),
  zoneId: zoneRef('restrict'),
});

export const assistantAssignments = pgTable('assistant_assignments', {
  ...staffAssignmentFields(),
  classId: classRef('restrict'),
  sectionId: sectionRef('set null'),
});

export const accountantAssignments = pgTable('accountant_assignments', {
  ...staffAssignmentFields(),
  cycleId: cycleRef('restrict'),
});

export const securityAssignments = pgTable('security_assignments', {
  ...staffAssignmentFields(),
  zoneId: zoneRef('restrict'),
});

export const busAssistantAssignments = pgTable('bus_assistant_assignments', {
  ...staffAssignmentFields(),
  vehicleId: text('vehicle_id').references(() => vehicles.id, { onDelete: 'restrict' }).notNull(),
});

export type Zone = typeof zones.$inferSelect;
export type StaffCredential = typeof staffCredentials.$inferSelect;
export type CleanerAssignment = typeof cleanerAssignments.$inferSelect;
export type AssistantAssignment = typeof assistantAssignments.$inferSelect;
export type AccountantAssignment = typeof accountantAssignments.$inferSelect;
export type SecurityAssignment = typeof securityAssignments.$inferSelect;
export type BusAssistantAssignment = typeof busAssistantAssignments.$inferSelect;
