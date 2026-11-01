import { describeRoutineContent } from '@sms/contracts/routines';
import { parseRoutineJson, routineJsonTime, type RoutineJson } from '@sms/contracts';
import type { RoutineDay, RoutinePeriod, RoutineSchedule } from '../types';
import { printedInk, subjectColors } from './subjectColors';

const byOrder = (periods: readonly RoutinePeriod[]) => [...periods].sort((a, b) => a.sortOrder - b.sortOrder);

/**
 * The loaded timetables as the portable file import reads: names identify
 * classes, subjects and people, and a lesson points at its period by position.
 * Undefined when they do not make a valid file.
 */
export function buildRoutineJson(routines: readonly RoutineSchedule[], schoolYear: string): RoutineJson | undefined {
  const result = parseRoutineJson({
    format: 'school-class-routines',
    version: 1,
    schoolYear,
    exportedAt: new Date().toISOString(),
    routines: routines.map((routine) => {
      const periods = byOrder(routine.periods);
      const position = new Map(periods.map((period, index) => [period.id, index + 1]));
      return {
        className: routine.className,
        sectionName: routine.sectionName,
        name: routine.name,
        periods: periods.map((period) => ({
          type: period.isBreak ? 'break' : 'lesson',
          name: period.name,
          startTime: routineJsonTime(period.startTime),
          endTime: routineJsonTime(period.endTime),
        })),
        lessons: routine.entries.filter((entry) => position.has(entry.periodId)).map((entry) => ({
          day: entry.dayOfWeek,
          period: position.get(entry.periodId)!,
          subject: entry.subjectName,
          subjectCode: entry.subjectCode || null,
          teacher: entry.teacherName || null,
          roomNumber: entry.roomNumber || null,
          notes: entry.notes || null,
          contentGroups: entry.contentGroups ?? [],
        })),
        duties: routine.duties.filter((duty) => position.has(duty.periodId)).map((duty) => ({
          day: duty.dayOfWeek,
          period: position.get(duty.periodId)!,
          staff: duty.staffName,
          notes: duty.notes || null,
        })),
      };
    }),
  });
  return result.success ? result.data : undefined;
}

export interface RoutineSheetLabels {
  dayHeader: string;
  orLabel: string;
  dayLabel: (day: RoutineDay) => string;
  periodLabel: (period: RoutinePeriod) => string;
  dir: 'ltr' | 'rtl';
}

const NAVY = 'FF2C4A7A';
const BREAK_FILL = 'FFECEEF2';
const RULE = { style: 'thin' as const, color: { argb: 'FF8B97AB' } };
const argb = (hex: string) => `FF${hex.replace('#', '').toUpperCase()}`;
/** Excel limits sheet names to 31 characters, forbids a few and needs them unique. */
function sheetNames(routines: readonly RoutineSchedule[]) {
  const used = new Set<string>();
  return routines.map((routine) => {
    const base = [routine.className, routine.sectionName].filter(Boolean).join(' ')
      .replace(/[[\]:*?/\\]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 28) || 'Sheet';
    let name = base;
    for (let copy = 2; used.has(name.toLocaleLowerCase()); copy++) name = `${base} ${copy}`;
    used.add(name.toLocaleLowerCase());
    return name;
  });
}

/**
 * One sheet per timetable laid out as on screen, days down and periods
 * across, in the grid's colors. The writer is loaded only when someone exports.
 */
export async function buildRoutineWorkbook(routines: readonly RoutineSchedule[], labels: RoutineSheetLabels): Promise<Blob> {
  const { Xlsx } = await import('xlsx-manager');
  // xlsx-manager edits loaded workbooks; a subclass gives it new, empty sheets.
  class RoutineWorkbook extends Xlsx {
    addSheet(name: string) {
      const sheet = this.workbook.addWorksheet(name, {
        views: [{ state: 'frozen', xSplit: 1, ySplit: 1, rightToLeft: labels.dir === 'rtl' }],
        pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
      });
      this.worksheet ??= sheet;
      return sheet;
    }
  }
  const workbook = new RoutineWorkbook();
  const names = sheetNames(routines);
  routines.forEach((routine, index) => {
    const sheet = workbook.addSheet(names[index]);
    const periods = byOrder(routine.periods);
    const colorOf = subjectColors(routine.entries.map((entry) => ({ id: entry.subjectId, code: entry.subjectCode })));
    const entries = new Map(routine.entries.map((entry) => [`${entry.dayOfWeek}:${entry.periodId}`, entry]));
    const duties = new Map(routine.duties.map((duty) => [`${duty.dayOfWeek}:${duty.periodId}`, duty]));

    const header = sheet.addRow([labels.dayHeader, ...periods.map((period) => `${routineJsonTime(period.startTime)} – ${routineJsonTime(period.endTime)}`)]);
    header.height = 22;
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: RULE, bottom: RULE, left: RULE, right: RULE };
    });

    for (const day of routine.activeDays) {
      const row = sheet.addRow([labels.dayLabel(day), ...periods.map((period) => {
        const entry = entries.get(`${day}:${period.id}`);
        if (entry) {
          const content = describeRoutineContent(entry.contentGroups ?? [], entry.subjectName, labels.orLabel);
          return [content, entry.teacherName, entry.roomNumber].filter(Boolean).join('\n');
        }
        const duty = duties.get(`${day}:${period.id}`);
        if (period.isBreak) return duty ? `${labels.periodLabel(period)}\n${duty.staffName}` : labels.periodLabel(period);
        return '';
      })]);
      row.height = 48;
      row.eachCell({ includeEmpty: true }, (cell, column) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: RULE, bottom: RULE, left: RULE, right: RULE };
        if (column === 1) {
          cell.font = { bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF1F6' } };
          return;
        }
        const period = periods[column - 2];
        const entry = period && entries.get(`${day}:${period.id}`);
        if (entry) {
          const { fill, ink } = printedInk(colorOf(entry.subjectId));
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(fill) } };
          cell.font = { bold: true, color: { argb: argb(ink) } };
        } else if (period?.isBreak) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BREAK_FILL } };
          cell.font = { italic: true, color: { argb: 'FF6B7385' } };
        }
      });
    }
    sheet.getColumn(1).width = 14;
    periods.forEach((period, position) => { sheet.getColumn(position + 2).width = period.isBreak ? 16 : 24; });
  });
  return new Blob([await workbook.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** A name every file system accepts. */
export const routineFileName = (title: string, extension: string) =>
  `${title.replace(/[\u0000-\u001f<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim() || 'routines'}.${extension}`;

export function downloadRoutineFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Chrome reads the blob, and its name, after the click returns.
  setTimeout(() => URL.revokeObjectURL(url), 40_000);
}
