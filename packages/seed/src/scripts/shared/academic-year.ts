/** The teaching year begins in September; July and August still belong to the year just finished. */
export function getSeedAcademicYear(referenceDate = new Date()): string {
  const year = referenceDate.getFullYear();
  const startYear = referenceDate.getMonth() >= 8 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export function getConfiguredSeedAcademicYear(referenceDate = new Date()): string {
  const arg = process.argv.find((value) => value.startsWith('--academic-year='));
  const academicYear = arg?.slice('--academic-year='.length) || getSeedAcademicYear(referenceDate);
  const match = /^(\d{4})-(\d{4})$/.exec(academicYear);
  if (!match || Number(match[2]) !== Number(match[1]) + 1) {
    throw new Error('Expected --academic-year=YYYY-YYYY with consecutive years');
  }
  return academicYear;
}

/** Demo collections run during term and the July 1-14 closeout, before vacation. */
export function isDemoCollectionDay(date: Date): boolean {
  const month = date.getMonth();
  return month !== 7 && (month !== 6 || date.getDate() < 15);
}
