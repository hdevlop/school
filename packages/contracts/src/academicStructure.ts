/** School's standard stages, shared by seeds and academic views. Custom stages remain valid. */
export const SCHOOL_ACADEMIC_CYCLES = [
  { name: 'Maternelle', sortOrder: 0, labels: { fr: 'Maternelle', en: 'Preschool', ar: 'التعليم الأولي', es: 'Preescolar' } },
  { name: 'Primaire', sortOrder: 1, labels: { fr: 'Primaire', en: 'Primary School', ar: 'الابتدائي', es: 'Primaria' } },
  { name: 'Collège', sortOrder: 2, labels: { fr: 'Collège', en: 'Middle School', ar: 'الإعدادي', es: 'Secundaria' } },
  { name: 'Lycée', sortOrder: 3, labels: { fr: 'Lycée', en: 'High School', ar: 'الثانوي', es: 'Bachillerato' } },
] as const;

const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase();
export function schoolCycleForLevel(level: string) {
  return SCHOOL_ACADEMIC_CYCLES.find(cycle => [cycle.name, ...Object.values(cycle.labels)]
    .some(label => normalized(label) === normalized(level)));
}

export function academicLevelLabel(level: string, language: string) {
  const cycle = schoolCycleForLevel(level);
  return cycle?.labels[language as keyof typeof cycle.labels] || level;
}

export function compareAcademicLevels(left: string, right: string, language = 'en') {
  return academicLevelLabel(left, language).localeCompare(academicLevelLabel(right, language), language, {
    numeric: true,
    sensitivity: 'base',
  });
}
