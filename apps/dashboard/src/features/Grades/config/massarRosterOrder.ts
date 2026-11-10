import { classOrder } from '@/features/Massar/config/massarModel';

export interface MassarOrdered {
  massarClassName?: string | null;
  massarPosition?: number | null;
  studentCode?: string | null;
  name?: string | null;
  class?: { name?: string | null } | null;
  section?: { name?: string | null } | null;
}

const text = (a?: string | null, b?: string | null) => (a ?? '').localeCompare(b ?? '', 'en', { numeric: true });

/**
 * The order a Massar grid lists students: class by class, then each student's
 * position in the class. Students Massar does not list follow, by School class,
 * section and name.
 */
export function compareMassarOrder(a: MassarOrdered, b: MassarOrdered): number {
  const aListed = a.massarPosition != null;
  const bListed = b.massarPosition != null;
  if (aListed !== bListed) return aListed ? -1 : 1;
  if (aListed) {
    return classOrder(a.massarClassName ?? '', b.massarClassName ?? '')
      || (a.massarPosition as number) - (b.massarPosition as number)
      || text(a.studentCode, b.studentCode);
  }
  return text(a.class?.name, b.class?.name) || text(a.section?.name, b.section?.name) || text(a.name, b.name);
}
