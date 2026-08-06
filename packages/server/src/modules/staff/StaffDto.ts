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
import {
  compensationModeEnum,
  employmentTypeEnum,
  genderEnum,
  shiftEnum,
  staffStatusEnum,
} from '@server/shared/enums';

// Role-specific support profile. Driver is the only structured support table in v1
// (see STAFF_ROLES_REFACTOR_PLAN.md §7). New roles add their own optional block here.
const driverProfileSchema = z.object({
  id: optionalId,
  licenseNumber: z.string().min(5, 'License number must be at least 5 characters').max(20, 'License number too long'),
  licenseType: z.string().max(10, 'License type too long'),
  licenseExpiry: dateField,
  yearsOfExperience: num().int().min(0, 'Years of experience must be non-negative').optional(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

const staffProfileSchema = driverProfileSchema.partial();

const staffAssignmentSchema = z.object({
  zoneId: z.string().min(1).optional(),
  classId: z.string().min(1).optional(),
  sectionId: z.string().min(1).optional().nullable(),
  cycleId: z.string().min(1).optional(),
  vehicleId: z.string().min(1).optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
  startDate: dateField.optional().nullable(),
  endDate: dateField.optional().nullable(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

const staffBaseSchema = z.object({
  id: optionalId,
  userId: z.string().min(1).optional().nullable(),
  // Optional login provisioning (plan §5: staff.userId stays nullable).
  createLogin: z.boolean().optional(),
  email: emailField.optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
  image: z.string().nullish(),
  // Role-specific support fields (e.g. driver license) — validated per-role in the service.
  profile: staffProfileSchema.optional(),
  assignments: z.array(staffAssignmentSchema).optional(),
  employeeCode: z.string().min(1, 'Employee code is required').max(50, 'Employee code too long').optional(),
  name: nameField,
  cin: cinField,
  gender: genderEnum.optional(),
  phone: phoneField,
  address: addressField.and(z.string().min(1, 'Address is required')),
  medicalConditions: z.string().max(1000, 'Medical conditions description too long').optional().nullable().or(z.literal('')),
  role: z.string().min(1, 'Role is required'),
  department: z.string().max(100, 'Department too long').optional().or(z.literal('')),
  compensationMode: compensationModeEnum.default('monthly'),
  salary: num().positive('Salary must be positive'),
  hourlyRate: num().positive('Hourly rate must be positive').optional(),
  workloadHours: num().int().min(0, 'Workload hours must be non-negative').optional(),
  shift: shiftEnum.optional(),
  employmentType: employmentTypeEnum.optional(),
  hireDate: dateField,
  endDate: dateField.optional().or(z.literal('')),
  status: staffStatusEnum.default('active'),
  bankAccount: z.string().max(100, 'Bank account too long').optional().or(z.literal('')),
  emergencyContact: nameField.optional(),
  emergencyPhone: phoneField.optional().or(z.literal('')),
});

const ensureCompensationFields = (data, ctx) => {
  if (data.compensationMode === 'hourly') {
    if (!(Number(data.hourlyRate) > 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hourlyRate'], message: 'Hourly rate is required for hourly staff' });
    }
    if (!(Number(data.workloadHours) > 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['workloadHours'], message: 'Workload hours are required for hourly staff' });
    }
  }
};

export const createStaffDto = staffBaseSchema.superRefine(ensureCompensationFields);
export const updateStaffDto = staffBaseSchema.partial().superRefine(ensureCompensationFields);

export const staffIdParam = z.object({ id: z.string().min(1) });
export const staffRoleParam = z.object({ role: z.string().min(1) });
export const staffEmployeeCodeParam = z.object({ employeeCode: z.string().min(1) });
export const staffAttendanceRosterQueryDto = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
});

export const deleteBulkStaffDto = z.array(z.string().min(1));

export type CreateStaffDto = z.infer<typeof createStaffDto>;
export type UpdateStaffDto = z.infer<typeof updateStaffDto>;
export type DeleteBulkStaffDto = z.infer<typeof deleteBulkStaffDto>;
export type StaffAttendanceRosterQueryDto = z.infer<typeof staffAttendanceRosterQueryDto>;
