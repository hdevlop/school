import { createHash } from 'node:crypto';
import { Err, Service, Transaction } from '../../najm';
import { parseSchoolYearLabel } from '@sms/contracts/academic-years';
import { SectionRepository } from '../sections/SectionRepository';
import { SettingsRepository } from '../settings/SettingsRepository';
import { StudentEnrollmentRepository } from '../studentEnrollments/StudentEnrollmentRepository';
import { AcademicYearMigrationIssueRepository } from '../academicYearMigrationIssues/AcademicYearMigrationIssueRepository';
import { AcademicYearValidator } from '../academicYears/AcademicYearValidator';
import { AcademicYearTransitionRepository } from './AcademicYearTransitionRepository';
import type { CommitAcademicYearTransitionDto, PreviewAcademicYearTransitionDto } from './AcademicYearTransitionDto';

type PreviewIssue = {
  code: string;
  studentId?: string;
  sectionId?: string;
};

function digest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

@Service()
export class AcademicYearTransitionService {
  constructor(
    private years: AcademicYearValidator,
    private settings: SettingsRepository,
    private enrollments: StudentEnrollmentRepository,
    private sections: SectionRepository,
    private migrationIssues: AcademicYearMigrationIssueRepository,
    private runs: AcademicYearTransitionRepository,
  ) {}

