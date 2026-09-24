import { describe, expect, it } from 'bun:test';

import classesJson from '../src/fixtures/data/classes.json';
import feeTypesJson from '../src/fixtures/data/feeTypes.json';
import sectionsJson from '../src/fixtures/data/sections.json';
import subjectsJson from '../src/fixtures/data/subjects.json';
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
