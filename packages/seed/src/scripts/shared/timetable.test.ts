import { expect, it } from 'bun:test';
import {
  MAX_TEACHER_LESSONS,
  TIMETABLE_SLOTS,
  fillSections,
  placeLessons,
  shareEvenly,
  shareUnits,
  subjectFamily,
  weeklyLessons,
} from './timetable';

it('fills a section before the next one opens', () => {
  expect(fillSections(11, 3)).toEqual([11, 0, 0]);
  expect(fillSections(40, 3)).toEqual([20, 20, 0]);
  expect(fillSections(0, 3)).toEqual([0, 0, 0]);
  expect(fillSections(200, 3).reduce((sum, count) => sum + count, 0)).toBe(200);
});

it('shares lessons at a full-time load, or evenly over a fixed staff', () => {
  const units = ['A', 'B', 'C', 'D', 'E'].flatMap((sectionId) =>
    ['AR', 'FR', 'MATH'].map((subjectId) => ({ sectionId, subjectId, lessons: weeklyLessons('Primaire', subjectId) })));
  const shares = shareUnits(units);
  expect(shares.flat()).toHaveLength(units.length);
  for (const share of shares) {
    expect(share.reduce((sum, unit) => sum + unit.lessons, 0)).toBeLessThanOrEqual(MAX_TEACHER_LESSONS);
  }
  expect(shareUnits(units, 3)).toHaveLength(3);
});

it('places a school week without double-booking a section or a teacher', () => {
  const sections = ['CP-A', 'CE1-A', 'CE2-A', 'CM1-A', 'CM2-A'];
  const subjects = ['AR', 'FR', 'MATH', 'ENG', 'PE', 'SVT', 'PHY', 'HIST', 'GEO', 'INFO'];
  const units = subjects.flatMap((subjectId) => sections.map((sectionId) => ({
    sectionId, subjectId, lessons: weeklyLessons('Primaire', subjectId),
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
  const sections = ['CE6-A', '1AC-A', '2AC-A', '3AC-A'];
  const subjects = ['MATH', 'FR', 'AR', 'ENG', 'PHY', 'SVT', 'PE', 'HIST', 'GEO', 'INFO'];
  const units = subjects.flatMap((subjectId) => sections.map((sectionId) => ({
    sectionId, subjectId, lessons: weeklyLessons('Collège', subjectId),
  })));
  const planned = shareUnits(units).flatMap((share, index) => share.map((unit) => ({ ...unit, teacherId: `T${index}` })));

  const { placed, unplaced } = placeLessons(planned);

  expect(unplaced).toBe(0);
  expect(placed.filter((lesson) => lesson.sectionId === '1AC-A')).toHaveLength(28);
});

it('keeps a subject with full-time teachers and no token contract', () => {
  const units = ['CE6', '1AC', '2AC', '3AC', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'].map((sectionId, index) =>
    ({ sectionId, subjectId: 'MATH', lessons: weeklyLessons(index < 4 ? 'Collège' : 'Primaire', 'MATH') }));
  const loads = shareEvenly(units).map((share) => share.reduce((sum, unit) => sum + unit.lessons, 0));

  expect(loads).toEqual([25, 20]);
  for (const value of loads) expect(value).toBeLessThanOrEqual(MAX_TEACHER_LESSONS);
});

it('gives a teacher one subject, history and geography taught together', () => {
  const families = ['MATH', 'AR', 'FR', 'ENG', 'PHY', 'SVT', 'HIST', 'INFO', 'PE'].map(subjectFamily);
  expect(new Set(families).size).toBe(families.length);
  expect(subjectFamily('GEO')).toBe(subjectFamily('HIST'));
});
