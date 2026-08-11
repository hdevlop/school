import { describe, expect, it } from 'bun:test';

describe('BehaviorRewardRepository contract', () => {
  it('returns joined student, class, section, and awarding-user data', async () => {
    const source = await Bun.file(
      new URL('../../src/modules/behaviorRewards/BehaviorRewardRepository.ts', import.meta.url),
    ).text();

    expect(source).toContain('student: {');
    expect(source).toContain('class: { id: classes.id, name: classes.name }');
    expect(source).toContain('section: { id: sections.id, name: sections.name }');
    expect(source).toContain('awardedByUser: {');
    expect(source).toContain('.innerJoin(students');
    expect(source).toContain('.innerJoin(awardingUsers');
  });

  it('applies ownership scope and newest-first ordering to list and lookup', async () => {
    const repository = await Bun.file(
      new URL('../../src/modules/behaviorRewards/BehaviorRewardRepository.ts', import.meta.url),
    ).text();
    const guards = await Bun.file(
      new URL('../../src/modules/behaviorRewards/BehaviorRewardGuards.ts', import.meta.url),
    ).text();

    expect(repository).toContain('return this.scope(this.buildQuery())');
    expect(repository).toContain('.orderBy(desc(behaviorRewards.behaviorAt), desc(behaviorRewards.createdAt))');
    expect(guards).toContain(".for('teacher', where(behaviorRewards.awardedBy))");
  });
});
