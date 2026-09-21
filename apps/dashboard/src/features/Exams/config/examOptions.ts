import { EXAM_STATUS_VALUES, EXAM_TYPE_VALUES } from '@sms/contracts';
import type { ExamStatus, ExamType } from '@sms/contracts';

import { optionsFromValues, type EnumOption, type Translate } from '@/shared/forms/enumOptions';

/** The type and status selects on the exam form. */

export const EXAM_TYPE_TRANSLATION_PREFIX = 'exams.type';
export const EXAM_STATUS_TRANSLATION_PREFIX = 'exams.status';

export const buildExamTypeOptions = (t: Translate): readonly EnumOption<ExamType>[] =>
  optionsFromValues(EXAM_TYPE_VALUES, t, EXAM_TYPE_TRANSLATION_PREFIX);

export const buildExamStatusOptions = (t: Translate): readonly EnumOption<ExamStatus>[] =>
  optionsFromValues(EXAM_STATUS_VALUES, t, EXAM_STATUS_TRANSLATION_PREFIX);
