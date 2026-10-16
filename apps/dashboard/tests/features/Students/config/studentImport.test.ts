import { describe, expect, it } from 'bun:test';
import { ar, en, es, fr } from '@sms/contracts/locales';
import { buildStudentImport, type StudentImportReason } from '@/features/Students/config/studentImport';
import { SCHOOL_CLASS_NAMES } from '@sms/contracts';

const classes = [
  { id: 'c1', name: 'CE1', academicYear: '2025-2026', sections: [{ id: 's1', name: 'A' }, { id: 's2', name: 'B' }] },
  { id: 'c2', name: 'CE2', academicYear: '2025-2026', sections: [] },
];

// The row the table exports: its accessor keys, gender and status as stored.
const exported = {
  studentCode: 'STU-1', name: 'Yasmine Alaoui', email: 'yasmine@example.ma', phone: '',
  class: 'CE1', section: 'A', gender: 'F', status: 'active',
};

describe('student import', () => {
  it('preserves the optional Arabic name and Massar code without replacing the main name', () => {
    const result = buildStudentImport([{ ...exported, studentCode: 'F257114351', arabicName: '  ياسمين العلوي  ' }], classes, '2026-01-12');
    expect(result.problems).toEqual([]);
    expect(result.students[0]).toMatchObject({ studentCode: 'F257114351', name: exported.name, arabicName: 'ياسمين العلوي' });
    expect(buildStudentImport([{ ...exported, arabicName: '   ' }], classes, '2026-01-12').students[0]).not.toHaveProperty('arabicName');
    expect(buildStudentImport([{ ...exported, arabicName: 'ا'.repeat(101) }], classes, '2026-01-12').problems)
      .toEqual([{ row: 2, reason: 'invalidArabicName', value: undefined }]);
  });
  it('imports a guardian separately from the student login fields, without inventing a CIN', () => {
    const result = buildStudentImport([{
      ...exported, email: '', phone: '', guardianName: 'Fatima Alaoui', guardianPhone: '+212612345678', guardianRelationship: 'mother',
    }], classes, '2026-01-12');
    expect(result.problems).toEqual([]);
    expect(result.students[0].email).toBe('');
    expect(result.students[0]).not.toHaveProperty('phone');
    expect(result.students[0].parents?.[0]).toMatchObject({ name: 'Fatima Alaoui', phone: '+212612345678', relationshipType: 'mother' });
    expect(result.students[0].parents?.[0].cin).toBeUndefined();
  });

  it('retains a guardian with no contact details and uses the alternate phone when available', () => {
    const result = buildStudentImport([
      { ...exported, studentCode: 'S1', guardianName: 'Guardian One' },
      { ...exported, studentCode: 'S2', guardianName: 'Guardian Two', guardianPhone2: '+212612345678' },
    ], classes, '2026-01-12');
    expect(result.problems).toEqual([]);
    expect(result.students[0].parents?.[0]).toMatchObject({ name: 'Guardian One', relationshipType: 'guardian' });
    expect(result.students[0].parents?.[0].phone).toBeUndefined();
    expect(result.students[1].parents?.[0].phone).toBe('+212612345678');
  });

  it('flags invalid guardian details before sending a student request', () => {
    const result = buildStudentImport([{ ...exported, guardianName: 'Fatima Alaoui', guardianPhone: 'invalid' }], classes, '2026-01-12');
    expect(result.students).toEqual([]);
    expect(result.problems).toEqual([{ row: 2, reason: 'invalidGuardian', value: 'phone' }]);
  });
  it.each([...SCHOOL_CLASS_NAMES])('imports both class names for $official / $app', ({ official, app }) => {
    for (const savedName of [app, official]) {
      const existingClasses = [{ ...classes[0], name: savedName }];
      for (const inputName of [official, app, official.toLowerCase()]) {
        const result = buildStudentImport([{ ...exported, class: inputName, section: 1 }], existingClasses, '2026-01-12');
        expect(result.problems).toEqual([]);
        expect(result.students[0]).toMatchObject({ classId: 'c1', sectionId: 's1' });
      }
    }
  });

  it('imports an exported row back, admitted on the business date', () => {
    const { students, problems } = buildStudentImport([exported], classes, '2026-01-12');
    expect(problems).toEqual([]);
    expect(students).toEqual([{
      studentCode: 'STU-1', name: 'Yasmine Alaoui', email: 'yasmine@example.ma',
      gender: 'F', status: 'active', classId: 'c1', sectionId: 's1',
      enrollmentDate: '2026-01-12', yearEnrolledOn: '2026-01-12',
    }]);
  });

  it('matches names case-insensitively and reads spreadsheet cells as text', () => {
    const { students } = buildStudentImport([{
      ...exported, studentCode: 1042, class: ' ce1 ', section: 'b', gender: 'm', status: '',
      phone: 612345678, enrollmentDate: '2025-08-20T00:00:00.000Z', dateOfBirth: '2018-03-04',
    }], classes, '2026-01-12');
    expect(students[0]).toMatchObject({
      studentCode: '1042', classId: 'c1', sectionId: 's2', gender: 'M', phone: '612345678',
      dateOfBirth: '2018-03-04', enrollmentDate: '2025-08-20', yearEnrolledOn: '2025-09-01',
    });
    expect(students[0]).not.toHaveProperty('status');
  });

  it.each([1, '1', ' 1 ', 'a', 'A'])('matches section %j to A', (section) => {
    const result = buildStudentImport([{ ...exported, section }], classes, '2026-01-12');
    expect(result.problems).toEqual([]);
    expect(result.students[0]?.sectionId).toBe('s1');
  });

  it('matches numeric sections to letters independently of section order', () => {
    const letterClasses = [{
      ...classes[0],
      sections: [{ id: 's3', name: 'C' }, { id: 's2', name: 'B' }, { id: 's1', name: 'A' }],
    }];
    const result = buildStudentImport([1, '2', 3].map((section, index) => ({
      ...exported, studentCode: `STU-${index}`, section,
    })), letterClasses, '2026-01-12');
    expect(result.problems).toEqual([]);
    expect(result.students.map(student => student.sectionId)).toEqual(['s1', 's2', 's3']);
  });

  it('matches letters to existing numeric section names', () => {
    const numericClasses = [{
      ...classes[0],
      sections: [{ id: 's3', name: '3' }, { id: 's1', name: '1' }, { id: 's2', name: '2' }],
    }];
    const result = buildStudentImport(['a', 'B', ' c '].map((section, index) => ({
      ...exported, studentCode: `STU-${index}`, section,
    })), numericClasses, '2026-01-12');
    expect(result.problems).toEqual([]);
    expect(result.students.map(student => student.sectionId)).toEqual(['s1', 's2', 's3']);
  });

  it('prefers the exact section name when both naming conventions exist', () => {
    const mixedClasses = [{
      ...classes[0], sections: [{ id: 'letter', name: 'A' }, { id: 'number', name: '1' }],
    }];
    for (const [section, id] of [['1', 'number'], ['a', 'letter']]) {
      const result = buildStudentImport([{ ...exported, section }], mixedClasses, '2026-01-12');
      expect(result.problems).toEqual([]);
      expect(result.students[0]?.sectionId).toBe(id);
    }
  });

  it.each(['', '0', '-1', '1.5', '3', '27', 'AA'])('rejects section %j without a matching section', (section) => {
    const result = buildStudentImport([{ ...exported, section }], classes, '2026-01-12');
    expect(result.students).toEqual([]);
    expect(result.problems).toEqual([{ row: 2, reason: 'unknownSection', value: section }]);
  });

  it('preserves custom section names without treating their array position as a number', () => {
    const customClasses = [{ ...classes[0], sections: [{ id: 'custom', name: 'Blue' }] }];
    const exact = buildStudentImport([{ ...exported, section: 'blue' }], customClasses, '2026-01-12');
    expect(exact.problems).toEqual([]);
    expect(exact.students[0]?.sectionId).toBe('custom');
    const numeric = buildStudentImport([{ ...exported, section: 1 }], customClasses, '2026-01-12');
    expect(numeric.students).toEqual([]);
    expect(numeric.problems).toEqual([{ row: 2, reason: 'unknownSection', value: '1' }]);
  });

  it('creates nobody when any row is wrong, naming each spreadsheet line', () => {
    const { problems } = buildStudentImport([
      exported,
      { ...exported, studentCode: 'STU-1', name: '', gender: 'X' },
      { ...exported, studentCode: 'STU-3', class: 'CM2', status: 'expelled' },
      { ...exported, studentCode: 'STU-4', class: 'CE2', enrollmentDate: '2026-02-30' },
    ], classes, '2026-01-12');
    expect(problems).toEqual([
      { row: 3, reason: 'missingName', value: undefined },
      { row: 3, reason: 'duplicateCode', value: 'STU-1' },
      { row: 3, reason: 'invalidGender', value: 'X' },
      { row: 4, reason: 'invalidStatus', value: 'expelled' },
      { row: 4, reason: 'unknownClass', value: 'CM2' },
      { row: 5, reason: 'unknownSection', value: 'A' },
      { row: 5, reason: 'invalidDate', value: '2026-02-30' },
    ]);
  });

  it('has every reason in all four catalogs', () => {
    const reasons: StudentImportReason[] = ['missingName', 'invalidArabicName', 'invalidGender', 'invalidStatus', 'unknownClass', 'unknownSection', 'invalidDate', 'duplicateCode', 'invalidGuardian'];
    for (const catalog of [en, fr, es, ar] as any[]) {
      for (const reason of reasons) expect(typeof catalog.students.import.reasons[reason]).toBe('string');
    }
  });
});
