export type ScopedRow = {
  classId?: string | null;
  sectionId?: string | null;
  sectionIds?: string[] | null;
  class?: { id?: string | null } | null;
  section?: { id?: string | null } | null;
};

export function matchesClassSection(row: ScopedRow, classId: string, sectionId: string) {
  return (!classId || (row.classId ?? row.class?.id) === classId)
    && (!sectionId || (row.sectionIds?.length
      ? row.sectionIds.includes(sectionId)
      : (row.sectionId ?? row.section?.id) === sectionId));
}

export function matchesAnyChild(children: ScopedRow[] | undefined, classId: string, sectionId: string) {
  return (!classId && !sectionId)
    || (children || []).some((child) => matchesClassSection(child, classId, sectionId));
}
