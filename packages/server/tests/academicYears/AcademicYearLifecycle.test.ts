import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { getGuardMetadata } from 'najm-guard';
import { AcademicYearService } from '../../src/modules/academicYears/AcademicYearService';
import { AcademicYearValidator } from '../../src/modules/academicYears/AcademicYearValidator';
import { AcademicYearController } from '../../src/modules/academicYears/AcademicYearController';
import { StudentEnrollmentService } from '../../src/modules/studentEnrollments/StudentEnrollmentService';
import { StudentEnrollmentValidator } from '../../src/modules/studentEnrollments/StudentEnrollmentValidator';
import { createAcademicYearDto } from '../../src/modules/academicYears/AcademicYearDto';
import { withEnglishMessages } from '../support/englishMessages';

const activeYear = {
  id: 'year-2026', label: '2026-2027', status: 'open', provenance: 'verified',
  instructionStartsOn: '2026-09-01', instructionEndsOn: '2027-06-30',
  reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-08-31', paymentCloseoutOn: '2027-08-31',
};
const nextYear = {
  id: 'year-2027', label: '2027-2028', status: 'draft', provenance: 'verified',
  instructionStartsOn: '2027-09-01', instructionEndsOn: '2028-06-30',
  reportingStartsOn: '2027-09-01', reportingEndsOn: '2028-08-31', paymentCloseoutOn: '2028-08-31',
};
const admin = { id: 'admin-1', role: 'admin' };

const run = {
  id: 'run-1', sourceAcademicYearId: activeYear.id, targetAcademicYearId: nextYear.id,
  input: { enrolledOn: '2027-09-01' },
  outcomes: [
    { studentId: 'student-1', outcome: 'promote', enrollmentId: 'e-1', placementId: 'p-1' },
    { studentId: 'student-2', outcome: 'graduate', enrollmentId: null, placementId: null },
    { studentId: 'student-3', outcome: 'omit', enrollmentId: null, placementId: null },
  ],
};

function harness(input: {
  target?: Record<string, unknown>;
  pointer?: string | null;
  pointerAfterLock?: string | null;
  run?: typeof run | null;
  switchFails?: boolean;
} = {}) {
  const writes: unknown[] = [];
  const target = { ...nextYear, ...input.target };
  let pointer = input.pointer === undefined ? activeYear.id : input.pointer;
  let reads = 0;
  const years: Record<string, any> = { [activeYear.id]: activeYear, [nextYear.id]: target };
  const service = new AcademicYearService(
    {
      findById: async (id: string) => years[id],
      setStatus: async (id: string, status: string, actorId: string) => { writes.push(['status', id, status, actorId]); },
      recordActivation: async (entry: unknown) => { writes.push(['audit', entry]); },
    } as any,
    Object.assign(withEnglishMessages(new AcademicYearValidator({} as any)), { requireId: async (id: string) => years[id] }),
    {
      getAdminSettings: async () => {
        reads++;
        if (reads > 1 && input.pointerAfterLock !== undefined) pointer = input.pointerAfterLock;
        return { activeAcademicYearId: pointer, currentAcademicYear: pointer ? years[pointer]?.label : '2026-2027' };
      },
      switchActiveYear: async (from: string, to: { id: string; label: string }) => {
        writes.push(['pointer', from, to.id, to.label]);
        return input.switchFails ? null : { id: 'settings-1' };
      },
    } as any,
    {
      lockCommittedRun: async (source: string, targetId: string) => {
        writes.push(['lock', source, targetId]);
        const committed = input.run === undefined ? run : input.run;
        if (!committed) throw new Error('Commit the academic-year transition from the active year before activating this year');
        return committed;
      },
    } as any,
    {
      projectActiveYear: async (source: string, targetId: string, dispositions: unknown) => {
        writes.push(['project', source, targetId, dispositions]);
        return { placed: 1, ended: 2 };
      },
    } as any,
  );
  return { service, writes };
}

