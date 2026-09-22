import { z } from 'zod';
import { GENDER_VALUES, STUDENT_STATUS_VALUES } from '@sms/contracts';

const optionalId = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1, 'ID cannot be empty').nullish().optional(),
);
const requiredId = z.preprocess(
  (value) => value ?? '',
  z.string().min(1, 'ID is required'),
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
const optionalDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .nullable()
  .optional();
const locationValueSchema = z.object({
  address: z.string().max(500, 'Address too long'),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
});

/**
 * A student on their own — the quick-add dialog and the profile edit.
 *
 * `addressLocation` is the map picker's `{ address, latitude, longitude }`
 * object rather than three fields, because that is what the picker writes.
 * The full student form flattens it into `address` / `addressLatitude` /
 * `addressLongitude` just before the request is built; nothing else does, so
 * that flattening stays in `FullStudentForm` rather than in this schema.
 *
 * `image` accepts a `File` so a freshly picked photo and a stored path both
 * validate against the same schema.
 */
export const studentSchema = z.object({
  id: optionalId,
  classId: requiredId,
  sectionId: requiredId,
  studentCode: z.string(),
  name: nameField,
  email: emailField,
  phone: phoneField.nullish(),
  addressLocation: locationValueSchema,
  addressPlaceId: z.string().max(255).optional().nullable(),
  dateOfBirth: optionalDateField,
  gender: z.enum(GENDER_VALUES),
  enrollmentDate: dateField,
  medicalConditions: z.string().max(1000, 'Medical conditions description too long').nullish().optional(),
  previousSchool: z.string().max(500, 'Previous school name too long').optional().nullable(),
  image: z.union([z.string(), z.instanceof(File), z.null()]).optional(),
  status: z.enum(STUDENT_STATUS_VALUES).default('active'),
});

export type StudentFormValues = z.input<typeof studentSchema>;
