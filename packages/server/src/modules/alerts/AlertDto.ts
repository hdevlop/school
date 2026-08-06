import { z } from 'zod';
import { optionalId } from '@server/shared/fields';
import { alertPriorityEnum, alertStatusEnum, alertTypeEnum } from '@server/shared/enums';

const alertSchema = z.object({
  type: alertTypeEnum,
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message too long'),
  priority: alertPriorityEnum.default('medium'),
  status: alertStatusEnum.default('active'),
  studentId: optionalId,
  teacherId: optionalId,
  classId: optionalId,
  subjectId: optionalId,
  targetAudience: z.enum(['all', 'students', 'teachers', 'parents']).optional(),
  authorId: optionalId,
  isRead: z.boolean().default(false),
});

export const createAlertDto = alertSchema;
export const updateAlertDto = createAlertDto.partial();
export const alertIdParam = z.object({ id: z.string().min(1) });
export const alertTypeParam = z.object({ type: alertTypeEnum });
export const alertStatusParam = z.object({ status: alertStatusEnum });
export const alertPriorityParam = z.object({ priority: alertPriorityEnum });
export const alertStudentIdParam = z.object({ studentId: z.string().min(1) });
export const alertTeacherIdParam = z.object({ teacherId: z.string().min(1) });
export const alertClassIdParam = z.object({ classId: z.string().min(1) });
export const alertSubjectIdParam = z.object({ subjectId: z.string().min(1) });
export const updateAlertStatusDto = z.object({ status: z.string().min(1) });
export const recentAlertsQueryDto = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});
export const recentAlertsByHoursQueryDto = z.object({
  hours: z.coerce.number().int().positive().max(24 * 30).optional(),
});
export const typedStudentAlertDto = z.object({
  studentId: z.string().min(1),
  alertType: z.string().min(1),
  details: z.unknown().optional(),
});
export const announcementAlertDto = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  targetAudience: z.string().min(1),
  authorId: z.string().min(1),
  classId: optionalId,
});
export const reminderAlertDto = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  targetAudience: z.string().min(1),
  authorId: z.string().min(1),
  details: z.unknown().optional(),
});
export const emergencyAlertDto = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
});
export const systemAlertDto = z.object({
  message: z.string().min(1),
  priority: alertPriorityEnum.optional(),
});

export type CreateAlertDto = z.input<typeof createAlertDto>;
export type UpdateAlertDto = z.input<typeof updateAlertDto>;
export type RecentAlertsQueryDto = z.infer<typeof recentAlertsQueryDto>;
export type RecentAlertsByHoursQueryDto = z.infer<typeof recentAlertsByHoursQueryDto>;
export type TypedStudentAlertDto = z.infer<typeof typedStudentAlertDto>;
export type AnnouncementAlertDto = z.infer<typeof announcementAlertDto>;
export type ReminderAlertDto = z.infer<typeof reminderAlertDto>;
export type EmergencyAlertDto = z.infer<typeof emergencyAlertDto>;
export type SystemAlertDto = z.infer<typeof systemAlertDto>;
export type UpdateAlertStatusDto = z.infer<typeof updateAlertStatusDto>;
