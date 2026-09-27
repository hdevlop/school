import { describe, expect, it } from 'bun:test';
import { AcademicYearTransitionService } from '../../src/modules/academicYearTransitions/AcademicYearTransitionService';
import { previewAcademicYearTransitionDto } from '../../src/modules/academicYearTransitions/AcademicYearTransitionDto';

const sourceYear = {
  id: 'year-old', label: '2025-2026', status: 'open', provenance: 'verified',
  reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31',
};
const targetYear = {
  id: 'year-new', label: '2026-2027', status: 'draft', provenance: 'verified',
  reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-08-31',
};

function sourceRecord(studentId: string, sectionId = 'section-old') {
  return {
    student: { id: studentId },
    enrollment: { status: 'active', enrolledOn: '2025-09-01', leftOn: null },
    lastPlacement: {
      classId: 'class-old', sectionId, validFrom: '2025-09-01', validTo: null,
    },
  };
}

function harness(input: {
  source?: ReturnType<typeof sourceRecord>[];
  target?: ReturnType<typeof sourceRecord>[];
  targetAtDate?: Array<{ studentId: string; sectionId: string }>;
  capacity?: number;
  openIssues?: number;
  targetProvenance?: string;
  activeProjections?: Array<{ studentId: string; classAcademicYear: string; classId: string; sectionId: string }>;
} = {}) {
  const source = input.source ?? [sourceRecord('student-1'), sourceRecord('student-2')];
  const target = input.target ?? [];
  const writes: string[] = [];
  let run: any = null;
  const service = new AcademicYearTransitionService(
    { requireId: async (id: string) => id === sourceYear.id ? sourceYear : { ...targetYear, provenance: input.targetProvenance ?? 'verified' } } as any,
    { getAdminSettings: async () => ({
      activeAcademicYearId: sourceYear.id, currentAcademicYear: sourceYear.label, maxClassSize: 30,
    }) } as any,
    {
      listAnnualRoster: async (id: string) => id === sourceYear.id ? source : target,
      listRosterAtDate: async () => input.targetAtDate ?? target
        .filter((record) => record.lastPlacement)
        .map((record) => ({ studentId: record.student.id, sectionId: record.lastPlacement!.sectionId })),
      listActiveStudentProjections: async () => input.activeProjections ?? source.map((record) => ({
        studentId: record.student.id, classAcademicYear: sourceYear.label,
        classId: record.lastPlacement?.classId ?? 'class-old',
        sectionId: record.lastPlacement?.sectionId ?? 'section-old',
      })),
      create: async (data: any) => {
        writes.push(`enrollment:${data.studentId}`);
        return { ...data, id: `enrollment-${data.studentId}` };
      },
      addPlacement: async (data: any) => {
        writes.push(`placement:${data.enrollmentId}`);
        return { ...data, id: `placement-${data.enrollmentId}` };
      },
    } as any,
    { getByAcademicYear: async () => [{
      id: 'section-new', classId: 'class-new', class: { academicYear: targetYear.label },
      status: 'active', maxStudents: input.capacity ?? 30,
    }] } as any,
    { countOpenForYear: async () => input.openIssues ?? 0 } as any,
    {
      findByKey: async (key: string) => run?.idempotencyKey === key ? run : null,
      findByTarget: async (id: string) => run?.targetAcademicYearId === id ? run : null,
      lockScope: async () => { writes.push('lock'); },
      create: async (data: any) => {
        writes.push('run');
        run = { ...data, id: 'run-1' };
        return run;
      },
    } as any,
  );
  return { service, writes };
}

function build(input: Parameters<typeof harness>[0] = {}) {
  return harness(input).service;
}

const input = {
  sourceAcademicYearId: sourceYear.id,
  enrolledOn: '2026-09-01',
  mappings: [{
    sourceSectionId: 'section-old', targetClassId: 'class-new',
    targetSectionId: 'section-new', outcome: 'promote' as const,
  }],
  studentDecisions: [{ studentId: 'student-2', outcome: 'graduate' as const }],
};

