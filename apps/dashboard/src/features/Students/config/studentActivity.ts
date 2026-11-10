/** Activity belongs to the enrollment in the viewed academic year. */
export function isStudentDisabled(student: { enrollment?: { leftOn?: string | null; status?: string } | null }) {
  return Boolean(student.enrollment?.leftOn) || ['withdrawn', 'transferred', 'graduated'].includes(student.enrollment?.status ?? '');
}

export const getStudentRowClassName = (student: Parameters<typeof isStudentDisabled>[0]) =>
  isStudentDisabled(student) ? INACTIVE_ROW_CLASS : undefined;

/** Keep active enrollments first, preserving the existing order within each group. */
export const compareStudentActivity = (
  left: Parameters<typeof isStudentDisabled>[0],
  right: Parameters<typeof isStudentDisabled>[0],
) => Number(isStudentDisabled(left)) - Number(isStudentDisabled(right));

type StudentListRow = Parameters<typeof isStudentDisabled>[0] & {
  name?: string | null;
  class?: { name?: string | null } | null;
  section?: { name?: string | null } | null;
};
const studentListCollator = new Intl.Collator('fr', { numeric: true });

/** Current students first, then PS → MS → GS and the following levels. */
export const compareStudentListRows = (left: StudentListRow, right: StudentListRow) =>
  compareStudentActivity(left, right)
  || compareClassNames(left.class?.name ?? '', right.class?.name ?? '')
  || studentListCollator.compare(left.section?.name ?? '', right.section?.name ?? '')
  || studentListCollator.compare(left.name ?? '', right.name ?? '');
import { compareClassNames } from '@sms/contracts';
import { INACTIVE_ROW_CLASS } from '@/shared/inactiveRow';
