import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { ParentService } from '../../src/modules/parents/ParentService';
import { ParentChildrenRepository } from '../../src/modules/parents/ParentChildrenRepository';

const oldYear = {
  id: 'year-old', label: '2025-2026', status: 'closed',
  reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31',
};

// Outside a request the @Year() getter is not installed; give the instance
// the year a request scope would resolve.
function inYear<T extends object>(instance: T, year: object): T {
  Object.defineProperty(instance, 'year', { value: year, configurable: true });
  return instance;
}

function parentService(validator: Record<string, unknown>, children: Record<string, unknown>) {
  return new ParentService(
    {} as any, validator as any, {} as any, {} as any, {} as any, children as any,
  );
}

describe('parent children year scope', () => {
  it('enriches only the readable parent list in one batch, retaining parents with no placements', async () => {
    const service = new ParentService(
      { getAll: async () => [{ id: 'p1' }, { id: 'p2' }] } as any,
      {} as any, {} as any, {} as any, {} as any,
      { getListPlacements: async (ids: string[]) => {
        expect(ids).toEqual(['p1', 'p2']);
        return [{ parentId: 'p1', studentId: 's1', classId: 'c1', sectionId: 'a' }];
      } } as any,
    );
    expect<unknown>(await service.getAll()).toEqual([
      { id: 'p1', childPlacements: [{ parentId: 'p1', studentId: 's1', classId: 'c1', sectionId: 'a' }] },
      { id: 'p2', childPlacements: [] },
    ]);
  });

  it('places each child in the request year after checking the parent', async () => {
    const calls: unknown[] = [];
    const service = parentService(
      { ensureExists: async (id: string) => { calls.push(['exists', id]); return { id }; } },
      {
        getLinkedChildren: async () => { throw new Error('current placement used'); },
        getChildren: async (parentId: string) => {
          calls.push(['children', parentId]);
          return [{ id: 'student-1', classId: 'class-old' }];
        },
      },
    );
    expect<unknown>(await service.getChildren('parent-1')).toEqual([{ id: 'student-1', classId: 'class-old' }]);
    expect(calls).toEqual([['exists', 'parent-1'], ['children', 'parent-1']]);
  });

  it('reads no children of a parent the reader cannot see', async () => {
    const service = parentService(
      { ensureExists: async () => { throw new Error('Parent not found'); } },
      { getChildren: async () => { throw new Error('children read'); } },
    );
    await expect(service.getChildren('parent-1')).rejects.toThrow('Parent not found');
  });

  it('keeps the current-link read explicit', async () => {
    const service = parentService(
      { ensureExists: async () => ({ id: 'parent-1' }) },
      { getLinkedChildren: async () => [{ id: 'student-1' }] },
    );
    expect<unknown>(await service.getLinkedChildren('parent-1')).toEqual([{ id: 'student-1' }]);
  });
});

describe('parent children query', () => {
  it('filters list placements by year, readable students and requested parents, picking the latest placement', async () => {
    let captured = { sql: '', params: [] as unknown[] };
    const repo: any = inYear(new ParentChildrenRepository(), oldYear);
    repo.db = drizzle(async (sql, params) => { captured = { sql, params }; return { rows: [] }; });
    repo._scopeCtx = { hasActiveContext: () => true, getUser: () => ({ id: 'teacher-1', role: 'teacher' }) };
    await repo.getListPlacements(['p1', 'p2']);
    expect(captured.sql).toContain('select distinct on ("student_parents"."parent_id", "students"."id")');
    expect(captured.sql).toContain('"student_enrollments"."academic_year_id" = $');
    expect(captured.sql).toContain('"student_parents"."parent_id" in (');
    expect(captured.sql).toContain('"students"."id" in (select');
    expect(captured.sql).toContain('"student_enrollment_placements"."valid_from" desc');
    expect(captured.sql).not.toContain('"students"."class_id"');
    expect(captured.params).toEqual(expect.arrayContaining(['year-old', 'teacher-1', 'p1', 'p2']));
    expect(await repo.getListPlacements([])).toEqual([]);
  });

  async function statement(method: 'getChildren' | 'getLinkedChildren' = 'getChildren', role?: string) {
    let captured = { sql: '', params: [] as unknown[] };
    const repo: any = inYear(new ParentChildrenRepository(), oldYear);
    repo.db = drizzle(async (sql, params) => { captured = { sql, params }; return { rows: [] }; });
    if (role) repo._scopeCtx = { hasActiveContext: () => true, getUser: () => ({ id: 'user-1', role }) };
    await repo[method]('parent-1');
    return captured;
  }

  it('names the current class and section for current-link features', async () => {
    const { sql, params } = await statement('getLinkedChildren');
    expect(sql).toContain('left join "classes" on "students"."class_id" = "classes"."id"');
    expect(sql).toContain('left join "sections" on "students"."section_id" = "sections"."id"');
    expect(sql).not.toContain('student_enrollments');
    expect(params).toEqual(['parent-1']);
  });

  it("keeps every linked child and places each by that year's latest placement", async () => {
    const { sql, params } = await statement();
    expect(sql).toContain('select distinct on ("students"."name", "students"."id")');
    expect(sql).toContain('left join "student_enrollments" on ("student_enrollments"."student_id" = "students"."id" and "student_enrollments"."academic_year_id" = $1)');
    expect(sql).toContain('left join "classes" on "student_enrollment_placements"."class_id" = "classes"."id"');
    expect(sql).not.toContain('"students"."class_id"');
    expect(sql).toContain('where "student_parents"."parent_id" = $2');
    expect(sql).toContain('order by "students"."name", "students"."id", "student_enrollment_placements"."valid_from" desc');
    expect(params).toEqual(['year-old', 'parent-1']);
  });

  // A teacher reaches a parent through one pupil; the pupil's brothers and
  // sisters outside the teacher's sections stay out of the list.
  it('lists only the children the reader may read as students', async () => {
    for (const method of ['getChildren', 'getLinkedChildren'] as const) {
      const teacher = await statement(method, 'teacher');
      expect(teacher.sql).toContain('"students"."id" in (select "students"."id" from "students" inner join "student_enrollments"');
      expect(teacher.sql).toContain('inner join "student_enrollment_placements"');
      expect(teacher.sql).toContain('e.academic_year_id =');
      expect(teacher.sql).toContain('and "student_parents"."parent_id" = $');
      expect(teacher.params).toEqual(expect.arrayContaining(['year-old', 'user-1', 'parent-1']));

      const parent = await statement(method, 'parent');
      expect(parent.sql).toContain('"students"."id" in (select "students"."id" from "students" inner join "student_parents"');

      const principal = await statement(method, 'principal');
      expect(principal.sql).not.toContain('"students"."id" in (select');

      const outsider = await statement(method, 'visitor');
      expect(outsider.sql).toContain('1 = 0');
    }
  });
});
