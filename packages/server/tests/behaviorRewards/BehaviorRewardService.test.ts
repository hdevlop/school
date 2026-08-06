import { describe, expect, it, mock } from 'bun:test';
import { BehaviorRewardService } from '@server/modules/behaviorRewards/BehaviorRewardService';

const payload = {
  studentId: 'stu_01',
  behaviorAt: '2026-07-13T09:30:00.000Z',
  category: 'leadership' as const,
  recognitionLevel: 'excellence' as const,
  description: 'Led the class project responsibly.',
  rewardType: 'certificate' as const,
  points: 50,
  rewardNote: 'Recognized during assembly.',
};

describe('BehaviorRewardService', () => {
  it('derives snapshots and awarding user on create', async () => {
    const repository = {
      create: mock((data) => Promise.resolve({ id: 'br_01', ...data })),
    };
    const validator = {
      ensureStudentEligible: mock(() => Promise.resolve({
        id: 'stu_01', status: 'active', classId: 'cls_01', sectionId: 'sec_01',
      })),
      ensureBehaviorDate: mock(() => undefined),
    };
    const service = new BehaviorRewardService(repository as any, validator as any);

    const result = await service.create(payload, { id: 'usr_teacher', role: 'teacher' });

    expect(result.classId).toBe('cls_01');
    expect(result.sectionId).toBe('sec_01');
    expect(result.awardedBy).toBe('usr_teacher');
    expect((repository.create.mock.calls[0][0] as any).classId).toBe('cls_01');
  });

  it('recalculates snapshots when the student changes', async () => {
    const repository = {
      update: mock((_id, data) => Promise.resolve({ id: 'br_01', ...data })),
    };
    const validator = {
      ensureExists: mock(() => Promise.resolve({ id: 'br_01', studentId: 'stu_01', awardedBy: 'usr_teacher' })),
      ensureTeacherOwns: mock(() => undefined),
      ensureStudentEligible: mock(() => Promise.resolve({ classId: 'cls_02', sectionId: 'sec_02' })),
      ensureBehaviorDate: mock(() => undefined),
    };
    const service = new BehaviorRewardService(repository as any, validator as any);

    const result = await service.update(
      'br_01',
      { studentId: 'stu_02' },
      { id: 'usr_teacher', role: 'teacher' },
    );

    expect(result.studentId).toBe('stu_02');
    expect(result.classId).toBe('cls_02');
    expect(result.sectionId).toBe('sec_02');
  });
});
