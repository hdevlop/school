import { z } from 'zod';
import { isDateOnly } from '@sms/contracts/academic-years';
import { studentYearEnrollmentEndStatusEnum } from '../../shared/enums';

const dateOnly = z.string().refine(isDateOnly, 'Expected a real YYYY-MM-DD date');
const id = z.string().min(1);

export const createEnrollmentDto = z.object({
  studentId: id,
  academicYearId: id,
  classId: id,
  sectionId: id,
  enrolledOn: dateOnly,
});

export const transferEnrollmentDto = z.object({
  classId: id,
  sectionId: id,
  validFrom: dateOnly,
  reason: z.string().trim().min(1).max(500),
});

export const endEnrollmentDto = z.object({
  leftOn: dateOnly,
  status: studentYearEnrollmentEndStatusEnum,
});

export const enrollmentIdParam = z.object({ id });
export type CreateEnrollmentDto = z.infer<typeof createEnrollmentDto>;
export type TransferEnrollmentDto = z.infer<typeof transferEnrollmentDto>;
export type EndEnrollmentDto = z.infer<typeof endEnrollmentDto>;
