import { z } from 'zod';
import { ATTENDANCE_STATUS_VALUES } from '@sms/contracts';

import { dateField, requiredId } from '@/shared/forms/fieldPrimitives';

/**
 * A single attendance record, as the manual entry form submits it. Bulk
 * marking goes through the register screen and its own API, not this schema.
 */
export const attendanceSchema = z.object({
  studentId: requiredId,
  teacherId: requiredId,
  subjectId: requiredId,
  sectionId: requiredId,
  date: dateField,
  status: z.enum(ATTENDANCE_STATUS_VALUES).default('present'),
  notes: z.string().max(500, 'Notes too long').optional(),
});

export type AttendanceFormValues = z.input<typeof attendanceSchema>;
