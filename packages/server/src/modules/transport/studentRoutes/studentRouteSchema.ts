import { sql } from 'drizzle-orm';
import { date, doublePrecision, index, pgEnum, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

import { assignedByRef, idField, timestamps } from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';
import { students } from '../../students/studentSchema';
import { vehicles } from '../vehicles/vehicleSchema';

export const studentRouteStatusEnum = pgEnum('studentRouteStatus', getEnumValues('assignmentStatus'));

export const studentRoutes = pgTable('student_routes', {
  id: idField(),
  studentId: text('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
  vehicleId: text('vehicle_id').references(() => vehicles.id, { onDelete: 'cascade' }).notNull(),
  assignmentDate: date('assignment_date').notNull().default(sql`CURRENT_DATE`),
  unassignmentDate: date('unassignment_date'),
  status: studentRouteStatusEnum('status').notNull().default('active'),
  pickupLocation: text('pickup_location'),
  pickupPlaceId: text('pickup_place_id'),
  pickupLatitude: doublePrecision('pickup_latitude'),
  pickupLongitude: doublePrecision('pickup_longitude'),
  dropoffLocation: text('dropoff_location'),
  dropoffPlaceId: text('dropoff_place_id'),
  dropoffLatitude: doublePrecision('dropoff_latitude'),
  dropoffLongitude: doublePrecision('dropoff_longitude'),
  notes: text('notes'),
  assignedBy: assignedByRef(),
  ...timestamps,
}, (table) => ({
  activeStudentUnique: uniqueIndex('student_routes_active_student_unique')
    .on(table.studentId)
    .where(sql`${table.status} = 'active'`),
  activeVehicleIndex: index('student_routes_active_vehicle_idx')
    .on(table.vehicleId)
    .where(sql`${table.status} = 'active'`),
}));
