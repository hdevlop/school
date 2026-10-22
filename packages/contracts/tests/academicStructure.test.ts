import { describe, expect, it } from 'bun:test';
import { academicLevelLabel, compareAcademicLevels, SCHOOL_ACADEMIC_CYCLES } from '../src/academicStructure';

describe('school academic stages', () => {
  it('sorts the displayed labels alphabetically, including custom levels', () => {
    const levels = ['Lycée', 'Atelier', 'Primaire', 'Maternelle', 'Collège', 'Alpha'];
    const ascending = [...levels].sort((a, b) => compareAcademicLevels(a, b, 'en'));
    expect(ascending).toEqual(['Alpha', 'Atelier', 'Lycée', 'Collège', 'Maternelle', 'Primaire']);
    expect([...levels].sort((a, b) => -compareAcademicLevels(a, b, 'en'))).toEqual([...ascending].reverse());
    expect([...levels].sort((a, b) => compareAcademicLevels(a, b, 'fr')))
      .toEqual(['Alpha', 'Atelier', 'Collège', 'Lycée', 'Maternelle', 'Primaire']);
    expect(compareAcademicLevels('alpha', 'Alpha')).toBe(0);
  });
  it('uses the same labels as the cycle catalog and preserves custom names', () => {
    for (const cycle of SCHOOL_ACADEMIC_CYCLES) {
      for (const [language, label] of Object.entries(cycle.labels)) expect(academicLevelLabel(cycle.name, language)).toBe(label);
    }
    expect(academicLevelLabel('Atelier', 'fr')).toBe('Atelier');
  });
});
