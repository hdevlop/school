/** The teaching year begins in September; July and August still belong to the year just finished. */
export function getSeedAcademicYear(referenceDate = new Date()): string {
  const year = referenceDate.getFullYear();
  const startYear = referenceDate.getMonth() >= 8 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export function parseSeedAcademicYear(value: string): string {
  const academicYear = value.trim();
  const match = /^(\d{4})-(\d{4})$/.exec(academicYear);
  if (!match || Number(match[2]) !== Number(match[1]) + 1) {
    throw new Error('Expected --year=YYYY-YYYY with consecutive years');
  }
  return academicYear;
}

export function getConfiguredSeedAcademicYear(referenceDate = new Date(), args = process.argv.slice(2)): string {
  const index = args.findIndex((value) => value === '--year' || value.startsWith('--year='));
  if (index < 0) return getSeedAcademicYear(referenceDate);
  const value = args[index] === '--year'
    ? args[index + 1]
    : args[index].slice('--year='.length);
  return parseSeedAcademicYear(value ?? '');
}

/** Historical demos use a day near the end of their own teaching year. */
export function getDemoReferenceDate(academicYear: string, referenceDate = new Date()): Date {
  parseSeedAcademicYear(academicYear);
  if (academicYear > getSeedAcademicYear(referenceDate)) {
    throw new Error('Demo data can only be seeded for the current or a past academic year');
  }
  return academicYear === getSeedAcademicYear(referenceDate)
    ? new Date(referenceDate)
    : new Date(`${academicYear.slice(5)}-06-15T12:00:00.000Z`);
}

/** Demo collections run during term and the July 1-14 closeout, before vacation. */
export function isDemoCollectionDay(date: Date): boolean {
  const month = date.getMonth();
  return month !== 7 && (month !== 6 || date.getDate() < 15);
}

/** `count` consecutive years ending with today's teaching year, oldest first. */
export function getHistoryAcademicYears(count: number, referenceDate = new Date()) {
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    throw new Error('Expected --years between 1 and 10');
  }
  const currentStart = Number(getSeedAcademicYear(referenceDate).slice(0, 4));
  return Array.from({ length: count }, (_, index) => {
    const start = currentStart - count + 1 + index;
    return `${start}-${start + 1}`;
  });
}
