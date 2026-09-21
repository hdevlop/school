import { describe, expect, it } from 'bun:test';
import {
  BEHAVIOR_RECOGNITION_LEVEL_VALUES,
  BEHAVIOR_REWARD_CATEGORY_VALUES,
  BEHAVIOR_REWARD_TYPE_VALUES,
} from '@sms/contracts';

import { behaviorRewardSchema } from './behaviorRewardSchemas';

const reward = {
  studentId: 'st1',
  behaviorDate: '2026-02-01',
  behaviorTime: '09:30',
  category: 'leadership',
  recognitionLevel: 'excellence',
  description: 'Ran the reading corner all week.',
  rewardType: 'badge',
  points: 10,
};

describe('behaviorRewardSchema', () => {
  it('accepts every category, level and reward type the API accepts', () => {
    for (const category of BEHAVIOR_REWARD_CATEGORY_VALUES) {
      expect(behaviorRewardSchema.safeParse({ ...reward, category }).success).toBe(true);
    }
    for (const recognitionLevel of BEHAVIOR_RECOGNITION_LEVEL_VALUES) {
      expect(behaviorRewardSchema.safeParse({ ...reward, recognitionLevel }).success).toBe(true);
    }
    for (const rewardType of BEHAVIOR_REWARD_TYPE_VALUES) {
      expect(behaviorRewardSchema.safeParse({ ...reward, rewardType }).success).toBe(true);
    }
  });

  it('coerces the points the number input submits as text', () => {
    expect(behaviorRewardSchema.parse({ ...reward, points: '25' }).points).toBe(25);
  });

  it('keeps points a whole number between nothing and a hundred', () => {
    expect(behaviorRewardSchema.safeParse({ ...reward, points: 2.5 }).success).toBe(false);
    expect(behaviorRewardSchema.safeParse({ ...reward, points: -1 }).success).toBe(false);
    expect(behaviorRewardSchema.safeParse({ ...reward, points: 101 }).success).toBe(false);
    expect(behaviorRewardSchema.safeParse({ ...reward, points: 0 }).success).toBe(true);
  });

  it('needs both halves of the timestamp the form joins', () => {
    expect(behaviorRewardSchema.safeParse({ ...reward, behaviorDate: '' }).success).toBe(false);
    expect(behaviorRewardSchema.safeParse({ ...reward, behaviorTime: '' }).success).toBe(false);
  });
});
