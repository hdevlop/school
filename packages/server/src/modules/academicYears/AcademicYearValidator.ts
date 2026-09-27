import { Err, Service } from '../../najm';
import { canUseOtherAcademicYears, parseSchoolYearLabel, readAcademicYearSelection } from '@sms/contracts/academic-years';
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
  constructor(private years: AcademicYearRepository) {}

  async requireId(id: string) {
    const year = await this.years.findById(id);
    if (!year) Err(404, 'Academic year not found');
    return year!;
  }

  async requireLabel(label: string) {
    const year = await this.years.findByLabel(label);
    if (!year) Err(404, 'Academic year not found');
    return year!;
  }

  /** The registered year whose reporting interval holds the date, if any. */
  async findForDate(date: string) {
    return this.years.findForDate(date);
  }

  async ensureCalendarAvailable(startsOn: string, endsOn: string) {
    const overlap = await this.years.findOverlapping(startsOn, endsOn);
    if (overlap) Err(409, `Reporting interval overlaps ${overlap!.label}`);
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
    if (label !== undefined && !parseSchoolYearLabel(label)) Err(400, 'Invalid academic year');
    return this.permit(await this.years.findWithActivePointer(label === undefined ? undefined : { label }), role);
  }

  /** Check the year carried by a dated record before returning or changing it. */
  async resolveRecord(yearId: string | null | undefined, date: string | null | undefined, role?: string) {
    const found = yearId ? await this.years.findWithActivePointer({ id: yearId })
      : date ? await this.years.findWithActivePointer({ date }) : undefined;
    // A stored year must exist; a date that no registered year holds, or no
    // date at all, leaves the record without a year to check.
    if (yearId || found === null || found?.year) return this.permit(found ?? null, role);
    if (!canUseOtherAcademicYears(role)) Err(403, 'Record has no accessible academic year');
    return null;
  }

  // One rule for every year-scoped read and write: only administrators and
  // accounting work outside the active year (ACADEMIC_YEAR_HISTORY_ROLES).
  private permit(found: FoundYear, role?: string): ResolvedAcademicYear {
    if (!found) Err(409, 'School settings are missing');
    const { year, ...pointer } = found!;
    if (!year) Err(404, 'Academic year not found');
    if (year!.status === 'draft' && !canPrepareYears(role)) Err(404, 'Academic year not found');
    if (!canUseOtherAcademicYears(role) && !isActiveYear(year!, pointer)) {
      Err(403, 'Other school years are open to administrators and accounting only');
    }
    return year!;
  }
}
