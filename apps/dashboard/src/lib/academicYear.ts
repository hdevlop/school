export function getCurrentAcademicYear(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = month >= 8 ? year : year - 1;
  return `${start}-${start + 1}`;
}

export function getAcademicYearMonths(year: string): string[] {
  const startYear = Number(year.split('-')[0]);
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(startYear, 8 + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}
