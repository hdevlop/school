import { foldSubjectName, massarPlanningControls, type MassarAbsence, type MassarMark } from '@sms/contracts';
import { Service } from '../../najm';
import { MassarGradeRepository } from './MassarGradeRepository';
import { MassarValidator } from './MassarValidator';

type Sheet = Awaited<ReturnType<MassarGradeRepository['sheets']>>[number];
type Exam = Awaited<ReturnType<MassarGradeRepository['plannedExams']>>[number];
type HeldGrade = Awaited<ReturnType<MassarGradeRepository['grades']>>[number];
/** One cell column of a grid and the Planning exam that stands for it. */
export type MassarGradeCell = { sheet: Sheet; componentCode: string; exam: Exam };
type CellMark = { mark: number | null; absence: MassarAbsence };

const round2 = (value: number) => Math.round(value * 100) / 100;
const filled = (mark: CellMark | undefined) => !!mark && (mark.mark !== null || mark.absence === 'justified');

/**
 * Which Planning exam a grid's column is: same School class, section and
 * subject, an exam dated in the Contrôle's month, and either the column's own
 * name (a primary part, "الإملاء") or, for a grid of one column (a collège
 * test), the subject's only exam that month. Anything less certain is left
 * unlinked rather than guessed.
 */
export function linkCells(sheets: Sheet[], exams: Exam[], controls: ReturnType<typeof massarPlanningControls>): MassarGradeCell[] {
  const cells: MassarGradeCell[] = [];
  for (const sheet of sheets) {
    if (!sheet.classId || !sheet.sectionId || !sheet.subjectId) continue;
    const month = controls.find(control => control.term === sheet.term && control.exam === sheet.exam)?.examFrom.slice(0, 7);
    if (!month) continue;
    const own = exams.filter(exam => exam.classId === sheet.classId && exam.sectionId === sheet.sectionId && exam.subjectId === sheet.subjectId && String(exam.date).startsWith(month));
    for (const component of sheet.components) {
      const named = own.filter(exam => foldSubjectName(exam.title) === foldSubjectName(component.name));
      const exam = named.length === 1 ? named[0] : sheet.components.length === 1 && own.length === 1 ? own[0] : undefined;
      if (exam && !cells.some(cell => cell.exam.id === exam.id)) cells.push({ sheet, componentCode: component.code, exam });
    }
  }
  return cells;
}

/**
 * Keeps a Massar grid and School's exam grades the same mark, both ways, in the
 * caller's transaction: a mark saved or imported in the grid becomes the
 * exam's grade, and a grade saved in Grades becomes the grid's mark. Marks
 * are converted between Massar's scale (/10 primary, /20 collège) and the
 * exam's; a justified absence is a missed exam. A closed Contrôle changes on
 * neither side.
 */
@Service()
export class MassarGradeLink {
  constructor(private repository: MassarGradeRepository, private validator: MassarValidator) {}

  private async cells(sheets: Sheet[], exams: Exam[]) {
    if (!sheets.length || !exams.length) return [];
    return linkCells(sheets, exams, massarPlanningControls(await this.repository.planningMonths()));
  }
  private toSchool(mark: number, cell: MassarGradeCell) { return round2(mark / Number(cell.sheet.maxMark) * Number(cell.exam.totalMarks)); }
  private toMassar(value: number, cell: MassarGradeCell) { return round2(value / Number(cell.exam.totalMarks) * Number(cell.sheet.maxMark)); }

  /** The exact exam links for sheets the caller has already been allowed to read. */
  async examLinks(sheetIds: string[]) {
    if (!sheetIds.length) return [];
    const [sheets, exams] = await Promise.all([this.repository.sheets({ sheetIds }), this.repository.plannedExams()]);
    return this.cells(sheets, exams);
  }

  /** The grade a grid cell gives its exam: written, changed or removed. */
  private async writeGrade(cell: MassarGradeCell, studentId: string, mark: CellMark, held: HeldGrade[], actorId: string | null) {
    const old = held.find(grade => grade.examId === cell.exam.id && grade.studentId === studentId);
    if (!filled(mark)) { if (old) await this.repository.deleteGrade(old.id); return; }
    const next = mark.absence === 'justified' ? { marksObtained: '0', status: 'missed' as const } : { marksObtained: String(this.toSchool(mark.mark!, cell)), status: 'graded' as const };
    if (old && old.status === next.status && Number(old.marksObtained) === Number(next.marksObtained)) return;
    if (old) await this.repository.updateGrade(old.id, { ...next, gradedBy: actorId });
    else await this.repository.insertGrade({ studentId, examId: cell.exam.id, ...next, gradedBy: actorId });
  }
  /** The mark an exam grade gives its grid cell. */
  private gradeMark(grade: { marksObtained: unknown; status: string } | null, cell: MassarGradeCell): CellMark {
    if (!grade || grade.status === 'pending') return { mark: null, absence: 'none' };
    if (grade.status === 'missed') return { mark: null, absence: 'justified' };
    return { mark: this.toMassar(Number(grade.marksObtained), cell), absence: 'none' };
  }

