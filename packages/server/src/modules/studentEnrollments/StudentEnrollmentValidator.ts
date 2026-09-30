import { Err, I18n, Service } from '../../najm';
import { getBusinessDateOnly } from '../../shared/businessDate';
import { isDateOnly } from '@sms/contracts/academic-years';
import type { CorrectEnrollmentDto } from './StudentEnrollmentDto';

type YearInterval = { id: string; status: string; reportingStartsOn: string; reportingEndsOn: string };

@Service()
export class StudentEnrollmentValidator {
  @I18n('enrollments.errors') private et!: (key: string, params?: Record<string, unknown>) => string;
  ensureSelectedYear(recordYearId: string, selectedYearId: string) {
    if (recordYearId !== selectedYearId) Err(404, this.et('notFoundInYear'));
  }

  ensureCorrectionAllowed(role: string) {
    if (role !== 'admin' && role !== 'principal') Err(403, this.et('correctionRequiresAdmin'));
  }

  ensureCorrection(
    enrollment: { enrolledOn: string; leftOn: string | null; status: string },
    placements: CorrectEnrollmentDto['expected']['placements'], data: CorrectEnrollmentDto,
    year: YearInterval, admissionDate: string | null,
  ) {
    const state = (rows: typeof placements) => rows.map(({ id, classId, sectionId, validFrom, validTo }) =>
      ({ id, classId, sectionId, validFrom, validTo })).sort((a, b) => a.id.localeCompare(b.id));
    if (enrollment.enrolledOn !== data.expected.enrolledOn || enrollment.leftOn !== data.expected.leftOn ||
      enrollment.status !== data.expected.status || JSON.stringify(state(placements)) !== JSON.stringify(state(data.expected.placements))) {
      Err(409, this.et('changedReload'));
    }
    this.ensurePlacementYear(year.status);
    this.ensureEnrollmentInYear(data.enrolledOn, year);
    this.ensureAdmissionDate(data.enrolledOn, admissionDate);
    if ((data.status === 'active') !== (data.leftOn === null)) Err(422, this.et('statusEndDateMismatch'));
    if (data.leftOn) this.ensureEndDate(data.leftOn, data.enrolledOn, year);
    if (!placements.some((p) => p.id === data.placement.id)) Err(404, this.et('placementNotFound'));
    const next = placements.map((p) => p.id === data.placement.id ? data.placement : p)
      .sort((a, b) => a.validFrom.localeCompare(b.validFrom));
    const yearEnd = new Date(`${year.reportingEndsOn}T00:00:00Z`);
    yearEnd.setUTCDate(yearEnd.getUTCDate() + 1);
    const end = data.leftOn ?? yearEnd.toISOString().slice(0, 10);
    for (let i = 0; i < next.length; i++) {
      const p = next[i];
      if (p.validFrom < data.enrolledOn || p.validFrom > year.reportingEndsOn ||
        (p.validTo && (p.validTo <= p.validFrom || p.validTo > end)) ||
        (data.leftOn && !p.validTo) || (i > 0 && (!next[i - 1].validTo || next[i - 1].validTo! > p.validFrom))) {
        Err(422, this.et('placementIntervalsInvalid'));
      }
    }
  }

  ensureDatedRecordsRemainValid(invalid: boolean) {
    if (invalid) Err(409, this.et('correctionConflictsRecords'));
  }

  ensureStudentExists<T>(student: T | null | undefined): T {
    if (!student) Err(404, this.et('studentNotFound'));
    return student;
  }

  ensureEnrollmentExists<T>(enrollment: T | null | undefined): T {
    if (!enrollment) Err(404, this.et('notFound'));
    return enrollment;
  }

  ensurePlacementYear(status: string) {
    if (status === 'draft') Err(409, this.et('draftSetupOnly'));
  }

  ensureClassSection<T>(placement: T | null | undefined): T {
    if (!placement) Err(422, this.et('sectionNotInClass'));
    return placement;
  }

  ensureClassYear(academicYear: string, label: string) {
    if (academicYear !== label) Err(422, this.et('classOtherYear'));
  }

