import { describe, expect, it } from 'bun:test';
import settingsData from '../school/data/settings.json';
import { DEFAULT_DEMO_COUNTS, assessmentsPack, examsPack, gradesPack, studentRoutesPack, studentsPack, teachersPack } from './generator';
import { seedAcademicYear } from '../shared/school-seed-data';

it('generates 100 students by default', async () => {
  expect(DEFAULT_DEMO_COUNTS.students).toBe(100);
  const { students } = await studentsPack();
  expect(students).toHaveLength(100);
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
