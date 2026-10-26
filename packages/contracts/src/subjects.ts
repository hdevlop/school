import subjects from './fixtures/data/subjects.json';
import { schoolCycleForLevel } from './academicStructure';
import { toAppClassName } from './classNames';

/** One catalogue, including legacy IDs still referenced by older demo records. */
export const schoolSubjectsData = subjects;

type SchoolCycle = NonNullable<ReturnType<typeof schoolCycleForLevel>>['name'];

const subjectCodesByCycle: Record<SchoolCycle, readonly string[]> = {
  Maternelle: ['PRELANG', 'PREMATH', 'PREDECO', 'PREMOT', 'PREART', 'PREVIE'],
  Primaire: ['AR', 'FR', 'MATH', 'EI', 'SCI', 'HG', 'ART', 'PE'],
  Collège: ['AR', 'FR', 'MATH', 'EI', 'HG', 'PHY', 'SVT', 'ENG', 'PE', 'INFO', 'ART'],
  // Common secondary catalogue only; filière-specific subjects remain school-owned.
  Lycée: ['AR', 'FR', 'MATH', 'EI', 'HG', 'PHY', 'SVT', 'ENG', 'PE', 'INFO'],
};

/** Select catalogue defaults, without attaching subjects to classes or years. */
export function schoolSubjectsForLevels(levels: readonly string[]) {
  const codes = new Set(levels.flatMap(level => {
    const cycle = schoolCycleForLevel(level);
    if (!cycle) throw new Error(`Unknown school level "${level}"`);
    return subjectCodesByCycle[cycle.name];
  }));
  return subjects.filter(subject => codes.has(subject.code));
}

/** Demo assignments also respect the start of social studies in primary year four. */
export function schoolSubjectsForClass(schoolClass: { name: string; level: string }) {
  const selected = schoolSubjectsForLevels([schoolClass.level]);
  const earlyPrimary = schoolCycleForLevel(schoolClass.level)?.name === 'Primaire'
    && ['CP', 'CE1', 'CE2'].includes(toAppClassName(schoolClass.name).toUpperCase());
  return earlyPrimary ? selected.filter(subject => subject.code !== 'HG') : selected;
}

/** Exact former defaults; a school-customized record must never match by code alone. */
export const legacySchoolSubjectDefaults: Record<string, { name: string; description: string }> = {
  PHY: {
    name: 'Physique',
    description: 'Physique et chimie, mécanique, électricité et thermodynamique',
  },
  SVT: {
    name: 'Sciences de la Vie et de la Terre',
    description: 'Biologie, géologie, écologie et sciences naturelles',
  },
  ENG: {
    name: 'English',
    description: 'English language and literature',
  },
  PE: {
    name: 'Éducation Physique',
    description: 'Sport et éducation physique',
  },
};
