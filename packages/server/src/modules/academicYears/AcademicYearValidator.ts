import { Err, I18n, Service } from '../../najm';
import { canUseOtherAcademicYears, isDateOnly, isValidSchoolYearCalendar, parseSchoolYearLabel, readAcademicYearSelection } from '@sms/contracts/academic-years';
import { AcademicYearRepository } from './AcademicYearRepository';

type ActivePointer = { activeAcademicYearId?: string | null; currentAcademicYear?: string | null } | null | undefined;
type FoundYear = Awaited<ReturnType<AcademicYearRepository['findWithActivePointer']>>;

/** A registered school year a request was resolved to and allowed to use. */
export type ResolvedAcademicYear = NonNullable<Awaited<ReturnType<AcademicYearRepository['findById']>>>;

/** The Settings pointer names the active year; before it is set, its label does. */
export function isActiveYear(year: { id: string; label: string }, settings: ActivePointer) {
  return settings?.activeAcademicYearId
    ? settings.activeAcademicYearId === year.id
    : settings?.currentAcademicYear === year.label;
}

/** Administrators prepare years, so only they see and use drafts. */
export const canPrepareYears = (role?: string) => role === 'admin' || role === 'principal';

/**
 * Owns which school year a request works in and whether its role may. It
 * reads the registry and the Settings pointer in one query and writes
 * nothing; lifecycle changes belong to AcademicYearService.
 */
@Service()
export class AcademicYearValidator {
  @I18n('academicYears.errors') private et!: (key: string, params?: Record<string, unknown>) => string;
  constructor(private years: AcademicYearRepository) {}

  ensureDraftVisible(year: ResolvedAcademicYear, role?: string) {
    if (year.status === 'draft' && !canPrepareYears(role)) Err(404, this.et('notFound'));
  }

  ensureActiveRecord(year: ResolvedAcademicYear, settings: ActivePointer) {
    if (!isActiveYear(year, settings)) Err(404, this.et('notFound'));
  }

  async ensureLabelUnique(label: string) {
    if (await this.years.findByLabel(label)) Err(409, this.et('alreadyExists'));
  }

  ensureValidStoredCalendar(year: ResolvedAcademicYear) {
    if (!isValidSchoolYearCalendar(year.label, year)) Err(409, this.et('invalidCalendar'));
  }

  ensureActivePointer(settings: ActivePointer) {
    if (!settings?.activeAcademicYearId) Err(409, this.et('activeYearNotRegistered'));
    return settings.activeAcademicYearId;
  }

  ensurePointerUnchanged(settings: ActivePointer, sourceId: string) {
    if (settings?.activeAcademicYearId !== sourceId) Err(409, this.et('activeYearChanged'));
  }

  ensureActivationCalendar(source: ResolvedAcademicYear, target: ResolvedAcademicYear) {
    const sourceLabel = parseSchoolYearLabel(source.label);
    const targetLabel = parseSchoolYearLabel(target.label);
    if (!sourceLabel || !targetLabel || sourceLabel.endYear !== targetLabel.startYear ||
      source.status !== 'open' || target.status !== 'draft' || target.provenance !== 'verified' ||
      !isValidSchoolYearCalendar(target.label, target)) {
      Err(409, this.et('onlyNextDraftActivates'));
    }
  }

  ensureActivationDate(year: ResolvedAcademicYear, today: string) {
    if (today < year.reportingStartsOn || today > year.reportingEndsOn) {
      Err(409, this.et('activatableFrom', { date: year.reportingStartsOn }));
    }
  }

  ensurePreparedEnrollmentDate(preparedOn: unknown, today: string) {
    if (typeof preparedOn !== 'string' || !isDateOnly(preparedOn) || preparedOn > today) {
      Err(409, this.et('enrollmentsBeforeActivation'));
    }
  }

  ensureActiveSwitchSucceeded(switched: unknown) {
    if (!switched) Err(409, this.et('activeYearChanged'));
  }

  ensureCanClose(year: ResolvedAcademicYear, settings: ActivePointer) {
    if (settings?.activeAcademicYearId === year.id || settings?.currentAcademicYear === year.label) {
      Err(409, this.et('activateAnotherFirst'));
    }
    if (year.status === 'draft') Err(409, this.et('draftCannotClose'));
  }

  async requireId(id: string) {
    const year = await this.years.findById(id);
    if (!year) Err(404, this.et('notFound'));
    return year!;
  }

  async requireLabel(label: string) {
    const year = await this.years.findByLabel(label);
    if (!year) Err(404, this.et('notFound'));
    return year!;
  }

  /** The registered year whose reporting interval holds the date, if any. */
  async findForDate(date: string) {
    return this.years.findForDate(date);
  }

  async ensureCalendarAvailable(startsOn: string, endsOn: string) {
    const overlap = await this.years.findOverlapping(startsOn, endsOn);
    if (overlap) Err(409, this.et('reportingOverlaps', { label: overlap!.label }));
  }

  /**
   * The year a request selected with the `X-Academic-Year` header and/or the
   * `academicYear` query value; nothing selected means the active year, for
   * every role. Malformed values and a header and query that disagree are
   * refused before any record is read.
   */
  async resolveSelection(input: { header?: unknown; query?: unknown }, role?: string): Promise<ResolvedAcademicYear> {
    const selection = readAcademicYearSelection(input.header, input.query);
    if (selection.ok === false) {
      return Err(400, selection.reason === 'conflict'
        ? 'The academic year header and query value disagree'
        : 'Invalid academic year');
    }
    return this.resolve(selection.label, role);
  }

  /** The year with this label, or the active year without one, if the role may use it. */
  async resolve(label?: string, role?: string): Promise<ResolvedAcademicYear> {
    if (label !== undefined && !parseSchoolYearLabel(label)) Err(400, this.et('invalid'));
    return this.permit(await this.years.findWithActivePointer(label === undefined ? undefined : { label }), role);
  }

  /** Check the year carried by a dated record before returning or changing it. */
  async resolveRecord(yearId: string | null | undefined, date: string | null | undefined, role?: string) {
    const found = yearId ? await this.years.findWithActivePointer({ id: yearId })
      : date ? await this.years.findWithActivePointer({ date }) : undefined;
    // A stored year must exist; a date that no registered year holds, or no
    // date at all, leaves the record without a year to check.
    if (yearId || found === null || found?.year) return this.permit(found ?? null, role);
    if (!canUseOtherAcademicYears(role)) Err(403, this.et('recordHasNoYear'));
    return null;
  }

  // One rule for every year-scoped read and write: only administrators and
  // accounting work outside the active year (ACADEMIC_YEAR_HISTORY_ROLES).
  private permit(found: FoundYear, role?: string): ResolvedAcademicYear {
    if (!found) Err(409, this.et('settingsMissing'));
    const { year, ...pointer } = found!;
    if (!year) Err(404, this.et('notFound'));
    if (year!.status === 'draft' && !canPrepareYears(role)) Err(404, this.et('notFound'));
    if (!canUseOtherAcademicYears(role) && !isActiveYear(year!, pointer)) {
      Err(403, this.et('otherYearsRestricted'));
    }
    return year!;
  }
}
