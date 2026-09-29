import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { StudentEnrollmentService } from '../../src/modules/studentEnrollments/StudentEnrollmentService';
import { StudentEnrollmentValidator } from '../../src/modules/studentEnrollments/StudentEnrollmentValidator';
import { StudentEnrollmentRepository } from '../../src/modules/studentEnrollments/StudentEnrollmentRepository';

const oldYear = {
  id: 'year-old', label: '2025-2026', reportingStartsOn: '2025-09-01',
  reportingEndsOn: '2026-08-31', status: 'open',
};

function build(activeYearId = 'year-current', legacyProjection = false, yearStatus = 'open') {
  const writes: string[] = [];
  const enrollment = {
    id: 'enrollment-1', studentId: 'student-1', academicYearId: oldYear.id,
    enrolledOn: '2025-09-01', leftOn: null,
  };
  const current = {
    id: 'placement-1', enrollmentId: enrollment.id,
    classId: 'class-old', sectionId: 'section-old', validFrom: '2025-09-01', validTo: null,
  };
  const repository = {
    getStudent: async () => legacyProjection
      ? { id: 'student-1', classId: 'legacy-class', sectionId: 'legacy-section',
        classYear: '2024-2025', enrollmentDate: '2024-09-01' }
      : { id: 'student-1' },
    hasRecordedPlacement: async () => false,
    getByStudentAndYear: async () => null,
    getClassAndSection: async (classId: string, sectionId: string) => ({
      classId, sectionId, academicYear: oldYear.label,
    }),
    create: async (data: object) => { writes.push('create-enrollment'); return { ...enrollment, ...data }; },
    addPlacement: async (data: object) => { writes.push('add-placement'); return { id: 'new-placement', ...data }; },
    getById: async () => enrollment,
    getOpenPlacement: async () => current,
    closePlacement: async () => { writes.push('close-placement'); return current; },
    endEnrollment: async () => { writes.push('end-enrollment'); return enrollment; },
    updateCurrentStudent: async () => { writes.push('update-current-student'); },
  };
  const years = {
    requireId: async () => ({ ...oldYear, status: yearStatus }),
    requireLabel: async () => ({ ...oldYear, status: yearStatus }),
  };
  const settings = { getAdminSettings: async () => ({ activeAcademicYearId: activeYearId }) };
  const migrationIssues = { recordUnknownEnrollmentDate: async () => { writes.push('preserve-legacy-placement'); } };
  const service = new StudentEnrollmentService(repository as any, years as any, settings as any, migrationIssues as any, new StudentEnrollmentValidator());
  return { service, writes };
}

describe('dated enrollment writes', () => {
  it('permits trusted demo placement in the selected historical year while ordinary create remains active-only', async () => {
    const { service, writes } = build();
    Object.defineProperty(service, 'year', { value: oldYear });
    expect((await service.resolveSeedStudentPlacement('class-old', 'section-old', '2025-09-01')).id)
      .toBe(oldYear.id);
    await expect(service.resolveNewStudentPlacement('class-old', 'section-old', '2025-09-01')).rejects.toThrow();
    expect(writes).toEqual([]);
  });

  it('rejects out-of-year and draft demo placements before creating accounts or enrollment records', async () => {
    const { service, writes } = build();
    Object.defineProperty(service, 'year', { value: oldYear });
    await expect(service.resolveSeedStudentPlacement('class-old', 'section-old', '2026-09-01')).rejects.toThrow();
    const draft = build('year-current', false, 'draft');
    Object.defineProperty(draft.service, 'year', { value: oldYear });
    await expect(draft.service.resolveSeedStudentPlacement('class-old', 'section-old', '2025-09-01')).rejects.toThrow();
    expect(writes).toEqual([]);
    expect(draft.writes).toEqual([]);
  });

  it('accepts an explicit yearly date for a new student in the active class year', async () => {
    const { service } = build(oldYear.id);
    expect((await service.resolveNewStudentPlacement('class-old', 'section-old', '2025-09-01')).id)
      .toBe(oldYear.id);
  });

  it('rejects new student placement in a nonactive year before any writes', async () => {
    const { service, writes } = build();
    await expect(service.resolveNewStudentPlacement('class-old', 'section-old', '2025-09-01'))
      .rejects.toThrow();
    expect(writes).toEqual([]);
  });

  it('rejects an impossible yearly enrollment date before any writes', async () => {
    const { service, writes } = build(oldYear.id);
    await expect(service.resolveNewStudentPlacement('class-old', 'section-old', '2025-02-30'))
      .rejects.toThrow();
    expect(writes).toEqual([]);
  });

  it('keeps student enrollment writes out of draft years', async () => {
    const { service, writes } = build('year-current', false, 'draft');
    await expect(service.create({
      studentId: 'student-1', academicYearId: oldYear.id,
      classId: 'class-old', sectionId: 'section-old', enrolledOn: '2025-09-01',
    }, 'admin-1')).rejects.toThrow();
    expect(writes).toEqual([]);
  });

  it('creates a past-year placement without changing the active student projection', async () => {
    const { service, writes } = build();
    await service.create({
      studentId: 'student-1', academicYearId: oldYear.id,
      classId: 'class-old', sectionId: 'section-old', enrolledOn: '2025-09-01',
    }, 'admin-1');
    expect(writes).toEqual(['create-enrollment', 'add-placement']);
  });

  it('closes the previous interval before a historical transfer', async () => {
    const { service, writes } = build();
    await service.transfer('enrollment-1', {
      classId: 'class-other', sectionId: 'section-other',
      validFrom: '2026-01-15', reason: 'Section transfer',
    }, 'admin-1');
    expect(writes).toEqual(['close-placement', 'add-placement']);
  });

  it('rejects a transfer outside the year without writing', async () => {
    const { service, writes } = build();
    await expect(service.transfer('enrollment-1', {
      classId: 'class-other', sectionId: 'section-other',
      validFrom: '2026-09-01', reason: 'Invalid date',
    }, 'admin-1')).rejects.toThrow();
    expect(writes).toEqual([]);
  });

  it('updates the compatibility projection only for the active year', async () => {
    const { service, writes } = build(oldYear.id);
    await service.create({
      studentId: 'student-1', academicYearId: oldYear.id,
      classId: 'class-old', sectionId: 'section-old', enrolledOn: '2025-09-01',
    }, 'admin-1');
    expect(writes).toEqual(['create-enrollment', 'add-placement', 'update-current-student']);
  });

  it('records unresolved legacy placement before projecting a new active-year class', async () => {
    const { service, writes } = build(oldYear.id, true);
    await service.create({
      studentId: 'student-1', academicYearId: oldYear.id,
      classId: 'class-old', sectionId: 'section-old', enrolledOn: '2025-09-01',
    }, 'admin-1');
    expect(writes).toEqual([
      'preserve-legacy-placement', 'create-enrollment', 'add-placement', 'update-current-student',
    ]);
  });
});

