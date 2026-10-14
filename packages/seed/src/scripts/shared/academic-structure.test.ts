import { describe, expect, it } from 'bun:test';
import { ACADEMIC_LEVELS, academicStructure, parseAcademicLevels } from './academic-structure';

describe('academic structure seed', () => {
  it('offers the Moroccan cycles in school order', () => {
    expect(ACADEMIC_LEVELS).toEqual(['Maternelle', 'Primaire', 'Collège', 'Lycée']);
  });

  it('seeds every class with sections A, B and C in the chosen year', () => {
    const structure = academicStructure('2026-2027');
    expect(structure.classes.map((schoolClass) => schoolClass.name)).toEqual([
      'PS', 'MS', 'GS', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', 'CE6', '1AC', '2AC', '3AC', 'TC', '1BAC', '2BAC',
    ]);
    expect(structure.classes.every((schoolClass) => schoolClass.academicYear === '2026-2027')).toBe(true);
    for (const { name } of structure.classes) {
      expect(structure.sections.filter((section) => section.className === name).map((section) => section.name))
        .toEqual(['A', 'B', 'C']);
    }
    expect(structure.subjects.length).toBeGreaterThan(0);
  });

  it('leaves ids and room numbers to the database and the school', () => {
    const { classes, sections } = academicStructure('2026-2027');
    expect(classes.some((schoolClass) => 'id' in schoolClass)).toBe(false);
    expect(sections.some((section) => 'id' in section || 'roomNumber' in section)).toBe(false);
  });

  it('keeps only the chosen cycles and their sections', () => {
    const { classes, sections } = academicStructure('2026-2027', ['Maternelle', 'Collège']);
    expect(classes.map((schoolClass) => schoolClass.name)).toEqual(['PS', 'MS', 'GS', 'CE6', '1AC', '2AC', '3AC']);
    expect(new Set(sections.map((section) => section.className))).toEqual(new Set(classes.map((schoolClass) => schoolClass.name)));
  });

  it('seeds every default fee type whatever the levels, with the ids demo fees use', () => {
    const all = academicStructure('2026-2027');
    const one = academicStructure('2026-2027', ['Lycée']);
    expect(one.feeTypes).toEqual(all.feeTypes);
    expect(all.feeTypes.map((feeType) => feeType.name)).toContain('Tuition Fee');
    expect(all.feeTypes.find((feeType) => feeType.name === 'Tuition Fee')).toMatchObject({
      id: 'FT00', category: 'tuition', paymentType: 'recurring', status: 'active',
    });
    expect(new Set(all.feeTypes.map((feeType) => feeType.id)).size).toBe(all.feeTypes.length);
  });

  it('reads --levels without caring about accents or case', () => {
    expect(parseAcademicLevels([])).toEqual(ACADEMIC_LEVELS);
    expect(parseAcademicLevels(['--levels=maternelle,PRIMAIRE,college'])).toEqual(['Maternelle', 'Primaire', 'Collège']);
    expect(parseAcademicLevels(['--levels', 'lycee'])).toEqual(['Lycée']);
    expect(() => parseAcademicLevels(['--levels=university'])).toThrow('Unknown level');
    expect(() => parseAcademicLevels(['--levels='])).toThrow('Expected --levels');
  });
});
