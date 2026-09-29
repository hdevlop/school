import { z } from 'zod';
import { academicYearField, emailField, num, phoneField } from '../../shared/fields';
import { calendarSystemEnum, languageEnum } from '../../shared/enums';
import { latitudeDto, longitudeDto, placeIdDto } from '../../shared/locationDto';

// No field has a Zod default: `.partial()` keeps defaults, so an update naming
// one field would reset every other one, time zone and currency included.
// SettingsService.create fills the defaults of a new installation.
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
  attendanceRequirement: num().min(0, 'Attendance requirement must be non-negative').max(100, 'Attendance requirement cannot exceed 100').optional(),
  attendanceMode: z.enum(['daily', 'per_class']).optional(),
  maxClassSize: num().int('Max class size must be an integer').min(1, 'Max class size must be at least 1').max(200, 'Max class size cannot exceed 200').optional(),
  minimumPassingGrade: num().min(0, 'Minimum passing grade must be non-negative').max(100, 'Minimum passing grade cannot exceed 100').optional(),
  defaultExamDuration: num().int('Default exam duration must be in minutes').min(15, 'Exam duration must be at least 15 minutes').max(480, 'Exam duration cannot exceed 480 minutes').optional(),
  calendarSystem: calendarSystemEnum.optional(),
  startMonth: z.string().optional(),
  endMonth: z.string().optional(),

  academicAlerts: z.boolean().optional(),
  attendanceAlerts: z.boolean().optional(),
  eventAlerts: z.boolean().optional(),
  homeworkAlerts: z.boolean().optional(),
  feesReminder: z.boolean().optional(),
  feesOverdueAlerts: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  parentNotifications: z.boolean().optional(),
  lowGradeAlerts: z.boolean().optional(),
  allowLateSubmission: z.boolean().optional(),
  examResultsAlerts: z.boolean().optional(),
  disciplinaryAlerts: z.boolean().optional(),
  achievementAlerts: z.boolean().optional(),
  maintenanceNotifications: z.boolean().optional(),

  twoFactorEnabled: z.boolean().optional(),
  sessionTimeout: z.string().regex(/^\d{1,4}$/, 'Session timeout must be a number between 1-9999 minutes').optional(),
  passwordRequireSymbols: z.boolean().optional(),
  loginNotifications: z.boolean().optional(),
  parentAccessEnabled: z.boolean().optional(),
  teacherAccessEnabled: z.boolean().optional(),
  studentAccessEnabled: z.boolean().optional(),

  timeZone: z.string().min(1, 'Time zone is required').optional(),
  language: languageEnum.optional(),
  theme: z.enum(['light', 'dark']).optional(),
  dateFormat: z.enum(['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'DD-MM-YY', 'DD-MM-YYYY']).optional(),
  timeFormat: z.enum(['12', '24']).optional(),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').regex(/^[A-Z]{3}$/, 'Currency must be uppercase ISO code').optional(),

  gradingPeriods: num().int('Grading periods must be an integer').min(1, 'Grading periods must be at least 1').max(12, 'Grading periods cannot exceed 12').optional(),
  schoolStartTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format (HH:MM)').optional(),
  schoolEndTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format (HH:MM)').optional(),
  lunchBreakDuration: num().int('Lunch break duration must be in minutes').min(15, 'Lunch break must be at least 15 minutes').max(120, 'Lunch break cannot exceed 120 minutes').optional(),

  maintenanceMode: z.boolean().optional(),
  autoBackup: z.boolean().optional(),
});

export const createSettingsDto = settingsSchema.extend({ id: z.string().min(1).optional() });
export const updateSettingsDto = createSettingsDto.partial();
export const settingsIdParam = z.object({ id: z.string().min(1) });

export type CreateSettingsDto = z.infer<typeof createSettingsDto>;
export type UpdateSettingsDto = z.infer<typeof updateSettingsDto>;
