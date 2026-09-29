import { expect, it } from 'bun:test';
import { remapDemoAcademicReferences } from './demo-references';

it('reuses older class and section ids consistently across students, teachers and academic sources', () => {
  const records: any[] = [
    { studentId: 'student', classId: '2025-2026-CP', sectionId: '2025-2026-A' },
    { teacherId: 'teacher', assignments: [{ classId: '2025-2026-CP', sectionIds: ['2025-2026-A'], subjectIds: ['math'] }] },
    { classId: '2025-2026-CP', sectionIds: ['2025-2026-A'], teacherId: 'teacher' },
  ];
  remapDemoAcademicReferences(records, new Map([['2025-2026-CP', 'existing-cp']]), new Map([['2025-2026-A', 'existing-a']]));
  expect(records).toEqual([
    { studentId: 'student', classId: 'existing-cp', sectionId: 'existing-a' },
    { teacherId: 'teacher', assignments: [{ classId: 'existing-cp', sectionIds: ['existing-a'], subjectIds: ['math'] }] },
    { classId: 'existing-cp', sectionIds: ['existing-a'], teacherId: 'teacher' },
  ]);
});
