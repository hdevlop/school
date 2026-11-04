// Run in a separate process so the profile's hook mocks never leak into other tests.
import assert from 'node:assert/strict';
import { mock } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let permissions: string[] = [];
const reportRequests: Array<string | null> = [];
const student = { id: 'student-1', name: 'Yasmine Alaoui', gender: 'F', status: 'active' };
const empty = () => null;

mock.module('next/navigation', () => ({ useRouter: () => ({ push: () => {} }) }));
mock.module('najm-i18n/react', () => ({ useTranslation: () => ({ t: (key: string) => key, language: 'en' }) }));
mock.module('@/features/Users/hooks/useViewerRole', () => ({
  useViewerRole: () => ({ isSchoolWide: true, isFamily: false, can: (permission: string) => permissions.includes(permission) }),
}));
mock.module('@/features/Students/hooks/useStudentProfile', () => ({
  useStudentProfile: () => ({ student, isStudentLoading: false, canReadParents: true, parents: [], isParentsLoading: false }),
}));
mock.module('@/features/Students/hooks/useStudents', () => ({ useStudents: () => ({ updateStudent: async () => {}, isUpdating: false }) }));
mock.module('@/features/Grades/hooks/useGrades', () => ({
  useStudentReport: (studentId: string | null) => {
    reportRequests.push(studentId);
    return { data: undefined };
  },
  useGrades: () => ({}),
}));
mock.module('@/features/Classes/hooks/useClasses', () => ({ useClasses: () => ({ classes: [] }) }));
mock.module('@/features/Attendance/hooks/useAttendance', () => ({ useStudentAttendanceRecords: () => ({ data: [] }) }));
mock.module('@/features/Financial/Fees/hooks/useFees', () => ({ useFees: () => ({ studentFees: undefined }) }));
mock.module('@/features/Alerts/hooks/useAlerts', () => ({ useAlerts: () => ({ alerts: [] }) }));
mock.module('@/features/AcademicYears/hooks/useViewingAcademicYear', () => ({ useViewingAcademicYear: () => ({ viewingYear: '2026-2027' }) }));
mock.module('@/hooks/useSchoolFormat', () => ({ useSchoolFormat: () => ({ majorMoney: (value: number) => String(value) }) }));
mock.module('@/shared/useDialog', () => ({ useDialog: () => ({ openDialog: () => {} }) }));
for (const tab of ['Overview', 'Fees', 'Alerts', 'Attendance', 'Grades', 'Transport']) {
  mock.module(`@/features/Students/components/StudentProfile/${tab}`, () => ({ default: empty }));
}
mock.module('@/features/Students/components/SimpleStudentForm', () => ({ default: empty }));

const { default: StudentProfile } = await import('@/features/Students/components/StudentProfile');
const render = (granted: string[]) => {
  permissions = granted;
  reportRequests.length = 0;
  return renderToStaticMarkup(<StudentProfile studentId="student-1" />);
};
const GRADE_LABELS = ['students.profile.tabs.grades', 'students.profile.gpa', 'students.profile.examsAverage', 'students.profile.averageGrade'];

// A role that may open a student but not read grades: no tab, no figures, no request.
const withoutGrades = render(['read:students']);
for (const label of GRADE_LABELS) assert.doesNotMatch(withoutGrades, new RegExp(label), label);
assert.match(withoutGrades, /students\.profile\.tabs\.overview/);
assert.match(withoutGrades, /students\.profile\.absences/);
assert.ok(reportRequests.length > 0);
assert.ok(reportRequests.every((studentId) => studentId === null));

const withGrades = render(['read:students', 'read:grades']);
for (const label of GRADE_LABELS) assert.match(withGrades, new RegExp(label), label);
assert.ok(reportRequests.includes('student-1'));

console.log('student profile grades verified');
