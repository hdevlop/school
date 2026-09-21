import { z } from 'zod';
import { EMPLOYMENT_TYPE_VALUES, GENDER_VALUES, TEACHER_STATUS_VALUES } from '@sms/contracts';

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

/**
 * Hiring a teacher, in the three steps the wizard walks through.
 *
 * Each step binds its own schema so the user is stopped at the step that has
 * the problem, and `teacherFullSchema` is the same three merged for the final
 * submit. Keeping the parts and the whole in one file is what stops a field
 * from being validated on one screen and not the other.
 */

/** Step 1 — who they are. */
export const teacherPersonalSchema = z.object({
  id: optionalId,
  name: nameField,
  cin: cinField,
  email: emailField,
  phone: phoneField,
  address: addressField,
  gender: z.enum(GENDER_VALUES).optional(),
  emergencyContact: nameField.optional(),
  emergencyPhone: phoneField,
  status: z.enum(TEACHER_STATUS_VALUES).default('active'),
  image: z.union([z.string(), z.instanceof(File), z.null()]).optional(),
});

/** Step 2 — the terms of their employment. */
export const teacherProfessionalSchema = z.object({
  specialization: z.string().max(100, 'Specialization too long').optional(),
  yearsOfExperience: num().int().min(0, 'Years of experience must be non-negative').optional(),
  salary: num().positive('Salary must be positive').optional(),
  hireDate: dateField,
  bankAccount: z.coerce.string().max(100, { message: 'Bank account too long' }).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPE_VALUES).optional(),
  workloadHours: num().int().min(0, 'Workload hours must be non-negative').max(60, 'Workload hours cannot exceed 60').optional(),
  academicDegrees: z.string().max(500, 'Academic degrees description too long').optional(),
});

/** One line of "this teacher teaches these subjects to these sections". */
export const assignmentSchema = z.object({
  classId: z.string().min(1, 'Class is required'),
  sectionIds: z.array(z.string()).min(1, 'At least one section is required'),
  subjectIds: z.array(z.string()).min(1, 'At least one subject is required'),
  academicYear: z.string().optional(),
});

/** Step 3 — the timetable. Also bound on its own by the bulk assignment dialog. */
export const assignmentsSchema = z.object({
  assignments: z.array(assignmentSchema).min(1, 'At least one parent is required'),
});

export const teacherFullSchema = z.object({
  ...teacherPersonalSchema.shape,
  ...teacherProfessionalSchema.shape,
  ...assignmentsSchema.shape,
});

export type TeacherPersonalFormValues = z.input<typeof teacherPersonalSchema>;
export type TeacherProfessionalFormValues = z.input<typeof teacherProfessionalSchema>;
export type TeacherAssignmentFormValues = z.input<typeof assignmentSchema>;
export type TeacherFullFormValues = z.input<typeof teacherFullSchema>;
