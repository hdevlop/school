import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { getTransactionalMethods } from 'najm-database';
import { StudentRepository } from '../../src/modules/students/StudentRepository';
import { StudentService } from '../../src/modules/students/StudentService';
import { StudentValidator } from '../../src/modules/students/StudentValidator';
import { withEnglishMessages } from '../support/englishMessages';

describe('student deletion', () => {
  it('allows enrollment history but refuses financial history before any deletion', async () => {
    for (const retained of [false, true]) {
      const calls: string[] = [];
      const afterCommit: Array<() => unknown> = [];
      const student = { id: 'student-1', userId: 'student-user' };
      const repository = {
        lockForDeletion: async () => { calls.push('lock'); },
        getById: async () => student,
        hasFinancialHistory: async () => retained,
        delete: async () => { calls.push('delete'); return student; },
      };
      const validator = withEnglishMessages(new StudentValidator(
        repository as any, {} as any, {} as any, {} as any,
        { hasAnyForStudent: () => { throw new Error('Enrollment history must not block deletion'); } } as any,
      ));
      const service = new StudentService(repository as any, validator, {} as any, {} as any,
        {} as any, {} as any, {} as any, {} as any,
        { delete: async () => { calls.push('avatar'); } } as any);
      Object.assign(service, { transactions: { afterCommit: async (callback: () => unknown) => { afterCommit.push(callback); } } });
      if (retained) {
        await expect(service.delete(student.id)).rejects.toThrow('payment or credit history');
        expect(calls).toEqual(['lock']);
        expect(afterCommit).toHaveLength(0);
      } else {
        expect<unknown>(await service.delete(student.id)).toEqual(student);
        expect(calls).toEqual(['lock', 'delete']);
        expect(afterCommit).toHaveLength(1);
        await afterCommit[0]();
        expect(calls).toEqual(['lock', 'delete', 'avatar']);
      }
    }
  });

  it('removes only the targeted academic dependents, placements before enrollments, across all years', async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const db = drizzle(async (sql, params) => {
      queries.push({ sql, params });
      return { rows: [] };
    });
    const repository = new StudentRepository();
    repository.db = db as any;
    await repository.delete('target-student');
    expect(queries.map(({ sql }) => sql.match(/^delete from "([^"]+)"/)?.[1]))
      .toEqual(['attendance', 'discipline_incidents', 'behavior_rewards',
        'student_enrollment_placements', 'student_enrollments', 'students']);
    for (const query of queries) {
      expect(query.params).toEqual(['target-student']);
      expect(query.sql).not.toContain('academic_year_id');
    }
    expect(queries[3].sql).toContain('select "id" from "student_enrollments"');
  });

  it('declares the database transaction that rolls back academic cleanup if identity deletion fails', () => {
    expect(getTransactionalMethods(StudentService).some(({ propertyKey }) => propertyKey === 'delete')).toBe(true);
  });
});