describe('academic-year activation', () => {
  const businessDate = process.env.APP_BUSINESS_DATE;

  beforeEach(() => {
    process.env.APP_BUSINESS_DATE = '2027-09-01';
  });

  afterEach(() => {
    if (businessDate === undefined) delete process.env.APP_BUSINESS_DATE;
    else process.env.APP_BUSINESS_DATE = businessDate;
  });

  it('switches the prepared year under the transition locks and records who did it', async () => {
    const { service, writes } = harness();
    const result = await service.activate(nextYear.id, admin);
    expect(writes).toEqual([
      ['lock', activeYear.id, nextYear.id],
      // Only students without a place in the new year take an outcome status.
      ['project', activeYear.id, nextYear.id, [
        { studentId: 'student-2', outcome: 'graduate', enrollmentId: null, placementId: null },
        { studentId: 'student-3', outcome: 'omit', enrollmentId: null, placementId: null },
      ]],
      ['status', nextYear.id, 'open', 'admin-1'],
      ['pointer', activeYear.id, nextYear.id, nextYear.label],
      ['audit', {
        actorId: 'admin-1', actorRole: 'admin',
        from: { id: activeYear.id, label: activeYear.label },
        to: { id: nextYear.id, label: nextYear.label },
        transitionRunId: 'run-1', businessDate: '2027-09-01', students: { placed: 1, ended: 2 },
      }],
    ]);
    expect(result).toMatchObject({
      changed: true, activeAcademicYearId: nextYear.id, previousAcademicYearId: activeYear.id,
      transitionRunId: 'run-1', students: { placed: 1, ended: 2 },
    });
  });

  it('needs the committed transition from the active year and changes nothing without it', async () => {
    const { service, writes } = harness({ run: null });
    await expect(service.activate(nextYear.id, admin)).rejects.toThrow('Commit the academic-year transition');
    expect(writes).toEqual([['lock', activeYear.id, nextYear.id]]);
  });

  it('waits for the first day the new year records', async () => {
    process.env.APP_BUSINESS_DATE = '2027-08-31';
    const { service, writes } = harness();
    await expect(service.activate(nextYear.id, admin)).rejects.toThrow('can be activated from 2027-09-01');
    expect(writes).toEqual([['lock', activeYear.id, nextYear.id]]);
  });

  it('does not project future transition placements into the current class', async () => {
    const { service, writes } = harness({ run: { ...run, input: { enrolledOn: '2027-10-01' } } });
    await expect(service.activate(nextYear.id, admin)).rejects.toThrow('must start by the activation date');
    expect(writes).toEqual([['lock', activeYear.id, nextYear.id]]);
  });

  it('refuses a transition run without a valid enrollment date', async () => {
    const { service, writes } = harness({ run: { ...run, input: { enrolledOn: '2027-02-30' } } });
    await expect(service.activate(nextYear.id, admin)).rejects.toThrow('must start by the activation date');
    expect(writes).toEqual([['lock', activeYear.id, nextYear.id]]);
  });

  it('activates only the verified draft year that follows the active year', async () => {
    const refused = [
      { provenance: 'assumed' },
      { status: 'open' },
      { status: 'closed' },
      { label: '2028-2029' },
    ];
    for (const target of refused) {
      const { service, writes } = harness({ target });
      await expect(service.activate(nextYear.id, admin)).rejects.toThrow('Only the verified draft year');
      expect(writes).toEqual([['lock', activeYear.id, nextYear.id]]);
    }
  });

  it('answers a repeated request after success without changing anything', async () => {
    const { service, writes } = harness({ pointer: nextYear.id });
    expect(await service.activate(nextYear.id, admin)).toMatchObject({ changed: false, activeAcademicYearId: nextYear.id });
    expect(writes).toEqual([]);
  });

  it('lets only one of two concurrent activations switch the year', async () => {
    // The second request passed the first check, then waited on the locks
    // while the first switched the year.
    const { service, writes } = harness({ pointerAfterLock: nextYear.id });
    expect(await service.activate(nextYear.id, admin)).toMatchObject({ changed: false });
    expect(writes).toEqual([['lock', activeYear.id, nextYear.id]]);
  });

  it('refuses when the active year moved elsewhere while it waited', async () => {
    const { service, writes } = harness({ pointerAfterLock: 'year-other' });
    await expect(service.activate(nextYear.id, admin)).rejects.toThrow('The active year changed');
    expect(writes).toEqual([['lock', activeYear.id, nextYear.id]]);
  });

  it('refuses when the Settings pointer no longer holds the year it checked', async () => {
    const { service, writes } = harness({ switchFails: true });
    await expect(service.activate(nextYear.id, admin)).rejects.toThrow('The active year changed');
    // The transaction rolls back the projection and status written before it.
    expect(writes.map((write) => (write as unknown[])[0])).toEqual(['lock', 'project', 'status', 'pointer']);
  });

  it('refuses without a registered active year', async () => {
    const { service, writes } = harness({ pointer: null });
    await expect(service.activate(nextYear.id, admin)).rejects.toThrow('The active year is not registered');
    expect(writes).toEqual([]);
  });

  it('keeps the activate route to administrators and principals', () => {
    const roles = getGuardMetadata(AcademicYearController, 'activate')
      .filter((guard) => guard.guardClass?.name === 'RoleGuard')
      .map((guard) => [...[].concat(guard.params)].sort());
    expect(roles).toEqual([['admin', 'principal']]);
  });
});

