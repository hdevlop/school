import { z } from 'zod';
import { VEHICLE_STATUS_VALUES, VEHICLE_TYPE_VALUES } from '@sms/contracts';

type T = (key: string) => string;

const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

/** The vehicle form's schema; it takes `t` so a refused field reads in the page's language. */
export const createVehicleSchema = (t: T) => {
  const optionalId = z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1, t('validationMessages.idCannotBeEmpty')).nullish().optional(),
  );
  // The form starts an untouched date picker at '', which the date pattern
  // rejects; without this, a vehicle could not be saved with no purchase date.
  const optionalDateField = z.preprocess(
    (value) => (value === '' ? null : value),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, t('validationMessages.dateMustBeInYyyyMmDdFormat'))
      .nullable()
      .optional(),
  );

  return z.object({
    id: optionalId,
    name: z.string().min(2, t('validationMessages.vehicleNameMustBeAtLeast2Characters')).max(100, t('validationMessages.vehicleNameTooLong')),
    brand: z.string().min(2, t('validationMessages.brandMustBeAtLeast2Characters')).max(100, t('validationMessages.brandTooLong')),
    model: z.string().min(2, t('validationMessages.modelMustBeAtLeast2Characters')).max(100, t('validationMessages.modelTooLong')),
    year: numberField(z.number({ error: t('validationMessages.mustBeAValidNumber') }).int(t('validationMessages.mustBeAnInteger')).min(1900, t('validationMessages.yearMustBeAfter1900')).max(new Date().getFullYear() + 1, t('validationMessages.yearCannotBeInFuture'))),
    type: z.enum(VEHICLE_TYPE_VALUES).default('fullbus'),
    capacity: numberField(z.number({ error: t('validationMessages.mustBeAValidNumber') }).int(t('validationMessages.mustBeAnInteger')).min(1, t('validationMessages.capacityMustBeAtLeast1')).max(200, t('validationMessages.capacityCannotExceed200'))),
    licensePlate: z.string().min(2, t('validationMessages.licensePlateMustBeAtLeast2Characters')).max(50, t('validationMessages.licensePlateTooLong')),
    driverId: optionalId.nullable(),
    image: z.string().max(500, t('validationMessages.imagePathTooLong')).optional().nullable().default('novehicle.png'),
    purchaseDate: optionalDateField.nullable(),
    purchasePrice: numberField(z.number({ error: t('validationMessages.mustBeAValidNumber') }).min(0, t('validationMessages.purchasePriceMustBeNonNegative')).max(10000000, t('validationMessages.purchasePriceTooLarge'))).optional().nullable(),
    initialMileage: numberField(z.number({ error: t('validationMessages.mustBeAValidNumber') }).min(0, t('validationMessages.initialMileageMustBeNonNegative')).max(10000000, t('validationMessages.initialMileageTooLarge'))).optional().nullable(),
    currentMileage: numberField(z.number({ error: t('validationMessages.mustBeAValidNumber') }).min(0, t('validationMessages.currentMileageMustBeNonNegative')).max(10000000, t('validationMessages.currentMileageTooLarge'))).optional().nullable(),
    status: z.enum(VEHICLE_STATUS_VALUES).default('active'),
    notes: z.string().max(1000, t('validationMessages.notesTooLong')).optional().nullable(),
  });
};

export type VehicleFormValues = z.input<ReturnType<typeof createVehicleSchema>>;

/**
 * Ending a vehicle's current driver assignment. The server takes an end date
 * after the start, inside the viewed year and not in the future; the form
 * checks the first and defaults to the others.
 */
export const createEndDriverAssignmentSchema = (t: (key: string) => string, assignmentDate: string) => z.object({
  unassignmentDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, t('staff.validation.dateInvalid'))
    .refine((date) => date > assignmentDate, t('vehicles.validation.endAfterStart')),
});