  ensureNewEnrollmentDate(enrolledOn: string) {
    if (!isDateOnly(enrolledOn)) Err(422, this.et('enrollmentDateRequired'));
  }

  ensureNewStudentYear(year: YearInterval, activeYearId: string | null | undefined, enrolledOn: string) {
    if (!activeYearId || activeYearId !== year.id) Err(409, this.et('newPlacementActiveYear'));
    if (year.status === 'draft' || enrolledOn < year.reportingStartsOn || enrolledOn > year.reportingEndsOn) {
      Err(422, this.et('enrollmentDateActiveYear'));
    }
    this.ensureActiveEnrollmentDate(enrolledOn, true);
  }

  ensureProjectionPlacements(unplacedCount: number) {
    if (unplacedCount) Err(409, this.et('unplacedStudents', { count: unplacedCount }));
  }

  ensureProjectionOutcomes(undecidedCount: number) {
    if (undecidedCount) Err(409, this.et('undecidedStudents', { count: undecidedCount }));
  }

  ensureEnrollmentInYear(enrolledOn: string, year: YearInterval) {
    if (enrolledOn < year.reportingStartsOn || enrolledOn > year.reportingEndsOn) Err(422, this.et('dateOutsideYear'));
  }

  ensureAdmissionDate(enrolledOn: string, admissionDate: string | null) {
    if (admissionDate && enrolledOn < admissionDate) Err(422, this.et('beforeAdmission'));
  }

  ensureEnrollmentUnique(existing: unknown) {
    if (existing) Err(409, this.et('alreadyEnrolled'));
  }

  ensureActiveEnrollmentDate(enrolledOn: string, isActiveYear: boolean) {
    if (isActiveYear && enrolledOn > getBusinessDateOnly()) Err(422, this.et('futureStart'));
  }

  ensureTransferable(leftOn: string | null) {
    if (leftOn) Err(409, this.et('ended'));
  }

  ensureTransferDate(date: string, enrolledOn: string, yearEnd: string) {
    if (date <= enrolledOn || date > yearEnd) Err(422, this.et('transferOutsideInterval'));
  }

  ensureTransferPlacement<T extends { validFrom: string; classId: string; sectionId: string }>(
    placement: T | null | undefined, data: { validFrom: string; classId: string; sectionId: string },
  ): T {
    if (!placement) Err(409, this.et('noOpenPlacementTransfer'));
    if (data.validFrom <= placement.validFrom) Err(422, this.et('transferBeforePlacement'));
    if (placement.classId === data.classId && placement.sectionId === data.sectionId) Err(409, this.et('alreadyInPlacement'));
    return placement;
  }

  ensureActiveTransferDate(validFrom: string, isActiveYear: boolean) {
    if (isActiveYear && validFrom > getBusinessDateOnly()) Err(422, this.et('futureTransfer'));
  }

  ensureCanEnd(leftOn: string | null) {
    if (leftOn) Err(409, this.et('alreadyEnded'));
  }

  ensureEndDate(leftOn: string, enrolledOn: string, year: YearInterval) {
    if (year.status === 'draft') Err(409, this.et('draftNotEditable'));
    const lastDate = new Date(`${year.reportingEndsOn}T00:00:00.000Z`);
    lastDate.setUTCDate(lastDate.getUTCDate() + 1);
    if (leftOn <= enrolledOn || leftOn > lastDate.toISOString().slice(0, 10)) Err(422, this.et('endOutsideInterval'));
  }

  ensureEndPlacement<T extends { validFrom: string }>(placement: T | null | undefined, leftOn: string): T {
    if (!placement) Err(409, this.et('noOpenPlacementEnd'));
    if (leftOn <= placement.validFrom) Err(422, this.et('endBeforePlacement'));
    return placement;
  }

  ensureActiveEndDate(leftOn: string, isActiveYear: boolean) {
    if (isActiveYear && leftOn > getBusinessDateOnly()) Err(422, this.et('futureEnd'));
  }
}