  /** Marks saved or imported in a grid: their exams take them. */
  async fromMassar(sheetId: string, marks: MassarMark[], actorId: string | null) {
    const [sheet] = await this.repository.sheets({ sheetIds: [sheetId] });
    if (!sheet?.classId || !sheet.sectionId || !sheet.subjectId || !marks.length) return 0;
    const cells = await this.cells([sheet], await this.repository.plannedExams({ classId: sheet.classId, sectionId: sheet.sectionId, subjectId: sheet.subjectId }));
    if (!cells.length) return 0;
    const held = await this.repository.grades(cells.map(cell => cell.exam.id));
    let written = 0;
    for (const mark of marks) {
      const cell = cells.find(item => item.componentCode === mark.componentCode);
      if (!cell) continue;
      await this.writeGrade(cell, mark.studentId, mark, held, actorId); written++;
    }
    return written;
  }

  /** A grade saved or removed in Grades: the grid cell its exam stands for takes it. */
  async fromGrade(examId: string, studentId: string, grade: { marksObtained: unknown; status: string } | null, actorId: string | null) {
    const [exam] = await this.repository.plannedExams({ examIds: [examId] });
    if (!exam?.classId || !exam.sectionId || !exam.subjectId) return;
    const place = { classId: exam.classId, sectionId: exam.sectionId, subjectId: exam.subjectId };
    const cells = (await this.cells(await this.repository.sheets(place), await this.repository.plannedExams(place))).filter(cell => cell.exam.id === examId);
    for (const cell of cells) {
      const { sheet } = cell;
      if (sheet.roundStatus === 'closed') this.validator.refuse('controlClosed');
      if (!sheet.roster.some(student => student.id === studentId)) continue;
      const next = this.gradeMark(grade, cell);
      if (next.mark !== null && (next.mark < 0 || next.mark > Number(sheet.maxMark))) this.validator.refuse('invalidMark', 422);
      const old = (await this.repository.marks([sheet.id])).find(mark => mark.studentId === studentId && mark.componentCode === cell.componentCode);
      const oldMark = old ? { mark: old.mark === null ? null : Number(old.mark), absence: old.absence } : undefined;
      if ((oldMark?.mark ?? null) === next.mark && (oldMark?.absence ?? 'none') === next.absence) continue;
      await this.repository.saveMarks(sheet.id, [{ studentId, componentCode: cell.componentCode, ...next }], actorId);
      // A grid already sent shows it changed since, as when it is edited after reopening.
      await this.repository.touchSheet(sheet.id, sheet.exportedAt ? 'changed_after_export' : sheet.status === 'not_started' ? 'in_progress' : sheet.status);
    }
  }

  /**
   * Brings existing marks together once a grid and an exam meet (a Contrôle
   * opened, files imported): the grid's mark wins where it has one, and an
   * empty cell of a grid not yet sent takes the exam's grade.
   */
  async reconcile(actorId: string | null) {
    const sheets = (await this.repository.sheets()).filter(sheet => sheet.roundStatus !== 'closed');
    const cells = await this.cells(sheets, await this.repository.plannedExams());
    if (!cells.length) return;
    const key = (...parts: string[]) => parts.join('|');
    const marks = new Map((await this.repository.marks([...new Set(cells.map(cell => cell.sheet.id))])).map(mark => [key(mark.sheetId, mark.studentId, mark.componentCode), mark]));
    const held = await this.repository.grades([...new Set(cells.map(cell => cell.exam.id))]);
    const grades = new Map(held.map(grade => [key(grade.examId ?? '', grade.studentId), grade]));
    const touched = new Map<string, Sheet>();
    for (const cell of cells) for (const student of cell.sheet.roster) {
      const stored = marks.get(key(cell.sheet.id, student.id, cell.componentCode));
      const mark = stored ? { mark: stored.mark === null ? null : Number(stored.mark), absence: stored.absence } : undefined;
      if (filled(mark)) { await this.writeGrade(cell, student.id, mark!, held, actorId); continue; }
      const grade = grades.get(key(cell.exam.id, student.id));
      if (!grade || grade.status === 'pending' || cell.sheet.exportedAt) continue;
      await this.repository.saveMarks(cell.sheet.id, [{ studentId: student.id, componentCode: cell.componentCode, ...this.gradeMark(grade, cell) }], actorId);
      touched.set(cell.sheet.id, cell.sheet);
    }
    for (const sheet of touched.values()) await this.repository.touchSheet(sheet.id, sheet.status === 'not_started' ? 'in_progress' : sheet.status);
  }
}
