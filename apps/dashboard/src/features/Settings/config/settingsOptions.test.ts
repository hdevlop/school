import { describe, expect, it } from 'bun:test';
import { CALENDAR_SYSTEM_VALUES } from '@sms/contracts';

import { buildAttendanceModeOptions, buildCalendarSystemOptions, buildSetupAcademicYearOptions } from './settingsOptions';
import { settingsSchema } from './settingsSchemas';

const echo = (key: string) => key;
const silent = () => '';

const minimal = {
  schoolName: 'Ecole Al Amal',
  schoolLocation: { address: 'Casablanca', latitude: 33.5, longitude: -7.6 },
  schoolPhone: '212600000000',
  schoolEmail: 'contact@ecole.ma',
  currentAcademicYear: '2025-2026',
};

describe('settings option builders', () => {
  it('offers every calendar system the API accepts, in contract order', () => {
    expect(buildCalendarSystemOptions(echo).map((option) => option.value)).toEqual([
      ...CALENDAR_SYSTEM_VALUES,
    ]);
  });

  it('labels the calendar systems from settings.calendarSystem', () => {
    expect(buildCalendarSystemOptions(echo)[0]).toEqual({
      value: 'SEMESTER',
      label: 'settings.calendarSystem.SEMESTER',
    });
  });

  it('offers the two attendance modes the schema accepts', () => {
    for (const option of buildAttendanceModeOptions(echo)) {
      expect(
        settingsSchema.safeParse({ ...minimal, attendanceMode: option.value }).success,
      ).toBe(true);
    }
  });

  it('still explains each attendance mode when its translation is missing', () => {
    const [daily, perClass] = buildAttendanceModeOptions(silent);

    expect(daily.label).toBe('Daily (first period locks, later teachers correct)');
    expect(perClass.label).toBe('Per class (each teacher records independently)');
  });
});

describe('school setup year options', () => {
  it('offers the teaching year of the day, then the next one', () => {
    expect(buildSetupAcademicYearOptions(new Date(2026, 9, 2)).map((option) => option.value))
      .toEqual(['2026-2027', '2027-2028']);
  });

  it('still starts at the year being finished during the summer', () => {
    expect(buildSetupAcademicYearOptions(new Date(2027, 6, 15)).map((option) => option.value))
      .toEqual(['2026-2027', '2027-2028']);
  });
});
