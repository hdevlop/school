import { describe, expect, it } from 'bun:test';

import classesJson from '../src/fixtures/data/classes.json';
import feeTypesJson from '../src/fixtures/data/feeTypes.json';
import sectionsJson from '../src/fixtures/data/sections.json';
import subjectsJson from '../src/fixtures/data/subjects.json';
import { createAssignments } from '../src/fixtures/entities';
import {
  classesData,
  feeTypeData,
  generateAssessment,
  generateExam,
  generateStudent,
  generateFees,
  sectionsData,
  subjectsData,
} from '../src/fixtures';

/**
 * The fixtures are shared by demo seeding (Bun) and the dashboard's
 * development form fill (browser), so they must stay pure generators over the
 * static reference data that `seed:school` also writes.
 */
describe('fixtures', () => {
  it('exposes the same reference data seed:school reads', () => {
    expect(classesData).toBe(classesJson);
    expect(sectionsData).toBe(sectionsJson);
    expect(subjectsData).toBe(subjectsJson);
    expect(feeTypeData).toBe(feeTypesJson);
  });

  it('provides exactly sections A and B for every default class', () => {
    expect(sectionsData).toHaveLength(classesData.length * 2);
    for (const schoolClass of classesData) {
      expect(sectionsData.filter(section => section.classId === schoolClass.id).map(section => section.name)).toEqual(['A', 'B']);
    }
    expect(new Set(sectionsData.map(section => section.id)).size).toBe(sectionsData.length);
    expect(sectionsData.map(section => Number(section.roomNumber))).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
  });

  it('draws exam and assessment context from reference data, leaving the teacher to the caller', () => {
    const classIds = new Set(classesData.map((entry) => entry.id));
    const subjectIds = new Set(subjectsData.map((entry) => entry.id));

    for (let run = 0; run < 25; run += 1) {
      for (const generated of [generateExam(), generateAssessment()]) {
        expect(classIds.has(generated.classId)).toBe(true);
        expect(subjectIds.has(generated.subjectId)).toBe(true);
        const section = sectionsData.find((entry) => entry.id === generated.sectionId);
        expect(section?.classId).toBe(generated.classId);
        expect(generated.teacherId).toBe('');
      }
    }
  });

  it('generates a student placed in a real reference class and section', () => {
    const student = generateStudent();
    expect(student.name).toMatch(/\S+ \S+/);
    const section = sectionsData.find((entry) => entry.id === student.sectionId);
    expect(section?.classId).toBe(student.classId);
  });

  it('keeps generated teacher subjects appropriate to preschool, early primary and collège', () => {
    const teachers = createAssignments({ ASSIGNMENTS: [
      { CLASS_NAME: 'GS' }, { CLASS_NAME: 'CP' }, { CLASS_NAME: 'CE6' }, { CLASS_NAME: '1AC' },
    ] });
    const codesFor = (className: string) => {
      const schoolClass = classesData.find(schoolClass => schoolClass.name === className)!;
      return teachers.flatMap(teacher => teacher.assignments
        .filter(assignment => assignment.classId === schoolClass.id)
        .flatMap(assignment => assignment.subjectIds))
        .map(subjectId => subjectsData.find(subject => subject.id === subjectId)!.code);
    };
    expect(codesFor('GS')).toHaveLength(6);
    // Preschool uses the school's common subjects.
    expect(new Set(codesFor('GS'))).toEqual(new Set(['AR', 'FR', 'MATH', 'EI', 'ART', 'PE']));
    expect(codesFor('CP')).toContain('SCI');
    expect(codesFor('CP')).not.toContain('HG');
    expect(codesFor('CP')).not.toContain('PHY');
    expect(codesFor('CE6')).toContain('HG');
    expect(codesFor('CE6')).not.toContain('PHY');
    expect(codesFor('1AC')).toContain('PHY');
    expect(codesFor('1AC')).not.toContain('SCI');
  });

  it('uses the requested school year for every generated fee and never enrolls students in the future', () => {
    const academicYear = '2026-2027';
    const student = generateStudent({ academicYear });
    const fees = generateFees({ studentId: student.id, academicYear });
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    expect(student.enrollmentDate <= today).toBe(true);
    expect(fees.length).toBeGreaterThan(0);
    expect(fees.every((fee) => fee.academicYear === academicYear)).toBe(true);
    expect(fees.every((fee) => fee.effectiveDate === '2026-09-01')).toBe(true);
  });
});
