import { z } from 'zod';
import {
  addressField,
  cinField,
  dateField,
  emailField,
  nameField,
  num,
  optionalId,
} from '@server/shared/fields';
import { compensationModeEnum, driverStatusEnum, genderEnum } from '@server/shared/enums';

const multipartPhoneField = z.coerce.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number');

const driverSchema = z.object({
  id: optionalId,
  name: nameField,
  email: emailField,
  cin: cinField,
  phone: multipartPhoneField,
  address: addressField,
  gender: genderEnum.optional(),
  licenseNumber: z.string().min(5, 'License number must be at least 5 characters').max(20, 'License number too long'),
  licenseType: z.string().max(10, 'License type too long'),
  licenseExpiry: dateField,
  hireDate: dateField,
  salary: num().positive('Salary must be positive').optional(),
  compensationMode: compensationModeEnum.optional(),
  hourlyRate: num().positive('Hourly rate must be positive').optional(),
  workloadHours: num().int().min(0, 'Workload hours must be non-negative').optional(),
  yearsOfExperience: num().int().min(0, 'Years of experience must be non-negative').optional(),
  emergencyContact: nameField.optional(),
  emergencyPhone: multipartPhoneField.optional(),
  image: z.string().nullish(),
  status: driverStatusEnum.default('active'),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

const driverBaseSchema = driverSchema.extend({
  userId: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
});

export const createDriverDto = driverBaseSchema;
export const createDriversBulkDto = z.array(createDriverDto);
export const updateDriverDto = createDriverDto.partial().extend({
  status: driverStatusEnum.optional(),
});
export const updateDriverMcpDto = updateDriverDto.extend({
  id: z.string().min(1),
});

export const driverIdParam = z.object({ id: z.string().min(1) });
export const cinParam = z.object({ cin: z.string().min(1) });
export const licenseNumberParam = z.object({ licenseNumber: z.string().min(1) });
export const emailParam = z.object({ email: z.string().min(1) });
export const phoneParam = z.object({ phone: z.string().min(1) });

export const updateDriverStatusDto = z.object({
  status: z.string().min(1),
});

export const deleteDriversBulkDto = z.array(z.string().min(1));

export type CreateDriverDto = z.infer<typeof createDriverDto>;
export type UpdateDriverDto = z.infer<typeof updateDriverDto>;
export type UpdateDriverMcpDto = z.infer<typeof updateDriverMcpDto>;
export type CreateDriversBulkDto = z.infer<typeof createDriversBulkDto>;
export type UpdateDriverStatusDto = z.infer<typeof updateDriverStatusDto>;
export type DeleteDriversBulkDto = z.infer<typeof deleteDriversBulkDto>;
