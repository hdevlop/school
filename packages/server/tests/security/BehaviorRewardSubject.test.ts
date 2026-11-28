import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { BehaviorRewardService } from '../../src/modules/behaviorRewards/BehaviorRewardService';
import { BehaviorRewardValidator } from '../../src/modules/behaviorRewards/BehaviorRewardValidator';
import { createBehaviorRewardDto, updateBehaviorRewardDto } from '../../src/modules/behaviorRewards/BehaviorRewardDto';
import { withEnglishMessages } from '../support/englishMessages';

const repository = { subjectExists: async (id: string) => id === 'maths' };
const validator = withEnglishMessages(new BehaviorRewardValidator(repository as any, {} as any, {} as any));

describe("a reward's subject", () => {
  it('is optional: none stays none', async () => {
    expect(await validator.subjectFor(undefined)).toBeNull();
    expect(await validator.subjectFor(null)).toBeNull();
    expect(await validator.subjectFor('')).toBeNull();
    expect(createBehaviorRewardDto.parse({
      studentId: 's', behaviorAt: '2026-11-26T09:00:00.000Z', category: 'academic_effort', rewardType: 'badge',
    }).subjectId).toBeUndefined();
  });

  it('must be a subject of the school', async () => {
    expect(await validator.subjectFor('maths')).toBe('maths');
    await expect(validator.subjectFor('nowhere')).rejects.toThrow();
  });

  it('is recorded when given, and cleared on edit by an explicit null', async () => {
    const written: Record<string, unknown>[] = [];
    const store = {
      ...repository,
      create: async (data: Record<string, unknown>) => { written.push(data); return data; },
      update: async (_id: string, data: Record<string, unknown>) => { written.push(data); return data; },
      getById: async () => ({ id: 'r', awardedBy: 'teacher', studentId: 's', behaviorAt: '2026-11-26T09:00:00.000Z', rewardType: 'badge', certificatePlace: null }),
      getStudentPlacementOn: async () => ({ inSelectedYear: true, classId: 'c', sectionId: 'a' }),
      isTeacherAssignedToSection: async () => true,
    };
    const rules = withEnglishMessages(new BehaviorRewardValidator(store as any, {} as any, {} as any));
    const service = new BehaviorRewardService(store as any, rules);
    const teacher = { id: 'teacher', role: 'teacher' };

    await service.create(createBehaviorRewardDto.parse({
      studentId: 's', behaviorAt: '2026-11-26T09:00:00.000Z', category: 'academic_effort', rewardType: 'badge', subjectId: 'maths',
    }), teacher);
    expect(written.at(-1)?.subjectId).toBe('maths');

    await service.update('r', updateBehaviorRewardDto.parse({ subjectId: null }), teacher);
    expect(written.at(-1)).toHaveProperty('subjectId', null);

    // An edit that does not mention the subject leaves it as it is.
    await service.update('r', updateBehaviorRewardDto.parse({ points: 3 }), teacher);
    expect(written.at(-1)).not.toHaveProperty('subjectId');
  });
});
