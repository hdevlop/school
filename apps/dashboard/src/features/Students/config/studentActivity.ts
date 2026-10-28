/** Activity belongs to the enrollment in the viewed academic year. */
export function isStudentDisabled(student: { enrollment?: { leftOn?: string | null; status?: string } | null }) {
  return Boolean(student.enrollment?.leftOn) || ['withdrawn', 'transferred', 'graduated'].includes(student.enrollment?.status ?? '');
}

export const getStudentRowClassName = (student: Parameters<typeof isStudentDisabled>[0]) =>
  isStudentDisabled(student)
    ? 'bg-muted/60 text-muted-foreground opacity-80 grayscale hover:bg-muted/80'
    : undefined;

/** Keep active enrollments first, preserving the existing order within each group. */
export const compareStudentActivity = (
  left: Parameters<typeof isStudentDisabled>[0],
  right: Parameters<typeof isStudentDisabled>[0],
) => Number(isStudentDisabled(left)) - Number(isStudentDisabled(right));
