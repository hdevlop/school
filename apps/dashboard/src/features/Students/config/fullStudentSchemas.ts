import { z } from 'zod';

import { createFeeSchemas } from '@/features/Financial/Fees/config/feeSchemas';
import { parentsSchema } from '@/features/Parents/config/parentSchemas';
import { transportAssignmentSchema } from '@/features/Transport/config/transportSchemas';

import { studentSchema } from './studentSchemas';

// Answered on the first step; the step and the whole form share this field.
const transportEnabledField = z.boolean().optional().default(false);

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
 *
 * It takes `t` for the fee list, whose refusals read in the page's language.
 */
export const createFullStudentSchemas = (t: (key: string) => string) => {
  const { fees } = createFeeSchemas(t);
  const fullStudent = z.object({
    ...studentSchema.shape,
    ...parentsSchema.shape,
    ...fees.shape,
    transportEnabled: transportEnabledField,
    transportAssignment: transportAssignmentSchema.optional().nullable(),
  });

  // SEC-001: enrollment staff without financial access submit no charges.
  // Reuse the item schema; chaining min(0) would retain the list's min(1).
  const studentWithoutFees = fullStudent.extend({
    fees: z.array(fullStudent.shape.fees.element).max(0),
  });

  return { fees, fullStudent, studentWithoutFees };
};

/**
 * The wizard's first step.
 *
 * The student's own fields plus the transport toggle, because the toggle is
 * answered on that step and decides whether a fourth step appears at all. It
 * shares `transportEnabledField` with the whole form, so the step and the form
 * cannot disagree about it.
 */
export const studentWithTransportSchema = studentSchema.extend({
  transportEnabled: transportEnabledField,
});

export type FullStudentFormValues = z.input<ReturnType<typeof createFullStudentSchemas>['fullStudent']>;
