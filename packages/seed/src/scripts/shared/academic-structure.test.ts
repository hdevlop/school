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

  it('leaves ids to the database and numbers rooms sequentially for the selected sections', () => {
    const { classes, sections } = academicStructure('2026-2027');
    expect(classes.some((schoolClass) => 'id' in schoolClass)).toBe(false);
    expect(sections.some((section) => 'id' in section)).toBe(false);
    expect(sections.map((section) => section.roomNumber)).toEqual(Array.from({ length: 45 }, (_, index) => index + 1));
    const primary = academicStructure('2026-2027', ['Primaire']);
    expect(primary.sections.map((section) => section.roomNumber)).toEqual(Array.from({ length: 18 }, (_, index) => index + 1));
  });

  it('keeps only the chosen cycles and their sections', () => {
    const { classes, sections } = academicStructure('2026-2027', ['Maternelle', 'Collège']);
    expect(classes.map((schoolClass) => schoolClass.name)).toEqual(['PS', 'MS', 'GS', '1AC', '2AC', '3AC']);
    expect(new Set(sections.map((section) => section.className))).toEqual(new Set(classes.map((schoolClass) => schoolClass.name)));
  });

  it('selects subject defaults by cycle without assigning a fake grade level', () => {
    const primary = academicStructure('2026-2027', ['Primaire']);
    const codes = primary.subjects.map(subject => subject.code);
    expect(codes).toEqual(expect.arrayContaining(['EI', 'SCI', 'ART', 'HG']));
    for (const code of ['AMZ', 'PHY', 'SVT', 'HIST', 'GEO', 'ENG', 'INFO']) expect(codes).not.toContain(code);
    expect(primary.classes.find(schoolClass => schoolClass.name === 'CE6')?.level).toBe('Primaire');
    expect(primary.subjects.some(subject => 'gradeLevel' in subject)).toBe(false);
    const preschool = academicStructure('2026-2027', ['Maternelle']);
    expect(preschool.subjects).toHaveLength(6);
    expect(preschool.subjects.every(subject => subject.code.startsWith('PRE'))).toBe(true);
    const combined = academicStructure('2026-2027', ['Primaire', 'Collège']);
    expect(new Set(combined.subjects.map(subject => subject.code)).size).toBe(combined.subjects.length);
    expect(combined.subjects.map(subject => subject.code)).toEqual(expect.arrayContaining(['PHY', 'SVT', 'ENG']));
  });

  it('seeds every default fee type whatever the levels, with the ids demo fees use', () => {
    const all = academicStructure('2026-2027');
    const one = academicStructure('2026-2027', ['Lycée']);
    expect(one.feeTypes).toEqual(all.feeTypes);
    expect(all.feeTypes.find((feeType) => feeType.id === 'FT00')).toMatchObject({
      name: 'Frais de scolarité', category: 'tuition', amount: 1100, paymentType: 'recurring', status: 'active',
    });
    expect(new Set(all.feeTypes.map((feeType) => feeType.id)).size).toBe(all.feeTypes.length);
  });

  it('includes the daily meal alongside the monthly cafeteria fee by default', () => {
    const { feeTypes } = academicStructure('2026-2027');
    expect(feeTypes.find(type => type.id === 'FT12')).toMatchObject({
      name: 'Repas à la journée', category: 'cafeteria', amount: 35, paymentType: 'oneTime', status: 'active',
      labels: { en: 'Daily Meal', fr: 'Repas à la journée', ar: 'وجبة اليوم', es: 'Comida del día' },
    });
    expect(feeTypes.find(type => type.id === 'FT03')).toMatchObject({ amount: 400, paymentType: 'recurring' });
  });

  it('reads --levels without caring about accents or case', () => {
    expect(parseAcademicLevels([])).toEqual(ACADEMIC_LEVELS);
    expect(parseAcademicLevels(['--levels=maternelle,PRIMAIRE,college'])).toEqual(['Maternelle', 'Primaire', 'Collège']);
    expect(parseAcademicLevels(['--levels', 'lycee'])).toEqual(['Lycée']);
    expect(() => parseAcademicLevels(['--levels=university'])).toThrow('Unknown level');
    expect(() => parseAcademicLevels(['--levels='])).toThrow('Expected --levels');
  });
});
