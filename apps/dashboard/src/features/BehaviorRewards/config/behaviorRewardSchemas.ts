import { z } from 'zod';
import {
  BEHAVIOR_RECOGNITION_LEVEL_VALUES,
  BEHAVIOR_REWARD_CATEGORY_VALUES,
  BEHAVIOR_REWARD_TYPE_VALUES,
} from '@sms/contracts';

/**
 * Recording a reward.
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
export const behaviorRewardSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  behaviorDate: z.string().min(1, 'Behavior date is required'),
  behaviorTime: z.string().min(1, 'Behavior time is required'),
  category: z.enum(BEHAVIOR_REWARD_CATEGORY_VALUES),
  recognitionLevel: z.enum(BEHAVIOR_RECOGNITION_LEVEL_VALUES),
  description: z.string().trim().min(1, 'Description is required').max(2000, 'Description is too long'),
  rewardType: z.enum(BEHAVIOR_REWARD_TYPE_VALUES),
  points: z.coerce.number().int('Points must be an integer').min(0).max(100),
  rewardNote: z.string().trim().max(1000, 'Reward note is too long').optional().nullable(),
});

export type BehaviorRewardFormValues = z.input<typeof behaviorRewardSchema>;
