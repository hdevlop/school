import { describe, expect, it } from 'bun:test';
import { examPlanningMonths, examPlanningSemester, type ExamPlanningClass } from '@sms/contracts';
import { examPlanningEntries, examPlanningRecords, initialPlanningMonth, planningMonthRange, updatePlanningMonthDraft } from '@/features/Exams/planning/examPlanningModel';

const classes: ExamPlanningClass[] = [
  { id: 'ps', name: 'PS', visible: true, months: {} },
  { id: 'cp', name: 'CP', visible: true, months: { '2026-11': [{ id: 'arabic', date: '2026-11-09', subject: 'اللغة العربية', language: 'ar', lessons: ['الجملة الاسمية'] }] } },
];
describe('exam planning dates and document selection', () => {
  it('derives the semester from the month including January and September boundaries', () => {
    expect(['2026-09', '2026-12', '2027-01'].map(examPlanningSemester)).toEqual([1, 1, 1]);
    expect(['2027-02', '2027-06', '2027-08'].map(examPlanningSemester)).toEqual([2, 2, 2]);
    expect(examPlanningMonths('2026-2027')).toHaveLength(12);
    expect(examPlanningMonths('2026-2027').at(-1)).toBe('2027-08');
  });
  it('opens a populated month when this month is empty, while respecting the selected year', () => {
    expect(initialPlanningMonth(classes, '2026-10-28', '2026-2027')).toBe('2026-11');
    expect(initialPlanningMonth(classes, '2026-11-28', '2026-2027')).toBe('2026-11');
    expect(initialPlanningMonth([], '2026-10-28', '2026-2027')).toBe('2026-10');
    expect(initialPlanningMonth([], '2026-10-28', '2025-2026')).toBe('2025-09');
  });
  it('keeps language, dates and revision topics in the A4 model, including an explicitly cleared draft', () => {
    const range = planningMonthRange('2026-11');
    const records = examPlanningRecords(classes, range);
    expect(records).toHaveLength(1);
    expect(records[0].class?.name).toBe('CP');
    expect(records[0].planning?.groups[0]).toEqual({ label: '', language: 'ar', lessons: ['الجملة الاسمية'] });
    expect(examPlanningRecords(classes, range, { cp: { '2026-11': [] } })).toEqual([]);
    expect(examPlanningRecords(classes, planningMonthRange('2027-02'))).toEqual([]);
  });
  it('filters both date endpoints inclusively across months and semesters', () => {
    const entry = classes[1].months['2026-11'][0];
    const cls = { ...classes[1], months: {
      '2027-01': [{ ...entry, id: 'before', date: '2027-01-30' }, { ...entry, date: '2027-01-31' }],
      '2027-02': [{ ...entry, date: '2027-02-01' }, { ...entry, id: 'after', date: '2027-02-02' }],
    } };
    const range = { from: '2027-01-31', to: '2027-02-01' };
    expect(examPlanningEntries(cls, range).map(entry => entry.date)).toEqual(['2027-01-31', '2027-02-01']);
    const records = examPlanningRecords([cls], range);
    expect(records.map(record => record.planning?.semester)).toEqual([1, 2]);
    expect(new Set(records.map(record => record.id)).size).toBe(2);
    expect(examPlanningEntries(cls, { from: '2027-02-01', to: '2027-01-31' })).toEqual([]);
    expect(planningMonthRange('2028-02').to).toBe('2028-02-29');
  });
  it('preserves entries outside the date filter and drafts in other months when editing or clearing one month', () => {
    const entry = classes[1].months['2026-11'][0];
    const cls = { ...classes[1], months: {
      '2026-11': [entry, { ...entry, id: 'hidden', date: '2026-11-30' }],
      '2026-12': [{ ...entry, id: 'december', date: '2026-12-01' }],
    } };
    const edited = { ...entry, lessons: ['Updated lesson'] };
    const november = updatePlanningMonthDraft({}, cls, '2026-11', [edited, cls.months['2026-11'][1]]);
    const drafts = updatePlanningMonthDraft(november, cls, '2026-12', []);
    expect(examPlanningEntries(cls, { from: entry.date, to: entry.date }, drafts)).toEqual([edited]);
    expect(drafts.cp['2026-11'][1].id).toBe('hidden');
    expect(examPlanningEntries(cls, planningMonthRange('2026-12'), drafts)).toEqual([]);
    expect(updatePlanningMonthDraft(drafts, cls, '2026-11', cls.months['2026-11'])).toEqual({ cp: { '2026-12': [] } });
    expect(cls.months['2026-11'][0].lessons).toEqual(entry.lessons);
  });
});
