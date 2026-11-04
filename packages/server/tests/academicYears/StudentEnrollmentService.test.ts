import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { StudentEnrollmentService } from '../../src/modules/studentEnrollments/StudentEnrollmentService';
import { StudentEnrollmentValidator } from '../../src/modules/studentEnrollments/StudentEnrollmentValidator';
import { StudentEnrollmentRepository } from '../../src/modules/studentEnrollments/StudentEnrollmentRepository';
import { withEnglishMessages } from '../support/englishMessages';
import { getBusinessDateOnly } from '../../src/shared/businessDate';

const oldYear = {
  id: 'year-old', label: '2025-2026', reportingStartsOn: '2025-09-01',
  reportingEndsOn: '2026-08-31', status: 'open',
};

function build(activeYearId = 'year-current', legacyProjection = false, yearStatus = 'open') {
  const writes: string[] = [];
  const audits: { actorId: string; actorRole: string }[] = [];
  const enrollment = {
    id: 'enrollment-1', studentId: 'student-1', academicYearId: oldYear.id,
    enrolledOn: '2025-09-01', leftOn: null, status: 'active',
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
    getByStudentAndYear: async (): Promise<typeof enrollment | null> => null,
    getClassAndSection: async (classId: string, sectionId: string) => ({
      classId, sectionId, academicYear: oldYear.label,
    }),
    lockSectionCapacity: async () => ({ name: 'A', maxStudents: 30, academicYear: oldYear.label }),
    sectionPeakOccupancy: async () => 0,
    create: async (data: object) => { writes.push('create-enrollment'); return { ...enrollment, ...data }; },
    addPlacement: async (data: object) => { writes.push('add-placement'); return { id: 'new-placement', ...data }; },
    getById: async () => enrollment,
    getOpenPlacement: async () => current,
    listPlacements: async () => [current],
    correct: async (_id: string, data: any) => {
      writes.push('correct-placement'); Object.assign(current, data.placement); return enrollment;
    },
    hasInvalidDatedRecords: async () => false,
    auditCorrection: async (_id: string, actorId: string, actorRole: string) => {
      writes.push('audit-correction'); audits.push({ actorId, actorRole });
    },
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
  const service = new StudentEnrollmentService(repository as any, years as any, settings as any, migrationIssues as any, withEnglishMessages(new StudentEnrollmentValidator()));
  return { service, writes, audits, repository, current, enrollment, years };
}

describe('placement changes from Edit Student', () => {
  const actor = { id: 'admin-1', role: 'admin' };
  const target = { classId: 'class-other', sectionId: 'section-other' };
  function editable(active = false) {
    const fixture = build(active ? oldYear.id : 'year-current');
    fixture.repository.getByStudentAndYear = async () => fixture.enrollment;
    const today = getBusinessDateOnly();
    const offset = (days: number) => {
      const date = new Date(`${today}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().slice(0, 10);
    };
    const year = active ? { ...oldYear, reportingStartsOn: offset(-7), reportingEndsOn: offset(7) } : oldYear;
    if (active) {
      fixture.enrollment.enrolledOn = year.reportingStartsOn;
      fixture.current.validFrom = year.reportingStartsOn;
      fixture.years.requireId = async () => year;
    }
    Object.defineProperty(fixture.service, 'year', { value: year });
    return fixture;
  }

  it('uses the school business date and preserves the previous current-year placement', async () => {
    const { service, writes } = editable(true);
    const placement = await service.updatePlacementFromProfile('student-1', target, actor);
    expect(placement).toMatchObject({ ...target, validFrom: getBusinessDateOnly(), actorId: actor.id });
    expect(placement.reason).toBeTruthy();
    expect(writes).toEqual(['close-placement', 'add-placement', 'update-current-student']);
  });

  it('corrects repeated moves on the same day without an empty interval', async () => {
    const { service, writes, current } = editable(true);
    current.validFrom = getBusinessDateOnly();
    await service.updatePlacementFromProfile('student-1', target, actor);
    expect(writes).toEqual(['correct-placement', 'audit-correction', 'update-current-student']);
  });

  it('corrects a past-year placement with an automatic audit note and leaves today unchanged', async () => {
    const { service, writes, current } = editable();
    const from = current.validFrom;
    await service.updatePlacementFromProfile('student-1', target, { ...actor, role: 'principal' });
    expect(current).toMatchObject({ ...target, validFrom: from, validTo: null });
    expect(writes).toEqual(['correct-placement', 'audit-correction']);
  });

  it('does nothing when the selected-year placement is unchanged', async () => {
    const { service, writes, current } = editable();
    await service.updatePlacementFromProfile('student-1', current);
    expect(writes).toEqual([]);
  });

  it('lets the registrar transfer a student from Edit Student in the active year', async () => {
    const { service, writes } = editable(true);
    const placement = await service.updatePlacementFromProfile('student-1', target, { id: 'registrar-1', role: 'registrar' });
    expect(placement).toMatchObject({ ...target, actorId: 'registrar-1', validFrom: getBusinessDateOnly() });
    expect(writes).toEqual(['close-placement', 'add-placement', 'update-current-student']);
  });

  it('audits a registrar placement edit repeated on the same day', async () => {
    const { service, writes, audits, current } = editable(true);
    current.validFrom = getBusinessDateOnly();
    await service.updatePlacementFromProfile('student-1', target, { id: 'registrar-1', role: 'registrar' });
    expect(current).toMatchObject(target);
    expect(writes).toEqual(['correct-placement', 'audit-correction', 'update-current-student']);
    expect(audits).toEqual([{ actorId: 'registrar-1', actorRole: 'registrar' }]);
  });

  it('lets the registrar correct only placement in the selected past year', async () => {
    const { service, writes, current, enrollment } = editable();
    const before = { ...enrollment };
    const dates = { validFrom: current.validFrom, validTo: current.validTo };
    await service.updatePlacementFromProfile('student-1', target, { id: 'registrar-1', role: 'registrar' });
    expect(current).toMatchObject({ ...target, ...dates });
    expect(enrollment).toEqual(before);
    expect(writes).toEqual(['correct-placement', 'audit-correction']);
  });

  it('keeps general enrollment correction unavailable to the registrar', async () => {
    const { service, writes, current, enrollment } = editable();
    await expect(service.correct(enrollment.id, {
      enrolledOn: enrollment.enrolledOn, leftOn: null, status: 'active',
      expected: { ...enrollment, status: 'active', placements: [current] },
      placement: { ...current, ...target }, reason: 'Manual correction',
    }, { id: 'registrar-1', role: 'registrar' })).rejects.toThrow();
    expect(writes).toEqual([]);
  });

  it('keeps capacity and dated-record protections for registrar placement edits', async () => {
    const full = editable(true);
    full.repository.sectionPeakOccupancy = async () => 30;
    await expect(full.service.updatePlacementFromProfile('student-1', target, { id: 'registrar-1', role: 'registrar' })).rejects.toThrow('Section A is full');
    expect(full.writes).toEqual([]);
    const conflict = editable();
    conflict.repository.hasInvalidDatedRecords = async () => true;
    await expect(conflict.service.updatePlacementFromProfile('student-1', target, { id: 'registrar-1', role: 'registrar' })).rejects.toThrow('recorded attendance or grades');
    expect(conflict.writes).not.toContain('audit-correction');
  });

  it('resolves an omitted class from the selected-year placement', async () => {
    const { service, current } = editable();
    await service.updatePlacementFromProfile('student-1', { sectionId: target.sectionId }, actor);
    expect(current).toMatchObject({ classId: 'class-old', sectionId: target.sectionId });
  });

  it('keeps role, capacity, enrollment and dated-record protections', async () => {
    for (const denied of [undefined, { id: 'secretary', role: 'secretary' }]) {
      const { service, writes } = editable(true);
      await expect(service.updatePlacementFromProfile('student-1', target, denied)).rejects.toThrow();
      expect(writes).toEqual([]);
    }
    const full = editable(true);
    full.repository.sectionPeakOccupancy = async () => 30;
    await expect(full.service.updatePlacementFromProfile('student-1', target, actor)).rejects.toThrow();
    expect(full.writes).toEqual([]);
    const absent = editable();
    absent.repository.getByStudentAndYear = async () => null;
    await expect(absent.service.updatePlacementFromProfile('student-1', target, actor)).rejects.toThrow();
    expect(absent.writes).toEqual([]);
    const conflict = editable();
    conflict.repository.hasInvalidDatedRecords = async () => true;
    await expect(conflict.service.updatePlacementFromProfile('student-1', target, actor)).rejects.toThrow();
    expect(conflict.writes).not.toContain('audit-correction');
  });
});

describe('dated enrollment writes', () => {
  it('keeps future active-year moves refused while allowing today', () => {
    const validator = withEnglishMessages(new StudentEnrollmentValidator());
    const today = getBusinessDateOnly();
    const next = new Date(`${today}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    expect(() => validator.ensureActiveTransferDate(today, true)).not.toThrow();
    expect(() => validator.ensureActiveTransferDate(next.toISOString().slice(0, 10), true)).toThrow('future');
  });
  it('corrects and audits a same-day move without creating an empty placement interval', async () => {
    const { service, writes } = build(oldYear.id);
    Object.defineProperty(service, 'year', { value: oldYear });
    const moved = await service.transfer('enrollment-1', {
      classId: 'class-other', sectionId: 'section-other', validFrom: '2025-09-01', reason: 'Correct initial class',
    }, 'admin-1', 'admin');
    expect(moved.sectionId).toBe('section-other');
    expect(moved.validFrom).toBe('2025-09-01');
    expect(moved.validTo).toBeNull();
    expect(writes).toEqual(['correct-placement', 'audit-correction', 'update-current-student']);
  });

  it('keeps same-day corrections subject to dated-record and role protections', async () => {
    const fixture = build();
    Object.defineProperty(fixture.service, 'year', { value: oldYear });
    fixture.repository.hasInvalidDatedRecords = async () => true;
    const move = { classId: 'class-other', sectionId: 'section-other', validFrom: '2025-09-01', reason: 'Wrong class' };
    await expect(fixture.service.transfer('enrollment-1', move, 'admin-1', 'admin')).rejects.toThrow();
    expect(fixture.writes).not.toContain('audit-correction');
    const denied = build();
    await expect(denied.service.transfer('enrollment-1', move, 'teacher-1', 'teacher')).rejects.toThrow();
    expect(denied.writes).toEqual([]);
  });

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
    const service = new StudentEnrollmentService(repository as any, {} as any, {} as any, {} as any, withEnglishMessages(new StudentEnrollmentValidator()));
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
