import { Xlsx } from 'xlsx-manager';
import { strFromU8, unzipSync } from 'fflate';
import type { MassarAbsence, MassarComponent, MassarSheetKind } from '@sms/contracts';
import { FIRST_COMPONENT_COLUMN, FIRST_STUDENT_ROW, MASSAR_CELLS, MAX_COMPONENTS, MAX_STUDENTS } from './cells';
import { sheetPath } from './sheetPath';

export type WorkbookRefusal = 'invalidWorkbook' | 'encrypted' | 'tooLarge' | 'unsupportedLayout' | 'invalidHeader' | 'invalidRoster' | 'invalidComponents' | 'invalidMark';
export class MassarWorkbookError extends Error {
  constructor(public readonly key: WorkbookRefusal) { super(key); }
}
export interface ExportStudent {
  massarStudentId: string | number | null; studentCode: string; name: string; dateOfBirth: string;
  marks: Array<{ componentCode: string; mark: number | null; absence: MassarAbsence }>;
}
export interface MassarExport {
  schoolCode: string; classGuid: string; term: number; exam: number; subjectCode: string; yearId: number;
  levelCode: string | number; academy: string; direction: string; schoolName: string; levelLabel: string;
  className: string; termLabel: string; examLabel: string; subjectName: string; yearLabel: string;
  level: string; maxMark: number; kind: MassarSheetKind; components: MassarComponent[];
  students: ExportStudent[]; clean: boolean;
}
/** Inspect size before inflating; both upload archives and workbooks are untrusted zip files. */
export function unpack(bytes: Uint8Array, maxBytes = 40 * 1024 * 1024) {
  let total = 0, entries = 0;
  try {
    return unzipSync(bytes, { filter: entry => {
      total += entry.originalSize;
      if (++entries > 2000 || total > maxBytes) throw new MassarWorkbookError('tooLarge');
      return true;
    } });
  } catch (error) {
    if (error instanceof MassarWorkbookError) throw error;
    // Encrypted Office files are OLE containers, rather than zip archives.
    if (bytes[0] === 0xd0 && bytes[1] === 0xcf) throw new MassarWorkbookError('encrypted');
    throw new MassarWorkbookError('invalidWorkbook');
  }
}
function scalar(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  // Formula cells are never evaluated or trusted, including their cached result.
  throw new MassarWorkbookError('invalidWorkbook');
}
export async function readExport(bytes: Uint8Array): Promise<MassarExport> {
  const zip = unpack(bytes);
  const path = sheetPath(zip, 'NotesCC');
  const clean = !!path && !!zip[path] && /<x:worksheet\b/.test(strFromU8(zip[path]));
  const xlsx = new Xlsx();
  try { await xlsx.loadBuffer(bytes); xlsx.useSheet('NotesCC'); }
  catch { throw new MassarWorkbookError('invalidWorkbook'); }
  if (xlsx.worksheet.rowCount > FIRST_STUDENT_ROW + MAX_STUDENTS - 1 || xlsx.worksheet.columnCount > 35) throw new MassarWorkbookError(clean ? 'tooLarge' : 'unsupportedLayout');
  const value = (address: string) => scalar(xlsx.getCell(address)?.value);
  const text = (address: string) => String(value(address) ?? '');
  const header = Object.fromEntries(Object.entries(MASSAR_CELLS).map(([key, address]) => [key, value(address)]));
  const className = text(MASSAR_CELLS.className);
  const level = /^(\dAP(?:G|IC))-\d+$/.exec(className)?.[1];
  const kind = level?.includes('APIC') ? 'exam' : 'components';
  const term = Number(header.term), exam = Number(header.exam), yearId = Number(header.yearId);
  if (!level || ![1, 2].includes(term) || !Number.isInteger(exam) || exam < 1 || exam > 9 ||
    !Number.isInteger(yearId) || yearId < 1 || !/^\d{4}\/\d{4}$/.test(text('D13')) ||
    !['schoolCode', 'classGuid', 'levelCode', 'levelLabel', 'subjectName', 'termLabel', 'examLabel'].every(key => String(header[key] ?? '').length)) {
    throw new MassarWorkbookError('invalidHeader');
  }
  const subjectCode = /^#([^#]+)#$/.exec(text('K5'))?.[1];
  if (!subjectCode) throw new MassarWorkbookError('invalidHeader');
  const components: MassarComponent[] = [];
  for (let i = 0; i < MAX_COMPONENTS; i++) {
    const col = FIRST_COMPONENT_COLUMN + i * 2;
    const codeValue = scalar(xlsx.getCell(15, col).value);
    const name = scalar(xlsx.getCell(16, col).value);
    if (codeValue === null && name === null) continue;
    const code = /^#([^#]+)#$/.exec(String(codeValue))?.[1];
    if (!code || typeof name !== 'string' || !name.length || scalar(xlsx.getCell(16, col + 1).value) !== name ||
      components.some(component => component.code === code) || i !== components.length) throw new MassarWorkbookError('invalidComponents');
    components.push({ code, name });
  }
  if (!components.length || (kind === 'exam' && components.length !== 1)) throw new MassarWorkbookError('invalidComponents');
  const maxMark = kind === 'exam' ? 20 : 10;
  const students: ExportStudent[] = [], seen = new Set<string>();
  for (let row = FIRST_STUDENT_ROW; row <= xlsx.worksheet.rowCount; row++) {
    const code = scalar(xlsx.getCell(row, 3).value);
    if (code === null || code === '') continue;
    if (students.length >= MAX_STUDENTS || typeof code !== 'string' || seen.has(code) || !scalar(xlsx.getCell(row, 4).value)) throw new MassarWorkbookError('invalidRoster');
    seen.add(code);
    const marks = components.map((component, index) => {
      const col = FIRST_COMPONENT_COLUMN + index * 2;
      const raw = scalar(xlsx.getCell(row, col).value), absenceValue = scalar(xlsx.getCell(row, col + 1).value);
      const mark = raw === null || raw === '' ? null : Number(raw);
      const absence: MassarAbsence = absenceValue === 'مبرر' ? 'justified' : 'none';
      if ((absenceValue !== null && !['', ' ', 'مبرر'].includes(String(absenceValue))) ||
        (mark !== null && (!Number.isFinite(mark) || mark < 0 || mark > maxMark || absence === 'justified'))) throw new MassarWorkbookError('invalidMark');
      return { componentCode: component.code, mark, absence };
    });
    students.push({ studentCode: code, massarStudentId: scalar(xlsx.getCell(row, 2).value) || null,
      name: String(scalar(xlsx.getCell(row, 4).value)), dateOfBirth: String(scalar(xlsx.getCell(row, 6).value) ?? ''), marks });
  }
  return { ...header, className, subjectCode, level, kind, term, exam, yearId, maxMark, components, students, clean } as MassarExport;
}
