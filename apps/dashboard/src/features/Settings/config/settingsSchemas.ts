import { z } from 'zod';
import { NAJM_CURRENCIES, NAJM_TIME_ZONES } from 'najm-kit/server';
import { CALENDAR_SYSTEM_VALUES, DEFAULT_RECEIPT_LANGUAGE, RECEIPT_LANGUAGES, SCHOOL_DEFAULT_DATE_FORMAT, SCHOOL_DEFAULT_TIME_FORMAT } from '@sms/contracts';
import { parseSchoolYearLabel } from '@sms/contracts/academic-years';
import { schoolI18n } from '@sms/contracts/locales';
import { DEFAULT_TEACHING_DAYS, ROUTINE_DAYS } from '@sms/contracts/routines';

import { schoolApp, SCHOOL_DEFAULT_CURRENCY } from '@/najm.config';
import { SETTINGS_DATE_FORMAT_VALUES, SETTINGS_TIME_FORMAT_VALUES } from './dateTimeFormats';
export { SETTINGS_DATE_FORMAT_VALUES, SETTINGS_TIME_FORMAT_VALUES } from './dateTimeFormats';

type T = (key: string) => string;

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

/**
 * The settings and first-run forms' schemas. They take `t` so a refused field
 * reads in the page's language.
 */
