import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { ParentService } from '../../src/modules/parents/ParentService';
import { ParentRepository } from '../../src/modules/parents/ParentRepository';
import { parentChildrenQuery } from '../../src/modules/parents/ParentDto';

const oldYear = { id: 'year-old', label: '2025-2026', status: 'closed' };

function parentService(
  repository: Record<string, unknown>,
  validator: Record<string, unknown>,
) {
  return new ParentService(
    repository as any, validator as any, {} as any, {} as any, {} as any,
  );
}

describe('parent children year scope', () => {
  it('validates the optional year query', () => {
    expect(parentChildrenQuery.parse({})).toEqual({});
    expect(parentChildrenQuery.parse({ academicYear: '2025-2026' })).toEqual({ academicYear: '2025-2026' });
    expect(() => parentChildrenQuery.parse({ academicYear: 'all' })).toThrow();
  });

  it('places each child in the resolved year after checking the parent', async () => {
    const calls: unknown[] = [];
    const service = parentService(
      {
        getLinkedChildren: async () => { throw new Error('current placement used'); },
        getChildren: async (parentId: string, yearId: string) => {
          calls.push(['year', parentId, yearId]);
          return [{ id: 'student-1', classId: 'class-old' }];
        },
      },
      { ensureExists: async (id: string) => { calls.push(['exists', id]); return { id }; } },
    );
    expect<unknown>(await service.getChildren('parent-1', oldYear as any))
      .toEqual([{ id: 'student-1', classId: 'class-old' }]);
    expect(calls).toEqual([['exists', 'parent-1'], ['year', 'parent-1', 'year-old']]);
  });

  it('keeps the current-link read explicit', async () => {
    const service = parentService(
      { getLinkedChildren: async () => [{ id: 'student-1' }] },
      { ensureExists: async () => ({ id: 'parent-1' }) },
    );
    expect<unknown>(await service.getLinkedChildren('parent-1')).toEqual([{ id: 'student-1' }]);
  });
});

describe('parent children year query', () => {
  async function statement(method = 'getChildren', args: unknown[] = ['parent-1', 'year-old'], role?: string) {
    let captured = { sql: '', params: [] as unknown[] };
    const repo: any = new ParentRepository();
    repo.db = drizzle(async (sql, params) => { captured = { sql, params }; return { rows: [] }; });
    if (role) repo._scopeCtx = { hasActiveContext: () => true, getUser: () => ({ id: 'user-1', role }) };
    await repo[method](...args);
    return captured;
  }

  it('names the current class and section for current-link features', async () => {
    const { sql, params } = await statement('getLinkedChildren', ['parent-1']);
    expect(sql).toContain('left join "classes" on "students"."class_id" = "classes"."id"');
    expect(sql).toContain('left join "sections" on "students"."section_id" = "sections"."id"');
    expect(sql).not.toContain('student_enrollments');
    expect(params).toEqual(['parent-1']);
  });

  it('keeps every linked child and places each by that year\'s latest placement', async () => {
    const { sql, params } = await statement();
    expect(sql).toContain('select distinct on ("students"."name", "students"."id")');
    expect(sql).toContain('left join "student_enrollments" on ("student_enrollments"."student_id" = "students"."id" and "student_enrollments"."academic_year_id" = $1)');
    expect(sql).toContain('left join "classes" on "student_enrollment_placements"."class_id" = "classes"."id"');
    expect(sql).not.toContain('"students"."class_id"');
    expect(sql).toContain('where "student_parents"."parent_id" = $2');
    expect(sql).toContain('order by "students"."name", "students"."id", "student_enrollment_placements"."valid_from" desc');
    expect(params).toEqual(['year-old', 'parent-1']);
  });

  it('lists every child of a readable parent in the year', async () => {
    for (const role of ['parent', 'principal', 'teacher']) {
      const { sql, params } = await statement(undefined, undefined, role);
      expect(sql).toContain('where "student_parents"."parent_id" = $2 order by');
      expect(params).toEqual(['year-old', 'parent-1']);
    }
  });
});
