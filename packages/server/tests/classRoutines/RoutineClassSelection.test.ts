import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { ClassRoutineRepository } from '../../src/modules/classRoutines/ClassRoutineRepository';

describe('timetable class selection', () => {
  const capture = async (role: string) => {
    const statements: { query: string; params: unknown[] }[] = [];
    const repository = new ClassRoutineRepository();
    repository.db = drizzle(async (query, params) => {
      statements.push({ query, params });
      return { rows: [] };
    }) as any;
    Object.defineProperty(repository, 'year', { value: { id: 'year', label: '2026-2027' } });
    await repository.getClassesInSelectedYear({ id: 'monitor', role });
    await repository.getClassSectionsInSelectedYear({ id: 'monitor', role });
    return statements;
  };

  it('filters monitor classes and sections by current assignments within the selected year', async () => {
    for (const { query, params } of await capture('floor_manager')) {
      expect(query).toContain('floor_manager_assignments managed_grade');
      expect(query).toContain('managed_grade.class_name = "classes"."name"');
      expect(query).toContain("managed_grade.status = 'active'");
      expect(params).toContain('monitor');
      expect(params).toContain('2026-2027');
    }
  });

  it('retains the existing year-wide timetable selection for other readers', async () => {
    for (const { query, params } of await capture('teacher')) {
      expect(query).not.toContain('floor_manager_assignments');
      expect(params).toEqual(['2026-2027']);
    }
  });
});
