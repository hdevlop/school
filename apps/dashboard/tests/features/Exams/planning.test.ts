import { describe, expect, it } from 'bun:test';
import { derivedExamControls, examPlanningMonths, examPlanningSemester, type ExamControl, type ExamPlanningClass } from '@sms/contracts';
import { examControlLabel, examPlanningControlNumbers, teacherControls, examPlanningEntries, examPlanningRecords, initialPlanningMonth, mayPlanEntry, plannableInClass, controlClassGroups, controlDayCount, currentControl, periodControls, planningClassGroups, planningMonthRange, planningTextLanguage, updatePlanningMonthDraft } from '@/features/Exams/planning/examPlanningModel';

const classes: ExamPlanningClass[] = [
  { id: 'ps', name: 'PS', visible: true, months: {} },
  { id: 'cp', name: 'CP', visible: true, months: { '2026-11': [{ id: 'arabic', date: '2026-11-09', subject: 'اللغة العربية', lessons: ['الجملة الاسمية'] }] } },
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
  it('takes the lesson language from the first letter, like dir="auto"', () => {
    expect(planningTextLanguage(['', '1. الجملة الاسمية', 'Les accords'])).toBe('ar');
    expect(planningTextLanguage(['1. Les accords', 'الجملة الاسمية'])).toBe('fr');
    expect(planningTextLanguage('التربية الإسلامية')).toBe('ar');
    expect(planningTextLanguage([])).toBe('fr');
  });
  it('derives the lesson language and keeps dates and revision topics in the A4 model, including an explicitly cleared draft', () => {
    const range = planningMonthRange('2026-11');
    const records = examPlanningRecords(classes, range);
    expect(records).toHaveLength(1);
    expect(records[0].class?.name).toBe('CP');
    expect(records[0].planning?.groups[0]).toEqual({ label: '', language: 'ar', lessons: ['الجملة الاسمية'] });
    expect(examPlanningRecords(classes, range, { cp: { '2026-11': [] } })).toEqual([]);
    expect(examPlanningRecords(classes, planningMonthRange('2027-02'))).toEqual([]);
    // A teacher's exam the school has not given a day yet is left off the A4.
    const waiting = { id: 'w', date: '2026-11-09', subject: 'Français', lessons: ['Le verbe'], toPlace: true as const };
    expect(examPlanningRecords(classes, range, { cp: { '2026-11': [...classes[1].months['2026-11'], waiting] } })).toHaveLength(1);
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

describe('exam planning Contrôle numbers', () => {
  const year: ExamPlanningClass[] = [
    { id: 'cp', name: 'CP', visible: true, months: {
      '2026-11': [{ id: 'a', date: '2026-11-09', subject: 'Arabe', lessons: [] }],
      '2027-03': [{ id: 'c', date: '2027-03-10', subject: 'Arabe', lessons: [] }],
    } },
    // A hidden class still makes December a Contrôle, as it does in Massar.
    { id: 'ce1', name: 'CE1', visible: false, months: { '2026-12': [{ id: 'b', date: '2026-12-14', subject: 'Maths', lessons: [] }] } },
  ];
  // A year without saved Contrôles reads them from Planning's months, as before.
  const derived = derivedExamControls(year.map(cls => ({ classId: cls.id, months: cls.months })));
  const on = (date: string, classId = 'cp') => ({ date, class: { id: classId } });

  it('numbers each semester month with exams in order, across every class, until a Contrôle is saved', () => {
    expect(examPlanningControlNumbers(derived, [on('2026-11-09')])).toEqual([1]);
    expect(examPlanningControlNumbers(derived, [on('2026-12-14', 'ce1')])).toEqual([2]);
    expect(examPlanningControlNumbers(derived, [on('2027-03-10')])).toEqual([1]);
    expect(examPlanningControlNumbers(derived, [on('2026-11-09'), on('2026-12-14', 'ce1')])).toEqual([1, 2]);
    expect(examPlanningControlNumbers(derived, [on('2026-10-05')])).toEqual([]);
  });

  it('numbers a saved Contrôle for the class of each exam, by the class\'s own Contrôles in date order', () => {
    const saved: ExamControl[] = [
      { id: 'nov', term: 1, dateFrom: '2026-11-09', dateTo: '2026-11-13', classIds: ['cp'], subjectIds: [] },
      { id: 'dec', term: 1, dateFrom: '2026-12-14', dateTo: '2026-12-18', classIds: ['cp', 'ce1'], subjectIds: [] },
    ];
    expect(examPlanningControlNumbers(saved, [on('2026-11-09')])).toEqual([1]);
    expect(examPlanningControlNumbers(saved, [on('2026-11-09', 'ce1')])).toEqual([]);
    // December is CP's second Contrôle and CE1's first.
    expect(examPlanningControlNumbers(saved, [on('2026-12-14')])).toEqual([2]);
    expect(examPlanningControlNumbers(saved, [on('2026-12-14', 'ce1')])).toEqual([1]);
  });

  it('offers a teacher the Contrôles their classes sit, and every month-read one', () => {
    const saved: ExamControl[] = [
      { id: 'cp-only', term: 1, dateFrom: '2026-11-09', dateTo: '2026-11-13', classIds: ['cp'], subjectIds: [] },
      { id: 'ce1-only', term: 1, dateFrom: '2026-11-16', dateTo: '2026-11-20', classIds: ['ce1'], subjectIds: [] },
      { id: 'cp-maths', term: 1, dateFrom: '2026-11-23', dateTo: '2026-11-23', classIds: ['cp'], subjectIds: ['maths'] },
    ];
    expect(teacherControls(saved, ['cp']).map(control => control.id)).toEqual(['cp-only', 'cp-maths']);
    // A Contrôle of a few subjects reaches only their teachers.
    expect(teacherControls(saved, ['cp'], { cp: ['fr'] }).map(control => control.id)).toEqual(['cp-only']);
    expect(teacherControls(saved, ['cp'], { cp: ['maths'] }).map(control => control.id)).toEqual(['cp-only', 'cp-maths']);
    expect(teacherControls(derived, ['other']).length).toBe(derived.length);
  });

  it('names a Contrôle by its number and semester, for a teacher by their own classes\' number', () => {
    const t = (key: string, params?: Record<string, unknown>) => `${key}${params ? JSON.stringify(params) : ''}`;
    const saved: ExamControl[] = [
      { id: 'nov', term: 1, dateFrom: '2026-11-09', dateTo: '2026-11-13', classIds: ['cp'], subjectIds: [] },
      { id: 'dec', term: 1, dateFrom: '2026-12-14', dateTo: '2026-12-18', classIds: ['cp', 'ce1'], subjectIds: [] },
    ];
    expect(examControlLabel(saved, saved[0], t)).toBe('massar.flow.controlNumber{"exam":"1"} · massar.flow.semester{"term":1}');
    expect(examControlLabel(saved, saved[1], t)).toBe('massar.flow.controlNumber{"exam":"1 / 2"} · massar.flow.semester{"term":1}');
    expect(examControlLabel(saved, saved[1], t, ['ce1'])).toBe('massar.flow.controlNumber{"exam":"1"} · massar.flow.semester{"term":1}');
  });
});

describe('what a teacher may plan', () => {
  const subjects = [{ id: 'fr', name: 'Langue française', subSubjects: [{ name: 'Grammaire' }] }, { id: 'ar', name: 'اللغة العربية', subSubjects: [] }];
  it('plans every subject school-wide, nothing until the list loads, and a teacher their own per class', () => {
    expect(plannableInClass(null, 'cp')).toBeNull();
    expect([...plannableInClass(undefined, 'cp') ?? ['x']]).toEqual([]);
    expect([...plannableInClass({ cp: ['fr'] }, 'cp') ?? []]).toEqual(['fr']);
    expect([...plannableInClass({ cp: ['fr'] }, 'ce1') ?? ['x']]).toEqual([]);
  });
  it('changes an entry of their subject or sub-subject, or a new one with none picked, and reads the others', () => {
    const allowed = plannableInClass({ cp: ['fr'] }, 'cp');
    expect(mayPlanEntry(allowed, subjects, ' grammaire ')).toBe(true);
    expect(mayPlanEntry(allowed, subjects, 'Langue française')).toBe(true);
    expect(mayPlanEntry(allowed, subjects, '')).toBe(true);
    expect(mayPlanEntry(allowed, subjects, 'اللغة العربية')).toBe(false);
    expect(mayPlanEntry(allowed, subjects, 'Robotique')).toBe(false);
    expect(mayPlanEntry(null, subjects, 'Robotique')).toBe(true);
  });
});

describe('ticking a Contrôle\'s classes a cycle at a time', () => {
  const primary = { id: 'p', name: 'Primaire', labels: { ar: 'الابتدائي' }, order: 1 };
  const college = { id: 'c', name: 'Collège', labels: null, order: 2 };
  const classes = [
    { id: '1apic', cycle: college }, { id: '1apg', cycle: primary }, { id: '2apg', cycle: primary }, { id: 'loose', cycle: null }, { id: 'old' },
  ];

  it('groups the classes by cycle in the school\'s order, labelled in the reader\'s language, classes with none last', () => {
    expect(planningClassGroups(classes, 'fr')).toEqual([
      { id: 'p', label: 'Primaire', order: 1, classIds: ['1apg', '2apg'] },
      { id: 'c', label: 'Collège', order: 2, classIds: ['1apic'] },
      { id: null, label: null, order: Number.POSITIVE_INFINITY, classIds: ['loose', 'old'] },
    ]);
    expect(planningClassGroups(classes, 'ar')[0].label).toBe('الابتدائي');
  });

  it('shows a Contrôle\'s classes by cycle, a whole cycle as one, and counts its days', () => {
    const groups = planningClassGroups(classes, 'fr');
    expect(controlClassGroups(['2apg', '1apic', '1apg', 'elsewhere'], groups).map(({ id, whole, classIds }) => ({ id, whole, classIds }))).toEqual([
      { id: 'p', whole: true, classIds: ['1apg', '2apg'] },
      { id: 'c', whole: true, classIds: ['1apic'] },
    ]);
    expect(controlClassGroups(['2apg'], groups)[0]).toMatchObject({ id: 'p', whole: false, classIds: ['2apg'] });
    expect([controlDayCount({ dateFrom: '2027-01-02', dateTo: '2027-01-08' }), controlDayCount({ dateFrom: '2026-11-09', dateTo: '2026-11-09' })]).toEqual([7, 1]);
  });
});

describe('the period Planning shows', () => {
  const at = (id: string, from: string, to: string, classIds: string[], subjectIds: string[] = []): ExamControl =>
    ({ id, term: 1, dateFrom: from, dateTo: to, classIds, subjectIds });
  const controls = [
    at('dec', '2026-12-07', '2026-12-11', ['cp']), at('nov', '2026-11-09', '2026-11-13', ['cp', '1ac']),
    at('maths', '2026-11-16', '2026-11-20', ['1ac'], ['maths']), at('fr', '2026-11-16', '2026-11-20', ['1ac'], ['fr']),
  ];

  it('is picked among the Contrôles, the picked class’s only, one per set of days', () => {
    expect(periodControls(controls, null).map(control => control.id)).toEqual(['nov', 'fr', 'dec']);
    expect(periodControls(controls, 'cp').map(control => control.id)).toEqual(['nov', 'dec']);
    expect(periodControls(controls, '1ac').map(control => control.id)).toEqual(['nov', 'fr']);
  });

  it('opens on the Contrôle under way, else the next, else the last', () => {
    const periods = periodControls(controls, null);
    expect(currentControl(periods, '2026-11-18')?.id).toBe('fr');
    expect(currentControl(periods, '2026-11-25')?.id).toBe('dec');
    expect(currentControl(periods, '2027-03-01')?.id).toBe('dec');
    expect(currentControl([], '2027-03-01')).toBeUndefined();
  });
});
