import { z } from 'zod';
import {
  behaviorRecognitionLevelEnum,
  behaviorRewardCategoryEnum,
  behaviorRewardTypeEnum,
} from '@server/shared/enums';

const behaviorRewardInput = z.object({
  studentId: z.string().min(1, 'Student is required'),
  behaviorAt: z.string().datetime({ offset: true, message: 'Behavior date must be a valid ISO timestamp' }),
  category: behaviorRewardCategoryEnum,
  recognitionLevel: behaviorRecognitionLevelEnum,
  description: z.string().trim().min(1, 'Description is required').max(2000, 'Description is too long'),
  rewardType: behaviorRewardTypeEnum,
  points: z.number().int('Points must be an integer').min(0).max(100),
  rewardNote: z.string().trim().max(1000, 'Reward note is too long').nullable().optional(),
});

export const createBehaviorRewardDto = behaviorRewardInput.extend({
  points: behaviorRewardInput.shape.points.default(0),
});
export const updateBehaviorRewardDto = behaviorRewardInput.partial();
export const behaviorRewardIdParam = z.object({ id: z.string().min(1) });

export type CreateBehaviorRewardDto = z.infer<typeof createBehaviorRewardDto>;
export type UpdateBehaviorRewardDto = z.infer<typeof updateBehaviorRewardDto>;
