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
const placementState = z.object({
  id, classId: id, sectionId: id, validFrom: dateOnly, validTo: dateOnly.nullable(),
});
const enrollmentState = z.object({
  enrolledOn: dateOnly, leftOn: dateOnly.nullable(),
  status: z.enum(['active', 'withdrawn', 'graduated', 'transferred']),
});
// The complete state read when the form opens prevents stale corrections,
// including a transfer that adds another placement while that form is open.
export const correctEnrollmentDto = enrollmentState.extend({
  placement: placementState,
  expected: enrollmentState.extend({ placements: z.array(placementState).min(1) }),
  reason: z.string().trim().min(1).max(500),
});
export type CorrectEnrollmentDto = z.infer<typeof correctEnrollmentDto>;
export type CreateEnrollmentDto = z.infer<typeof createEnrollmentDto>;
export type TransferEnrollmentDto = z.infer<typeof transferEnrollmentDto>;
export type EndEnrollmentDto = z.infer<typeof endEnrollmentDto>;
