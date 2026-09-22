import { z } from 'zod';
import {
  addressField,
  cinField,
  emailField,
  nameField,
  optionalDateField,
  optionalId,
  phoneField,
} from '../../shared/fields';
import { genderEnum, maritalStatusEnum, relationshipTypeEnum } from '../../shared/enums';

const parentSchema = z.object({
  id: optionalId,
  name: nameField,
  email: emailField.optional(),
  phone: phoneField,
  gender: genderEnum.optional(),
  address: addressField,
  dateOfBirth: optionalDateField,
  cin: cinField,
  occupation: z.string().max(100, 'Occupation too long').optional(),
  nationality: z.string().max(100, 'Nationality too long').optional(),
  maritalStatus: maritalStatusEnum.optional(),
  relationshipType: relationshipTypeEnum,
  image: z.string().nullish(),
  isEmergencyContact: z.boolean().optional().default(false),
  financialResponsibility: z.boolean().optional().default(false),
});

export const createParentDto = parentSchema.omit({ id: true }).extend({
  id: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
});
export const createParentsBulkDto = z.array(createParentDto);
// Credentials are not part of a profile edit. `omit` alone would only strip a
// password, leaving an admin who sent one believing it had been set, so the
// field is declared `never`: present means rejected, absent means fine.
export const updateParentDto = createParentDto
  .partial()
  .extend({ password: z.never('Passwords are not set from a profile edit').optional() });

export const parentIdParam = z.object({ id: z.string().min(1) });
export const parentCinParam = z.object({ cin: cinField });
export const parentPhoneParam = z.object({ phone: phoneField });
export const parentSearchQueryDto = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().positive().max(100).optional(),
});
export const linkStudentDto = z.object({ studentId: z.string().min(1) });
export const unlinkStudentParams = z.object({
  id: z.string().min(1),
  studentId: z.string().min(1),
});
export const deleteBulkParentDto = z.object({
  ids: z.array(z.string().min(1)),
});

export type CreateParentDto = z.input<typeof createParentDto>;
export type UpdateParentDto = z.input<typeof updateParentDto>;
export type CreateParentsBulkDto = z.input<typeof createParentsBulkDto>;
export type ParentSearchQueryDto = z.infer<typeof parentSearchQueryDto>;
export type LinkStudentDto = z.infer<typeof linkStudentDto>;
export type DeleteBulkParentDto = z.infer<typeof deleteBulkParentDto>;
