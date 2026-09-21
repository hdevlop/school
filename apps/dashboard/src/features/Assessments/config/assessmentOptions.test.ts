import { describe, expect, it } from 'bun:test';
import { ASSESSMENT_STATUS_VALUES, ASSESSMENT_TYPE_VALUES } from '@sms/contracts';

import {
  buildAssessmentStatusOptions,
  buildAssessmentTypeOptions,
} from './assessmentOptions';

/**
 * The translator is stubbed to echo the key, which is what these tests are
 * actually about: the builder must ask for `assessments.type.quiz`, not
 * `assessment.types.quiz`. A wrong prefix does not throw — it renders the raw
 * key in the select, in all four languages at once.
 */
const echo = (key: string) => key;

describe('assessment option builders', () => {
  it('offers every type the API accepts, in contract order', () => {
    expect(buildAssessmentTypeOptions(echo).map((option) => option.value)).toEqual([
      ...ASSESSMENT_TYPE_VALUES,
    ]);
  });

  it('offers every status the API accepts, in contract order', () => {
    expect(buildAssessmentStatusOptions(echo).map((option) => option.value)).toEqual([
      ...ASSESSMENT_STATUS_VALUES,
    ]);
  });

  it('labels each value from its own translation key', () => {
    expect(buildAssessmentTypeOptions(echo)).toContainEqual({
      value: 'quiz',
      label: 'assessments.type.quiz',
    });
    expect(buildAssessmentStatusOptions(echo)).toContainEqual({
      value: 'scheduled',
      label: 'assessments.status.scheduled',
    });
  });
});
