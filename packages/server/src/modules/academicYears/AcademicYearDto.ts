import { z } from 'zod';
import { isDateOnly, isValidSchoolYearCalendar, parseSchoolYearLabel } from '@sms/contracts/academic-years';

const dateOnly = z.string().refine(isDateOnly, 'Expected a real YYYY-MM-DD date');

export const academicYearLabel = z.string().refine(
  (value) => parseSchoolYearLabel(value) !== null,
  'Expected consecutive years in YYYY-YYYY format',
);

export const createAcademicYearDto = z.object({
  label: academicYearLabel,
  instructionStartsOn: dateOnly,
  instructionEndsOn: dateOnly,
  reportingStartsOn: dateOnly,
  reportingEndsOn: dateOnly,
  paymentCloseoutOn: dateOnly,
  provenance: z.enum(['verified', 'assumed']),
  provenanceNote: z.string().trim().min(10).max(2000),
}).superRefine((value, context) => {
  if (!isValidSchoolYearCalendar(value.label, value)) {
    context.addIssue({ code: 'custom', message: 'Invalid school-year calendar' });
  }
});

export const academicYearIdParam = z.object({ id: z.string().min(1) });
export const academicYearQuery = z.object({ academicYear: academicYearLabel.optional() });
export const verifyAcademicYearDto = z.object({ evidenceNote: z.string().trim().min(10).max(2000) });
export type CreateAcademicYearDto = z.infer<typeof createAcademicYearDto>;
export type VerifyAcademicYearDto = z.infer<typeof verifyAcademicYearDto>;
