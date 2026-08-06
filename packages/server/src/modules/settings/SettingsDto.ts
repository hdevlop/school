import { z } from 'zod';
import { academicYearField, emailField, num, phoneField } from '@server/shared/fields';
import { calendarSystemEnum, languageEnum } from '@server/shared/enums';
import { latitudeDto, longitudeDto, placeIdDto } from '@server/shared/locationDto';

const settingsSchema = z.object({
  schoolName: z.string().min(2, 'School name must be at least 2 characters').max(200, 'School name too long'),
  schoolAddress: z.string().max(500, 'School address too long').optional(),
  schoolAddressPlaceId: placeIdDto,
  schoolAddressLatitude: latitudeDto,
  schoolAddressLongitude: longitudeDto,
  schoolPhone: phoneField,
  schoolEmail: emailField,
  schoolWebsite: z.string().url('Must be a valid URL').max(255, 'School website URL too long').optional(),
  schoolLogo: z.string().url('Must be a valid image URL').max(255, 'School logo URL too long').optional(),
  currentAcademicYear: academicYearField,

  gradingScale: z.record(z.string(), z.unknown()).optional(),
  attendanceRequirement: num().min(0, 'Attendance requirement must be non-negative').max(100, 'Attendance requirement cannot exceed 100').default(75.0),
  attendanceMode: z.enum(['daily', 'per_class']).default('daily'),
  maxClassSize: num().int('Max class size must be an integer').min(1, 'Max class size must be at least 1').max(200, 'Max class size cannot exceed 200').default(34),
  minimumPassingGrade: num().min(0, 'Minimum passing grade must be non-negative').max(100, 'Minimum passing grade cannot exceed 100').default(60.0),
  defaultExamDuration: num().int('Default exam duration must be in minutes').min(15, 'Exam duration must be at least 15 minutes').max(480, 'Exam duration cannot exceed 480 minutes').default(120),
  calendarSystem: calendarSystemEnum.default('SEMESTER'),
  startMonth: z.string().default('september'),
  endMonth: z.string().default('june'),

  academicAlerts: z.boolean().default(true),
  attendanceAlerts: z.boolean().default(true),
  eventAlerts: z.boolean().default(true),
  homeworkAlerts: z.boolean().default(true),
  feesReminder: z.boolean().default(true),
  feesOverdueAlerts: z.boolean().default(true),
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  parentNotifications: z.boolean().default(true),
  lowGradeAlerts: z.boolean().default(true),
  allowLateSubmission: z.boolean().default(true),
  examResultsAlerts: z.boolean().default(true),
  disciplinaryAlerts: z.boolean().default(true),
  achievementAlerts: z.boolean().default(true),
  maintenanceNotifications: z.boolean().default(true),

  twoFactorEnabled: z.boolean().default(false),
  sessionTimeout: z.string().regex(/^\d{1,4}$/, 'Session timeout must be a number between 1-9999 minutes').default('60'),
  passwordRequireSymbols: z.boolean().default(true),
  loginNotifications: z.boolean().default(true),
  parentAccessEnabled: z.boolean().default(true),
  teacherAccessEnabled: z.boolean().default(true),
  studentAccessEnabled: z.boolean().default(true),

  timeZone: z.string().min(1, 'Time zone is required').default('UTC'),
  language: languageEnum.default('en'),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  dateFormat: z.enum(['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'DD-MM-YY', 'DD-MM-YYYY']).default('MM/DD/YYYY'),
  timeFormat: z.enum(['12', '24']).default('12'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').regex(/^[A-Z]{3}$/, 'Currency must be uppercase ISO code').default('USD'),

  gradingPeriods: num().int('Grading periods must be an integer').min(1, 'Grading periods must be at least 1').max(12, 'Grading periods cannot exceed 12').default(4),
  schoolStartTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format (HH:MM)').default('08:00'),
  schoolEndTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format (HH:MM)').default('15:00'),
  lunchBreakDuration: num().int('Lunch break duration must be in minutes').min(15, 'Lunch break must be at least 15 minutes').max(120, 'Lunch break cannot exceed 120 minutes').default(30),

  maintenanceMode: z.boolean().default(false),
  autoBackup: z.boolean().default(true),
});

export const createSettingsDto = settingsSchema.extend({ id: z.string().min(1).optional() });
export const updateSettingsDto = createSettingsDto.partial();
export const settingsIdParam = z.object({ id: z.string().min(1) });

export type CreateSettingsDto = z.infer<typeof createSettingsDto>;
export type UpdateSettingsDto = z.infer<typeof updateSettingsDto>;
