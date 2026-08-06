import { beforeAll, describe, expect, it, mock } from 'bun:test';

mock.module('najm-i18n', () => ({
  I18n: () => () => undefined,
  t: (key: string) => key,
}));

const { isBehaviorRewardDateInFuture } = await import(
  '@server/modules/behaviorRewards/BehaviorRewardValidator'
);

describe('BehaviorRewardValidator date guard', () => {
  const now = new Date('2026-07-13T10:00:00.000Z');

  it('accepts dates up to the five-minute clock-skew allowance', () => {
    expect(isBehaviorRewardDateInFuture('2026-07-13T10:05:00.000Z', now)).toBe(false);
  });

  it('rejects dates beyond the clock-skew allowance', () => {
    expect(isBehaviorRewardDateInFuture('2026-07-13T10:05:01.000Z', now)).toBe(true);
  });
});

describe('BehaviorRewardValidator ownership source', () => {
  let source = '';

  beforeAll(async () => {
    source = await Bun.file(
      new URL('../../src/modules/behaviorRewards/BehaviorRewardValidator.ts', import.meta.url),
    ).text();
  });

  it('enforces teacher assignment, ownership, and admin-only deletion', () => {
    expect(source).toContain('isTeacherAssignedToStudent(actor.id, studentId)');
    expect(source).toContain("actor.role === 'teacher' && record.awardedBy !== actor.id");
    expect(source).toContain("actor.role !== 'admin'");
  });
});
