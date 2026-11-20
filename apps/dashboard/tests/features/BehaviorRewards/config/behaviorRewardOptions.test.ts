import { describe, expect, it } from 'bun:test';
import {
  BEHAVIOR_REWARD_CATEGORY_VALUES,
  BEHAVIOR_REWARD_TYPE_VALUES,
} from '@sms/contracts';

import {
  buildBehaviorRewardCategoryOptions,
  buildBehaviorRewardTypeOptions,
} from '@/features/BehaviorRewards/config/behaviorRewardOptions';

const echo = (key: string) => key;

describe('behaviour reward option builders', () => {
  it('offers exactly what the API accepts, in contract order', () => {
    expect(buildBehaviorRewardCategoryOptions(echo).map((o) => o.value)).toEqual([
      ...BEHAVIOR_REWARD_CATEGORY_VALUES,
    ]);
    expect(buildBehaviorRewardTypeOptions(echo).map((o) => o.value)).toEqual([
      ...BEHAVIOR_REWARD_TYPE_VALUES,
    ]);
  });

  it('uses the same translation keys the cards and tables already render', () => {
    expect(buildBehaviorRewardCategoryOptions(echo)[0]).toEqual({
      value: 'academic_effort',
      label: 'behaviorRewards.categories.academic_effort',
    });
    expect(buildBehaviorRewardTypeOptions(echo)[0]).toEqual({
      value: 'verbal_praise',
      label: 'behaviorRewards.rewardTypes.verbal_praise',
    });
  });
});
