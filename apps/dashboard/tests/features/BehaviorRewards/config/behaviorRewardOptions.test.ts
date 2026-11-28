import { describe, expect, it } from 'bun:test';
import {
  BEHAVIOR_REWARD_CATEGORY_VALUES,
  BEHAVIOR_REWARD_TYPE_VALUES,
} from '@sms/contracts';

import {
  buildBehaviorRewardCategoryOptions,
  buildBehaviorRewardTypeOptions,
  buildRewardSubjectFilterOptions,
  buildRewardSubjectOptions,
  NO_REWARD_SUBJECT,
  rewardSubjectValue,
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

describe('the reward subject', () => {
  const subjects = [
    { id: 'fr', name: 'Français' },
    { id: 'maths', name: 'Mathématiques', code: 'MATH' },
    { id: 'ar', name: 'Arabe' },
  ];

  it("offers none first, then the teacher's own subjects, then the others", () => {
    expect(buildRewardSubjectOptions(subjects, new Set(['maths']), echo).map((o) => o.value))
      .toEqual([NO_REWARD_SUBJECT, 'maths', 'fr', 'ar']);
    expect(buildRewardSubjectOptions(subjects, null, echo).map((o) => o.value))
      .toEqual([NO_REWARD_SUBJECT, 'fr', 'maths', 'ar']);
    expect(buildRewardSubjectOptions(subjects, null, echo)[2].label).toBe('Mathématiques (MATH)');
  });

  it('filters by the subjects the rewards name, and "no subject" when some name none', () => {
    const rewards = [{ subject: { id: 'maths', name: 'Mathématiques' } }, { subject: null }, { subject: { id: 'ar', name: 'Arabe' } }, {}];
    expect(buildRewardSubjectFilterOptions(rewards, echo, 'fr')).toEqual([
      { value: 'ar', label: 'Arabe' },
      { value: 'maths', label: 'Mathématiques' },
      { value: NO_REWARD_SUBJECT, label: 'behaviorRewards.filters.noSubject' },
    ]);
    expect(buildRewardSubjectFilterOptions([{ subject: { id: 'ar', name: 'Arabe' } }], echo).map((o) => o.value)).toEqual(['ar']);
    expect(rewards.map(rewardSubjectValue)).toEqual(['maths', NO_REWARD_SUBJECT, 'ar', NO_REWARD_SUBJECT]);
  });
});
