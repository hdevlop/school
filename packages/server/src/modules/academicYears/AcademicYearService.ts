import { Err, Service, Transaction } from '../../najm';
import { canUseOtherAcademicYears, isDateOnly, isValidSchoolYearCalendar, parseSchoolYearLabel } from '@sms/contracts/academic-years';
import { SettingsRepository } from '../settings/SettingsRepository';
import { AcademicYearTransitionService } from '../academicYearTransitions/AcademicYearTransitionService';
import { StudentEnrollmentService } from '../studentEnrollments/StudentEnrollmentService';
import { getBusinessDateOnly } from '../../shared/businessDate';
import { AcademicYearRepository } from './AcademicYearRepository';
import { AcademicYearValidator, canPrepareYears, isActiveYear } from './AcademicYearValidator';
import type { CreateAcademicYearDto } from './AcademicYearDto';

function toOption(year: Awaited<ReturnType<AcademicYearRepository['findById']>>) {
  if (!year) return null;
  return {
    id: year.id,
    label: year.label,
    instructionStartsOn: year.instructionStartsOn,
    instructionEndsOn: year.instructionEndsOn,
    reportingStartsOn: year.reportingStartsOn,
    reportingEndsOn: year.reportingEndsOn,
    paymentCloseoutOn: year.paymentCloseoutOn,
    status: year.status,
    provenance: year.provenance,
  };
}

@Service()
export class AcademicYearService {
  constructor(
    private years: AcademicYearRepository,
    private validator: AcademicYearValidator,
    private settings: SettingsRepository,
    private transitions: AcademicYearTransitionService,
    private enrollments: StudentEnrollmentService,
  ) {}

  async list(role?: string) {
    const [registered, settings] = await Promise.all([
      this.years.list(),
      this.settings.getPublicSettings(),
    ]);
    // Administrators also see draft years; a role that works in the active
    // year only is offered that year alone.
    const years = canPrepareYears(role) ? registered
      : canUseOtherAcademicYears(role) ? registered.filter((year) => year.status !== 'draft').map(toOption)
        : registered.filter((year) => isActiveYear(year, settings)).map(toOption);
    return { activeAcademicYearId: settings?.activeAcademicYearId ?? null, years };
  }

  async getById(id: string, role?: string) {
    const year = await this.validator.requireId(id);
    if (year.status === 'draft' && !canPrepareYears(role)) Err(404, 'Academic year not found');
    if (!canUseOtherAcademicYears(role) && !isActiveYear(year, await this.settings.getPublicSettings())) {
      Err(404, 'Academic year not found');
    }
    return canPrepareYears(role) ? year : toOption(year);
  }

  async create(data: CreateAcademicYearDto, actorId: string) {
    if (await this.years.findByLabel(data.label)) Err(409, 'Academic year already exists');
    await this.validator.ensureCalendarAvailable(data.reportingStartsOn, data.reportingEndsOn);
    return this.years.create({ ...data, status: 'draft', createdBy: actorId, updatedBy: actorId });
  }

  async verifyCalendar(id: string, evidenceNote: string, actorId: string) {
    const year = await this.validator.requireId(id);
    if (!isValidSchoolYearCalendar(year.label, year)) Err(409, 'Stored calendar is invalid');
    return this.years.verifyCalendar(id, evidenceNote, actorId);
  }

  /**
   * Makes the prepared next year the active one. Explicit and administrator
   * only; the viewing selector never calls it. It needs the committed
   * transition from the active year into this one, a verified draft calendar
   * adjacent to the active year, and today inside the year's reporting
   * interval, so records dated today belong to it. Under the transition's
   * locks it moves each student's current class to the new year, opens the
   * year, moves the Settings pointer and records who did it. The previous year
   * stays open until it is closed separately. A repeated request after success
   * changes nothing; financial rollover is a separate operation.
   */
  @Transaction()
  async activate(id: string, actor: { id: string; role?: string }) {
    const target = await this.validator.requireId(id);
    const before = await this.settings.getAdminSettings();
    if (!before?.activeAcademicYearId) Err(409, 'The active year is not registered in Settings');
    if (before!.activeAcademicYearId === target.id) return this.activation(target.id, null, false);

    const sourceId = before!.activeAcademicYearId!;
    const run = await this.transitions.lockCommittedRun(sourceId, target.id);
    // Read again under the lock: another activation may have finished first.
    const settings = await this.settings.getAdminSettings();
    if (settings?.activeAcademicYearId === target.id) return this.activation(target.id, null, false);
    if (settings?.activeAcademicYearId !== sourceId) Err(409, 'The active year changed; review and try again');

    const [source, locked] = await Promise.all([this.validator.requireId(sourceId), this.validator.requireId(target.id)]);
    const sourceLabel = parseSchoolYearLabel(source.label);
    const targetLabel = parseSchoolYearLabel(locked.label);
    if (!sourceLabel || !targetLabel || sourceLabel.endYear !== targetLabel.startYear ||
      source.status !== 'open' || locked.status !== 'draft' || locked.provenance !== 'verified' ||
      !isValidSchoolYearCalendar(locked.label, locked)) {
      Err(409, 'Only the verified draft year that follows the active year can be activated');
    }
    const today = getBusinessDateOnly();
    if (today < locked.reportingStartsOn || today > locked.reportingEndsOn) {
      Err(409, `This year can be activated from ${locked.reportingStartsOn}, the first day it records`);
    }
    const preparedOn = (run.input as { enrolledOn?: unknown } | null)?.enrolledOn;
    if (typeof preparedOn !== 'string' || !isDateOnly(preparedOn) || preparedOn > today) {
      Err(409, 'The prepared student enrollments must start by the activation date');
    }

    const dispositions = (run.outcomes as Array<{ studentId: string; outcome: string }>)
      .filter((item): item is { studentId: string; outcome: 'graduate' | 'withdraw' | 'omit' } =>
        item.outcome === 'graduate' || item.outcome === 'withdraw' || item.outcome === 'omit');
    const students = await this.enrollments.projectActiveYear(source.id, locked.id, dispositions);
    await this.years.setStatus(locked.id, 'open', actor.id);
    if (!await this.settings.switchActiveYear(source.id, { id: locked.id, label: locked.label })) {
      Err(409, 'The active year changed; review and try again');
    }
    await this.years.recordActivation({
      actorId: actor.id,
      actorRole: actor.role ?? 'unknown',
      from: { id: source.id, label: source.label },
      to: { id: locked.id, label: locked.label },
      transitionRunId: run.id,
      businessDate: today,
      students,
    });
    return this.activation(locked.id, source.id, true, run.id, students);
  }

  private async activation(
    yearId: string,
    previousAcademicYearId: string | null,
    changed: boolean,
    transitionRunId: string | null = null,
    students: { placed: number; ended: number } | null = null,
  ) {
    return {
      changed,
      activeAcademicYearId: yearId,
      previousAcademicYearId,
      transitionRunId,
      students,
      year: await this.years.findById(yearId),
    };
  }

  @Transaction()
  async close(id: string, actorId: string) {
    const year = await this.validator.requireId(id);
    const settings = await this.settings.getAdminSettings();
    if (settings?.activeAcademicYearId === year.id || settings?.currentAcademicYear === year.label) {
      Err(409, 'Activate another year before closing this one');
    }
    if (year.status === 'draft') Err(409, 'A draft year cannot be closed');
    return this.years.setStatus(id, 'closed', actorId);
  }
}
