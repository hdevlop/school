/**
 * What the grades MCP reads give the chat: a summary of the rows the reader
 * may see, built after the repository's ownership and year scope. The REST
 * routes keep every row for the dashboard. On the dev server a class's raw
 * rows (about 300 marks at 1.5 KB each) or the year's 3,399 left the answer
 * model unable to reply; one class's summary is a few kilobytes.
 */

interface GradeSource { id?: string | null; title?: string | null; type?: string | null; date?: unknown; totalMarks?: unknown; passingMarks?: unknown }
export interface GradeRow {
  marksObtained?: unknown;
  student?: { id?: string | null; name?: string | null; studentCode?: string | null } | null;
  assessment?: GradeSource | null;
  exam?: GradeSource | null;
  subject?: { name?: string | null } | null;
  teacher?: { name?: string | null } | null;
  class?: { name?: string | null } | null;
  section?: { name?: string | null } | null;
}

/** Up to this many marks, a class summary lists each mark; above it, each student's subject averages. */
export const EACH_MARK_UP_TO = 150;
/** Up to this many tests and exams, a summary lists them. */
const SOURCES_UP_TO = 40;

const sourceOf = (row: GradeRow) => (row.exam?.id ? { kind: 'exam', ...row.exam } : row.assessment?.id ? { kind: 'test', ...row.assessment } : null);
const number = (value: unknown) => (value === null || value === undefined || value === '' ? NaN : Number(value));
const round = (value: number) => Math.round(value * 100) / 100;
const dateOf = (value: unknown) => (value instanceof Date ? value.toISOString().slice(0, 10) : value ? String(value).slice(0, 10) : null);
const classOf = (row: GradeRow) => [row.class?.name, row.section?.name].filter(Boolean).join(' ') || null;
const studentOf = (row: GradeRow) => row.student?.name?.trim() || row.student?.studentCode || 'unknown';

function scored(rows: GradeRow[]) {
  return rows.map((row) => ({ mark: number(row.marksObtained), total: number(sourceOf(row)?.totalMarks) }))
    .filter((score) => Number.isFinite(score.mark) && Number.isFinite(score.total) && score.total > 0);
}

/** The mean mark "x/T" when every mark is out of T, otherwise out of 20. */
export function averageOf(rows: GradeRow[]): string | null {
  const scores = scored(rows);
  if (!scores.length) return null;
  const totals = new Set(scores.map((score) => score.total));
  if (totals.size === 1) {
    const [total] = totals;
    return `${round(scores.reduce((sum, score) => sum + score.mark, 0) / scores.length)}/${total}`;
  }
  return `${round(scores.reduce((sum, score) => sum + (score.mark / score.total) * 20, 0) / scores.length)}/20`;
}

const markOf = (row: GradeRow) => {
  const mark = number(row.marksObtained), total = number(sourceOf(row)?.totalMarks);
  return Number.isFinite(mark) ? (Number.isFinite(total) ? `${round(mark)}/${total}` : `${round(mark)}`) : null;
};

function groupBy(rows: GradeRow[], key: (row: GradeRow) => string | null) {
  const groups = new Map<string, GradeRow[]>();
  for (const row of rows) {
    const name = key(row) ?? 'unknown';
    groups.set(name, [...(groups.get(name) ?? []), row]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

const studentCount = (rows: GradeRow[]) => new Set(rows.map((row) => row.student?.id ?? studentOf(row))).size;
const groupSummary = (rows: GradeRow[], key: (row: GradeRow) => string | null, label: string) =>
  groupBy(rows, key).map(([name, group]) => ({ [label]: name, marks: group.length, students: studentCount(group), average: averageOf(group) }));

function sourcesOf(rows: GradeRow[]) {
  const groups = groupBy(rows, (row) => sourceOf(row)?.id ?? null);
  if (groups.length > SOURCES_UP_TO) return undefined;
  return groups.map(([, group]) => {
    const source = sourceOf(group[0]);
    return { title: source?.title ?? null, kind: source?.kind ?? null, subject: group[0].subject?.name ?? null,
      class: classOf(group[0]), date: dateOf(source?.date), outOf: number(source?.totalMarks) || null,
      marks: group.length, average: averageOf(group) };
  });
}

/** One class (optionally one subject): each student's marks, or their subject averages for a large class. */
export function classGradesSummary(rows: GradeRow[]) {
  const eachMark = rows.length <= EACH_MARK_UP_TO;
  return {
    class: rows[0] ? classOf(rows[0]) : null,
    marks: rows.length,
    students: studentCount(rows),
    average: averageOf(rows),
    subjects: groupSummary(rows, (row) => row.subject?.name ?? null, 'subject'),
    testsAndExams: sourcesOf(rows),
    byStudent: groupBy(rows, studentOf).map(([name, group]) => ({
      student: name,
      studentCode: group[0].student?.studentCode ?? null,
      average: averageOf(group),
      ...(eachMark
        ? { marks: group.map((row) => ({ subject: row.subject?.name ?? null, title: sourceOf(row)?.title ?? null, mark: markOf(row) })) }
        : { subjects: Object.fromEntries(groupBy(group, (row) => row.subject?.name ?? null).map(([subject, marks]) => [subject, averageOf(marks)])) }),
    })),
  };
}

/** Many classes (one subject, one teacher or the whole year): figures per class and per subject. */
export function gradesOverview(rows: GradeRow[]) {
  return {
    marks: rows.length,
    students: studentCount(rows),
    average: averageOf(rows),
    teachers: [...new Set(rows.map((row) => row.teacher?.name?.trim()).filter(Boolean))].slice(0, 20),
    byClass: groupSummary(rows, classOf, 'class'),
    bySubject: groupSummary(rows, (row) => row.subject?.name ?? null, 'subject'),
    testsAndExams: sourcesOf(rows),
  };
}

/** One test or exam: each student's mark and how many passed. */
export function sourceGradesSummary(rows: GradeRow[]) {
  const source = rows[0] ? sourceOf(rows[0]) : null;
  const passing = number(source?.passingMarks);
  return {
    title: source?.title ?? null,
    kind: source?.kind ?? null,
    subject: rows[0]?.subject?.name ?? null,
    class: rows[0] ? classOf(rows[0]) : null,
    date: dateOf(source?.date),
    outOf: number(source?.totalMarks) || null,
    marks: rows.length,
    average: averageOf(rows),
    ...(Number.isFinite(passing) ? { passingMark: passing, passed: rows.filter((row) => number(row.marksObtained) >= passing).length } : {}),
    byStudent: rows.map((row) => ({ student: studentOf(row), studentCode: row.student?.studentCode ?? null, mark: markOf(row) })),
  };
}
