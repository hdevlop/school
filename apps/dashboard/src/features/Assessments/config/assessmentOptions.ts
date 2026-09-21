import { ASSESSMENT_STATUS_VALUES, ASSESSMENT_TYPE_VALUES } from '@sms/contracts';

import { optionsFromValues, type EnumOption, type Translate } from '@/shared/forms/enumOptions';
import type { AssessmentStatus, AssessmentType } from '@sms/contracts';

/**
 * The selects on the assessment form.
 *
 * Both builders are pure: the component calls `useTranslation()` and passes
 * `t` in. The translation prefixes are the ones the tables and cards already
 * use (`assessments.type.*`, `assessments.status.*`), so a value reads the
 * same wherever it is shown.
 */

export const ASSESSMENT_TYPE_TRANSLATION_PREFIX = 'assessments.type';
export const ASSESSMENT_STATUS_TRANSLATION_PREFIX = 'assessments.status';

export const buildAssessmentTypeOptions = (t: Translate): readonly EnumOption<AssessmentType>[] =>
  optionsFromValues(ASSESSMENT_TYPE_VALUES, t, ASSESSMENT_TYPE_TRANSLATION_PREFIX);

export const buildAssessmentStatusOptions = (t: Translate): readonly EnumOption<AssessmentStatus>[] =>
  optionsFromValues(ASSESSMENT_STATUS_VALUES, t, ASSESSMENT_STATUS_TRANSLATION_PREFIX);