  async preview(targetYearId: string, data: PreviewAcademicYearTransitionDto) {
    const [sourceYear, targetYear, settings] = await Promise.all([
      this.years.requireId(data.sourceAcademicYearId),
      this.years.requireId(targetYearId),
      this.settings.getAdminSettings(),
    ]);
    if (!settings || settings.activeAcademicYearId !== sourceYear.id ||
      settings.currentAcademicYear !== sourceYear.label) {
      Err(409, 'The source year must be the active Settings year');
    }
    const sourceLabel = parseSchoolYearLabel(sourceYear.label);
    const targetLabel = parseSchoolYearLabel(targetYear.label);
    if (!sourceLabel || !targetLabel || sourceLabel.endYear !== targetLabel.startYear ||
      sourceYear.id === targetYear.id || sourceYear.status !== 'open' ||
      targetYear.status !== 'draft' || sourceYear.provenance !== 'verified' ||
      targetYear.provenance !== 'verified') {
      Err(409, 'Transition requires adjacent, verified source and draft target years');
    }
    if (data.enrolledOn < targetYear.reportingStartsOn ||
      data.enrolledOn > targetYear.reportingEndsOn ||
      data.enrolledOn <= sourceYear.reportingEndsOn) {
      Err(422, 'Target enrollment date must follow the source year and belong to the target year');
    }

    const [sourceRoster, targetRoster, targetRosterAtDate, targetSections, activeProjections, openMigrationIssueCount] = await Promise.all([
      this.enrollments.listAnnualRoster(sourceYear.id),
      this.enrollments.listAnnualRoster(targetYear.id),
      this.enrollments.listRosterAtDate(targetYear.id, data.enrolledOn),
      this.sections.getByAcademicYear(targetYear.label),
      this.enrollments.listActiveStudentProjections(),
      this.migrationIssues.countOpenForYear(sourceYear.label),
    ]);
    const sourceActive = sourceRoster.filter((record) =>
      record.enrollment.status === 'active' &&
      record.enrollment.enrolledOn <= sourceYear.reportingEndsOn &&
      (record.enrollment.leftOn === null || sourceYear.reportingEndsOn < record.enrollment.leftOn));
    const sourceIds = new Set(sourceActive.map((record) => record.student.id));
    const sourceByStudent = new Map(sourceActive.map((record) => [record.student.id, record]));
    const activeProjectionIds = new Set(activeProjections
      .filter((projection) => projection.classAcademicYear === sourceYear.label)
      .map((projection) => projection.studentId));
    const existingTargetByStudent = new Map(targetRoster.map((record) => [record.student.id, record]));
    const targetBySection = new Map(targetSections.map((section) => [section.id, section]));
    const mappingBySource = new Map(data.mappings.map((mapping) => [mapping.sourceSectionId, mapping]));
    const decisionByStudent = new Map(data.studentDecisions.map((decision) => [decision.studentId, decision]));
    const existingBySection = new Map<string, number>();
    for (const record of targetRosterAtDate) {
      existingBySection.set(record.sectionId,
        (existingBySection.get(record.sectionId) ?? 0) + 1);
    }

    const issues: PreviewIssue[] = [];
    if (sourceActive.length === 0) issues.push({ code: 'empty-source-roster' });
    if (openMigrationIssueCount > 0) issues.push({ code: 'unresolved-source-migration-issues' });
    for (const projection of activeProjections) {
      if (projection.classAcademicYear !== sourceYear.label || !sourceIds.has(projection.studentId)) {
        issues.push({ code: 'active-student-outside-source-roster', studentId: projection.studentId });
      } else {
        const placement = sourceByStudent.get(projection.studentId)?.lastPlacement;
        if (placement && (projection.classId !== placement.classId ||
          projection.sectionId !== placement.sectionId)) {
          issues.push({ code: 'active-student-placement-mismatch', studentId: projection.studentId });
        }
      }
    }
    for (const studentId of sourceIds) {
      if (!activeProjectionIds.has(studentId)) {
        issues.push({ code: 'source-roster-student-not-active-projection', studentId });
      }
    }
    for (const decision of data.studentDecisions) {
      if (!sourceIds.has(decision.studentId)) {
        issues.push({ code: 'decision-student-not-in-source-roster', studentId: decision.studentId });
      }
    }
    const proposedBySection = new Map<string, number>();
    const proposed: Array<{
      studentId: string;
      sourceClassId: string;
      sourceSectionId: string;
      targetClassId: string;
      targetSectionId: string;
      outcome: 'promote' | 'repeat';
    }> = [];
    const dispositions: Array<{ studentId: string; outcome: 'graduate' | 'withdraw' | 'omit' }> = [];
    for (const record of sourceActive) {
      const studentId = record.student.id;
      const placement = record.lastPlacement;
      if (!placement || placement.validFrom > sourceYear.reportingEndsOn ||
        (placement.validTo !== null && sourceYear.reportingEndsOn >= placement.validTo)) {
        issues.push({ code: 'missing-source-end-placement', studentId });
        continue;
      }
      const existingTarget = existingTargetByStudent.get(studentId);
      if (existingTarget) {
        issues.push({ code: 'existing-target-enrollment', studentId,
          sectionId: existingTarget.lastPlacement?.sectionId });
        continue;
      }
      const decision = decisionByStudent.get(studentId);
      if (decision && (decision.outcome === 'graduate' || decision.outcome === 'withdraw' || decision.outcome === 'omit')) {
        dispositions.push({ studentId, outcome: decision.outcome });
        continue;
      }
      const target = decision && 'targetSectionId' in decision
        ? decision : mappingBySource.get(placement.sectionId);
      if (!target) {
        issues.push({ code: 'missing-source-section-mapping', studentId, sectionId: placement.sectionId });
        continue;
      }
      const section = targetBySection.get(target.targetSectionId);
      if (!section || section.classId !== target.targetClassId || section.class.academicYear !== targetYear.label ||
        section.status !== 'active') {
        issues.push({ code: 'invalid-target-section', studentId, sectionId: target.targetSectionId });
        continue;
      }
      proposed.push({
        studentId, sourceClassId: placement.classId, sourceSectionId: placement.sectionId,
        targetClassId: target.targetClassId, targetSectionId: target.targetSectionId,
        outcome: target.outcome,
      });
      proposedBySection.set(target.targetSectionId,
        (proposedBySection.get(target.targetSectionId) ?? 0) + 1);
    }
    const capacity = [...proposedBySection].map(([sectionId, proposedCount]) => {
      const section = targetBySection.get(sectionId)!;
      const existingCount = existingBySection.get(sectionId) ?? 0;
      const limit = section.maxStudents ?? settings.maxClassSize ?? null;
      if (limit === null || limit <= 0 || existingCount + proposedCount > limit) {
        issues.push({ code: limit === null || limit <= 0 ? 'unknown-target-capacity' : 'target-capacity-exceeded', sectionId });
      }
      return { sectionId, existingCount, proposedCount, limit };
    });
    const result = {
      sourceAcademicYear: { id: sourceYear.id, label: sourceYear.label },
      targetAcademicYear: { id: targetYear.id, label: targetYear.label },
      enrolledOn: data.enrolledOn,
      sourceActiveStudents: sourceActive.length,
      proposedEnrollments: proposed.length,
      graduateCount: dispositions.filter((item) => item.outcome === 'graduate').length,
      withdrawalCount: dispositions.filter((item) => item.outcome === 'withdraw').length,
      omittedCount: dispositions.filter((item) => item.outcome === 'omit').length,
      openMigrationIssueCount,
      capacity, proposed, dispositions, issues,
      commitAvailable: issues.length === 0,
    };
    return {
      ...result,
      previewHash: digest({
        input: {
          sourceAcademicYearId: data.sourceAcademicYearId,
          enrolledOn: data.enrolledOn,
          mappings: [...data.mappings].sort((a, b) => a.sourceSectionId.localeCompare(b.sourceSectionId)),
          studentDecisions: [...data.studentDecisions].sort((a, b) => a.studentId.localeCompare(b.studentId)),
        },
        calendars: {
          source: {
            status: sourceYear.status, provenance: sourceYear.provenance,
            reportingStartsOn: sourceYear.reportingStartsOn, reportingEndsOn: sourceYear.reportingEndsOn,
          },
          target: {
            status: targetYear.status, provenance: targetYear.provenance,
            reportingStartsOn: targetYear.reportingStartsOn, reportingEndsOn: targetYear.reportingEndsOn,
          },
        },
        result: {
          ...result,
          proposed: [...result.proposed].sort((a, b) => a.studentId.localeCompare(b.studentId)),
          dispositions: [...result.dispositions].sort((a, b) => a.studentId.localeCompare(b.studentId)),
          capacity: [...result.capacity].sort((a, b) => a.sectionId.localeCompare(b.sectionId)),
          issues: [...result.issues].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
        },
      }),
    };
  }

