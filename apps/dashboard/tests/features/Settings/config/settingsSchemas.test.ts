import { describe, expect, it } from 'bun:test';
import { schoolI18n } from '@sms/contracts/locales';
import { CALENDAR_SYSTEM_VALUES } from '@sms/contracts';

import { createSettingsSchemas } from '@/features/Settings/config/settingsSchemas';

// The English catalog, so a message a test reads proves its key exists.
const english = (key: string, params?: Record<string, unknown>) => schoolI18n.translate('en', key as never, params as never);
const schoolSetupSchema = createSettingsSchemas(english).schoolSetup;
const settingsSchema = createSettingsSchemas(english).settings;

/**
 * A school that has never opened the settings screen runs on these defaults,
 * so they are asserted by value rather than merely "present".
 */
const minimal = {
  schoolName: 'Ecole Al Amal',
  schoolLocation: { address: 'Casablanca', latitude: 33.5, longitude: -7.6 },
  schoolPhone: '212600000000',
  schoolEmail: 'contact@ecole.ma',
};

describe('settingsSchema defaults', () => {
  const parsed = settingsSchema.parse(minimal);

  it('leaves out the grading scale, which has no input and must not overwrite the stored one', () => {
    expect('gradingScale' in settingsSchema.parse({ ...minimal, gradingScale: '' })).toBe(false);
  });

  it('fills the academic defaults', () => {
    expect(parsed.attendanceRequirement).toBe(75);
    expect(parsed.attendanceMode).toBe('daily');
    expect(parsed.maxClassSize).toBe(34);
    expect(parsed.minimumPassingGrade).toBe(60);
    expect(parsed.defaultExamDuration).toBe(120);
    expect(parsed.calendarSystem).toBe('SEMESTER');
    expect(parsed.gradingPeriods).toBe(4);
  });

  it('fills the school day', () => {
    expect(parsed.teachingDays).toEqual(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']);
    expect(parsed.schoolStartTime).toBe('08:00');
    expect(parsed.schoolEndTime).toBe('15:00');
    expect(parsed.lunchBreakDuration).toBe(30);
  });

  it('takes its currency, time zone and language from the app policy rather than restating them', () => {
    expect(parsed.currency).toBe('MAD');
    expect(parsed.timeZone).toBe('Africa/Casablanca');
    expect(parsed.language).toBe('en');
  });

  it('leaves notifications on and SMS off', () => {
    expect(parsed.emailNotifications).toBe(true);
    expect(parsed.parentNotifications).toBe(true);
    expect(parsed.smsNotifications).toBe(false);
  });

  it('leaves two-factor off', () => {
    expect(parsed.twoFactorEnabled).toBe(false);
    expect(parsed.sessionTimeout).toBe('60');
  });

  // A save sent these defaults and overwrote what was stored; the server
  // refused every save once a school's year started in another month, and
  // the active year was offered as a choice the server always refuses.
  it('submits nothing the screen does not show', () => {
    for (const hidden of ['currentAcademicYear', 'startMonth', 'endMonth', 'maintenanceMode', 'maintenanceNotifications', 'autoBackup']) {
      expect(Object.keys(parsed)).not.toContain(hidden);
    }
    const edited = Object.keys(settingsSchema.parse({ ...minimal, currentAcademicYear: '2027-2028', startMonth: 'august' }));
    expect(edited).not.toContain('currentAcademicYear');
    expect(edited).not.toContain('startMonth');
  });
});

describe('settingsSchema validation', () => {
  it('requires contact details and starts with Moroccan date and time formats', () => {
    expect(settingsSchema.safeParse({ ...minimal, schoolEmail: '' }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...minimal, schoolLocation: { address: '  ', latitude: null, longitude: null } }).success).toBe(false);
    expect(settingsSchema.parse(minimal)).toMatchObject({ dateFormat: 'DD/MM/YYYY', timeFormat: '24' });
    expect(settingsSchema.parse({ ...minimal, dateFormat: 'MM/DD/YYYY', timeFormat: '12' })).toMatchObject({ dateFormat: 'MM/DD/YYYY', timeFormat: '12' });
  });
  it('defaults receipt printing to French and accepts only French or Arabic independently of UI language', () => {
    expect(settingsSchema.parse(minimal).receiptLanguage).toBe('fr');
    for (const receiptLanguage of ['fr', 'ar'] as const) {
      const result = settingsSchema.parse({ ...minimal, language: 'en', receiptLanguage });
      expect(result.receiptLanguage).toBe(receiptLanguage);
      expect(result.language).toBe('en');
    }
    expect(settingsSchema.safeParse({ ...minimal, receiptLanguage: 'en' }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...minimal, receiptLanguage: 'bilingual' }).success).toBe(false);
  });
  it('requires at least one unique teaching day and puts selected days in week order', () => {
    expect(settingsSchema.safeParse({ ...minimal, teachingDays: [] }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...minimal, teachingDays: ['monday', 'monday'] }).success).toBe(false);
    expect(settingsSchema.parse({ ...minimal, teachingDays: ['sunday', 'monday'] }).teachingDays).toEqual(['monday', 'sunday']);
  });
  it('accepts every calendar system the API accepts', () => {
    for (const calendarSystem of CALENDAR_SYSTEM_VALUES) {
      expect(settingsSchema.safeParse({ ...minimal, calendarSystem }).success).toBe(true);
    }
  });

  it('refuses a calendar system, attendance mode or format it does not know', () => {
    expect(settingsSchema.safeParse({ ...minimal, calendarSystem: 'TERM' }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...minimal, attendanceMode: 'weekly' }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...minimal, timeFormat: '36' }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...minimal, dateFormat: 'YYYY' }).success).toBe(false);
  });

  it('keeps the session timeout a plain number of minutes', () => {
    expect(settingsSchema.safeParse({ ...minimal, sessionTimeout: '90' }).success).toBe(true);
    expect(settingsSchema.safeParse({ ...minimal, sessionTimeout: '90m' }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...minimal, sessionTimeout: '12345' }).success).toBe(false);
  });
});

