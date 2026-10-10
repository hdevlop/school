// A private school's weekly timetable, shared by the generator (how many
// teachers a school needs) and the seed (which lesson goes in which slot).

/** Weekly lessons of each subject (by code) per section, by class level. */
const WEEKLY_LESSONS: Record<string, Record<string, number>> = {
  Primaire: { AR: 7, FR: 6, MATH: 5, ENG: 2, PE: 2, SVT: 1, PHY: 1, HIST: 1, GEO: 1, INFO: 1 },
  Collège: { MATH: 5, FR: 5, AR: 5, ENG: 3, PHY: 3, SVT: 2, PE: 2, HIST: 1, GEO: 1, INFO: 1 },
};
const FALLBACK_LEVEL = 'Collège';

export function weeklyLessons(level: string | null | undefined, subjectCode: string) {
  const plan = WEEKLY_LESSONS[level ?? ''] ?? WEEKLY_LESSONS[FALLBACK_LEVEL];
  return plan[subjectCode] ?? 1;
}

/**
 * Subjects one teacher takes together, in hiring order. A teacher teaches one
 * subject; history and geography are the exception, taught as one discipline.
 */
const SUBJECT_FAMILIES = [['MATH'], ['AR'], ['FR'], ['ENG'], ['PHY'], ['SVT'], ['HIST', 'GEO'], ['INFO'], ['PE']];

/** Position of a subject's family in `SUBJECT_FAMILIES`; unknown subjects come last. */
export function subjectFamily(subjectCode: string) {
  const index = SUBJECT_FAMILIES.findIndex((family) => family.includes(subjectCode));
  return index < 0 ? SUBJECT_FAMILIES.length : index;
}

/** A full-time teacher's weekly lessons; the seed never plans more. */
export const MAX_TEACHER_LESSONS = 26;
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

export type TeachingUnit = { sectionId: string; subjectId: string; lessons: number };

/**
 * Splits the units, already ordered so a teacher's share stays within a level
 * and subject, among teachers: each one fills to `MAX_TEACHER_LESSONS`, or,
 * when the count is fixed, the units are spread evenly over that many.
 */
export function shareUnits<T extends TeachingUnit>(units: T[], fixedCount = 0): T[][] {
  const total = units.reduce((sum, unit) => sum + unit.lessons, 0);
  const shares: T[][] = [];
  let before = 0;
  for (const unit of units) {
    if (fixedCount > 0) {
      const index = Math.min(fixedCount - 1, Math.floor(before * fixedCount / Math.max(1, total)));
      (shares[index] ??= []).push(unit);
    } else {
      const last = shares.at(-1);
      const load = last?.reduce((sum, item) => sum + item.lessons, 0) ?? Infinity;
      if (last && load + unit.lessons <= MAX_TEACHER_LESSONS) last.push(unit);
      else shares.push([unit]);
    }
    before += unit.lessons;
  }
  return shares.filter(Boolean);
}

/**
 * Full-time teachers first, at most `MAX_TEACHER_LESSONS` each; the last one's
 * light remainder is then evened out with the one before, so a family ends
 * with two similar loads rather than one full and one token contract.
 */
export function shareEvenly<T extends TeachingUnit>(units: T[]): T[][] {
  const shares = shareUnits(units);
  if (shares.length < 2) return shares;
  const load = (share: T[]) => share.reduce((sum, unit) => sum + unit.lessons, 0);
  // A remainder that fits in the others' spare lessons needs no extra teacher.
  const remainder = shares.at(-1)!;
  const spare = shares.slice(0, -1).map((share) => MAX_TEACHER_LESSONS - load(share));
  const homes = remainder.map((unit) => {
    const index = spare.findIndex((room) => room >= unit.lessons);
    if (index >= 0) spare[index] -= unit.lessons;
    return index;
  });
  if (homes.every((index) => index >= 0)) {
    remainder.forEach((unit, position) => shares[homes[position]].push(unit));
    shares.pop();
  }
  const [previous, last] = shares.slice(-2);
  if (!last) return shares;
  while (previous.length > 1 && load(previous) - previous.at(-1)!.lessons >= load(last) + previous.at(-1)!.lessons) {
    last.unshift(previous.pop()!);
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
export function placeLessons(planned: PlannedLesson[], busy = new Set<string>(), attempts = 30) {
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
        const free = TIMETABLE_SLOTS
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