export const createSettingsSchemas = (t: T) => {
  const emailField = z.string().trim().min(1, t('validationMessages.schoolEmailRequired')).email(t('validationMessages.invalidEmailFormat'));
  const phoneField = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, t('validationMessages.invalidPhoneNumber'));
  const locationValueSchema = z.object({
    address: z.string().trim().min(1, t('validationMessages.schoolAddressRequired')).max(500, t('validationMessages.addressTooLong')),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
  });

  // Only what the settings screen shows. A field with a default and no input
  // would be submitted on every save and overwrite the stored value: the year's
  // start and end months (registered calendars change through a reviewed
  // correction), maintenance mode and backups. The active year is shown
  // read-only (AcademicSection): it changes through activation.
  const settings = z.object({
    // School Information
    schoolName: z.string().min(2, t('validationMessages.schoolNameMustBeAtLeast2Characters')).max(200, t('validationMessages.schoolNameTooLong')),
    schoolLocation: locationValueSchema,
    schoolAddressPlaceId: z.string().max(255).optional().nullable(),
    schoolPhone: phoneField,
    schoolEmail: emailField,
    schoolWebsite: z.string().url(t('validationMessages.mustBeAValidUrl')).max(255, t('validationMessages.schoolWebsiteUrlTooLong')).optional(),
    schoolLogo: z.string().url(t('validationMessages.mustBeAValidImageUrl')).max(255, t('validationMessages.schoolLogoUrlTooLong')).optional(),
    receiptLanguage: z.enum(RECEIPT_LANGUAGES).default(DEFAULT_RECEIPT_LANGUAGE),

    // Academic Settings
    attendanceRequirement: numberField(z.number({ error: t('validationMessages.mustBeAValidNumber') }).min(0, t('validationMessages.attendanceRequirementMustBeNonNegative')).max(100, t('validationMessages.attendanceRequirementCannotExceed100'))).default(75.00),
    attendanceMode: z.enum(ATTENDANCE_MODE_VALUES).default('daily'),
    maxClassSize: numberField(z.number({ error: t('validationMessages.mustBeAValidNumber') }).int(t('validationMessages.maxClassSizeMustBeAnInteger')).min(1, t('validationMessages.maxClassSizeMustBeAtLeast1')).max(200, t('validationMessages.maxClassSizeCannotExceed200'))).default(34),
    minimumPassingGrade: numberField(z.number({ error: t('validationMessages.mustBeAValidNumber') }).min(0, t('validationMessages.minimumPassingGradeMustBeNonNegative')).max(100, t('validationMessages.minimumPassingGradeCannotExceed100'))).default(60.00),
    defaultExamDuration: numberField(z.number({ error: t('validationMessages.mustBeAValidNumber') }).int(t('validationMessages.defaultExamDurationMustBeInMinutes')).min(15, t('validationMessages.examDurationMustBeAtLeast15Minutes')).max(480, t('validationMessages.examDurationCannotExceed480Minutes'))).default(120),
    calendarSystem: z.enum(CALENDAR_SYSTEM_VALUES).default('SEMESTER'),
    teachingDays: z.array(z.enum(ROUTINE_DAYS)).min(1).max(7)
      .refine((days) => new Set(days).size === days.length, t('validationMessages.teachingDaysMustBeUnique'))
      .transform((days) => ROUTINE_DAYS.filter((day) => days.includes(day))).default(DEFAULT_TEACHING_DAYS),

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

    // Security Settings
    twoFactorEnabled: z.boolean().default(false),
    sessionTimeout: z.string().regex(/^\d{1,4}$/, t('validationMessages.sessionTimeoutMustBeANumberBetween19999')).default('60'),
    passwordRequireSymbols: z.boolean().default(true),
    loginNotifications: z.boolean().default(true),
    parentAccessEnabled: z.boolean().default(true),
    teacherAccessEnabled: z.boolean().default(true),
    studentAccessEnabled: z.boolean().default(true),

    // System Preferences
    timeZone: z.enum(NAJM_TIME_ZONES).default(schoolApp.preferences.defaultTimeZone),
    language: z.enum(schoolI18n.supportedLanguages).default(schoolI18n.defaultLanguage),
    theme: z.enum(SETTINGS_THEME_VALUES).default('light'),
    dateFormat: z.enum(SETTINGS_DATE_FORMAT_VALUES).default(SCHOOL_DEFAULT_DATE_FORMAT),
    timeFormat: z.enum(SETTINGS_TIME_FORMAT_VALUES).default(SCHOOL_DEFAULT_TIME_FORMAT),
    currency: z.enum(NAJM_CURRENCIES).default(SCHOOL_DEFAULT_CURRENCY),

    // Academic Calendar Settings
    gradingPeriods: numberField(z.number({ error: t('validationMessages.mustBeAValidNumber') }).int(t('validationMessages.gradingPeriodsMustBeAnInteger')).min(1, t('validationMessages.gradingPeriodsMustBeAtLeast1')).max(12, t('validationMessages.gradingPeriodsCannotExceed12'))).default(4),
    schoolStartTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, t('validationMessages.invalidStartTimeFormatHhMm')).default('08:00'),
    schoolEndTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, t('validationMessages.invalidEndTimeFormatHhMm')).default('15:00'),
    lunchBreakDuration: numberField(z.number({ error: t('validationMessages.mustBeAValidNumber') }).int(t('validationMessages.lunchBreakDurationMustBeInMinutes')).min(15, t('validationMessages.lunchBreakMustBeAtLeast15Minutes')).max(120, t('validationMessages.lunchBreakCannotExceed120Minutes'))).default(30),
  });

  /**
   * The first-run form shown while the school has no settings. Installing them
   * registers and activates `currentAcademicYear` (September-June, reviewable
   * later), which every year-scoped page needs. The rest of the settings keep
   * the server's defaults until the administrator opens the settings screen.
   */
  const schoolSetup = settings
    .pick({ schoolName: true, schoolPhone: true, schoolEmail: true, schoolLocation: true, timeZone: true, language: true, currency: true })
    .extend({
      currentAcademicYear: z.string().refine(
        (value) => parseSchoolYearLabel(value) !== null,
        t('validationMessages.expectedConsecutiveYearsInYyyyYyyyFormat'),
      ),
    });

  return { settings, schoolSetup };
};

type SettingsSchemas = ReturnType<typeof createSettingsSchemas>;
export type SettingsFormValues = z.input<SettingsSchemas['settings']>;
export type SchoolSetupValues = z.input<SettingsSchemas['schoolSetup']>;
