import { z } from 'zod';
import { TEACHER_TREND_RANGE_VALUES } from '@sms/contracts/teacher-dashboard';

export const teacherTrendQuery = z.object({
  range: z.enum(TEACHER_TREND_RANGE_VALUES).optional().default('7d'),
});
export type TeacherTrendQuery = z.infer<typeof teacherTrendQuery>;
