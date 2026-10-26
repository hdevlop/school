// An illustrative private-school timetable, shared by the demo generator and
// seed. These lesson counts are not a regulatory hours/coefficient schedule.

/** Weekly lessons of each subject (by code) per section, by class level. */
const WEEKLY_LESSONS: Record<string, Record<string, number>> = {
  Maternelle: { PRELANG: 4, PREMATH: 4, PREDECO: 4, PREMOT: 4, PREART: 4, PREVIE: 4 },
  Primaire: { AR: 7, FR: 6, MATH: 5, EI: 2, SCI: 2, HG: 2, ART: 1, PE: 2 },
  Collège: { MATH: 5, FR: 4, AR: 4, ENG: 2, PHY: 2, SVT: 2, EI: 2, HG: 3, PE: 2, INFO: 1, ART: 1 },
};
const FALLBACK_LEVEL = 'Collège';

export function weeklyLessons(level: string | null | undefined, subjectCode: string) {
  const plan = WEEKLY_LESSONS[level ?? ''] ?? WEEKLY_LESSONS[FALLBACK_LEVEL];
  return plan[subjectCode] ?? 1;
}

/** A full-time teacher's weekly lessons; the seed never plans more. */
export const MAX_TEACHER_LESSONS = 26;
/** A demo teacher teaches one subject in at most two distinct classes. */
export const MAX_TEACHER_CLASSES = 2;
/** Below this weekly load a teacher is part-time and paid in proportion. */
export const PART_TIME_BELOW = 20;
/** Students a section takes before the next one of its class opens. */
export const SECTION_SIZE = 28;

/**
 * Monday to Thursday six lessons a day; Friday and Saturday the three morning
 * ones, before the 11:30 pause. Thirty slots hold a section's 27–28 lessons.
 */
export const TIMETABLE_SLOTS = [
  ...['monday', 'tuesday', 'wednesday', 'thursday']
    .flatMap((day) => Array.from({ length: 6 }, (_, lesson) => ({ day, lesson }))),
  ...['friday', 'saturday']
    .flatMap((day) => Array.from({ length: 3 }, (_, lesson) => ({ day, lesson }))),
];

/** Students of one class, filling a section before the next one opens. */
export function fillSections(students: number, sectionCount: number): number[] {
  if (sectionCount === 0) return [];
  const open = Math.min(sectionCount, Math.max(students > 0 ? 1 : 0, Math.ceil(students / SECTION_SIZE)));
  return Array.from({ length: sectionCount }, (_, index) => index < open
    ? Math.floor(students / open) + (index < students % open ? 1 : 0)
    : 0);
}

export type TeachingUnit = { classId: string; sectionId: string; subjectId: string; lessons: number };

/**
 * Covers every section and subject once. Each teacher keeps one subject,
 * at most two classes and at most `MAX_TEACHER_LESSONS` weekly lessons.
 * An explicit headcount splits valid shares without duplicating assignments.
 */
export function shareUnits<T extends TeachingUnit>(units: T[], fixedCount = 0): T[][] {
  if (!Number.isSafeInteger(fixedCount) || fixedCount < 0) {
    throw new Error('--teachers must be a non-negative integer (0 = automatic staffing)');
  }
  const shares: T[][] = [];
  for (const unit of units) {
    const share = shares.find((candidate) => {
      const classes = new Set(candidate.map((item) => item.classId));
      return candidate[0].subjectId === unit.subjectId
        && (classes.has(unit.classId) || classes.size < MAX_TEACHER_CLASSES)
        && candidate.reduce((sum, item) => sum + item.lessons, 0) + unit.lessons <= MAX_TEACHER_LESSONS;
    });
    if (share) share.push(unit);
    else shares.push([unit]);
  }
  if (fixedCount > 0) {
    if (fixedCount < shares.length) {
      throw new Error(`--teachers=${fixedCount} cannot cover this demo with one subject and at most two classes per teacher; use at least ${shares.length} or --teachers=0`);
    }
    if (fixedCount > units.length) {
      throw new Error(`--teachers=${fixedCount} exceeds the available assignments; use at most ${units.length} or --teachers=0`);
    }
    while (shares.length < fixedCount) {
      const largest = shares.reduce((best, share) => share.length > best.length ? share : best);
      shares.push(largest.splice(Math.ceil(largest.length / 2)));
    }
  }
  return shares;
}

export type PlannedLesson ={ sectionId: string; subjectId: string; teacherId: string; lessons: number };
export type PlacedLesson = { sectionId: string; subjectId: string; teacherId: string; day: string; lesson: number };

// Small deterministic generator so a plan can be retried in another order.
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Places every lesson in a slot where neither its section nor its teacher is
 * busy, at most twice a day per subject, spreading a subject over the week.
 * `busy` holds teacher slots already taken (`teacherId|day|lesson`). Retries
 * in other orders and keeps the attempt that leaves the fewest lessons out.
 */
export function placeLessons(planned: PlannedLesson[], busy = new Set<string>(), attempts = 30, slots = TIMETABLE_SLOTS) {
  let best: { placed: PlacedLesson[]; unplaced: number } | null = null;
  const teacherLoad = new Map<string, number>();
  for (const item of planned) teacherLoad.set(item.teacherId, (teacherLoad.get(item.teacherId) ?? 0) + item.lessons);

  for (let attempt = 0; attempt < attempts && best?.unplaced !== 0; attempt++) {
    const next = random(attempt + 1);
    const taken = new Set(busy);
    const placed: PlacedLesson[] = [];
    let unplaced = 0;
    const order = [...planned]
      .map((item) => ({ item, tie: next() }))
      .sort((a, b) => (teacherLoad.get(b.item.teacherId)! - teacherLoad.get(a.item.teacherId)!)
        || (b.item.lessons - a.item.lessons) || (a.tie - b.tie))
      .map(({ item }) => item);

    for (const item of order) {
      for (let count = 0; count < item.lessons; count++) {
        const perDay = (day: string) => placed.filter((lesson) =>
          lesson.sectionId === item.sectionId && lesson.subjectId === item.subjectId && lesson.day === day).length;
        const free = slots
          .filter(({ day, lesson }) => !taken.has(`${item.sectionId}|${day}|${lesson}`)
            && !taken.has(`${item.teacherId}|${day}|${lesson}`)
            && perDay(day) < 2)
          .map((slot) => ({ slot, score: perDay(slot.day) * 10 + next() }))
          .sort((a, b) => a.score - b.score);
        const choice = free[0]?.slot;
        if (!choice) {
          unplaced++;
          continue;
        }
        taken.add(`${item.sectionId}|${choice.day}|${choice.lesson}`);
        taken.add(`${item.teacherId}|${choice.day}|${choice.lesson}`);
        placed.push({ ...item, day: choice.day, lesson: choice.lesson });
      }
    }
    if (!best || unplaced < best.unplaced) best = { placed, unplaced };
  }
  return best ?? { placed: [], unplaced: 0 };
}
