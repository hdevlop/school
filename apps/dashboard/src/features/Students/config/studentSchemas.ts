import { z } from 'zod';
import { GENDER_VALUES, STUDENT_STATUS_VALUES } from '@sms/contracts';

import { locationValueSchema } from '@/shared/forms/commonSchemas';
import {
  dateField,
  emailField,
  nameField,
  optionalDateField,
  optionalId,
  phoneField,
  requiredId,
} from '@/shared/forms/fieldPrimitives';

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
