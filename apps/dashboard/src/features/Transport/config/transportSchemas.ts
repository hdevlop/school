import { z } from 'zod';

export const locationValueSchema = z.object({
  address: z.string().max(500, 'Address too long'),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
});

const optionalDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .nullable()
  .optional();

/**
 * Putting a student on a bus.
 *
 * Two forms write this, and they are not the same form. The standalone
 * assignment dialog (`TransportAssignmentForm`) always needs a vehicle and a
 * pickup point, because that is the whole purpose of opening it. Inside the
 * full student form transport is a toggle, so the same fields are only
 * required once `transportEnabled` is on — which is what `transportSchema`
 * below expresses.
 *
 * Keeping both here is deliberate: the Students feature composes the optional
 * variant rather than redefining it, so a field added to one cannot go missing
 * from the other.
 */

/** The fields themselves, with nothing required beyond what the API needs. */
export const transportAssignmentSchema = z.object({
  vehicleId: z.string().optional().default(''),
  assignmentDate: optionalDateField,
  pickup: locationValueSchema,
  pickupPlaceId: z.string().max(255).optional().nullable(),
  dropoff: locationValueSchema,
  dropoffPlaceId: z.string().max(255).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

/**
 * The standalone assignment dialog. Opened from a student or from a vehicle's
 * roster, and in both cases the user came to assign a specific bus — so the
 * vehicle and the pickup point are required outright rather than conditionally.
 */
export const standaloneTransportAssignmentSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  assignmentDate: z.string().optional().nullable(),
  pickup: locationValueSchema.refine((value) => Boolean(value.address), {
    path: ['address'],
    message: 'Pickup location is required',
  }),
  pickupPlaceId: z.string().max(255).optional().nullable(),
  dropoff: locationValueSchema,
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
export const transportSchema = z
  .object({
    transportEnabled: z.boolean().optional().default(false),
    transportAssignment: transportAssignmentSchema.optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (!value.transportEnabled) return;
    if (!value.transportAssignment?.vehicleId) {
      ctx.addIssue({
        code: 'custom',
        path: ['transportAssignment', 'vehicleId'],
        message: 'Vehicle is required',
      });
    }
    if (!value.transportAssignment?.pickup.address) {
      ctx.addIssue({
        code: 'custom',
        path: ['transportAssignment', 'pickup', 'address'],
        message: 'Pickup location is required',
      });
    }
  });

export type TransportAssignmentFormValues = z.input<typeof transportAssignmentSchema>;
export type StandaloneTransportAssignmentFormValues = z.input<typeof standaloneTransportAssignmentSchema>;
