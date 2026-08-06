import { describe, expect, it } from 'bun:test';
import {
  createBehaviorRewardDto,
  updateBehaviorRewardDto,
} from '@server/modules/behaviorRewards/BehaviorRewardDto';

const validPayload = {
  studentId: 'stu_01',
  behaviorAt: '2026-07-13T09:30:00.000Z',
  category: 'helpfulness',
  recognitionLevel: 'achievement',
  description: 'Helped a classmate understand the assignment.',
  rewardType: 'merit',
  points: 20,
};

describe('BehaviorRewardDto', () => {
  it('accepts a complete create payload', () => {
    expect(createBehaviorRewardDto.safeParse(validPayload).success).toBe(true);
  });

  it.each(['studentId', 'behaviorAt', 'category', 'recognitionLevel', 'description', 'rewardType'])(
    'rejects a create payload missing %s',
    (field) => {
      const payload = { ...validPayload } as Record<string, unknown>;
      delete payload[field];
      expect(createBehaviorRewardDto.safeParse(payload).success).toBe(false);
    },
  );

  it('rejects points outside 0-100', () => {
    expect(createBehaviorRewardDto.safeParse({ ...validPayload, points: -1 }).success).toBe(false);
    expect(createBehaviorRewardDto.safeParse({ ...validPayload, points: 101 }).success).toBe(false);
  });

  it('accepts a partial update and rejects server-owned fields', () => {
    const result = updateBehaviorRewardDto.safeParse({
      description: 'Updated factual description.',
      awardedBy: 'someone_else',
      classId: 'class_other',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ description: 'Updated factual description.' });
  });
});
