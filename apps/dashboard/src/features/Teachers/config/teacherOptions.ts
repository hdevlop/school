import { EMPLOYMENT_TYPE_VALUES, TEACHER_STATUS_VALUES } from '@sms/contracts';
import type { EmploymentType, TeacherStatus } from '@sms/contracts';

import {
  optionsFromValues,
  withStoredValue,
  type EnumOption,
  type Translate,
} from '@/shared/forms/enumOptions';

/** The status and employment-type selects in the teacher wizard. */

export const TEACHER_STATUS_TRANSLATION_PREFIX = 'teachers.status';
export const EMPLOYMENT_TYPE_TRANSLATION_PREFIX = 'teachers.employmentType';

export const buildTeacherStatusOptions = (t: Translate): readonly EnumOption<TeacherStatus>[] =>
  optionsFromValues(TEACHER_STATUS_VALUES, t, TEACHER_STATUS_TRANSLATION_PREFIX);

export const buildEmploymentTypeOptions = (t: Translate): readonly EnumOption<EmploymentType>[] =>
  optionsFromValues(EMPLOYMENT_TYPE_VALUES, t, EMPLOYMENT_TYPE_TRANSLATION_PREFIX);

/**
 * The same lists, keeping whatever an existing record already holds
 * selectable. Staff records are often migrated in from a previous system, so
 * an unrecognised employment type is a thing to show, not to overwrite.
 */
export const buildTeacherStatusOptionsFor = (
  t: Translate,
  storedValue?: string | null,
): readonly EnumOption<TeacherStatus>[] =>
  withStoredValue(buildTeacherStatusOptions(t), storedValue, (value) =>
    t(`${TEACHER_STATUS_TRANSLATION_PREFIX}.${value}`),
  );

export const buildEmploymentTypeOptionsFor = (
  t: Translate,
  storedValue?: string | null,
): readonly EnumOption<EmploymentType>[] =>
  withStoredValue(buildEmploymentTypeOptions(t), storedValue, (value) =>
    t(`${EMPLOYMENT_TYPE_TRANSLATION_PREFIX}.${value}`),
  );