describe('current class after activation', () => {
  type Record = {
    student: { id: string };
    enrollment: { status: string; leftOn: string | null };
    lastPlacement: { classId: string; sectionId: string } | null;
  };

  function enrollmentService(source: Record[], target: Record[]) {
    const writes: unknown[] = [];
    const service = new StudentEnrollmentService(
      {
        listAnnualRoster: async (yearId: string) => yearId === 'source' ? source : target,
        updateCurrentStudent: async (...args: unknown[]) => { writes.push(['place', ...args]); },
        updateCurrentStudentStatus: async (...args: unknown[]) => { writes.push(['status', ...args]); },
      } as any,
      {} as any, {} as any, {} as any, withEnglishMessages(new StudentEnrollmentValidator()),
    );
    return { service, writes };
  }

  const enrolled = (id: string, status = 'active', leftOn: string | null = null): Record => ({
    student: { id },
    enrollment: { status, leftOn },
    lastPlacement: { classId: `class-${id}`, sectionId: `section-${id}` },
  });

  it('gives each student enrolled in the new year that enrollment\'s latest class, section and status', async () => {
    const { service, writes } = enrollmentService(
      [enrolled('a'), enrolled('b')],
      [enrolled('a'), enrolled('b', 'withdrawn', '2027-09-10')],
    );
    expect(await service.projectActiveYear('source', 'target', [])).toEqual({ placed: 2, ended: 0 });
    expect(writes).toEqual([
      ['place', 'a', 'class-a', 'section-a', 'active'],
      ['place', 'b', 'class-b', 'section-b', 'inactive'],
    ]);
  });

  it('marks students the transition graduated, withdrew or left out, keeping their last class', async () => {
    const { service, writes } = enrollmentService(
      [enrolled('a'), enrolled('b'), enrolled('c'), enrolled('d')],
      [enrolled('a')],
    );
    const result = await service.projectActiveYear('source', 'target', [
      { studentId: 'b', outcome: 'graduate' },
      { studentId: 'c', outcome: 'withdraw' },
      { studentId: 'd', outcome: 'omit' },
    ]);
    expect(result).toEqual({ placed: 1, ended: 3 });
    expect(writes).toEqual([
      ['place', 'a', 'class-a', 'section-a', 'active'],
      ['status', 'b', 'graduated'],
      ['status', 'c', 'inactive'],
      ['status', 'd', 'inactive'],
    ]);
  });

  it('refuses the switch before any change when a student still enrolled has no place or outcome', async () => {
    // Admitted to the active year after the transition was committed.
    const { service, writes } = enrollmentService(
      [enrolled('a'), enrolled('late'), enrolled('left', 'withdrawn', '2027-03-01')],
      [enrolled('a')],
    );
    await expect(service.projectActiveYear('source', 'target', [])).rejects.toThrow('1 student(s) of the active year have no enrollment or outcome');
    expect(writes).toEqual([]);
  });

  it('refuses the switch before any change when a target enrollment has no placement', async () => {
    const { service, writes } = enrollmentService(
      [enrolled('a'), enrolled('b')],
      [enrolled('a'), { ...enrolled('b'), lastPlacement: null }],
    );
    await expect(service.projectActiveYear('source', 'target', [])).rejects.toThrow('1 student(s) of the new year have no placement');
    expect(writes).toEqual([]);
  });
});

