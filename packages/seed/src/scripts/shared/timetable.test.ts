import { expect, it } from 'bun:test';
import {
  MAX_TEACHER_CLASSES,
  MAX_TEACHER_LESSONS,
  TIMETABLE_SLOTS,
  fillSections,
  placeLessons,
  shareUnits,
  weeklyLessons,
} from './timetable';

it('fills a section before the next one opens', () => {
  expect(fillSections(11, 3)).toEqual([11, 0, 0]);
  expect(fillSections(40, 3)).toEqual([20, 20, 0]);
  expect(fillSections(0, 3)).toEqual([0, 0, 0]);
  expect(fillSections(200, 3).reduce((sum, count) => sum + count, 0)).toBe(200);
});

it('covers all lessons with one subject and at most two classes per teacher', () => {
  const units = ['A', 'B', 'C', 'D', 'E'].flatMap((sectionId) =>
    ['AR', 'FR', 'MATH'].map((subjectId) => ({ classId: sectionId, sectionId, subjectId, lessons: weeklyLessons('Primaire', subjectId) })));
  const shares = shareUnits(units);
  expect(shares.flat()).toHaveLength(units.length);
  expect(new Set(shares.flat())).toEqual(new Set(units));
  for (const share of shares) {
    expect(new Set(share.map((unit) => unit.subjectId)).size).toBe(1);
    expect(new Set(share.map((unit) => unit.classId)).size).toBeLessThanOrEqual(MAX_TEACHER_CLASSES);
    expect(share.reduce((sum, unit) => sum + unit.lessons, 0)).toBeLessThanOrEqual(MAX_TEACHER_LESSONS);
  }
  expect(() => shareUnits(units, 3)).toThrow('--teachers=3');
  expect(() => shareUnits(units, units.length + 1)).toThrow('at most');
  const fixed = shareUnits(units, shares.length + 1);
  expect(fixed).toHaveLength(shares.length + 1);
  expect(new Set(fixed.flat())).toEqual(new Set(units));
  for (const share of fixed) {
    expect(new Set(share.map((unit) => unit.subjectId)).size).toBe(1);
    expect(new Set(share.map((unit) => unit.classId)).size).toBeLessThanOrEqual(MAX_TEACHER_CLASSES);
  }
});

it('places a school week without double-booking a section or a teacher', () => {
  const sections = ['CP-A', 'CE1-A', 'CE2-A', 'CM1-A', 'CM2-A'];
  const subjects = ['AR', 'FR', 'MATH', 'ENG', 'PE', 'SVT', 'PHY', 'HIST', 'GEO', 'INFO'];
  const units = subjects.flatMap((subjectId) => sections.map((sectionId) => ({
    classId: sectionId, sectionId, subjectId, lessons: weeklyLessons('Primaire', subjectId),
  })));
  const planned = shareUnits(units).flatMap((share, index) => share.map((unit) => ({ ...unit, teacherId: `T${index}` })));
  const busy = new Set(['T0|monday|0']);

  const { placed, unplaced } = placeLessons(planned, busy);

  expect(unplaced).toBe(0);
  expect(placed).toHaveLength(units.reduce((sum, unit) => sum + unit.lessons, 0));
  const keys = placed.flatMap((lesson) => [
    `${lesson.sectionId}|${lesson.day}|${lesson.lesson}`,
    `${lesson.teacherId}|${lesson.day}|${lesson.lesson}`,
  ]);
  expect(new Set(keys).size).toBe(keys.length);
  expect(keys).not.toContain('T0|monday|0');
  for (const lesson of placed) {
    expect(TIMETABLE_SLOTS).toContainEqual({ day: lesson.day, lesson: lesson.lesson });
  }
});

it('teaches Monday to Thursday all day, Friday and Saturday mornings only', () => {
  const lessonsOn = (day: string) => TIMETABLE_SLOTS.filter((slot) => slot.day === day).map((slot) => slot.lesson);
  for (const day of ['monday', 'tuesday', 'wednesday', 'thursday']) expect(lessonsOn(day)).toEqual([0, 1, 2, 3, 4, 5]);
  for (const day of ['friday', 'saturday']) expect(lessonsOn(day)).toEqual([0, 1, 2]);
  expect(lessonsOn('sunday')).toEqual([]);
});

it('fits a full collège week in those mornings and afternoons', () => {
  const sections = ['1AC-A', '2AC-A', '3AC-A'];
  const subjects = ['MATH', 'FR', 'AR', 'ENG', 'PHY', 'SVT', 'EI', 'HG', 'PE', 'INFO', 'ART'];
  const units = subjects.flatMap((subjectId) => sections.map((sectionId) => ({
    classId: sectionId, sectionId, subjectId, lessons: weeklyLessons('Collège', subjectId),
  })));
  const planned = shareUnits(units).flatMap((share, index) => share.map((unit) => ({ ...unit, teacherId: `T${index}` })));

  const { placed, unplaced } = placeLessons(planned);

  expect(unplaced).toBe(0);
  expect(placed.filter((lesson) => lesson.sectionId === '1AC-A')).toHaveLength(28);
});

it('counts classes separately from sections while respecting the weekly workload', () => {
  const units = ['CP', 'CE1', 'CE2'].flatMap((classId) => ['A', 'B', 'C'].map((section) => ({
    classId, sectionId: `${classId}-${section}`, subjectId: 'AR', lessons: 7,
  })));
  const shares = shareUnits(units);
  expect(shares.flat()).toHaveLength(units.length);
  expect(shares.some((share) => share.length > MAX_TEACHER_CLASSES)).toBe(true);
  for (const share of shares) {
    expect(new Set(share.map((unit) => unit.classId)).size).toBeLessThanOrEqual(MAX_TEACHER_CLASSES);
    expect(share.reduce((sum, unit) => sum + unit.lessons, 0)).toBeLessThanOrEqual(MAX_TEACHER_LESSONS);
  }
});

it('gives history and geography to separate teachers', () => {
  const units = ['HIST', 'GEO'].map((subjectId) => ({ classId: 'CP', sectionId: 'CP-A', subjectId, lessons: 1 }));
  expect(shareUnits(units)).toEqual(units.map((unit) => [unit]));
});

it('handles an empty school and rejects invalid teacher counts', () => {
  expect(shareUnits([])).toEqual([]);
  expect(() => shareUnits([], 1)).toThrow('at most 0');
  for (const count of [-1, 1.5, NaN]) expect(() => shareUnits([], count)).toThrow('--teachers');
});
// A school-wide day selection also limits the slots used by the demo seed.
it('places lessons only in the configured teaching-day slots', () => {
  const result = placeLessons([{ sectionId: 's1', subjectId: 'AR', teacherId: 't1', lessons: 2 }], new Set(), 1,
    [{ day: 'sunday', lesson: 0 }, { day: 'sunday', lesson: 1 }]);
  expect(result.unplaced).toBe(0);
  expect(result.placed.map((lesson) => lesson.day)).toEqual(['sunday', 'sunday']);
});