describe('schoolSetupSchema', () => {
  const setup = { schoolName: 'Ecole Al Amal', schoolPhone: '212600000000', schoolEmail: 'contact@school.test', schoolLocation: { address: 'Demo address', latitude: null, longitude: null }, currentAcademicYear: '2026-2027' };

  it('fills the school preferences a new installation starts with', () => {
    const parsed = schoolSetupSchema.parse(setup);
    expect(parsed.currency).toBe('MAD');
    expect(parsed.timeZone).toBe('Africa/Casablanca');
    expect(Object.keys(parsed).sort()).toEqual(['currency', 'currentAcademicYear', 'language', 'schoolEmail', 'schoolLocation', 'schoolName', 'schoolPhone', 'timeZone']);
  });

  it('requires a school name, a phone and a consecutive-year label', () => {
    expect(schoolSetupSchema.safeParse({ ...setup, schoolPhone: '' }).success).toBe(false);
    expect(schoolSetupSchema.safeParse({ ...setup, schoolName: '' }).success).toBe(false);
    expect(schoolSetupSchema.safeParse({ ...setup, currentAcademicYear: '2026-2028' }).success).toBe(false);
    expect(schoolSetupSchema.safeParse({ ...setup, currentAcademicYear: '2026' }).success).toBe(false);
  });
});

describe('settingsSchema official identity', () => {
  it('starts empty, keeps local phone numbers and refuses a malformed license date', () => {
    expect(settingsSchema.parse(minimal)).toMatchObject({ schoolNameAr: '', schoolPhones: [], schoolLicenseNumber: '', schoolLicenseDate: '' });
    expect(settingsSchema.parse({ ...minimal, schoolPhones: ['0522750085', '', ''] }).schoolPhones).toEqual(['0522750085', '', '']);
    expect(settingsSchema.safeParse({ ...minimal, schoolPhones: ['call us'] }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...minimal, schoolLicenseDate: '19/10/2015' }).success).toBe(false);
  });
});
