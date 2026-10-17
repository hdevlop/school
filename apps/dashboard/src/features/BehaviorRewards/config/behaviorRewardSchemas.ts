import { z } from 'zod';
import {
  BEHAVIOR_RECOGNITION_LEVEL_VALUES,
  BEHAVIOR_REWARD_CATEGORY_VALUES,
  BEHAVIOR_REWARD_TYPE_VALUES,
} from '@sms/contracts';

type T = (key: string) => string;

/**
 * Recording a reward. It takes `t` so a refused field reads in the page's
 * language.
 *
 * The three enums used to be spelled out twice — once inline in the global
 * validation module and once in this feature's constants file — and neither
 * copy was checked against the API. They now come from `@sms/contracts`, the
 * same tuples the DTO and the `pgEnum` column are built from.
 *
 * `behaviorDate` and `behaviorTime` are two inputs the form joins into one
 * `behaviorAt` timestamp before submitting, so they are validated as present
 * rather than as a shape: the form owns the format, the component owns the
 * join.
 */
export const createBehaviorRewardSchema = (t: T) => z.object({
  studentId: z.string().min(1, t('validationMessages.studentIsRequired')),
  behaviorDate: z.string().min(1, t('validationMessages.behaviorDateIsRequired')),
  behaviorTime: z.string().min(1, t('validationMessages.behaviorTimeIsRequired')),
  category: z.enum(BEHAVIOR_REWARD_CATEGORY_VALUES),
  recognitionLevel: z.enum(BEHAVIOR_RECOGNITION_LEVEL_VALUES),
  description: z.string().trim().min(1, t('validationMessages.descriptionIsRequired')).max(2000, t('validationMessages.descriptionIsTooLong')),
  rewardType: z.enum(BEHAVIOR_REWARD_TYPE_VALUES),
  points: z.coerce.number().int(t('validationMessages.pointsMustBeAnInteger')).min(0).max(100),
  rewardNote: z.string().trim().max(1000, t('validationMessages.rewardNoteIsTooLong')).optional().nullable(),
});

export type BehaviorRewardFormValues = z.input<ReturnType<typeof createBehaviorRewardSchema>>;
