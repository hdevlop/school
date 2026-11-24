import { describe, expect, it } from 'bun:test';
import { schoolI18n } from '@sms/contracts/locales';
import {
  BEHAVIOR_REWARD_CATEGORY_VALUES,
  BEHAVIOR_REWARD_TYPE_VALUES,
} from '@sms/contracts';

import { createRewardTemplateSchema } from '@/features/RewardTemplates/config/rewardTemplateSchemas';
import { nextTemplate, templateFormValues, templatesFor, type RewardTemplate } from '@/features/RewardTemplates/config/rewardTemplateMatch';
import { createBehaviorRewardSchema } from '@/features/BehaviorRewards/config/behaviorRewardSchemas';

// The English catalog, so a message a test reads proves its key exists.
const english = (key: string, params?: Record<string, unknown>) => schoolI18n.translate('en', key as never, params as never);
const schema = createRewardTemplateSchema(english);

const template = {
  title: 'Outstanding teamwork',
  category: 'teamwork',
  rewardType: 'badge',
  points: 10,
  description: 'Led the group project.',
  active: true,
};

describe('rewardTemplateSchema', () => {
  it('accepts every category and reward type the API accepts', () => {
    for (const category of BEHAVIOR_REWARD_CATEGORY_VALUES) {
      expect(schema.safeParse({ ...template, category }).success).toBe(true);
    }
    for (const rewardType of BEHAVIOR_REWARD_TYPE_VALUES) {
      expect(schema.safeParse({ ...template, rewardType }).success).toBe(true);
    }
  });

  it('requires a name, in the reader\'s language', () => {
    const result = schema.safeParse({ ...template, title: '  ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Name is required');
    expect(schema.safeParse({ ...template, title: 'x'.repeat(121) }).success).toBe(false);
  });

  it('bounds points as a recorded reward does', () => {
    for (const points of [-1, 101, 2.5]) expect(schema.safeParse({ ...template, points }).success).toBe(false);
    expect(schema.parse({ ...template, points: '25' }).points).toBe(25);
  });
});

describe('templatesFor', () => {
  const bank: RewardTemplate[] = [
    { id: 'b', title: 'Team spirit', category: 'teamwork', rewardType: 'badge', points: 5, description: '', active: true },
    { id: 'a', title: 'Outstanding teamwork', category: 'teamwork', rewardType: 'badge', points: 10, description: 'Led it.', active: true },
    { id: 'c', title: 'Retired', category: 'teamwork', rewardType: 'badge', points: 1, description: '', active: false },
    { id: 'd', title: 'Other pair', category: 'teamwork', rewardType: 'certificate', points: 20, description: '', active: true },
  ];

  it('offers only the active templates of the chosen category and reward type, by title', () => {
    expect(templatesFor(bank, 'teamwork', 'badge').map((t) => t.id)).toEqual(['a', 'b']);
    expect(templatesFor(bank, 'leadership', 'badge')).toEqual([]);
    expect(templatesFor(undefined, 'teamwork', 'badge')).toEqual([]);
  });

  it('cycles to another template on each click, starting after the wording already there', () => {
    const matches = templatesFor(bank, 'teamwork', 'badge');
    expect(nextTemplate(matches, null)?.id).toBe('a');
    expect(nextTemplate(matches, 'a')?.id).toBe('b');
    expect(nextTemplate(matches, 'b')?.id).toBe('a');
    // A stored reward already worded like "Outstanding teamwork" moves on to the next one.
    expect(nextTemplate(matches, null, ' Led it. ')?.id).toBe('b');
    expect(nextTemplate([], null)).toBeUndefined();
  });

  it('fills values the reward form accepts', () => {
    const rewardSchema = createBehaviorRewardSchema(english);
    for (const entry of bank) {
      const filled = { studentId: 's', behaviorDate: '2026-02-01', behaviorTime: '09:30',
        category: entry.category, rewardType: entry.rewardType, ...templateFormValues(entry) };
      expect(rewardSchema.safeParse(filled).success).toBe(true);
    }
    expect(templateFormValues({ points: 0, description: null })).toEqual({ points: 0, description: '' });
  });
});
