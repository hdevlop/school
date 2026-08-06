import { z } from 'zod';
import {
  addressField,
  cinField,
  dateField,
  emailField,
  nameField,
  num,
  optionalId,
  phoneField,
} from '@server/shared/fields';
import { compensationModeEnum, employmentTypeEnum, genderEnum, teacherStatusEnum } from '@server/shared/enums';

const teacherPersonalSchema = z.object({
  id: optionalId,
  name: nameField,
  cin: cinField,
  email: emailField,
  phone: phoneField,
  address: addressField,
  gender: genderEnum.optional(),
  emergencyContact: nameField.optional(),
  emergencyPhone: phoneField.optional(),
  status: teacherStatusEnum.default('active'),
  image: z.string().nullish(),
});

const teacherProfessionalSchema = z.object({
  specialization: z.string().max(100, 'Specialization too long').optional(),
  yearsOfExperience: num().int().min(0, 'Years of experience must be non-negative').optional(),
  salary: num().positive('Salary must be positive').optional(),
  compensationMode: compensationModeEnum.optional(),
  hourlyRate: num().positive('Hourly rate must be positive').optional(),
  hireDate: dateField,
  bankAccount: z.coerce.string().max(100, { message: 'Bank account too long' }).optional(),
  employmentType: employmentTypeEnum.optional(),
  workloadHours: num().int().min(0, 'Workload hours must be non-negative').max(60, 'Workload hours cannot exceed 60').optional(),
  academicDegrees: z.string().max(500, 'Academic degrees description too long').optional(),
});

const assignmentSchema = z.object({
  classId: z.string().min(1, 'Class is required'),
  sectionIds: z.array(z.string()).min(1, 'At least one section is required'),
  subjectIds: z.array(z.string()).min(1, 'At least one subject is required'),
  academicYear: z.string().optional(),
});

const assignmentsSchema = z.object({
  assignments: z.array(assignmentSchema).optional().default([]),
});

const teacherFullSchema = z.object({
  ...teacherPersonalSchema.shape,
  ...teacherProfessionalSchema.shape,
  ...assignmentsSchema.shape,
});

export const createTeacherDto = teacherFullSchema.omit({ id: true }).extend({
  id: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
});
export const createTeachersBulkDto = z.array(createTeacherDto);
export const updateTeacherDto = createTeacherDto.partial();

export const teacherIdParam = z.object({ id: z.string().min(1) });
export const teacherCinParam = z.object({ cin: cinField });
export const teacherEmailParam = z.object({ email: z.string().email('Invalid email format') });
export const teacherPhoneParam = z.object({ phone: phoneField });
export const deleteBulkTeacherDto = z.array(z.string().min(1));

export const assignSubjectDto = z.object({
  teacherId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  subjectId: z.string().min(1),
});

export const unassignSubjectDto = z.object({
  teacherId: z.string().min(1),
  sectionId: z.string().min(1),
  subjectId: z.string().min(1),
});

export const assignClassDto = z.object({
  teacherId: z.string().min(1),
  classId: z.string().min(1),
  subjectId: z.string().min(1),
});

export const unassignClassDto = z.object({
  teacherId: z.string().min(1),
  classId: z.string().min(1),
  subjectId: z.string().min(1).optional(),
});

export type CreateTeacherDto = z.input<typeof createTeacherDto>;
export type UpdateTeacherDto = z.input<typeof updateTeacherDto>;
export type TeacherAssignmentDto = z.input<typeof assignmentSchema>;
export type CreateTeachersBulkDto = z.input<typeof createTeachersBulkDto>;
export type DeleteBulkTeacherDto = z.infer<typeof deleteBulkTeacherDto>;
export type AssignClassDto = z.input<typeof assignClassDto>;
export type UnassignClassDto = z.input<typeof unassignClassDto>;