describe('enrollment history for administrators', () => {
  it('names each year and each placement, and refuses an unknown student first', async () => {
    const calls: string[] = [];
    const repository = {
      getStudent: async (id: string) => (id === 'student-1' ? { id } : null),
      listHistoryByStudent: async () => {
        calls.push('history');
        return [{ id: 'enrollment-1', status: 'active', academicYear: { id: oldYear.id, label: oldYear.label } }];
      },
      listNamedPlacements: async (enrollmentId: string) => {
        calls.push(`placements ${enrollmentId}`);
        return [{ id: 'placement-1', className: 'CE5', sectionName: 'A', validFrom: '2025-09-01', validTo: null }];
      },
    };
    const service = new StudentEnrollmentService(repository as any, {} as any, {} as any, {} as any, new StudentEnrollmentValidator());
    expect<unknown>(await service.listByStudent('student-1')).toEqual([{
      id: 'enrollment-1', status: 'active', academicYear: { id: oldYear.id, label: oldYear.label },
      placements: [{ id: 'placement-1', className: 'CE5', sectionName: 'A', validFrom: '2025-09-01', validTo: null }],
    }]);
    expect(calls).toEqual(['history', 'placements enrollment-1']);
    await expect(service.listByStudent('missing')).rejects.toThrow('Student not found');
  });
});

describe('enrollment history SQL', () => {
  async function statementFor(method: 'listHistoryByStudent' | 'listNamedPlacements', id: string) {
    let captured = { sql: '', params: [] as unknown[] };
    const repo: any = new StudentEnrollmentRepository();
    repo.db = drizzle(async (sql, params) => { captured = { sql, params }; return { rows: [] }; });
    await repo[method](id);
    return captured;
  }

  it('reads one student enrollments with their registered year, newest first', async () => {
    const { sql, params } = await statementFor('listHistoryByStudent', 'student-1');
    expect(sql).toContain('inner join "academic_years" on "student_enrollments"."academic_year_id" = "academic_years"."id"');
    expect(sql).toContain('where "student_enrollments"."student_id" = $1 order by "academic_years"."reporting_starts_on" desc');
    expect(params).toEqual(['student-1']);
  });

  it('names each placement class and section, newest first', async () => {
    const { sql, params } = await statementFor('listNamedPlacements', 'enrollment-1');
    expect(sql).toContain('inner join "classes"');
    expect(sql).toContain('inner join "sections"');
    expect(sql).toContain('where "student_enrollment_placements"."enrollment_id" = $1 order by "student_enrollment_placements"."valid_from" desc');
    expect(params).toEqual(['enrollment-1']);
  });
});
