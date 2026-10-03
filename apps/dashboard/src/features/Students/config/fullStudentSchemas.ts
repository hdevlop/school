import { z } from 'zod';

import { feesSchema } from '@/features/Financial/Fees/config/feeSchemas';
import { parentsSchema } from '@/features/Parents/config/parentSchemas';
import { transportAssignmentSchema } from '@/features/Transport/config/transportSchemas';

import { studentSchema } from './studentSchemas';

/**
 * Enrolment: a student, their guardians, their fees and — if the family wants
 * it — a seat on a bus, submitted as one request.
 *
 * Students owns the *combination*; it does not own the parts. The parent list
 * comes from `Parents`, the fee list from `Financial/Fees`, the bus assignment
 * from `Transport`, and each stays the single definition its own screens bind
 * to. Adding a field to the parent form therefore adds it here too, which is
 * the whole point of composing rather than restating.
 *
 * One request, not four: the wizard collects every step and submits a single
 * nested payload, with the image as multipart. Splitting it into sequential
 * calls would make a half-enrolled student possible.
 *
 * There is no yearly enrollment date to fill in: the wizard derives the
 * placement date from the admission date on submit (`firstYearEnrolledOn`).
 */
export const fullStudentSchema = z.object({
  ...studentSchema.shape,
  ...parentsSchema.shape,
  ...feesSchema.shape,
  transportEnabled: z.boolean().optional().default(false),
  transportAssignment: transportAssignmentSchema.optional().nullable(),
});

// SEC-001: enrollment staff without financial access submit no charges.
// Reuse the item schema; chaining min(0) would retain feesSchema's min(1).
export const studentWithoutFeesSchema = fullStudentSchema.extend({
  fees: z.array(fullStudentSchema.shape.fees.element).max(0),
});

/**
 * The wizard's first step.
 *
 * The student's own fields plus the transport toggle, because the toggle is
 * answered on that step and decides whether a fourth step appears at all. It
 * is spelled out here rather than reaching into `fullStudentSchema.shape` from
 * the component, so the step and the whole form cannot disagree about it.
 */
export const studentWithTransportSchema = studentSchema.extend({
  transportEnabled: fullStudentSchema.shape.transportEnabled,
});

export type FullStudentFormValues = z.input<typeof fullStudentSchema>;
