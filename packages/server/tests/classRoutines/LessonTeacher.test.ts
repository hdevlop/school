import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { ClassRoutineRepository } from '../../src/modules/classRoutines/ClassRoutineRepository';

// A timetable built or imported with subjects alone names no teacher on its
// lessons. The lesson then belongs to the teacher assigned to the section for
// that subject, both on the class timetable and in the teacher's own week.
function capture() {
  const captured: Array<{ sql: string; params: unknown[] }> = [];
  const repo = new ClassRoutineRepository();
  (repo as any).db = drizzle(async (sql, params) => {
    captured.push({ sql, params });
    return { rows: [] };
  });
  return { captured, repo };
}

const FALLBACK = /coalesce\("teacher_assignments"\."teacher_id", \(\s*select section_assignment\.teacher_id from teacher_assignments section_assignment\s*where section_assignment\.section_id = "routine_schedules"\."section_id"\s*and section_assignment\.subject_id = "routine_entries"\."subject_id"/;

describe('who teaches a lesson', () => {
  it('names the section\'s assigned teacher on a lesson that names none', async () => {
    const { captured, repo } = capture();
    await repo.getEntries('schedule');
    expect(captured[0].sql).toMatch(FALLBACK);
    expect(captured[0].sql).toContain('left join "teachers" on "teachers"."id" = coalesce(');
  });

  it('puts those lessons in the assigned teacher\'s week', async () => {
    const { captured, repo } = capture();
    await repo.getTeacherScheduleIds('teacher', '2026-2027');
    const lessons = captured[0];
    expect(lessons.sql).toMatch(FALLBACK);
    // The lesson's own assignment is optional now: a lesson without one still counts.
    expect(lessons.sql).toContain('left join "teacher_assignments" on "routine_entries"."teacher_assignment_id"');
    expect(lessons.params).toContain('teacher');
    expect(lessons.params).toContain('2026-2027');
  });
});
