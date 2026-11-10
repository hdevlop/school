import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { TeacherRepository } from '../../src/modules/teachers/TeacherRepository';
import { TeacherService } from '../../src/modules/teachers/TeacherService';
import { TeacherValidator } from '../../src/modules/teachers/TeacherValidator';
import { TeacherController } from '../../src/modules/teachers/TeacherController';
import { withEnglishMessages } from '../support/englishMessages';

function harness() {
  const calls: string[] = [];
  const repository = {
    getById: async () => ({ id: 'teacher', staffId: 'staff' }),
    hasAnyAssignments: async () => true,
    recordedHistory: async () => ({ exams: 3, assessments: 0, grades: 22, attendance: 0, lessons: 0 }),
    eraseRecordedHistory: async () => { calls.push('recorded history'); },
    delete: async () => { calls.push('teacher and assignments'); return { id: 'teacher' }; },
  };
  const validator = withEnglishMessages(new TeacherValidator(repository as any, {} as any, {} as any, {} as any, {} as any));
  const service = new TeacherService(repository as any, validator, {} as any, {} as any,
    { delete: async () => { calls.push('avatar'); } } as any,
    { delete: async () => { calls.push('staff and login'); } } as any);
  return { calls, service };
}

describe('teacher deletion policy', () => {
  it('lets admins remove any teacher: what they recorded first, then the teacher and linked account, in one operation', async () => {
    const { calls, service } = harness();
    await service.delete('teacher', 'admin');
    expect(calls).toEqual(['recorded history', 'teacher and assignments', 'staff and login', 'avatar']);
  });

  it.each(['principal', 'teacher', undefined])('keeps the assignment guard for %s, and erases nothing', async role => {
    const { calls, service } = harness();
    await expect(service.delete('teacher', role)).rejects.toThrow('class assignments');
    expect(calls).toEqual([]);
  });

  it('counts what a deletion would erase, for the confirmation', async () => {
    const { calls, service } = harness();
    expect(await service.deletionImpact('teacher')).toEqual({ exams: 3, assessments: 0, grades: 22, attendance: 0, lessons: 0 });
    expect(calls).toEqual([]);
  });

  it('passes the authenticated role to single and bulk deletion', async () => {
    const calls: unknown[] = [];
    const controller = new TeacherController({
      delete: async (...args: unknown[]) => calls.push(args),
      deleteBulk: async (...args: unknown[]) => calls.push(args),
    } as any);
    await controller.deleteById('teacher', { role: 'admin' });
    await controller.deleteBulk(['teacher'], { role: 'principal' });
    expect(calls).toEqual([['teacher', 'admin'], [['teacher'], 'principal']]);
  });

  it('applies the same policy to each bulk-deleted teacher', async () => {
    const { calls, service } = harness();
    const result = await service.deleteBulk(['teacher'], 'admin');
    expect(result.deletedCount).toBe(1);
    expect(calls).toEqual(['recorded history', 'teacher and assignments', 'staff and login', 'avatar']);
  });

  const capture = () => {
    const captured: Array<{ sql: string; params: unknown[] }> = [];
    const repo = new TeacherRepository();
    repo.db = drizzle(async (sql, params) => {
      captured.push({ sql, params });
      return { rows: sql.startsWith('select count') ? [[sql.includes('from "grades"') ? 22 : 0]] : [] };
    }) as any;
    return { captured, repo };
  };

  it('counts assignment-dependent records in all years without needing a selected-year scope', async () => {
    const { captured, repo } = capture();
    expect(await repo.recordedHistory('teacher')).toEqual({ exams: 0, assessments: 0, grades: 22, attendance: 0, lessons: 0 });
    expect(captured).toHaveLength(5);
    for (const statement of captured) {
      expect(statement.sql).not.toContain('academic_year');
      expect(statement.params).toContain('teacher');
    }
    expect(captured.some(statement => statement.sql.includes('"attendance"."teacher_id"'))).toBe(true);
    expect(captured.some(statement => statement.sql.includes('"routine_entries"'))).toBe(true);
  });

  it('erases grades before the exams and assessments they belong to, in every year, and only this teacher\'s', async () => {
    const { captured, repo } = capture();
    await repo.eraseRecordedHistory('teacher');
    const tables = captured.map(statement => statement.sql.match(/^delete from "(\w+)"/)?.[1]);
    expect(tables).toEqual(['grades', 'exams', 'assessments', 'attendance', 'routine_entries']);
    for (const statement of captured) {
      expect(statement.sql).not.toContain('academic_year');
      expect(statement.sql).toContain('"teacher_assignments"."teacher_id"');
      expect(statement.params).toContain('teacher');
    }
  });
});
