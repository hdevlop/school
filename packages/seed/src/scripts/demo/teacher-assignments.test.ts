import { expect, it } from 'bun:test';
import { subjectsData } from '@sms/contracts/fixtures';
import { MAX_TEACHER_CLASSES, MAX_TEACHER_LESSONS, placeLessons, weeklyLessons } from '../shared/timetable';

function generateScenario(args: readonly string[]) {
  const generator = new URL('./generator.ts', import.meta.url).href;
  const structure = new URL('../shared/school-seed-data.ts', import.meta.url).href;
  return Bun.spawnSync([process.execPath, '--eval', `
    import { studentsPack, teachersPack } from ${JSON.stringify(generator)};
    import { schoolSeedData } from ${JSON.stringify(structure)};
    const { students } = await studentsPack();
    const { teachers } = await teachersPack();
    console.log(JSON.stringify({
      teachers, classes: schoolSeedData.classesData,
      sectionIds: [...new Set(students.map((student) => student.sectionId))],
    }));
  `, '--', 'teacher-assignment-probe', '--year=2025-2026', ...args]);
}

it.each([
  { label: 'one occupied class', args: ['--students=12', '--classes=CP'], count: 10 },
  { label: 'multiple sections per class', args: ['--students=500'], count: undefined },
  { label: 'all school levels', args: ['--students=900', '--classes=ALL'], count: undefined },
  { label: 'an explicit larger staff', args: ['--students=100', '--classes=CP', '--teachers=12'], count: 12 },
  { label: 'one teacher per assignment', args: ['--students=100', '--classes=CP', '--teachers=30'], count: 30 },
  { label: 'no students', args: ['--students=0'], count: 0 },
])('keeps teacher assignments valid for $label', ({ args, count }) => {
  const result = generateScenario(args);
  expect(result.stderr.toString()).toBe('');
  expect(result.exitCode).toBe(0);
  const { teachers, classes, sectionIds } = JSON.parse(result.stdout.toString());
  if (count !== undefined) expect(teachers).toHaveLength(count);
  const planned = teachers.flatMap((teacher: any) => {
    const subjectIds = new Set(teacher.assignments.flatMap((assignment: any) => assignment.subjectIds));
    const classIds = new Set(teacher.assignments.map((assignment: any) => assignment.classId));
    expect(subjectIds.size).toBe(1);
    expect(classIds.size).toBeGreaterThanOrEqual(1);
    expect(classIds.size).toBeLessThanOrEqual(MAX_TEACHER_CLASSES);
    expect(teacher.specialization).toBe(subjectsData.find((subject) => subjectIds.has(subject.id))?.name);
    const lessons = teacher.assignments.flatMap((assignment: any) => {
      const level = classes.find((schoolClass: any) => schoolClass.id === assignment.classId)?.level;
      return assignment.sectionIds.flatMap((sectionId: string) => assignment.subjectIds.map((subjectId: string) => ({
        sectionId, subjectId, teacherId: teacher.id,
        lessons: weeklyLessons(level, subjectsData.find((subject) => subject.id === subjectId)!.code),
      })));
    });
    const workload = lessons.reduce((sum: number, lesson: any) => sum + lesson.lessons, 0);
    expect(teacher.workloadHours).toBe(workload);
    expect(workload).toBeGreaterThan(0);
    expect(workload).toBeLessThanOrEqual(MAX_TEACHER_LESSONS);
    return lessons;
  });
  const actual = planned.map((lesson: any) => `${lesson.sectionId}:${lesson.subjectId}`);
  const expected = sectionIds.flatMap((sectionId: string) => subjectsData.map((subject) => `${sectionId}:${subject.id}`));
  expect(actual).toHaveLength(expected.length);
  expect(new Set(actual)).toEqual(new Set(expected));
  expect(placeLessons(planned).unplaced).toBe(0);
});

it.each([
  { label: 'too few teachers', args: ['--teachers=1'] },
  { label: 'too many teachers', args: ['--classes=CP', '--teachers=31'] },
])('rejects $label before generating seed data', ({ args }) => {
  const result = generateScenario(['--students=100', ...args]);
  expect(result.exitCode).not.toBe(0);
  expect(result.stderr.toString()).toContain('--teachers=');
  expect(result.stdout.toString()).toBe('');
});
