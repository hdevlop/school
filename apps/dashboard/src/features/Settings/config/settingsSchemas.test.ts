import { describe, expect, it } from 'bun:test';
import { CALENDAR_SYSTEM_VALUES } from '@sms/contracts';

import { settingsSchema } from './settingsSchemas';

/**
 * A school that has never opened the settings screen runs on these defaults,
 * so they are asserted by value rather than merely "present".
 */
const minimal = {
  schoolName: 'Ecole Al Amal',
  schoolLocation: { address: 'Casablanca', latitude: 33.5, longitude: -7.6 },
  schoolPhone: '212600000000',
  schoolEmail: 'contact@ecole.ma',
  currentAcademicYear: '2025-2026',
};

describe('settingsSchema defaults', () => {
  const parsed = settingsSchema.parse(minimal);

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
    expect(parsed.schoolStartTime).toBe('08:00');
    expect(parsed.schoolEndTime).toBe('15:00');
    expect(parsed.lunchBreakDuration).toBe(30);
    expect(parsed.startMonth).toBe('september');
    expect(parsed.endMonth).toBe('june');
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

  it('leaves maintenance mode and two-factor off', () => {
    expect(parsed.maintenanceMode).toBe(false);
    expect(parsed.twoFactorEnabled).toBe(false);
    expect(parsed.autoBackup).toBe(true);
    expect(parsed.sessionTimeout).toBe('60');
  });
});

describe('settingsSchema validation', () => {
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

  it('insists on a YYYY-YYYY academic year', () => {
    expect(settingsSchema.safeParse({ ...minimal, currentAcademicYear: '2025' }).success).toBe(false);
  });

  it('keeps the session timeout a plain number of minutes', () => {
    expect(settingsSchema.safeParse({ ...minimal, sessionTimeout: '90' }).success).toBe(true);
    expect(settingsSchema.safeParse({ ...minimal, sessionTimeout: '90m' }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...minimal, sessionTimeout: '12345' }).success).toBe(false);
  });
});
