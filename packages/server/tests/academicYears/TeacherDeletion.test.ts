import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { TeacherRepository } from '../../src/modules/teachers/TeacherRepository';
import { TeacherService } from '../../src/modules/teachers/TeacherService';
import { TeacherValidator } from '../../src/modules/teachers/TeacherValidator';
import { TeacherController } from '../../src/modules/teachers/TeacherController';
import { withEnglishMessages } from '../support/englishMessages';

function harness(history = false) {
  const calls: string[] = [];
  const repository = {
    getById: async () => ({ id: 'teacher', staffId: 'staff' }),
    hasAnyAssignments: async () => true,
    hasRecordedHistory: async () => history,
    delete: async () => { calls.push('teacher and assignments'); return { id: 'teacher' }; },
  };
  const validator = withEnglishMessages(new TeacherValidator(repository as any, {} as any, {} as any, {} as any, {} as any));
  const service = new TeacherService(repository as any, validator, {} as any, {} as any,
    { delete: async () => { calls.push('avatar'); } } as any,
    { delete: async () => { calls.push('staff and login'); } } as any);
  return { calls, service };
}

describe('teacher deletion policy', () => {
  it('lets admins remove assigned teachers and their linked account in one operation', async () => {
    const { calls, service } = harness();
    await service.delete('teacher', 'admin');
    expect(calls).toEqual(['teacher and assignments', 'staff and login', 'avatar']);
  });

  it.each(['principal', 'teacher', undefined])('keeps the assignment guard for %s', async role => {
    const { calls, service } = harness();
    await expect(service.delete('teacher', role)).rejects.toThrow('class assignments');
    expect(calls).toEqual([]);
  });

  it('refuses recorded history before deleting anything, with an actionable message', async () => {
    const { calls, service } = harness(true);
    await expect(service.delete('teacher', 'admin')).rejects.toThrow('Deactivate the teacher');
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
    expect(calls).toContain('staff and login');
  });

  it('checks assignment-dependent records in all years without needing a selected-year scope', async () => {
    const captured: Array<{ sql: string; params: unknown[] }> = [];
    const repo = new TeacherRepository();
    repo.db = drizzle(async (sql, params) => {
      captured.push({ sql, params });
      return { rows: sql.includes('from "exams"') ? [['exam']] : [] };
    }) as any;
    expect(await repo.hasRecordedHistory('teacher')).toBe(true);
    expect(captured).toHaveLength(4);
    for (const statement of captured) {
      expect(statement.sql).toContain('limit');
      expect(statement.sql).not.toContain('academic_year');
      expect(statement.params).toContain('teacher');
    }
    expect(captured.some(statement => statement.sql.includes('"attendance"."teacher_id"'))).toBe(true);
    expect(captured.some(statement => statement.sql.includes('"routine_entries"'))).toBe(true);
  });
});
