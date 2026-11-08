import { describe, expect, it } from 'bun:test';
import { schoolSubjectsData, schoolSubjectsForClass, schoolSubjectsForLevels } from '../src/subjects';
import { foldSubjectName } from '../src/subjectNames';

describe('Moroccan subject defaults', () => {
  it('keeps legacy IDs available without seeding separate history and geography as defaults', () => {
    expect(schoolSubjectsData.find(subject => subject.id === 'SB05')?.code).toBe('HIST');
    expect(schoolSubjectsData.find(subject => subject.id === 'SB06')?.code).toBe('GEO');
    const defaults = schoolSubjectsForLevels(['Maternelle', 'Primaire', 'Collège', 'Lycée']);
    const codes = defaults.map(subject => subject.code);
    expect(codes).toContain('HG');
    for (const code of ['HIST', 'GEO', 'AMZ']) expect(codes).not.toContain(code);
    expect(new Set(defaults.map(subject => subject.id)).size).toBe(defaults.length);
  });

  it('gives preschool the common subjects and primary science instead of secondary sciences', () => {
    const preschool = schoolSubjectsForLevels(['Maternelle']);
    expect(preschool).toHaveLength(6);
    expect(preschool.map(subject => subject.code).sort()).toEqual(['AR', 'FR', 'MATH', 'EI', 'ART', 'PE'].sort());
    const primaryCodes = schoolSubjectsForLevels(['Primaire']).map(subject => subject.code);
    expect(primaryCodes).toEqual(expect.arrayContaining(['AR', 'FR', 'MATH', 'EI', 'SCI', 'HG', 'ART', 'PE', 'COM']));
    for (const code of ['PHY', 'SVT', 'ENG', 'INFO']) expect(primaryCodes).not.toContain(code);
    const collegeCodes = schoolSubjectsForLevels(['Collège']).map(subject => subject.code);
    expect(collegeCodes).toEqual(expect.arrayContaining(['PHY', 'SVT', 'ENG', 'EI', 'HG']));
    expect(collegeCodes).not.toContain('SCI');
  });

  it('starts social studies in primary year four, including official class aliases', () => {
    for (const name of ['CP', 'CE1', 'CE2', '1APG', '2APG', '3APG']) {
      expect(schoolSubjectsForClass({ name, level: 'Primaire' }).some(subject => subject.code === 'HG')).toBe(false);
    }
    for (const name of ['CM1', 'CM2', 'CE6', '4APG', '5APG', '6APG']) {
      expect(schoolSubjectsForClass({ name, level: 'Primaire' }).some(subject => subject.code === 'HG')).toBe(true);
    }
  });

  it('takes a union for multiple levels, recognizes translated labels and rejects unknown levels', () => {
    const primary = schoolSubjectsForLevels(['Primaire']);
    expect(schoolSubjectsForLevels(['الابتدائي'])).toEqual(primary);
    expect(schoolSubjectsForLevels(['Primaire', 'Primary School'])).toEqual(primary);
    expect(schoolSubjectsForLevels([])).toEqual([]);
    expect(() => schoolSubjectsForLevels(['University'])).toThrow('Unknown school level');
  });

  it('gives each default sub-subject one subject: no name twice, none a subject name', () => {
    const names = [...schoolSubjectsData.map(subject => subject.name), ...schoolSubjectsData.flatMap(subject => subject.subSubjects ?? [])].map(foldSubjectName);
    expect(new Set(names).size).toBe(names.length);
    const primary = schoolSubjectsForLevels(['Primaire']).find(subject => subject.code === 'FR')!;
    expect(primary.subSubjects).toEqual(expect.arrayContaining(['Grammaire', 'Dictée', 'Étude du son']));
  });
});
