import { Err, I18n, Service } from '../../najm';
import { parseSchoolYearLabel } from '@sms/contracts/academic-years';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import type { AcademicYearTransitionRepository } from './AcademicYearTransitionRepository';

type TransitionRun = Awaited<ReturnType<AcademicYearTransitionRepository['findById']>>;

@Service()
export class AcademicYearTransitionValidator {
  @I18n('yearTransitions.errors') private et!: (key: string) => string;
  ensureActiveSource<T extends { activeAcademicYearId: string | null; currentAcademicYear: string | null }>(settings: T | null | undefined, source: ResolvedAcademicYear) {
    if (!settings || settings.activeAcademicYearId !== source.id || settings.currentAcademicYear !== source.label) {
      Err(409, this.et('sourceNotActive'));
    }
    return settings;
  }

  ensureTransitionYears(source: ResolvedAcademicYear, target: ResolvedAcademicYear) {
    const sourceLabel = parseSchoolYearLabel(source.label);
    const targetLabel = parseSchoolYearLabel(target.label);
    if (!sourceLabel || !targetLabel || sourceLabel.endYear !== targetLabel.startYear ||
      source.id === target.id || source.status !== 'open' || target.status !== 'draft' ||
      source.provenance !== 'verified' || target.provenance !== 'verified') {
      Err(409, this.et('yearsNotAdjacent'));
    }
  }

  ensureEnrollmentDate(source: ResolvedAcademicYear, target: ResolvedAcademicYear, date: string) {
    if (date < target.reportingStartsOn || date > target.reportingEndsOn || date <= source.reportingEndsOn) {
      Err(422, this.et('targetDateInvalid'));
    }
  }

  ensureMatchingPayload(run: NonNullable<TransitionRun>, payloadHash: string, targetYearId: string) {
    if (run.payloadHash !== payloadHash || run.targetAcademicYearId !== targetYearId) {
      Err(409, this.et('idempotencyKeyReused'));
    }
  }

  ensureTargetAvailable(run: TransitionRun) {
    if (run) Err(409, this.et('alreadyCommitted'));
  }

  ensurePreviewCurrent(preview: { previewHash: string; commitAvailable: boolean }, expectedHash: string) {
    if (preview.previewHash !== expectedHash) Err(409, this.et('previewStale'));
    if (!preview.commitAvailable) Err(409, this.et('previewHasIssues'));
  }

  ensureRunExists(run: TransitionRun) {
    if (!run) Err(404, this.et('runNotFound'));
    return run;
  }

  ensureCommittedRun(run: TransitionRun, sourceYearId: string) {
    if (!run || run.sourceAcademicYearId !== sourceYearId) {
      Err(409, this.et('commitBeforeActivating'));
    }
    return run;
  }
}
