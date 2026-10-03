/**
 * September 1 of a class's academic year. A class without a year label falls
 * back to the teaching year `referenceDate` (or today) falls in.
 */
export const academicYearStartDate = (academicYear?: string | null, referenceDate?: string | null) => {
  const startYear = academicYear?.match(/^\d{4}/)?.[0]
  if (startYear) return `${startYear}-09-01`

  const today = referenceDate ? new Date(`${referenceDate}T00:00:00`) : new Date()
  const year = today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1
  return `${year}-09-01`
}

/**
 * A new student's placement in their class's year. The create form asks only
 * for the admission date: the placement starts that day, or on the first day
 * of the class's year when the admission predates it (a student recorded
 * after they joined). Later years get their own date through the enrollment
 * operations, never through this form.
 */
export const firstYearEnrolledOn = (admissionDate: string, academicYear?: string | null) => {
  const yearStart = academicYearStartDate(academicYear, admissionDate)
  return admissionDate > yearStart ? admissionDate : yearStart
}
