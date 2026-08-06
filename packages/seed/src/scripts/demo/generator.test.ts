import { describe, expect, it } from 'bun:test';

import { createBehaviorRewardDto } from '@server/modules/behaviorRewards/BehaviorRewardDto';
import { createDisciplineDto, resolveDisciplineDto } from '@server/modules/discipline/DisciplineDto';
import { seedGradeDto } from '@server/modules/grades/GradeDto';
import { createVehicleAssignmentDto } from '@server/modules/transport/vehicleAssignments/VehicleAssignmentDto';
import { createStudentRouteDto } from '@server/modules/transport/studentRoutes/StudentRouteDto';
import drivers from './data/drivers.json';
import students from './data/students.json';
import teachers from './data/teachers.json';
import vehicles from './data/vehicles.json';
import {
  behaviorRewardsPack,
  disciplinePack,
  gradesPack,
  studentRoutesPack,
  vehicleAssignmentsPack,
} from './generator';

describe('demo operational data generators', () => {
  it('generates discipline incidents for students assigned to the reporting teacher', () => {
    const { disciplineIncidents } = disciplinePack(students, teachers, 12);

    expect(disciplineIncidents).toHaveLength(12);
    for (const incident of disciplineIncidents) {
      const teacher = teachers.find((candidate) => candidate.id === incident.teacherId);
      const student = students.find((candidate) => candidate.id === incident.studentId);
      const sectionIds = teacher?.assignments.flatMap((assignment) => assignment.sectionIds) || [];
      const { teacherId: _teacherId, resolution, ...input } = incident;

      expect(sectionIds).toContain(student?.sectionId);
      expect(createDisciplineDto.safeParse(input).success).toBe(true);
      if (resolution) expect(resolveDisciplineDto.safeParse(resolution).success).toBe(true);
    }
  });

  it('generates valid rewards for students assigned to the awarding teacher', () => {
    const { behaviorRewards } = behaviorRewardsPack(students, teachers, 15);

    expect(behaviorRewards).toHaveLength(15);
    for (const reward of behaviorRewards) {
      const teacher = teachers.find((candidate) => candidate.id === reward.teacherId);
      const student = students.find((candidate) => candidate.id === reward.studentId);
      const sectionIds = teacher?.assignments.flatMap((assignment) => assignment.sectionIds) || [];
      const { teacherId: _teacherId, ...input } = reward;

      expect(sectionIds).toContain(student?.sectionId);
      expect(createBehaviorRewardDto.safeParse(input).success).toBe(true);
    }
  });

  it('keeps vehicle-driver and student-vehicle assignments valid', () => {
    const { vehicleAssignments } = vehicleAssignmentsPack(vehicles, drivers, 5);
    const { studentRoutes } = studentRoutesPack(students, vehicles, 8);

    expect(vehicleAssignments).toHaveLength(5);
    expect(studentRoutes).toHaveLength(8);
    expect(vehicleAssignments.every((item) => createVehicleAssignmentDto.safeParse(item).success)).toBe(true);
    expect(studentRoutes.every((item) => createStudentRouteDto.safeParse(item).success)).toBe(true);
  });

  it('generates roster-based grades for completed assessments and exams', () => {
    const roster = [
      { id: 'student-1', sectionId: 'section-a' },
      { id: 'student-2', sectionId: 'section-a' },
      { id: 'student-3', sectionId: 'section-b' },
    ];
    const assessments = [
      { id: 'assessment-1', sectionId: 'section-a', status: 'completed', totalMarks: 20 },
      { id: 'assessment-2', sectionId: 'section-b', status: 'scheduled', totalMarks: 20 },
    ];
    const exams = [
      { id: 'exam-1', sectionId: 'section-a', status: 'completed', totalMarks: 100 },
      { id: 'exam-2', sectionId: 'section-b', status: 'scheduled', totalMarks: 100 },
    ];

    const { grades } = gradesPack(roster, assessments, exams, 0);

    expect(grades).toHaveLength(4);
    expect(grades.filter((grade) => grade.assessmentId)).toHaveLength(2);
    expect(grades.filter((grade) => grade.examId)).toHaveLength(2);
    expect(grades.every((grade) => seedGradeDto.safeParse(grade).success)).toBe(true);
  });
});
