import { describe, expect, it } from 'bun:test';
import { ar, en, es, fr } from '@sms/contracts/locales';
import { buildStudentImport, type StudentImportReason } from '@/features/Students/config/studentImport';

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
    const reasons: StudentImportReason[] = ['missingName', 'invalidGender', 'invalidStatus', 'unknownClass', 'unknownSection', 'invalidDate', 'duplicateCode'];
    for (const catalog of [en, fr, es, ar] as any[]) {
      for (const reason of reasons) expect(typeof catalog.students.import.reasons[reason]).toBe('string');
    }
  });
});
