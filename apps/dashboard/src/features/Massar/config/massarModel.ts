import type { MassarMark, MassarRound, MassarSheetRow } from '@sms/contracts';
import { isValidMassarMark } from '@sms/contracts';

/** Massar's cycle of a class: collège classes are nAPIC-n, primary nAPG-n. */
export const classCycle = (name: string): 'primary' | 'college' => /^\dAPIC-/i.test(name) ? 'college' : 'primary';
/** Primary before collège, then by level and section. */
export const classOrder = (a: string, b: string) => Number(classCycle(a) === 'college') - Number(classCycle(b) === 'college') || a.localeCompare(b, 'en', { numeric: true });
/** How much is entered, as a percent that never says 0% once a mark exists, nor 100% while one is missing. */
export const progressPercent = (filled: number, total: number) => !total || !filled ? 0 : filled >= total ? 100 : Math.min(99, Math.max(1, Math.round(filled / total * 100)));
export function sheetState(sheet: MassarSheetRow) {
  if (sheet.status === 'exported') return sheet.status;
  if (sheet.late && sheet.missing > 0) return 'late';
  if (sheet.status === 'changed_after_export') return sheet.status;
  return sheet.missing === 0 ? 'done' : sheet.missing === sheet.total ? 'empty' : 'started';
}
export function classState(sheets: MassarSheetRow[]) {
  if (sheets.some(sheet => sheetState(sheet) === 'late')) return 'late';
  if (sheets.some(sheet => sheetState(sheet) === 'changed_after_export')) return 'changed_after_export';
  if (sheets.length && sheets.every(sheet => sheetState(sheet) === 'exported')) return 'exported';
  if (sheets.length && sheets.every(sheet => sheet.missing === 0)) return 'done';
  return sheets.some(sheet => sheet.missing < sheet.total) ? 'started' : 'empty';
}
export function overview(sheets: MassarSheetRow[]) {
  const missing = new Map<string | null, MassarSheetRow[]>();
  for (const sheet of sheets.filter(sheet => sheet.missing > 0)) missing.set(sheet.teacherName, [...(missing.get(sheet.teacherName) ?? []), sheet]);
  return {
    classes: [...new Set(sheets.map(sheet => sheet.className))].sort(classOrder),
    subjects: [...new Set(sheets.map(sheet => sheet.subjectName))],
    done: sheets.filter(sheet => !sheet.missing).length,
    missing: [...missing.entries()].sort((a, b) => Number(b[1].some(sheet => sheetState(sheet) === 'late')) - Number(a[1].some(sheet => sheetState(sheet) === 'late'))),
  };
}
export function dueState(dueDate: string | null | undefined, today: string) {
  if (!dueDate) return { status: 'none' as const, days: 0 };
  const days = Math.round((Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  return { status: days < 0 ? 'late' as const : days === 0 ? 'today' as const : 'future' as const, days: Math.abs(days) };
}
/** A planned Contrôle: its due date for marks, and when Planning holds its exams. */
export type PlannedRound = { term: number; exam: number; dueDate: string | null; examFrom?: string | null; examTo?: string | null };
type RoundKey = Pick<MassarRound, 'term' | 'exam'>;
const byOrder = (a: RoundKey, b: RoundKey) => a.term - b.term || a.exam - b.exam;
/**
 * The Contrôle to open next: the first planned one after the last ordinary
 * Contrôle opened, then the integrated activities of each semester.
 */
export function nextRound(rounds: RoundKey[], planned: PlannedRound[]) {
  const last = rounds.filter(round => round.exam < 4).sort(byOrder).at(-1);
  const found = planned.find(item => (!last || byOrder(item, last) > 0) && !rounds.some(round => round.term === item.term && round.exam === item.exam));
  const next = found ? { term: found.term, exam: found.exam } : { term: 3, exam: 1 };
  // Keep integrated activities reachable after the final ordinary assessment.
  return next.term <= 2 ? next : [1, 2].map(term => ({ term, exam: 4 })).find(candidate => !rounds.some(round => round.term === candidate.term && round.exam === 4)) ?? next;
}
export type DraftCell = { text: string; absence: 'none' | 'justified' };
export function parseCell(cell: DraftCell, max: number): Pick<MassarMark, 'mark' | 'absence'> | null {
  const text = cell.text.trim().replace(',', '.');
  if (text && !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const mark = text ? Number(text) : null;
  return isValidMassarMark(mark, cell.absence, max) ? { mark, absence: cell.absence } : null;
}
export function pastedCells(text: string, row: number, col: number, rows: number, columns: number) {
  return text.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n').flatMap((line, dy) => line.split('\t').flatMap((text, dx) => {
    if (row + dy >= rows || col + dx >= columns) return [];
    const absent = /^(a|مبرر)$/i.test(text.trim());
    return [{ row: row + dy, col: col + dx, cell: { text: absent ? '' : text, absence: absent ? 'justified' as const : 'none' as const } }];
  }));
}
export function nextCell(key: string, row: number, col: number, rows: number, cols: number, shift = false, rtl = false) {
  if (key === 'Tab') { const index = row * cols + col + (shift ? -1 : 1); return index >= 0 && index < rows * cols ? { row: Math.floor(index / cols), col: index % cols } : null; }
  if (key === 'Enter') row += shift ? -1 : 1;
  else if (key === 'ArrowDown') row++;
  else if (key === 'ArrowUp') row--;
  else if (key === 'ArrowRight' || key === 'ArrowLeft') col += (key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1);
  else return null;
  return row >= 0 && row < rows && col >= 0 && col < cols ? { row, col } : null;
}
/**
 * Every Contrôle of the year in order: the opened ones (selectable), the next
 * planned one, and the later ones, shown with their date but not yet available.
 */
export function controlList<R extends MassarRound>(rounds: R[], planned: PlannedRound[]) {
  const next = nextRound(rounds, planned);
  const exams = (key: RoundKey) => { const found = planned.find(item => item.term === key.term && item.exam === key.exam); return { examFrom: found?.examFrom ?? null, examTo: found?.examTo ?? null }; };
  const opened = rounds.map(round => ({ term: round.term, exam: round.exam, dueDate: round.dueDate ?? null, ...exams(round), round, state: 'opened' as const }));
  const waiting = planned.filter(item => !rounds.some(round => round.term === item.term && round.exam === item.exam))
    .map(item => ({ ...item, round: undefined, state: item.term === next.term && item.exam === next.exam ? 'next' as const : 'later' as const }));
  return [...opened, ...waiting].sort(byOrder);
}
