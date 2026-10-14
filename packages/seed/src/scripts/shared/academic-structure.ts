import { classesData, feeTypeData, sectionsData } from '@sms/contracts/fixtures';
import { normalizedSubjectsData } from './school-seed-data';

/** The Moroccan cycles the default classes belong to, in school order. */
export const ACADEMIC_LEVELS = [...new Set(classesData.map((schoolClass) => schoolClass.level))];

const sameLevel = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' }) === 0;

/** `--levels=maternelle,primaire` picks cycles; accents and case do not matter. Without it, every cycle. */
export function parseAcademicLevels(args = process.argv.slice(2)): string[] {
  const index = args.findIndex((value) => value === '--levels' || value.startsWith('--levels='));
  if (index < 0) return ACADEMIC_LEVELS;
  const value = args[index] === '--levels' ? args[index + 1] : args[index].slice('--levels='.length);
  const levels = (value ?? '').split(',').map((level) => level.trim()).filter(Boolean).map((level) => {
    const known = ACADEMIC_LEVELS.find((candidate) => sameLevel(candidate, level));
    if (!known) throw new Error(`Unknown level "${level}"; expected ${ACADEMIC_LEVELS.join(', ')}`);
    return known;
  });
  if (!levels.length) throw new Error(`Expected --levels=${ACADEMIC_LEVELS.join(',')}`);
  return levels;
}

/**
 * The default classes, their A/B/C sections and the subjects, without the
 * demo's ids and room numbers: ids are generated, and rooms are the school's
 * own. Sections name their class, which is matched by name in the year, so a
 * class the school already has keeps its id and gains only missing sections.
 *
 * Fee types belong to the school, not to a year or a cycle, so every level
 * choice gets all of them. They keep their fixture ids, which the demo fees
 * point at.
 */
export function academicStructure(academicYear: string, levels: readonly string[] = ACADEMIC_LEVELS) {
  const classes = classesData.filter((schoolClass) => levels.includes(schoolClass.level));
  const classNames = new Map(classes.map((schoolClass) => [schoolClass.id, schoolClass.name]));
  return {
    subjects: normalizedSubjectsData,
    classes: classes.map(({ name, description, level }) => ({ name, description, level, academicYear })),
    sections: sectionsData
      .filter((section) => classNames.has(section.classId))
      .map(({ classId, name, maxStudents }) => ({ className: classNames.get(classId)!, name, maxStudents })),
    feeTypes: feeTypeData,
  };
}
