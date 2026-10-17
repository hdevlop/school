import { z } from 'zod';

type T = (key: string) => string;

/**
 * Putting a student on a bus. The schemas take `t` so a refused field reads in
 * the page's language.
 *
 * Two forms write this, and they are not the same form. The standalone
 * assignment dialog (`TransportAssignmentForm`) always needs a vehicle and a
 * pickup point, because that is the whole purpose of opening it. Inside the
 * full student form transport is a toggle, so the same fields are only
 * required once `transportEnabled` is on — which is what `transport` below
 * expresses.
 *
 * Keeping both here is deliberate: the Students feature composes the optional
 * variant rather than redefining it, so a field added to one cannot go missing
 * from the other.
 */
export const createTransportSchemas = (t: T) => {
  const location = z.object({
    address: z.string().max(500, t('validationMessages.addressTooLong')),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
  });

  // A blank date input holds `''`; read it as not given. The student wizard
  // starts the assignment blank and validates it even with transport off.
  const optionalDateField = z.preprocess(
    (value) => (value === '' ? null : value),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, t('validationMessages.dateMustBeInYyyyMmDdFormat'))
      .nullable()
      .optional(),
  );
  const vehicleRequired = t('validationMessages.vehicleIsRequired');
  const pickupRequired = t('validationMessages.pickupLocationIsRequired');

  /** The fields themselves, with nothing required beyond what the API needs. */
  const assignment = z.object({
    vehicleId: z.string().optional().default(''),
    assignmentDate: optionalDateField,
    pickup: location,
    pickupPlaceId: z.string().max(255).optional().nullable(),
    dropoff: location,
    dropoffPlaceId: z.string().max(255).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
  });

  /**
   * The standalone assignment dialog. Opened from a student or from a vehicle's
   * roster, and in both cases the user came to assign a specific bus — so the
   * vehicle and the pickup point are required outright rather than conditionally.
   */
  const standaloneAssignment = z.object({
    vehicleId: z.string().min(1, vehicleRequired),
    assignmentDate: z.string().optional().nullable(),
    pickup: location.refine((value) => Boolean(value.address), {
      path: ['address'],
      message: pickupRequired,
    }),
    pickupPlaceId: z.string().max(255).optional().nullable(),
    dropoff: location,
    dropoffPlaceId: z.string().max(255).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
  });

  /**
   * Transport as an optional part of a larger form.
   *
   * The refinement is the point: with the toggle off nothing is checked, and
   * with it on the vehicle and pickup address become required and report against
   * their own nested paths so the errors land on the right inputs.
   */
  const transport = z
    .object({
      transportEnabled: z.boolean().optional().default(false),
      transportAssignment: assignment.optional().nullable(),
    })
    .superRefine((value, ctx) => {
      if (!value.transportEnabled) return;
      if (!value.transportAssignment?.vehicleId) {
        ctx.addIssue({
          code: 'custom',
          path: ['transportAssignment', 'vehicleId'],
          message: vehicleRequired,
        });
      }
      if (!value.transportAssignment?.pickup.address) {
        ctx.addIssue({
          code: 'custom',
          path: ['transportAssignment', 'pickup', 'address'],
          message: pickupRequired,
        });
      }
    });

  return { location, assignment, standaloneAssignment, transport };
};

type TransportSchemas = ReturnType<typeof createTransportSchemas>;
export type TransportAssignmentFormValues = z.input<TransportSchemas['assignment']>;
export type StandaloneTransportAssignmentFormValues = z.input<TransportSchemas['standaloneAssignment']>;
