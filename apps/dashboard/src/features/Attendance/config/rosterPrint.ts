import { buildSchoolPrintDocument, escapePrintHtml, schoolPrintCells, type SchoolPrintDocumentOptions } from '@/shared/schoolPrintDocument';
export { printSchoolDocument as printRosterDocument } from '@/shared/schoolPrintDocument';
import { compareClassNames } from '@sms/contracts';
import type { RosterMark } from './rosterMarks';

/** What the register's print menu offers, in menu order. */
export const ROSTER_PRINT_CHOICES = [
  { key: 'absent', label: 'attendance.roster.absent', marks: ['absent'] },
  { key: 'late', label: 'attendance.roster.late', marks: ['late'] },
  { key: 'absentAndLate', label: 'attendance.roster.absentAndLate', marks: ['absent', 'late'] },
] as const satisfies readonly { key: string; label: string; marks: readonly RosterMark[] }[];

export type RosterPrintChoice = (typeof ROSTER_PRINT_CHOICES)[number];

export interface RosterDocumentRow {
  cells: readonly string[];
  mark: RosterMark;
}

export interface RosterDocumentOptions extends SchoolPrintDocumentOptions {
  statusHeader: string;
  statusLabels: Record<RosterMark, string>;
}

interface CyclePerson {
  name?: string | null;
  class?: { name?: string | null } | null;
  section?: { name?: string | null } | null;
}

/** The school's cycle order (PS before CP before 1AC), then section, then name. */
export function orderByCycle<T extends CyclePerson>(people: readonly T[]): T[] {
  const text = (value?: string | null) => value ?? '';
  return [...people].sort((a, b) => compareClassNames(text(a.class?.name), text(b.class?.name))
    || text(a.section?.name).localeCompare(text(b.section?.name), 'fr', { numeric: true })
    || text(a.name).localeCompare(text(b.name), 'fr'));
}

export function rowsForChoice(rows: readonly RosterDocumentRow[], choice: RosterPrintChoice) {
  const marks: readonly RosterMark[] = choice.marks;
  return rows.filter((row) => marks.includes(row.mark));
}

const MARK_ORDER: readonly RosterMark[] = ['present', 'absent', 'late', 'unmarked'];

/** The register as a printable sheet: the marks on screen, unsaved ones included. */
export function buildRosterDocument(rows: readonly RosterDocumentRow[], options: RosterDocumentOptions): string {
  const e = escapePrintHtml;
  const counts = MARK_ORDER
    .map((mark) => [mark, rows.filter((row) => row.mark === mark).length] as const)
    .filter(([, count]) => count > 0);
  const chips = [
    `<span class="chip">${e(options.totalLabel)} <b>${rows.length}</b></span>`,
    ...counts.map(([mark, count]) => `<span class="chip mark-${mark}">${e(options.statusLabels[mark])} <b>${count}</b></span>`),
  ].join('');
  const body = rows.map((row, index) => `<tr><td class="index">${index + 1}</td>${schoolPrintCells(row.cells)}<td><span class="badge mark-${row.mark}">${e(options.statusLabels[row.mark])}</span></td></tr>`).join('');
  return buildSchoolPrintDocument({ ...options, columns: [...options.columns, options.statusHeader] }, body, chips);
}
