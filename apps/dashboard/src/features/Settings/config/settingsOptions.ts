import { CALENDAR_SYSTEM_VALUES } from '@sms/contracts';
import type { CalendarSystem } from '@sms/contracts';

import { optionsFromValues, type EnumOption, type Translate } from '@/shared/forms/enumOptions';
import { ATTENDANCE_MODE_VALUES, type AttendanceMode } from './settingsSchemas';

/** The selects in the academic section of the settings form. */

export const CALENDAR_SYSTEM_TRANSLATION_PREFIX = 'settings.calendarSystem';

export const buildCalendarSystemOptions = (t: Translate): readonly EnumOption<CalendarSystem>[] =>
  optionsFromValues(CALENDAR_SYSTEM_VALUES, t, CALENDAR_SYSTEM_TRANSLATION_PREFIX);

/**
 * How attendance is taken.
 *
 * The labels carry an `||` fallback the other builders do not, because these
 * two sentences explain a consequence rather than name a value — an untranslated
 * key here would leave an administrator guessing which mode locks the register.
 */
export const buildAttendanceModeOptions = (t: Translate): readonly EnumOption<AttendanceMode>[] => [
  {
    value: 'daily',
    label:
      t('settings.academic.attendanceModeDaily')
      || 'Daily (first period locks, later teachers correct)',
  },
  {
    value: 'per_class',
    label:
      t('settings.academic.attendanceModePerClass')
      || 'Per class (each teacher records independently)',
  },
];

export const ATTENDANCE_MODE_OPTION_VALUES = ATTENDANCE_MODE_VALUES;
