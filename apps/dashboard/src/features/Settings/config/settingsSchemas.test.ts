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
