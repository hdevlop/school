import { beforeAll, describe, expect, it } from 'bun:test';

describe('SectionRepository student joins', () => {
  let source = '';

  beforeAll(async () => {
    source = await Bun.file(
      new URL('../../src/modules/sections/SectionRepository.ts', import.meta.url),
    ).text();
  });

  it('joins section students to users through students.userId', () => {
    const getStudentsMethod = source.match(/async getStudents\(sectionId\)[\s\S]*?async getAnalytics/);

    expect(getStudentsMethod?.[0]).toContain('.innerJoin(users, eq(students.userId, users.id))');
    expect(getStudentsMethod?.[0]).not.toContain('.innerJoin(users, eq(teachers.userId, users.id))');
  });
});
