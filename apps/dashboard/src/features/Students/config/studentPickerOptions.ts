type PickerStudent = {
  readonly id: string;
  readonly name?: string | null;
  readonly arabicName?: string | null;
  readonly studentCode?: string | null;
  readonly class?: { readonly name?: string | null } | null;
  readonly section?: { readonly name?: string | null } | null;
};

export type StudentPickerOption = {
  readonly value: string;
  readonly name: string;
  readonly code: string | null;
  readonly placement: string | null;
  readonly keywords: readonly string[];
};

/** Case, accents and Arabic vowel marks never decide whether a student is found. */
const normalize = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/**
 * Sorted by name so that namesakes sit side by side and their class, section
 * and code tell them apart. Every one of those can be searched for.
 */
export const buildStudentPickerOptions = (students: readonly PickerStudent[] = []): StudentPickerOption[] =>
  students
    .map((student) => {
      const name = student.name ?? '';
      const code = student.studentCode || null;
      const className = student.class?.name;
      const sectionName = student.section?.name;
      return {
        value: student.id,
        name,
        code,
        placement: [className, sectionName].filter(Boolean).join(' · ') || null,
        keywords: [name, student.arabicName, code, className, sectionName]
          .filter((keyword): keyword is string => Boolean(keyword))
          .map(normalize),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

/** A cmdk filter: every word typed must appear, so "aya 3a" finds Aya in class 3A. */
export const scoreStudentPickerOption = (search: string, keywords: readonly string[] = []) => {
  const haystack = keywords.join(' ');
  return normalize(search).split(/\s+/).filter(Boolean).every((word) => haystack.includes(word)) ? 1 : 0;
};
