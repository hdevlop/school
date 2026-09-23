import { describe, expect, it } from 'bun:test';
import settingsData from '../school/data/settings.json';
import { DEFAULT_DEMO_COUNTS, studentRoutesPack, studentsPack } from './generator';

it('generates 100 students by default', async () => {
  expect(DEFAULT_DEMO_COUNTS.students).toBe(100);
  const { students } = await studentsPack();
  expect(students).toHaveLength(100);
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
