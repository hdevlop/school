import { z } from 'zod';
import { NAJM_CURRENCIES, NAJM_TIME_ZONES } from 'najm-kit/server';
import { CALENDAR_SYSTEM_VALUES } from '@sms/contracts';
import { schoolI18n } from '@sms/contracts/locales';

import { schoolApp, SCHOOL_DEFAULT_CURRENCY } from '@/najm.config';

const emailField = z.string().email('Invalid email format').or(z.literal(''));
const phoneField = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number');
const academicYearField = z
  .string()
  .min(9, 'Academic year is required')
  .regex(/^\d{4}-\d{4}$/, 'Academic year must be in YYYY-YYYY format');
const locationValueSchema = z.object({
  address: z.string().max(500, 'Address too long'),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
});
const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

/**
 * The whole school-settings form, in one schema, because it is one form: a
 * single save writes every section at once.
 *
 * The defaults here matter more than in most schemas — a school that has never
 * opened this screen is running on them. They are also the only place the
 * dashboard states its own opinion about currency, time zone and language;
 * the *lists* those are chosen from come from Najm Kit and the shared locale
 * catalog, so the settings UI and the server validator cannot offer different
 * ones.
 *
 * Frontend-only values live here rather than in `@sms/contracts`:
 * `attendanceMode`, `theme`, `dateFormat` and `timeFormat` are stored as text
 * and are not database enums.
 */

/** How attendance is taken. Stored as text; not a database enum. */
export const ATTENDANCE_MODE_VALUES = ['daily', 'per_class'] as const;
export type AttendanceMode = (typeof ATTENDANCE_MODE_VALUES)[number];

export const SETTINGS_THEME_VALUES = ['light', 'dark'] as const;

export const SETTINGS_DATE_FORMAT_VALUES = [
  'YYYY-MM-DD',
  'MM/DD/YYYY',
  'DD/MM/YYYY',
  'DD-MM-YY',
  'DD-MM-YYYY',
] as const;

export const SETTINGS_TIME_FORMAT_VALUES = ['12', '24'] as const;

export const settingsSchema = z.object({
  // School Information
  schoolName: z.string().min(2, 'School name must be at least 2 characters').max(200, 'School name too long'),
  schoolLocation: locationValueSchema,
  schoolAddressPlaceId: z.string().max(255).optional().nullable(),
  schoolPhone: phoneField,
  schoolEmail: emailField,
  schoolWebsite: z.string().url('Must be a valid URL').max(255, 'School website URL too long').optional(),
  schoolLogo: z.string().url('Must be a valid image URL').max(255, 'School logo URL too long').optional(),
  currentAcademicYear: academicYearField,

  // Academic Settings
  gradingScale: z.any().optional(),
  attendanceRequirement: numberField(z.number({ error: 'Must be a valid number' }).min(0, 'Attendance requirement must be non-negative').max(100, 'Attendance requirement cannot exceed 100')).default(75.00),
  attendanceMode: z.enum(ATTENDANCE_MODE_VALUES).default('daily'),
  maxClassSize: numberField(z.number({ error: 'Must be a valid number' }).int('Max class size must be an integer').min(1, 'Max class size must be at least 1').max(200, 'Max class size cannot exceed 200')).default(34),
  minimumPassingGrade: numberField(z.number({ error: 'Must be a valid number' }).min(0, 'Minimum passing grade must be non-negative').max(100, 'Minimum passing grade cannot exceed 100')).default(60.00),
  defaultExamDuration: numberField(z.number({ error: 'Must be a valid number' }).int('Default exam duration must be in minutes').min(15, 'Exam duration must be at least 15 minutes').max(480, 'Exam duration cannot exceed 480 minutes')).default(120),
  calendarSystem: z.enum(CALENDAR_SYSTEM_VALUES).default('SEMESTER'),
  startMonth: z.string().default('september'),
  endMonth: z.string().default('june'),

  // Notification Settings
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

  // Security Settings
  twoFactorEnabled: z.boolean().default(false),
  sessionTimeout: z.string().regex(/^\d{1,4}$/, 'Session timeout must be a number between 1-9999 minutes').default('60'),
  passwordRequireSymbols: z.boolean().default(true),
  loginNotifications: z.boolean().default(true),
  parentAccessEnabled: z.boolean().default(true),
  teacherAccessEnabled: z.boolean().default(true),
  studentAccessEnabled: z.boolean().default(true),

  // System Preferences
  timeZone: z.enum(NAJM_TIME_ZONES).default(schoolApp.preferences.defaultTimeZone),
  language: z.enum(schoolI18n.supportedLanguages).default(schoolI18n.defaultLanguage),
  theme: z.enum(SETTINGS_THEME_VALUES).default('light'),
  dateFormat: z.enum(SETTINGS_DATE_FORMAT_VALUES).default('MM/DD/YYYY'),
  timeFormat: z.enum(SETTINGS_TIME_FORMAT_VALUES).default('12'),
  currency: z.enum(NAJM_CURRENCIES).default(SCHOOL_DEFAULT_CURRENCY),

  // Academic Calendar Settings
  gradingPeriods: numberField(z.number({ error: 'Must be a valid number' }).int('Grading periods must be an integer').min(1, 'Grading periods must be at least 1').max(12, 'Grading periods cannot exceed 12')).default(4),
  schoolStartTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format (HH:MM)').default('08:00'),
  schoolEndTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format (HH:MM)').default('15:00'),
  lunchBreakDuration: numberField(z.number({ error: 'Must be a valid number' }).int('Lunch break duration must be in minutes').min(15, 'Lunch break must be at least 15 minutes').max(120, 'Lunch break cannot exceed 120 minutes')).default(30),

  // Maintenance & Backup Settings
  maintenanceMode: z.boolean().default(false),
  autoBackup: z.boolean().default(true),
});

export type SettingsFormValues = z.input<typeof settingsSchema>;
