import { z } from 'zod';
import { dateField, requiredId } from '@server/shared/fields';
import { attendanceStatusEnum, attendanceTypeEnum } from '@server/shared/enums';

const mcpRequiredId = z.string().min(1, 'ID is required');
const notesField = z.string().max(500, 'Notes too long').optional();

const createAttendanceInputSchema = z.object({
  type: attendanceTypeEnum.default('student'),
  studentId: mcpRequiredId.optional(),
  staffId: mcpRequiredId.optional(),
  teacherId: mcpRequiredId.optional(),
  subjectId: mcpRequiredId.optional(),
  sectionId: mcpRequiredId.optional(),
  date: dateField,
  status: attendanceStatusEnum.default('present'),
  notes: notesField,
});

export const createAttendanceInputDto = createAttendanceInputSchema;

export const createAttendanceDto = createAttendanceInputSchema.superRefine((data, ctx) => {
  if (data.type === 'staff') {
    if (!data.staffId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['staffId'],
        message: 'Staff ID is required',
      });
    }

    return;
  }

  if (!data.studentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['studentId'],
      message: 'Student ID is required',
    });
  }

  if (!data.sectionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sectionId'],
      message: 'Section ID is required',
    });
  }

  // teacherId/subjectId are only required in per_class mode; the service
  // resolves them from the authenticated user when the client omits them
  // (daily mode, or staff marking attendance without being a teacher).
});

export const updateAttendanceDto = z.object({
  status: attendanceStatusEnum.optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
});

export const updateAttendanceStatusDto = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  sectionId: z.string().min(1, 'Section ID is required'),
  status: attendanceStatusEnum,
  note: z.string().max(500, 'Note too long').optional(),
  date: dateField.optional(),
});

export const staffAttendanceRosterItemDto = z.object({
  staffId: mcpRequiredId,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  status: attendanceStatusEnum.default('present'),
  notes: notesField.nullable(),
});

export const upsertStaffAttendanceRosterDto = z.object({
  items: z.array(staffAttendanceRosterItemDto)
    .min(1, 'At least one staff attendance record is required')
    .max(1000, 'A staff attendance roster cannot exceed 1000 records'),
});

export const seedAttendanceDto = z.object({
  id: requiredId.optional(),
  type: attendanceTypeEnum.default('student'),
  studentId: requiredId.optional(),
  staffId: requiredId.optional(),
  teacherId: requiredId.optional(),
  teacherAssignmentId: requiredId.optional(),
  date: dateField,
  status: attendanceStatusEnum.default('present'),
  notes: z.string().max(500, 'Notes too long').optional(),
  markedBy: requiredId.optional(),
}).passthrough();
export const seedAttendanceBulkDto = z.array(seedAttendanceDto);

export const attendanceIdParam = z.object({ id: z.string().min(1) });
export const attendanceDateParam = z.object({ date: z.string().min(1) });
export const sectionIdParam = z.object({ sectionId: z.string().min(1) });
export const studentIdParam = z.object({ studentId: z.string().min(1) });
export const staffIdParam = z.object({ staffId: z.string().min(1) });
export const teacherIdParam = z.object({ teacherId: z.string().min(1) });
export const typeQueryParam = z.object({ type: attendanceTypeEnum.optional() });
export const attendanceDateFilterDto = attendanceDateParam.merge(typeQueryParam);

type AttendanceStatus = z.infer<typeof attendanceStatusEnum>;

export type StudentAttendanceDto = {
  type: 'student';
  studentId: string;
  teacherId?: string;
  subjectId?: string;
  sectionId: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
};

export type StaffAttendanceDto = {
  type: 'staff';
  staffId: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
};

export type CreateAttendanceDto = StudentAttendanceDto | StaffAttendanceDto;
export type UpdateAttendanceDto = z.infer<typeof updateAttendanceDto>;
export type UpdateAttendanceStatusDto = z.infer<typeof updateAttendanceStatusDto>;
export type StaffAttendanceRosterItemDto = z.infer<typeof staffAttendanceRosterItemDto>;
export type UpsertStaffAttendanceRosterDto = z.infer<typeof upsertStaffAttendanceRosterDto>;
export type SeedAttendanceDto = z.input<typeof seedAttendanceDto>;
export type AttendanceTypeQueryDto = z.infer<typeof typeQueryParam>;
export type AttendanceDateFilterDto = z.infer<typeof attendanceDateFilterDto>;
