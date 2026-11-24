import { z } from 'zod';
import {
  BEHAVIOR_REWARD_CATEGORY_VALUES,
  BEHAVIOR_REWARD_TYPE_VALUES,
} from '@sms/contracts';

type T = (key: string) => string;

/**
 * A reward in the bank. The bounds match the reward form's
 * (`createBehaviorRewardSchema`), so whatever a template fills in is a value
 * the reward form accepts. The server's `RewardTemplateDto` decides what is
 * written.
 */
export const createRewardTemplateSchema = (t: T) => z.object({
  title: z.string().trim()
    .min(1, t('validationMessages.rewardTemplateTitleRequired'))
    .max(120, t('validationMessages.rewardTemplateTitleTooLong')),
  category: z.enum(BEHAVIOR_REWARD_CATEGORY_VALUES),
  rewardType: z.enum(BEHAVIOR_REWARD_TYPE_VALUES),
  points: z.coerce.number(t('validationMessages.pointsMustBeAnInteger'))
    .int(t('validationMessages.pointsMustBeAnInteger'))
    .min(0, t('validationMessages.pointsRange'))
    .max(100, t('validationMessages.pointsRange')),
  description: z.string().trim().max(2000, t('validationMessages.descriptionIsTooLong')).optional(),
  active: z.boolean().optional(),
});

export type RewardTemplateFormValues = z.input<ReturnType<typeof createRewardTemplateSchema>>;
