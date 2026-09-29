import type { StudentYearEnrollment } from '@/services/studentEnrollmentApi';

/** Build a correction of the identified interval, retaining the complete read state. */
export function studentEnrollmentCorrection(enrollment: StudentYearEnrollment | undefined, values: Record<string, any>) {
  if (!enrollment) return undefined;
  const placement = enrollment.placements.find((row) => row.id === values.correctionPlacementId);
  if (!placement) throw new Error('Placement not found in this enrollment');
  const next = { id: placement.id, classId: values.classId, sectionId: values.sectionId,
    validFrom: values.placementValidFrom, validTo: values.placementValidTo || null };
  const leftOn = values.yearLeftOn || null;
  if (values.yearEnrolledOn === enrollment.enrolledOn && leftOn === enrollment.leftOn &&
    values.yearStatus === enrollment.status && next.classId === placement.classId &&
    next.sectionId === placement.sectionId && next.validFrom === placement.validFrom && next.validTo === placement.validTo) {
    return undefined;
  }
  return { enrollmentId: enrollment.id, enrolledOn: values.yearEnrolledOn, leftOn,
    status: values.yearStatus, placement: next, reason: values.correctionReason,
    expected: { enrolledOn: enrollment.enrolledOn, leftOn: enrollment.leftOn, status: enrollment.status,
      placements: enrollment.placements.map(({ id, classId, sectionId, validFrom, validTo }) =>
        ({ id, classId, sectionId, validFrom, validTo })) },
  };
}
