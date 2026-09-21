import { describe, expect, it } from 'bun:test';
import { EXAM_STATUS_VALUES, EXAM_TYPE_VALUES } from '@sms/contracts';

import { buildExamStatusOptions, buildExamTypeOptions } from './examOptions';

const echo = (key: string) => key;

describe('exam option builders', () => {
  it('offers every type and status the API accepts, in contract order', () => {
    expect(buildExamTypeOptions(echo).map((option) => option.value)).toEqual([...EXAM_TYPE_VALUES]);
    expect(buildExamStatusOptions(echo).map((option) => option.value)).toEqual([...EXAM_STATUS_VALUES]);
  });

  it('labels each value from the prefix the exam tables already use', () => {
    expect(buildExamTypeOptions(echo)[0]).toEqual({ value: 'midterm', label: 'exams.type.midterm' });
    expect(buildExamStatusOptions(echo)[0]).toEqual({
      value: 'scheduled',
      label: 'exams.status.scheduled',
    });
  });
});
