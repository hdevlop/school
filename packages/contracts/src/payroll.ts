/** Monthly payroll includes the hire month; it does not prorate that month's salary. */
export function isPayrollPeriodAfterHire(period: string, hireDate: string | null | undefined): boolean {
  return !!hireDate && period >= hireDate.slice(0, 7);
}