describe('year calendar checks', () => {
  const calendar = {
    instructionStartsOn: nextYear.instructionStartsOn, instructionEndsOn: nextYear.instructionEndsOn,
    reportingStartsOn: nextYear.reportingStartsOn, reportingEndsOn: nextYear.reportingEndsOn,
    paymentCloseoutOn: nextYear.paymentCloseoutOn,
  };

  it('accepts a valid new year and refuses an impossible calendar', () => {
    const body = { label: nextYear.label, ...calendar, provenance: 'verified', provenanceNote: 'Ministry calendar 2027-2028' };
    expect(createAcademicYearDto.safeParse(body).success).toBe(true);
    expect(createAcademicYearDto.safeParse({ ...body, paymentCloseoutOn: '2028-06-29' }).success).toBe(false);
  });

  it('verifies a stored calendar, whose record also carries its label and status', async () => {
    const verified: unknown[] = [];
    const service = new AcademicYearService(
      { verifyCalendar: async (...args: unknown[]) => { verified.push(args); return { ...nextYear }; } } as any,
      Object.assign(withEnglishMessages(new AcademicYearValidator({} as any)), { requireId: async () => ({ ...nextYear, provenance: 'assumed', provenanceNote: null, createdBy: null }) }) as any,
      {} as any, {} as any, {} as any,
    );
    await service.verifyCalendar(nextYear.id, 'Ministry calendar 2027-2028', 'admin-1');
    expect(verified).toEqual([[nextYear.id, 'Ministry calendar 2027-2028', 'admin-1']]);
  });
});

describe('years offered to each role', () => {
  const closedYear = { ...activeYear, id: 'year-2025', label: '2025-2026', status: 'closed',
    reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31' };
  const registered = [closedYear, activeYear, nextYear];
  const service = new AcademicYearService(
    { list: async () => registered } as any,
    Object.assign(withEnglishMessages(new AcademicYearValidator({} as any)), { requireId: async (id: string) => registered.find((year) => year.id === id) }) as any,
    { getPublicSettings: async () => ({ activeAcademicYearId: activeYear.id, currentAcademicYear: activeYear.label }) } as any,
    {} as any, {} as any,
  );
  const labels = async (role: string) => (await service.list(role)).years.map((year: any) => year.label);

  it('lists drafts to administrators, past years to accounting, and the active year alone to everyone else', async () => {
    expect(await labels('admin')).toEqual(['2025-2026', '2026-2027', '2027-2028']);
    expect(await labels('principal')).toEqual(['2025-2026', '2026-2027', '2027-2028']);
    expect(await labels('accounting')).toEqual(['2025-2026', '2026-2027']);
    for (const role of ['teacher', 'parent', 'student', 'secretary']) expect(await labels(role)).toEqual(['2026-2027']);
  });

  it('shows another year record only to administrators and accounting', async () => {
    expect(await service.getById(closedYear.id, 'accounting')).toMatchObject({ label: '2025-2026' });
    expect(await service.getById(activeYear.id, 'teacher')).toMatchObject({ label: '2026-2027' });
    await expect(service.getById(closedYear.id, 'teacher')).rejects.toThrow('Academic year not found');
    await expect(service.getById(nextYear.id, 'accounting')).rejects.toThrow('Academic year not found');
  });
});
