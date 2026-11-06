import type { RosterStatus } from './rosterMarks';

export const STUDENT_ROSTER_IMPORT_COLUMNS = ['studentCode', 'status'] as const;

type ImportIssue = { reason: 'missingFields' | 'unknownStudent' | 'duplicateStudent' | 'invalidStatus'; row: number; code: string };
type ImportResult = { ok: true; marks: Record<string, RosterStatus>; count: number } | { ok: false; issue: ImportIssue };
type ImportLabels = { codeHeader: string; statusHeader: string; statuses: Record<RosterStatus, string> };

const text = (value: unknown) => typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)) ? String(value).trim() : '';
const normalized = (value: string) => value.normalize('NFKC').trim().toLowerCase();
const headerKey = (value: string) => normalized(value).replace(/[\s_-]+/g, '');

/** Validate the whole file against the open register before changing any marks. */
export function parseStudentRosterImport(
  rows: Record<string, unknown>[],
  students: { id: string; studentCode?: string | null }[],
  labels: ImportLabels,
): ImportResult {
  const studentsByCode = new Map(students.filter((student) => student.studentCode).map((student) => [normalized(student.studentCode!), student]));
  const codeHeaders = new Set(['studentcode', headerKey(labels.codeHeader)]);
  const statusHeaders = new Set(['status', headerKey(labels.statusHeader)]);
  const statuses = new Map<string, RosterStatus>();
  for (const status of ['present', 'absent', 'late'] as const) {
    statuses.set(status, status);
    statuses.set(normalized(labels.statuses[status]), status);
  }
  const marks: Record<string, RosterStatus> = {};
  const seen = new Set<string>();
  if (!rows.length) return { ok: false, issue: { reason: 'missingFields', row: 1, code: '' } };

  for (const [index, row] of rows.entries()) {
    const fields = Object.entries(row);
    const code = text(fields.find(([key]) => codeHeaders.has(headerKey(key)))?.[1]);
    const statusText = text(fields.find(([key]) => statusHeaders.has(headerKey(key)))?.[1]);
    const issue = (reason: ImportIssue['reason']): ImportResult => ({ ok: false, issue: { reason, row: index + 1, code } });
    if (!code || !statusText) return issue('missingFields');
    const student = studentsByCode.get(normalized(code));
    if (!student) return issue('unknownStudent');
    if (seen.has(student.id)) return issue('duplicateStudent');
    const status = statuses.get(normalized(statusText));
    if (!status) return issue('invalidStatus');
    seen.add(student.id);
    marks[student.id] = status;
  }
  return { ok: true, marks, count: seen.size };
}
