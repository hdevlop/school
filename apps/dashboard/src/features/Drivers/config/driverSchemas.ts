import { z } from 'zod';
import { DRIVER_STATUS_VALUES, GENDER_VALUES } from '@sms/contracts';

type T = (key: string) => string;

const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

/** A cleared number input holds `null`; an optional field reads it as not given. */
const optionalNumberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => (value === null ? undefined : value), numberField(schema).optional());

/** The driver form's schema; it takes `t` so a refused field reads in the page's language. */
export const createDriverSchema = (t: T) => {
  const optionalId = z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1, t('validationMessages.idCannotBeEmpty')).nullish().optional(),
  );
  const emailField = z.string().email(t('validationMessages.invalidEmailFormat')).or(z.literal(''));
  const phoneField = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, t('validationMessages.invalidPhoneNumber'));
  const nameField = z
    .string()
    .min(2, t('validationMessages.nameMustBeAtLeast2Characters'))
    .max(100, t('validationMessages.nameTooLong'));
  const dateField = z.string().regex(
    /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/,
    t('validationMessages.dateMustBeInYyyyMmDdMmDd'),
  );
  const cinField = z.string().min(7, t('validationMessages.cinMustBeAtLeast7Characters')).max(20, t('validationMessages.cinTooLong'));
  const addressField = z.string().max(500, t('validationMessages.addressTooLong')).optional();
  const validNumber = () => z.number({ error: t('validationMessages.mustBeAValidNumber') });

  return z.object({
    id: optionalId,
    name: nameField,
    email: emailField,
    cin: cinField,
    phone: phoneField,
    address: addressField,
    gender: z.enum(GENDER_VALUES).optional(),
    licenseNumber: z.string().min(5, t('validationMessages.licenseNumberMustBeAtLeast5Characters')).max(20, t('validationMessages.licenseNumberTooLong')),
    licenseType: z.string().max(10, t('validationMessages.licenseTypeTooLong')),
    licenseExpiry: dateField,
    hireDate: dateField,
    salary: optionalNumberField(validNumber().positive(t('validationMessages.salaryMustBePositive'))),
    yearsOfExperience: optionalNumberField(validNumber().int(t('validationMessages.mustBeAnInteger'))
      .min(0, t('validationMessages.yearsOfExperienceMustBeNonNegative'))),
    emergencyContact: nameField.optional(),
    emergencyPhone: phoneField.optional(),
    image: z.union([z.string(), z.instanceof(File), z.null()]).optional(),
    status: z.enum(DRIVER_STATUS_VALUES).default('active'),
    notes: z.string().max(1000, t('validationMessages.notesTooLong')).optional().nullable(),
  });
};

export type DriverFormValues = z.input<ReturnType<typeof createDriverSchema>>;
