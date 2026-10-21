import { describe, expect, it } from 'bun:test';
import { schoolI18n } from '@sms/contracts/locales';
import {
  BEHAVIOR_RECOGNITION_LEVEL_VALUES,
  BEHAVIOR_REWARD_CATEGORY_VALUES,
  BEHAVIOR_REWARD_TYPE_VALUES,
} from '@sms/contracts';

import { createBehaviorRewardSchema } from '@/features/BehaviorRewards/config/behaviorRewardSchemas';

// The English catalog, so a message a test reads proves its key exists.
const english = (key: string, params?: Record<string, unknown>) => schoolI18n.translate('en', key as never, params as never);
const behaviorRewardSchema = createBehaviorRewardSchema(english);

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

  it('uses translated range feedback in every language', () => {
    for (const language of ['en', 'fr', 'es', 'ar'] as const) {
      const t = (key: string) => schoolI18n.translate(language, key as never);
      for (const points of [-1, 101]) {
        const result = createBehaviorRewardSchema(t).safeParse({ ...reward, points });
        expect(result.success).toBe(false);
        expect(result.error!.issues.find(issue => issue.path[0] === 'points')?.message)
          .toBe(t('validationMessages.pointsRange'));
        expect(t('validationMessages.pointsRange')).not.toBe('validationMessages.pointsRange');
      }
      expect(createBehaviorRewardSchema(t).safeParse({ ...reward, points: 100 }).success).toBe(true);
    }
  });

  it('needs both halves of the timestamp the form joins', () => {
    expect(behaviorRewardSchema.safeParse({ ...reward, behaviorDate: '' }).success).toBe(false);
    expect(behaviorRewardSchema.safeParse({ ...reward, behaviorTime: '' }).success).toBe(false);
  });
});
