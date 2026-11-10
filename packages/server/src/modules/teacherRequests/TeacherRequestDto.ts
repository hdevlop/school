import { z } from 'zod';
import { addressField, cinField, nameField, num, phoneField } from '../../shared/fields';
import { genderEnum } from '../../shared/enums';

export const createTeacherRequestDto = z.object({
  name: nameField,
  // Lower case and trimmed: one waiting request per address, and Google sign-in
  // compares this address with the one Google verified.
  email: z.string().trim().toLowerCase().email('Invalid email format').max(254),
  phone: phoneField,
  cin: cinField,
  address: addressField.unwrap().trim().min(1, 'Address is required'),
  gender: genderEnum.optional(),
  specialization: z.string().trim().max(100, 'Specialization too long').optional(),
  yearsOfExperience: num().int().min(0, 'Years of experience must be non-negative').optional(),
  academicDegrees: z.string().trim().max(500, 'Academic degrees description too long').optional(),
  // A hidden field only a robot fills in.
  website: z.string().max(1000).optional(),
});

export const teacherRequestIdParam = z.object({ id: z.string().min(1) });

export type CreateTeacherRequestDto = z.infer<typeof createTeacherRequestDto>;
