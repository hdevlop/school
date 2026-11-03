import { isStudentDisabled } from '@/features/Students/config/studentActivity';
import { INACTIVE_ROW_CLASS } from '@/shared/inactiveRow';

type ParentActivityRow = {
  isOrphaned?: boolean;
  totalChildren?: number | string | null;
  childPlacements?: Parameters<typeof isStudentDisabled>[0][];
};

export const isParentOrphaned = (parent: ParentActivityRow) =>
  parent.isOrphaned === true || (parent.totalChildren != null && Number(parent.totalChildren) === 0);

/** Use only readable children's enrollments in the viewed academic year. */
export function isParentDisabled(parent: ParentActivityRow) {
  if (isParentOrphaned(parent)) return true;
  const children = parent.childPlacements;
  return !!children?.length && children.every(isStudentDisabled);
}

export const getParentRowClassName = (parent: ParentActivityRow) =>
  isParentDisabled(parent) ? INACTIVE_ROW_CLASS : undefined;

/** Keep inactive parents last without changing the order within either group. */
export const compareParentActivity = (left: ParentActivityRow, right: ParentActivityRow) =>
  Number(isParentDisabled(left)) - Number(isParentDisabled(right));
