/** Source dates may extend the initial enrollment backwards, never postpone existing history. */
export function importedEnrollmentDates(sourceAdmissionDate: string, savedAdmissionDate: string,
  enrollment: { enrolledOn: string }, yearStartsOn: string) {
  const admissionDate = sourceAdmissionDate < savedAdmissionDate ? sourceAdmissionDate : savedAdmissionDate;
  const sourceYearDate = sourceAdmissionDate < yearStartsOn ? yearStartsOn : sourceAdmissionDate;
  const yearEnrolledOn = sourceYearDate < enrollment.enrolledOn ? sourceYearDate : enrollment.enrolledOn;
  return { admissionDate, yearEnrolledOn,
    changed: admissionDate !== savedAdmissionDate || yearEnrolledOn !== enrollment.enrolledOn };
}
