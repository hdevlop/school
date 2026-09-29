import { Err, Service } from '../../najm';
import { parseSchoolYearLabel } from '@sms/contracts/academic-years';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import type { AcademicYearTransitionRepository } from './AcademicYearTransitionRepository';

type TransitionRun = Awaited<ReturnType<AcademicYearTransitionRepository['findById']>>;

@Service()
export class AcademicYearTransitionValidator {
  ensureActiveSource<T extends { activeAcademicYearId: string | null; currentAcademicYear: string | null }>(settings: T | null | undefined, source: ResolvedAcademicYear) {
    if (!settings || settings.activeAcademicYearId !== source.id || settings.currentAcademicYear !== source.label) {
      Err(409, 'The source year must be the active Settings year');
    }
    return settings;
  }

  ensureTransitionYears(source: ResolvedAcademicYear, target: ResolvedAcademicYear) {
    const sourceLabel = parseSchoolYearLabel(source.label);
    const targetLabel = parseSchoolYearLabel(target.label);
    if (!sourceLabel || !targetLabel || sourceLabel.endYear !== targetLabel.startYear ||
      source.id === target.id || source.status !== 'open' || target.status !== 'draft' ||
      source.provenance !== 'verified' || target.provenance !== 'verified') {
      Err(409, 'Transition requires adjacent, verified source and draft target years');
    }
  }

  ensureEnrollmentDate(source: ResolvedAcademicYear, target: ResolvedAcademicYear, date: string) {
    if (date < target.reportingStartsOn || date > target.reportingEndsOn || date <= source.reportingEndsOn) {
      Err(422, 'Target enrollment date must follow the source year and belong to the target year');
    }
  }

  ensureMatchingPayload(run: NonNullable<TransitionRun>, payloadHash: string, targetYearId: string) {
    if (run.payloadHash !== payloadHash || run.targetAcademicYearId !== targetYearId) {
      Err(409, 'Transition idempotency key was used with another payload');
    }
  }

  ensureTargetAvailable(run: TransitionRun) {
    if (run) Err(409, 'Target year already has a committed transition');
  }

  ensurePreviewCurrent(preview: { previewHash: string; commitAvailable: boolean }, expectedHash: string) {
    if (preview.previewHash !== expectedHash) Err(409, 'Transition preview is stale; review the current roster and capacity');
    if (!preview.commitAvailable) Err(409, 'Transition preview has unresolved issues');
  }

  ensureRunExists(run: TransitionRun) {
    if (!run) Err(404, 'Academic-year transition run not found');
    return run;
  }

  ensureCommittedRun(run: TransitionRun, sourceYearId: string) {
    if (!run || run.sourceAcademicYearId !== sourceYearId) {
      Err(409, 'Commit the academic-year transition from the active year before activating this year');
    }
    return run;
  }
}
