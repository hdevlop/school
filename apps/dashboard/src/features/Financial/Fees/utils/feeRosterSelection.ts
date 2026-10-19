type SchoolClass = { id: string; name: string };
type Section = { id: string; name: string; classId: string };

export type FeeRosterSelection = { classId: string; sectionId: string };

export function defaultFeeSection(sections: readonly Section[], classId: string): string {
  const available = sections.filter((section) => section.classId === classId);
  return (available.find((section) => section.name.trim().toUpperCase() === 'A') ?? available[0])?.id ?? '';
}

/** Resolve IDs from this year's catalogs, without initially selecting every student. */
export function resolveFeeRosterSelection(
  classes: readonly SchoolClass[],
  sections: readonly Section[],
  selection: FeeRosterSelection | null,
): FeeRosterSelection {
  if (selection?.classId === 'all') {
    return { classId: 'all', sectionId: sections.some((section) => section.id === selection.sectionId) ? selection.sectionId : '' };
  }
  if (selection && classes.some((schoolClass) => schoolClass.id === selection.classId)) {
    return {
      classId: selection.classId,
      sectionId: !selection.sectionId || sections.some((section) => section.id === selection.sectionId && section.classId === selection.classId)
        ? selection.sectionId : defaultFeeSection(sections, selection.classId),
    };
  }
  const schoolClass = classes.find((item) => item.name.trim().toUpperCase() === 'CP') ?? classes[0];
  return {
    classId: schoolClass?.id ?? '',
    sectionId: schoolClass ? defaultFeeSection(sections, schoolClass.id) : '',
  };
}
