import { z } from 'zod';
import { DRIVER_STATUS_VALUES, GENDER_VALUES } from '@sms/contracts';

const optionalId = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1, 'ID cannot be empty').nullish().optional(),
);
const emailField = z.string().email('Invalid email format').or(z.literal(''));
const phoneField = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number');
const nameField = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name too long');
const dateField = z.string().regex(
  /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/,
  'Date must be in YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, DD-MM-YY, or DD-MM-YYYY format',
);
const cinField = z.string().min(8, 'CIN must be at least 8 characters').max(20, 'CIN too long');
const addressField = z.string().max(500, 'Address too long').optional();
const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

export const driverSchema = z.object({
  id: optionalId,
  name: nameField,
  email: emailField,
  cin: cinField,
  phone: phoneField,
  address: addressField,
  gender: z.enum(GENDER_VALUES).optional(),
  licenseNumber: z.string().min(5, 'License number must be at least 5 characters').max(20, 'License number too long'),
  licenseType: z.string().max(10, 'License type too long'),
  licenseExpiry: dateField,
  hireDate: dateField,
  salary: numberField(z.number({ error: 'Must be a valid number' }).positive('Salary must be positive')).optional(),
  yearsOfExperience: numberField(z.number({ error: 'Must be a valid number' }).int('Must be an integer').min(0, 'Years of experience must be non-negative')).optional(),
  emergencyContact: nameField.optional(),
  emergencyPhone: phoneField.optional(),
  image: z.union([z.string(), z.instanceof(File), z.null()]).optional(),
  status: z.enum(DRIVER_STATUS_VALUES).default('active'),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

export type DriverFormValues = z.input<typeof driverSchema>;
