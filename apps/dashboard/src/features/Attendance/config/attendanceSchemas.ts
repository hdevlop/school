import { z } from 'zod';
import { ATTENDANCE_STATUS_VALUES } from '@sms/contracts';

type T = (key: string) => string;

/**
 * A single attendance record, as the manual entry form submits it. Bulk
 * marking goes through the register screen and its own API, not this schema.
 * It takes `t` so a refused field reads in the page's language.
 */
export const createAttendanceSchema = (t: T) => {
  const requiredId = z.preprocess(
    (value) => value ?? '',
    z.string().min(1, t('validationMessages.idIsRequired')),
  );
  const dateField = z.string().regex(
    /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/,
    t('validationMessages.dateMustBeInYyyyMmDdMmDd'),
  );

  return z.object({
    studentId: requiredId,
    teacherId: requiredId,
    subjectId: requiredId,
    sectionId: requiredId,
    date: dateField,
    status: z.enum(ATTENDANCE_STATUS_VALUES).default('present'),
    notes: z.string().max(500, t('validationMessages.notesTooLong')).optional(),
  });
};

export type AttendanceFormValues = z.input<ReturnType<typeof createAttendanceSchema>>;
