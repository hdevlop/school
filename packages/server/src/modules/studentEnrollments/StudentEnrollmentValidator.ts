import { Err, Service } from '../../najm';
import { getBusinessDateOnly } from '../../shared/businessDate';
import { isDateOnly } from '@sms/contracts/academic-years';
import type { CorrectEnrollmentDto } from './StudentEnrollmentDto';

type YearInterval = { id: string; status: string; reportingStartsOn: string; reportingEndsOn: string };

@Service()
export class StudentEnrollmentValidator {
  ensureSelectedYear(recordYearId: string, selectedYearId: string) {
    if (recordYearId !== selectedYearId) Err(404, 'Enrollment not found in the selected year');
  }

  ensureCorrectionAllowed(role: string) {
    if (role !== 'admin' && role !== 'principal') Err(403, 'Enrollment corrections require an administrator');
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
      Err(409, 'Enrollment changed; reload it before correcting');
    }
    this.ensurePlacementYear(year.status);
    this.ensureEnrollmentInYear(data.enrolledOn, year);
    this.ensureAdmissionDate(data.enrolledOn, admissionDate);
    if ((data.status === 'active') !== (data.leftOn === null)) Err(422, 'Enrollment status must match its end date');
    if (data.leftOn) this.ensureEndDate(data.leftOn, data.enrolledOn, year);
    if (!placements.some((p) => p.id === data.placement.id)) Err(404, 'Placement not found in this enrollment');
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
        Err(422, 'Placement intervals must fit the enrollment and must not overlap');
      }
    }
  }

  ensureDatedRecordsRemainValid(invalid: boolean) {
    if (invalid) Err(409, 'Correction conflicts with recorded attendance or grades; reconcile those records first');
  }

  ensureStudentExists<T>(student: T | null | undefined): T {
    if (!student) Err(404, 'Student not found');
    return student;
  }

  ensureEnrollmentExists<T>(enrollment: T | null | undefined): T {
    if (!enrollment) Err(404, 'Enrollment not found');
    return enrollment;
  }

  ensurePlacementYear(status: string) {
    if (status === 'draft') Err(409, 'Draft years only permit academic setup');
  }

  ensureClassSection<T>(placement: T | null | undefined): T {
    if (!placement) Err(422, 'Section must belong to the selected class');
    return placement;
  }

  ensureClassYear(academicYear: string, label: string) {
    if (academicYear !== label) Err(422, 'Class belongs to another academic year');
  }

  ensureNewEnrollmentDate(enrolledOn: string) {
    if (!isDateOnly(enrolledOn)) Err(422, 'A real yearly enrollment date is required');
  }

  ensureNewStudentYear(year: YearInterval, activeYearId: string | null | undefined, enrolledOn: string) {
    if (!activeYearId || activeYearId !== year.id) Err(409, 'New student placement must belong to the active academic year');
    if (year.status === 'draft' || enrolledOn < year.reportingStartsOn || enrolledOn > year.reportingEndsOn) {
      Err(422, 'Yearly enrollment date must belong to the active academic year');
    }
    this.ensureActiveEnrollmentDate(enrolledOn, true);
  }

  ensureProjectionPlacements(unplacedCount: number) {
    if (unplacedCount) Err(409, `${unplacedCount} student(s) of the new year have no placement to project`);
  }

  ensureProjectionOutcomes(undecidedCount: number) {
    if (undecidedCount) Err(409, `${undecidedCount} student(s) of the active year have no enrollment or outcome in the new year`);
  }

  ensureEnrollmentInYear(enrolledOn: string, year: YearInterval) {
    if (enrolledOn < year.reportingStartsOn || enrolledOn > year.reportingEndsOn) Err(422, 'Enrollment date must belong to the selected year');
  }

  ensureAdmissionDate(enrolledOn: string, admissionDate: string | null) {
    if (admissionDate && enrolledOn < admissionDate) Err(422, 'Yearly enrollment cannot predate the original admission date');
  }

  ensureEnrollmentUnique(existing: unknown) {
    if (existing) Err(409, 'Student is already enrolled in this year');
  }

  ensureActiveEnrollmentDate(enrolledOn: string, isActiveYear: boolean) {
    if (isActiveYear && enrolledOn > getBusinessDateOnly()) Err(422, 'Active-year enrollment cannot start in the future');
  }

  ensureTransferable(leftOn: string | null) {
    if (leftOn) Err(409, 'Enrollment has ended');
  }

  ensureTransferDate(date: string, enrolledOn: string, yearEnd: string) {
    if (date <= enrolledOn || date > yearEnd) Err(422, 'Transfer date is outside the enrollment interval');
  }

  ensureTransferPlacement<T extends { validFrom: string; classId: string; sectionId: string }>(
    placement: T | null | undefined, data: { validFrom: string; classId: string; sectionId: string },
  ): T {
    if (!placement) Err(409, 'No open placement to transfer');
    if (data.validFrom <= placement.validFrom) Err(422, 'Transfer must occur after the current placement starts');
    if (placement.classId === data.classId && placement.sectionId === data.sectionId) Err(409, 'Student is already in that placement');
    return placement;
  }

  ensureActiveTransferDate(validFrom: string, isActiveYear: boolean) {
    if (isActiveYear && validFrom > getBusinessDateOnly()) Err(422, 'Active-year transfer cannot start in the future');
  }

  ensureCanEnd(leftOn: string | null) {
    if (leftOn) Err(409, 'Enrollment has already ended');
  }

  ensureEndDate(leftOn: string, enrolledOn: string, year: YearInterval) {
    if (year.status === 'draft') Err(409, 'Draft years have no editable enrollments');
    const lastDate = new Date(`${year.reportingEndsOn}T00:00:00.000Z`);
    lastDate.setUTCDate(lastDate.getUTCDate() + 1);
    if (leftOn <= enrolledOn || leftOn > lastDate.toISOString().slice(0, 10)) Err(422, 'End date is outside the enrollment interval');
  }

  ensureEndPlacement<T extends { validFrom: string }>(placement: T | null | undefined, leftOn: string): T {
    if (!placement) Err(409, 'No open placement to end');
    if (leftOn <= placement.validFrom) Err(422, 'End date must follow the current placement start');
    return placement;
  }

  ensureActiveEndDate(leftOn: string, isActiveYear: boolean) {
    if (isActiveYear && leftOn > getBusinessDateOnly()) Err(422, 'Active-year enrollment cannot end in the future');
  }
}