describe('academic transition preview', () => {
  it('shows explicit promotion and graduation without writing or activating', async () => {
    const result = await build().preview(targetYear.id, input);
    expect(result.proposed.map((item) => item.studentId)).toEqual(['student-1']);
    expect(result.graduateCount).toBe(1);
    expect(result.issues).toEqual([]);
    expect(result.commitAvailable).toBe(true);
    expect(result.previewHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('reports missing source placement instead of silently dropping a student', async () => {
    const missing = { ...sourceRecord('student-2'), lastPlacement: null };
    const result = await build({ source: [sourceRecord('student-1'), missing] as any })
      .preview(targetYear.id, input);
    expect(result.issues).toContainEqual({ code: 'missing-source-end-placement', studentId: 'student-2' });
    expect(result.proposedEnrollments).toBe(1);
  });

  it('reports capacity and existing target enrollment conflicts', async () => {
    const existing = sourceRecord('student-2', 'section-new');
    existing.enrollment.enrolledOn = '2026-09-01';
    existing.lastPlacement.validFrom = '2026-09-01';
    const result = await build({ target: [existing], capacity: 1 })
      .preview(targetYear.id, { ...input, studentDecisions: [] });
    expect(result.issues).toContainEqual({
      code: 'existing-target-enrollment', studentId: 'student-2', sectionId: 'section-new',
    });
    expect(result.issues).toContainEqual({ code: 'target-capacity-exceeded', sectionId: 'section-new' });
  });

  it('counts target seats on the requested date despite a later placement', async () => {
    const result = await build({
      targetAtDate: [{ studentId: 'other-student', sectionId: 'section-new' }],
      capacity: 1,
    }).preview(targetYear.id, input);
    expect(result.capacity).toEqual([{
      sectionId: 'section-new', existingCount: 1, proposedCount: 1, limit: 1,
    }]);
    expect(result.issues).toContainEqual({ code: 'target-capacity-exceeded', sectionId: 'section-new' });
  });

  it('requires reviewed calendars before preparing a transition', async () => {
    await expect(build({ targetProvenance: 'assumed' }).preview(targetYear.id, input)).rejects.toThrow();
  });

  it('flags an active legacy student missing from the dated source roster', async () => {
    const result = await build({ activeProjections: [
      { studentId: 'student-1', classAcademicYear: sourceYear.label, classId: 'class-old', sectionId: 'section-old' },
      { studentId: 'legacy-student', classAcademicYear: sourceYear.label, classId: 'class-old', sectionId: 'section-old' },
    ] }).preview(targetYear.id, input);
    expect(result.issues).toContainEqual({
      code: 'active-student-outside-source-roster', studentId: 'legacy-student',
    });
  });

  it('flags a dated source enrollment missing from the active profile projection', async () => {
    const result = await build({ activeProjections: [
      { studentId: 'student-1', classAcademicYear: sourceYear.label, classId: 'class-old', sectionId: 'section-old' },
    ] }).preview(targetYear.id, input);
    expect(result.issues).toContainEqual({
      code: 'source-roster-student-not-active-projection', studentId: 'student-2',
    });
  });

  it('blocks a source profile that disagrees with its dated end placement', async () => {
    const result = await build({ activeProjections: [
      { studentId: 'student-1', classAcademicYear: sourceYear.label, classId: 'class-old', sectionId: 'other-section' },
      { studentId: 'student-2', classAcademicYear: sourceYear.label, classId: 'class-old', sectionId: 'section-old' },
    ] }).preview(targetYear.id, input);
    expect(result.issues).toContainEqual({ code: 'active-student-placement-mismatch', studentId: 'student-1' });
    expect(result.commitAvailable).toBe(false);
  });

  it('rejects duplicate source mappings and student decisions at the DTO boundary', () => {
    expect(previewAcademicYearTransitionDto.safeParse({
      ...input, mappings: [...input.mappings, ...input.mappings],
    }).success).toBe(false);
    expect(previewAcademicYearTransitionDto.safeParse({
      ...input, studentDecisions: [...input.studentDecisions, ...input.studentDecisions],
    }).success).toBe(false);
  });
});

describe('academic transition commit', () => {
  it('prepares target placements once and preserves source projection and Settings', async () => {
    const { service, writes } = harness();
    const preview = await service.preview(targetYear.id, input);
    const body = { preview: input, expectedPreviewHash: preview.previewHash,
      idempotencyKey: 'd11a7ab7-d759-49ce-a5f7-0e295e734b12' };
    const first = await service.commit(targetYear.id, body, 'admin-1');
    const retry = await service.commit(targetYear.id, body, 'admin-1');
    expect(retry.id).toBe(first.id);
    expect(first.input).toEqual(input);
    expect(first.outcomes).toEqual([
      { studentId: 'student-1', outcome: 'promote', enrollmentId: 'enrollment-student-1',
        placementId: 'placement-enrollment-student-1' },
      { studentId: 'student-2', outcome: 'graduate', enrollmentId: null, placementId: null },
    ]);
    expect(writes).toEqual(['lock', 'enrollment:student-1',
      'placement:enrollment-student-1', 'run']);
  });

  it('rejects a stale preview before any enrollment write', async () => {
    const { service, writes } = harness();
    await expect(service.commit(targetYear.id, {
      preview: input, expectedPreviewHash: '0'.repeat(64),
      idempotencyKey: '96fc93b1-1b7a-41f6-aa8d-86279127a3f6',
    }, 'admin-1')).rejects.toThrow();
    expect(writes).toEqual(['lock']);
  });

  it('rejects unresolved source issues before any enrollment write', async () => {
    const { service, writes } = harness({ openIssues: 1 });
    const preview = await service.preview(targetYear.id, input);
    expect(preview.commitAvailable).toBe(false);
    await expect(service.commit(targetYear.id, {
      preview: input, expectedPreviewHash: preview.previewHash,
      idempotencyKey: '8d6bdfe0-695e-4124-9482-1fe91ca895ab',
    }, 'admin-1')).rejects.toThrow();
    expect(writes).toEqual(['lock']);
  });

  it('rejects reuse of a key with a different decision', async () => {
    const { service } = harness();
    const preview = await service.preview(targetYear.id, input);
    const idempotencyKey = '650b748e-27e8-4e40-826c-7a69f08ee493';
    await service.commit(targetYear.id, {
      preview: input, expectedPreviewHash: preview.previewHash, idempotencyKey,
    }, 'admin-1');
    await expect(service.commit(targetYear.id, {
      preview: { ...input, studentDecisions: [] },
      expectedPreviewHash: preview.previewHash, idempotencyKey,
    }, 'admin-1')).rejects.toThrow();
  });

  it('rejects a second run for the same target under another key', async () => {
    const { service, writes } = harness();
    const preview = await service.preview(targetYear.id, input);
    await service.commit(targetYear.id, {
      preview: input, expectedPreviewHash: preview.previewHash,
      idempotencyKey: 'af4d5318-0c33-4365-b3a8-285b8c0d4ad1',
    }, 'admin-1');
    await expect(service.commit(targetYear.id, {
      preview: input, expectedPreviewHash: preview.previewHash,
      idempotencyKey: '41b409cb-dd2d-49f5-8f1c-f6861f68c294',
    }, 'admin-1')).rejects.toThrow();
    expect(writes.filter((entry) => entry === 'run')).toHaveLength(1);
  });
});
