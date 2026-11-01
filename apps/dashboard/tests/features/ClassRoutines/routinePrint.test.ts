import { describe, expect, it } from 'bun:test';
import { buildRoutineDocument, buildRoutineDocuments, type RoutineDocumentPage } from '@/features/ClassRoutines/utils/routinePrint';

function page(className: string, subject: string, days: RoutineDocumentPage['data']['days'] = ['monday']): RoutineDocumentPage {
  return {
    data: {
      days,
      periods: [{ id: 'p1', name: 'Period 1', startTime: '08:30', endTime: '09:30', sortOrder: 0, isBreak: false, isActive: true }],
      entries: [{ id: 'entry', scheduleId: className, dayOfWeek: 'monday', periodId: 'p1', subjectId: 'subject', subjectName: subject,
        teacherAssignmentId: null, teacherId: null, teacherName: null, version: 1, contentGroups: [] }],
    },
    options: { language: 'en', title: 'Timetable', classLabel: 'Class', className, dayHeader: 'Days', orLabel: 'OR',
      dayLabel: (day) => day, periodLabel: (period) => period.name, colorOf: () => 'bg-[#dcf2e1] text-[#15803d]' },
  };
}

describe('combined timetable printing', () => {
  it('builds one document with section pages in their displayed order', () => {
    const html = buildRoutineDocuments([page('CP A', 'Mathematics'), page('CE1 B', 'Reading')]);
    expect(html.match(/<!doctype html>/g)).toHaveLength(1);
    expect(html.match(/class="routine-page"/g)).toHaveLength(2);
    expect(html.match(/<table>/g)).toHaveLength(2);
    expect(html.indexOf('CP A')).toBeLessThan(html.indexOf('CE1 B'));
    expect(html).toContain('Mathematics');
    expect(html).toContain('Reading');
    expect(html).toContain('break-after:page');
    expect(html).toContain('.routine-page:last-child{break-after:auto');
  });

  it('keeps independent row heights for different teaching weeks', () => {
    const html = buildRoutineDocuments([page('CP A', 'Math'), page('CE1 B', 'Reading', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])]);
    expect(html).toContain('--row-height:32mm');
    expect(html).toContain('--row-height:26mm');
  });

  it('escapes names and preserves Arabic direction', () => {
    const sheet = page('CP <A>', '<script>');
    sheet.options.language = 'ar';
    const html = buildRoutineDocuments([sheet]);
    expect(html).toContain('lang="ar" dir="rtl"');
    expect(html).toContain('CP &lt;A&gt;');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('keeps single-section printing and rejects an empty print job', () => {
    const sheet = page('CP A', 'Math');
    expect(buildRoutineDocument(sheet.data, sheet.options)).toBe(buildRoutineDocuments([sheet]));
    expect(() => buildRoutineDocuments([])).toThrow('No timetables to print');
  });
});
