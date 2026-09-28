import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { getGuardMetadata } from 'najm-guard';
import { SearchRepository } from '../../src/modules/search/SearchRepository';
import { SearchController } from '../../src/modules/search/SearchController';

async function searchSql(role: string, method: 'searchStudents' | 'searchTeachers' | 'searchParents') {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new SearchRepository();
  repository.db = drizzle(async (sql, params) => {
    statements.push({ sql, params });
    return { rows: [] };
  }) as any;
  repository._scopeCtx = {
    hasActiveContext: () => true,
    getUser: () => ({ id: 'search-user', role }),
  } as any;
  await repository[method]('Adam');
  return statements.at(-1)!;
}

describe('identity search ownership', () => {
  it('requires each resource permission for global search and the matching permission for typed search', () => {
    const permissions = (method: string) => getGuardMetadata(SearchController, method)
      .map((guard) => guard.params)
      .filter((value): value is string => typeof value === 'string');
    expect(permissions('searchGlobal')).toEqual(expect.arrayContaining([
      'read:students', 'read:teachers', 'read:parents',
    ]));
    expect(permissions('searchStudents')).toContain('read:students');
    expect(permissions('searchTeachers')).toContain('read:teachers');
    expect(permissions('searchParents')).toContain('read:parents');
  });

  it('applies the matching entity rule with the search term in one WHERE', async () => {
    const student = await searchSql('parent', 'searchStudents');
    expect(student.sql).toContain('"students"."id" in (select');
    expect(student.sql).toContain('"student_parents"');
    expect(student.sql).toContain('ilike');
    expect(student.params).toContain('search-user');

    const teacher = await searchSql('teacher', 'searchTeachers');
    expect(teacher.sql).toContain('"teachers"."id" in (select');
    expect(teacher.sql).toContain('"staff"');
    expect(teacher.params).toContain('search-user');

    const parent = await searchSql('student', 'searchParents');
    expect(parent.sql).toContain('"parents"."id" in (select');
    expect(parent.sql).toContain('"student_parents"');
    expect(parent.params).toContain('search-user');
  });

  it('denies resources without an ownership rule and keeps school-wide identities shared', async () => {
    for (const method of ['searchStudents', 'searchTeachers', 'searchParents'] as const) {
      const unknown = await searchSql('custom-role', method);
      expect(unknown.sql).toContain('1 = 0');
      const admin = await searchSql('admin', method);
      expect(admin.sql).not.toContain('1 = 0');
      expect(admin.sql).not.toContain('"academic_year"');
      expect(admin.sql).not.toContain('"academic_year_id"');
    }
  });
});
