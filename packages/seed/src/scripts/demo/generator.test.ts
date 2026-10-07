import { describe, expect, it } from 'bun:test';
import settingsData from '../school/data/settings.json';
import { feeTypeData, subjectsData } from '@sms/contracts/fixtures';
import {
  DEFAULT_DEMO_COUNTS,
  assessmentsPack,
  examsPack,
  expensesPack,
  gradesPack,
  staffPack,
  studentRoutesPack,
  studentsPack,
  teachersPack,
  transportPack,
} from './generator';
import { seedAcademicYear } from '../shared/school-seed-data';

it('generates 100 students by default', async () => {
  expect(DEFAULT_DEMO_COUNTS.students).toBe(100);
  const { students } = await studentsPack();
  expect(students).toHaveLength(100);
});

it('sizes the default school so tuition carries its payroll and running costs', async () => {
  const { fees, students } = await studentsPack();
  const { teachers } = await teachersPack();
  const { drivers } = await transportPack();
  const { staff } = staffPack();
  const { expenses } = await expensesPack();
  const feeTypes = new Map(feeTypeData.map((type: any) => [type.id, type]));
  const monthlyTuition = fees
    .filter((fee: any) => feeTypes.get(fee.feeTypeId)?.paymentType === 'recurring')
    .reduce((sum: number, fee: any) => sum + Number(feeTypes.get(fee.feeTypeId).amount), 0);
  const payroll = [...teachers, ...drivers, ...staff].reduce((sum, person: any) => sum + Number(person.salary), 0);
  const termMonths = new Set(expenses.map((expense: any) => expense.expenseDate.slice(0, 7))).size || 1;
  const monthlyRunningCosts = expenses.reduce((sum: number, expense: any) => sum + Number(expense.amount), 0) / termMonths;

  expect(payroll).toBeLessThan(monthlyTuition * 0.7);
  expect(payroll + monthlyRunningCosts).toBeLessThan(monthlyTuition * 0.85);
  // Every section with students is taught every subject, by exactly one teacher.
  const sectionIds = new Set(students.map((student: any) => student.sectionId));
  const taught = teachers.flatMap((teacher) => teacher.assignments.flatMap((assignment: any) =>
    assignment.sectionIds.flatMap((sectionId: string) =>
      assignment.subjectIds.map((subjectId: string) => `${sectionId}:${subjectId}`))));
  expect(new Set(taught).size).toBe(taught.length);
  expect(taught).toHaveLength(sectionIds.size * subjectsData.length);
  for (const key of taught) expect(sectionIds.has(key.split(':')[0])).toBe(true);
});

it('keeps demo academic sources in the teaching year and grades students after entry', async () => {
  const { teachers } = await teachersPack();
  const { students } = await studentsPack();
  const { assessments } = assessmentsPack(teachers);
  const { exams } = examsPack(teachers);
  const startsOn = `${seedAcademicYear.slice(0, 4)}-09-01`;
  const endsOn = `${seedAcademicYear.slice(5)}-06-30`;
  for (const source of [...assessments, ...exams]) {
    expect(source.date >= startsOn && source.date <= endsOn).toBe(true);
  }
  // Every taught section and subject follows the whole calendar.
  const taught = new Set(teachers.flatMap((teacher) => teacher.assignments.flatMap((assignment: any) =>
    assignment.sectionIds.flatMap((sectionId: string) =>
      assignment.subjectIds.map((subjectId: string) => `${sectionId}:${subjectId}`)))));
  expect(assessments).toHaveLength(taught.size * 6);
  expect(exams).toHaveLength(taught.size * 2);
  for (const source of [...assessments, ...exams]) {
    expect(taught.has(`${source.sectionId}:${source.subjectId}`)).toBe(true);
    expect(source.status).toBe(source.date <= new Date().toISOString().slice(0, 10) ? 'completed' : 'scheduled');
  }
  const { grades } = gradesPack(students, assessments, exams);
  const sources = new Map([...assessments, ...exams].map((source) => [source.id, source]));
  const studentsById = new Map(students.map((student: any) => [student.id, student]));
  for (const grade of grades) {
    const student = studentsById.get(grade.studentId);
    const source = sources.get(grade.assessmentId ?? grade.examId);
    expect(student?.yearEnrolledOn <= source?.date).toBe(true);
  }
});

describe('student route demo data', () => {
  it('uses active vehicles and dates inside each student’s billable academic year', () => {
    const startYear = Number(settingsData.currentAcademicYear.split('-')[0]);
    const yearStart = `${startYear}-09-01`;
    const yearEnd = `${startYear + 1}-06-30`;
    const students = Array.from({ length: 50 }, (_, index) => ({
      id: `student-${index}`,
      enrollmentDate: index % 2 === 0 ? `${startYear}-08-01` : yearEnd,
      status: 'active',
      address: 'Casablanca',
    }));
    const vehicles = [
      { id: 'maintenance', status: 'maintenance' },
      { id: 'active', status: 'active' },
      { id: 'retired', status: 'retired' },
    ];

    const { studentRoutes } = studentRoutesPack(students, vehicles, students.length);

    expect(studentRoutes).toHaveLength(students.length);
    for (const route of studentRoutes) {
      const student = students.find((candidate) => candidate.id === route.studentId)!;
      expect(route.vehicleId).toBe('active');
      expect(route.assignmentDate >= yearStart).toBe(true);
      expect(route.assignmentDate >= student.enrollmentDate).toBe(true);
      expect(route.assignmentDate <= yearEnd).toBe(true);
    }
  });

  it('rejects a route request when no vehicle is active', () => {
    const startYear = Number(settingsData.currentAcademicYear.split('-')[0]);
    expect(() => studentRoutesPack(
      [{ id: 'student', enrollmentDate: `${startYear}-09-01`, status: 'active' }],
      [{ id: 'retired', status: 'retired' }],
      1,
    )).toThrow('without an active vehicle');
  });
});
