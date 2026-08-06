import { z } from 'zod';
import {
  addressField,
  dateField,
  emailField,
  nameField,
  optionalDateField,
  optionalId,
  phoneField,
  requiredId,
} from '@server/shared/fields';
import { genderEnum, studentStatusEnum } from '@server/shared/enums';
import { latitudeDto, longitudeDto, placeIdDto } from '@server/shared/locationDto';

const transportAssignmentDto = z.object({
  vehicleId: z.string().min(1),
  assignmentDate: optionalDateField,
  pickupLocation: z.string().min(1).max(500),
  pickupPlaceId: placeIdDto,
  pickupLatitude: latitudeDto,
  pickupLongitude: longitudeDto,
  dropoffLocation: z.string().max(500).optional().nullable(),
  dropoffPlaceId: placeIdDto,
  dropoffLatitude: latitudeDto,
  dropoffLongitude: longitudeDto,
  notes: z.string().max(1000).optional().nullable(),
});

const studentSchema = z.object({
  id: optionalId,
  classId: requiredId,
  sectionId: requiredId,
  studentCode: z.string(),
  name: nameField,
  email: emailField,
  phone: phoneField.nullish(),
  address: addressField,
  addressPlaceId: placeIdDto,
  addressLatitude: latitudeDto,
  addressLongitude: longitudeDto,
  dateOfBirth: optionalDateField,
  gender: genderEnum,
  enrollmentDate: dateField,
  medicalConditions: z.string().max(1000, 'Medical conditions description too long').nullish().optional(),
  previousSchool: z.string().max(500, 'Previous school name too long').optional().nullable(),
  image: z.string().nullish(),
  status: studentStatusEnum.default('active'),
});

export const createStudentDto = studentSchema.omit({ id: true }).extend({
  id: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  gradeLevel: z.number().optional(),
  graduationDate: z.string().optional().nullable(),
  parents: z.array(z.unknown()).optional(),
  parentIds: z.array(z.string().min(1)).optional(),
  fees: z.array(z.unknown()).optional(),
  transportAssignment: transportAssignmentDto.optional().nullable(),
});

export const createStudentsBulkDto = z.array(createStudentDto);
export const updateStudentDto = createStudentDto.partial();

export const studentIdParam = z.object({ id: z.string().min(1) });
export const deleteBulkStudentDto = z.object({
  ids: z.array(z.string().min(1)),
});

export type CreateStudentDto = z.input<typeof createStudentDto>;
export type UpdateStudentDto = z.input<typeof updateStudentDto>;
export type CreateStudentsBulkDto = z.input<typeof createStudentsBulkDto>;
export type DeleteBulkStudentDto = z.infer<typeof deleteBulkStudentDto>;