  @Transaction()
  async commit(targetYearId: string, data: CommitAcademicYearTransitionDto, actorId: string) {
    const payloadHash = digest({ targetYearId, preview: {
      ...data.preview,
      mappings: [...data.preview.mappings].sort((a, b) => a.sourceSectionId.localeCompare(b.sourceSectionId)),
      studentDecisions: [...data.preview.studentDecisions].sort((a, b) => a.studentId.localeCompare(b.studentId)),
    } });
    const prior = await this.runs.findByKey(data.idempotencyKey);
    if (prior) {
      if (prior.payloadHash !== payloadHash || prior.targetAcademicYearId !== targetYearId) {
        Err(409, 'Transition idempotency key was used with another payload');
      }
      return prior;
    }

    await this.runs.lockScope(data.preview.sourceAcademicYearId, targetYearId);
    const afterLock = await this.runs.findByKey(data.idempotencyKey);
    if (afterLock) {
      if (afterLock.payloadHash !== payloadHash || afterLock.targetAcademicYearId !== targetYearId) {
        Err(409, 'Transition idempotency key was used with another payload');
      }
      return afterLock;
    }
    if (await this.runs.findByTarget(targetYearId)) {
      Err(409, 'Target year already has a committed transition');
    }

    const preview = await this.preview(targetYearId, data.preview);
    if (preview.previewHash !== data.expectedPreviewHash) {
      Err(409, 'Transition preview is stale; review the current roster and capacity');
    }
    if (!preview.commitAvailable) {
      Err(409, 'Transition preview has unresolved issues');
    }

    const outcomes: Array<{
      studentId: string;
      outcome: 'promote' | 'repeat' | 'graduate' | 'withdraw' | 'omit';
      enrollmentId: string | null;
      placementId: string | null;
    }> = [];
    for (const item of preview.proposed) {
      const enrollment = await this.enrollments.create({
        studentId: item.studentId,
        academicYearId: targetYearId,
        status: 'active',
        enrolledOn: data.preview.enrolledOn,
        createdBy: actorId,
        updatedBy: actorId,
      });
      const placement = await this.enrollments.addPlacement({
        enrollmentId: enrollment.id,
        classId: item.targetClassId,
        sectionId: item.targetSectionId,
        validFrom: data.preview.enrolledOn,
        reason: item.outcome === 'repeat' ? 'Year transition: repeat' : 'Year transition: promote',
        actorId,
      });
      outcomes.push({
        studentId: item.studentId, outcome: item.outcome,
        enrollmentId: enrollment.id, placementId: placement.id,
      });
    }
    for (const item of preview.dispositions) {
      outcomes.push({ studentId: item.studentId, outcome: item.outcome,
        enrollmentId: null, placementId: null });
    }
    return this.runs.create({
      sourceAcademicYearId: data.preview.sourceAcademicYearId,
      targetAcademicYearId: targetYearId,
      idempotencyKey: data.idempotencyKey,
      payloadHash,
      previewHash: preview.previewHash,
      input: data.preview,
      outcomes,
      createdBy: actorId,
    });
  }

  async getRun(id: string) {
    const run = await this.runs.findById(id);
    if (!run) Err(404, 'Academic-year transition run not found');
    return run;
  }

  // Activation's required preparation: the committed transition from the
  // active year into the target. It takes the commit's locks first, so no
  // enrollment, class or section of either year changes while the year switches.
  async lockCommittedRun(sourceYearId: string, targetYearId: string) {
    await this.runs.lockScope(sourceYearId, targetYearId);
    const run = await this.runs.findByTarget(targetYearId);
    if (!run || run.sourceAcademicYearId !== sourceYearId) {
      Err(409, 'Commit the academic-year transition from the active year before activating this year');
    }
    return run!;
  }
}
