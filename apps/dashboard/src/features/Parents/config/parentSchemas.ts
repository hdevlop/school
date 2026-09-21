import { z } from 'zod';
import { GENDER_VALUES, MARITAL_STATUS_VALUES, RELATIONSHIP_TYPE_VALUES } from '@sms/contracts';

import {
  addressField,
  cinField,
  emailField,
  nameField,
  optionalDateField,
  optionalId,
  phoneField,
} from '@/shared/forms/fieldPrimitives';

/**
 * One parent or guardian.
 *
 * Almost everything is optional because the school often has only a name, a
 * phone and a CIN when a child is enrolled, and a half-filled record is worth
 * more than none. The three that are not optional — name, phone, CIN — are the
 * ones the school needs to reach and identify the person.
 *
 * `image` accepts a `File` as well as a string: the same schema validates both
 * a freshly picked upload and a record loaded back from the API with a stored
 * path.
 */
export const parentSchema = z.object({
  id: optionalId,
  name: nameField,
  email: emailField.optional(),
  phone: phoneField,
  gender: z.enum(GENDER_VALUES).optional(),
  address: addressField,
  dateOfBirth: optionalDateField,
  cin: cinField,
  occupation: z.string().max(100, 'Occupation too long').optional(),
  nationality: z.string().max(100, 'Nationality too long').optional(),
  maritalStatus: z.enum(MARITAL_STATUS_VALUES).optional(),
  relationshipType: z.enum(RELATIONSHIP_TYPE_VALUES),
  image: z.union([z.string(), z.instanceof(File), z.null()]).optional(),
  isEmergencyContact: z.boolean().optional().default(false),
  financialResponsibility: z.boolean().optional().default(false),
});

/**
 * A list of parents, as the bulk form and the full student form submit it.
 *
 * Defaults to an empty array rather than requiring one entry: a student can be
 * created before any guardian details are known, and the parents tab is then
 * filled in later.
 */
export const parentsSchema = z.object({
  parents: z.array(parentSchema).optional().default([]),
});

export type ParentFormValues = z.input<typeof parentSchema>;
export type ParentsFormValues = z.input<typeof parentsSchema>;
