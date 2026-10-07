import type { ClassRoutineService, SectionService } from '@sms/server/modules/seed';
import { createProgressLogger } from './demo-phases';
import { placeLessons, weeklyLessons, type PlannedLesson } from './timetable';

/**
 * One published timetable per section that has teachers, in the selected
 * year. Lessons are planned without a teacher or section double-booked, then
 * written through ClassRoutineService, whose validator checks every entry
 * again. A section that already has a timetable keeps it, and its lessons
 * keep their teachers busy for the others.
 */
export async function seedTimetables(classRoutineService: ClassRoutineService, sectionService: SectionService) {
  const sections = await sectionService.getAll();
  const busy = new Set<string>();
  const planned: PlannedLesson[] = [];
  const assignmentIds = new Map<string, string>();

  for (const section of sections) {
    const existing = await classRoutineService.getPublishedForSection(section.id);
    if (existing?.entries.length) {
      const lessons = existing.periods.filter((period) => !period.isBreak).map((period) => period.id);
      for (const entry of existing.entries) {
        busy.add(`${entry.teacherId}|${entry.dayOfWeek}|${lessons.indexOf(entry.periodId)}`);
      }
      continue;
    }
    const seen = new Set<string>();
    for (const assignment of await classRoutineService.getAssignments(section.id)) {
      if (seen.has(assignment.subjectId)) continue;
      seen.add(assignment.subjectId);
      assignmentIds.set(`${section.id}|${assignment.subjectId}`, assignment.id);
      planned.push({
        sectionId: section.id,
        subjectId: assignment.subjectId,
        teacherId: assignment.teacherId,
        lessons: weeklyLessons(section.class?.level, assignment.subjectCode),
      });
    }
  }

  const { placed, unplaced } = placeLessons(planned, busy);
  const sectionIds = [...new Set(planned.map((lesson) => lesson.sectionId))];
  const logProgress = createProgressLogger('Timetables', sectionIds.length, 5);
  logProgress(0, 'created 0 lessons');
  let lessonCount = 0;
  let skippedCount = unplaced;

  for (const [index, sectionId] of sectionIds.entries()) {
    const section = sections.find((item) => item.id === sectionId)!;
    const schedule = await classRoutineService.create({
      sectionId,
      name: `${section.class?.name ?? ''} ${section.name}`.trim(),
      activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    });
    const lessons = schedule.periods
      .filter((period) => !period.isBreak)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    for (const lesson of placed.filter((item) => item.sectionId === sectionId)) {
      try {
        await classRoutineService.addEntry(schedule.id, {
          dayOfWeek: lesson.day as any,
          periodId: lessons[lesson.lesson].id,
          teacherAssignmentId: assignmentIds.get(`${sectionId}|${lesson.subjectId}`)!,
        });
        lessonCount++;
      } catch (error: any) {
        skippedCount++;
        console.warn(`  ⚠️  Lesson skipped for section ${sectionId}: ${error?.message}`);
      }
    }
    logProgress(index + 1, `created ${lessonCount} lessons`);
  }

  return { timetableCount: sectionIds.length, lessonCount, skippedCount };
}
