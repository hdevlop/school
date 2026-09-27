// A test double of AcademicYearRepository.findWithActivePointer: the
// registered years and the Settings pointer its one query joins, matched the
// same way (by label, id or a date in the reporting interval, else the active
// label). A null pointer stands for a school with no Settings row.

type RegisteredYear = { id: string; label: string; reportingStartsOn?: string; reportingEndsOn?: string };
type Pointer = { activeAcademicYearId?: string | null; currentAcademicYear: string };
type Match = { label: string } | { id: string } | { date: string };

export function yearRegistry<Year extends RegisteredYear>(years: readonly Year[], pointer: Pointer | null) {
  const inInterval = (year: Year, date: string) =>
    !!year.reportingStartsOn && !!year.reportingEndsOn && year.reportingStartsOn <= date && date <= year.reportingEndsOn;
  return {
    findWithActivePointer: async (match?: Match) => {
      if (!pointer) return null;
      const year = !match ? years.find((candidate) => candidate.label === pointer.currentAcademicYear)
        : 'id' in match ? years.find((candidate) => candidate.id === match.id)
          : 'label' in match ? years.find((candidate) => candidate.label === match.label)
            : years.find((candidate) => inInterval(candidate, match.date));
      return {
        activeAcademicYearId: pointer.activeAcademicYearId ?? null,
        currentAcademicYear: pointer.currentAcademicYear,
        year: year ?? null,
      };
    },
  };
}
