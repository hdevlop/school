import { z } from 'zod';
import { behaviorRewardCategoryEnum, behaviorRewardTypeEnum } from '../../shared/enums';

// The same bounds as a recorded reward (BehaviorRewardDto), so a template
// always fills the reward form with values the reward route accepts.
const rewardTemplateInput = z.object({
  title: z.string().trim().min(1, 'validationMessages.rewardTemplateTitleRequired')
    .max(120, 'validationMessages.rewardTemplateTitleTooLong'),
  category: behaviorRewardCategoryEnum,
  rewardType: behaviorRewardTypeEnum,
  points: z.number().int('Points must be an integer')
    .min(0, 'validationMessages.pointsRange').max(100, 'validationMessages.pointsRange'),
  description: z.string().trim().max(2000, 'Description is too long').optional(),
  active: z.boolean().optional(),
});

export const createRewardTemplateDto = rewardTemplateInput.extend({
  points: rewardTemplateInput.shape.points.default(0),
});
export const updateRewardTemplateDto = rewardTemplateInput.partial();
export const rewardTemplateIdParam = z.object({ id: z.string().min(1) });

export type CreateRewardTemplateDto = z.infer<typeof createRewardTemplateDto>;
export type UpdateRewardTemplateDto = z.infer<typeof updateRewardTemplateDto>;
