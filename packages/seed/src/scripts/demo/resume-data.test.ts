import { expect, it } from 'bun:test';
import { assessmentsPack, examsPack, gradesPack } from './generator';

it('builds resumed academic records from persisted people and placement ids', () => {
  const teachers = [{
    id: 'persisted-teacher', userId: 'persisted-user',
    assignments: [{
      classId: 'persisted-class', sectionIds: ['persisted-section'], subjectIds: ['math'],
    }],
  }];
  const { assessments } = assessmentsPack(teachers, 1);
  const { exams } = examsPack(teachers, 1);
  for (const source of [...assessments, ...exams]) {
    expect(source).toMatchObject({
      teacherId: 'persisted-teacher', teacherUserId: 'persisted-user',
      classId: 'persisted-class', sectionId: 'persisted-section', subjectId: 'math',
    });
  }
  const { grades } = gradesPack([
    { id: 'existing-student', sectionId: 'persisted-section', yearEnrolledOn: '2000-09-01' },
    { id: 'late-student', sectionId: 'persisted-section', yearEnrolledOn: '9999-09-01' },
    { id: 'other-student', sectionId: 'another-section', yearEnrolledOn: '2000-09-01' },
  ], assessments, exams);
  expect(grades).toHaveLength(2);
  expect(grades[0]).toMatchObject({
    studentId: 'existing-student', assessmentId: assessments[0].id, gradedBy: 'persisted-user',
  });
  expect(grades[1]).toMatchObject({
    studentId: 'existing-student', examId: exams[0].id, gradedBy: 'persisted-user',
  });
});
