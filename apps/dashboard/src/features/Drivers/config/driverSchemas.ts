import { z } from 'zod';
import { DRIVER_STATUS_VALUES, GENDER_VALUES } from '@sms/contracts';

import {
  addressField,
  cinField,
  dateField,
  emailField,
  nameField,
  num,
  optionalId,
  phoneField,
} from '@/shared/forms/fieldPrimitives';

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
  salary: num().positive('Salary must be positive').optional(),
  yearsOfExperience: num().int().min(0, 'Years of experience must be non-negative').optional(),
  emergencyContact: nameField.optional(),
  emergencyPhone: phoneField.optional(),
  image: z.union([z.string(), z.instanceof(File), z.null()]).optional(),
  status: z.enum(DRIVER_STATUS_VALUES).default('active'),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

export type DriverFormValues = z.input<typeof driverSchema>;
