import { date, index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { idField, timestamps } from '../../database/shared';
import { staffRef } from '../staff/staffSchema';

/**
 * A fingerprint terminal (ZKTeco F18 and other ADMS "push" devices) that has
 * contacted School. Only a serial number listed in ATTENDANCE_DEVICE_SERIALS
 * gets a row; the row's creation day is the first day its scans count, so the
 * device's older stored logs are kept but never turned into marks.
 */
export const attendanceDevices = pgTable('attendance_devices', {
  id: idField(),
  serialNumber: text('serial_number').notNull().unique(),
  lastSeenAt: timestamp('last_seen_at', { mode: 'string' }),
  // The last school day the end-of-day close marked absences for.
  closedThrough: date('closed_through'),
  ...timestamps,
});

export const attendanceDeviceRef = (onDelete: 'cascade' = 'cascade') =>
  text('device_id').references(() => attendanceDevices.id, { onDelete }).notNull();

/** A user the device reported (its PIN and the name typed on the device). */
export const attendanceDeviceUsers = pgTable('attendance_device_users', {
  id: idField(),
  deviceId: attendanceDeviceRef(),
  deviceUserId: text('device_user_id').notNull(),
  name: text('name'),
  ...timestamps,
}, (table) => ({
  deviceUserUnique: uniqueIndex('attendance_device_users_device_user_unique').on(table.deviceId, table.deviceUserId),
}));

/**
 * Every scan the device sent, once: the device resends logs after a failed
 * upload, so (device, user, time) is unique. `staffId` is who the scan was
 * counted for, empty while its PIN belongs to no staff member.
 */
export const attendanceDevicePunches = pgTable('attendance_device_punches', {
  id: idField(10),
  deviceId: attendanceDeviceRef(),
  deviceUserId: text('device_user_id').notNull(),
  // The device's local clock, as it sent it: the school's own time.
  punchedAt: timestamp('punched_at', { mode: 'string' }).notNull(),
  staffId: staffRef('set null'),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
}, (table) => ({
  punchUnique: uniqueIndex('attendance_device_punches_unique').on(table.deviceId, table.deviceUserId, table.punchedAt),
  punchedAtIdx: index('attendance_device_punches_punched_at_idx').on(table.punchedAt),
  userIdx: index('attendance_device_punches_user_idx').on(table.deviceUserId),
}));
