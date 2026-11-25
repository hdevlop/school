import { describe, expect, it } from 'bun:test';
import {
  classControlNumber, controlFirstDays, controlNumbers, derivedExamControls, examControlProblem, examDaysOf, massarControlFor, massarControlsOfYear, mergedMassarControls, monthEndOf, yearExamControls,
  type ExamControl,
} from '../src/examControls';

const plans = [
  { classId: 'cp', months: { '2026-11': [{ date: '2026-11-09' }, { date: '2026-11-10' }], '2026-12': [{ date: '2026-12-14' }] } },
  { classId: 'ce1', months: { '2026-11': [{ date: '2026-11-12' }] } },
];
const saved = (over: Partial<ExamControl> = {}): ExamControl => ({
  id: 'c', term: 1, dateFrom: '2026-11-09', dateTo: '2026-11-13', classIds: ['cp'], subjectIds: [], ...over,
});

describe('a year without saved Contrôles', () => {
  it('reads them from Planning\'s months, as before: each month with exams is the next one, sat by the classes with exams', () => {
    expect(derivedExamControls(plans)).toEqual([
      { id: 'derived-1-1', term: 1, dateFrom: '2026-11-09', dateTo: '2026-11-12', classIds: ['ce1', 'cp'], subjectIds: [], derived: true },
      { id: 'derived-1-2', term: 1, dateFrom: '2026-12-14', dateTo: '2026-12-14', classIds: ['cp'], subjectIds: [], derived: true },
    ]);
  });

  it('links each month\'s whole month to Massar, and opens its first day to every class', () => {
    const [november] = massarControlsOfYear([], plans);
    expect(november).toMatchObject({ term: 1, exam: 1, examFrom: '2026-11-09', linkFrom: '2026-11-01', linkTo: '2026-11-30' });
    expect([...controlFirstDays(derivedExamControls(plans), 'another-class')]).toEqual(['2026-11-09', '2026-12-14']);
  });

  it('stops reading the months once a Contrôle is saved', () => {
    expect(yearExamControls([saved({ id: 'only' })], plans).map(control => control.id)).toEqual(['only']);
  });
});

describe('saved Contrôles', () => {
  it('are numbered by each class in date order, and link their own days and first day to their own classes', () => {
    const controls = [saved({ dateFrom: '2026-11-30', dateTo: '2026-12-04' }), saved({ id: 'dec', dateFrom: '2026-12-14', dateTo: '2026-12-15', classIds: ['cp', 'ce1'] })];
    expect(massarControlsOfYear(controls, [])).toEqual([
      { term: 1, exam: 1, subjectId: null, examFrom: '2026-11-30', examTo: '2026-12-04', classIds: ['cp'], linkFrom: '2026-11-30', linkTo: '2026-12-04' },
      // December is CP's second Contrôle and CE1's first.
      { term: 1, exam: 2, subjectId: null, examFrom: '2026-12-14', examTo: '2026-12-15', classIds: ['cp'], linkFrom: '2026-12-14', linkTo: '2026-12-15' },
      { term: 1, exam: 1, subjectId: null, examFrom: '2026-12-14', examTo: '2026-12-15', classIds: ['ce1'], linkFrom: '2026-12-14', linkTo: '2026-12-15' },
    ]);
    expect([classControlNumber(controls, controls[1], 'cp'), classControlNumber(controls, controls[1], 'ce1')]).toEqual([2, 1]);
    expect([...controlFirstDays(controls, 'cp')]).toEqual(['2026-11-30', '2026-12-14']);
    expect([...controlFirstDays(controls, 'ce1')]).toEqual(['2026-12-14']);
    expect([...controlFirstDays(controls, 'ce2')]).toEqual([]);
  });

  it('start again at 1 each semester, and a fourth one stays the school\'s', () => {
    const days = ['2026-10-05', '2026-11-02', '2026-11-30', '2026-12-14', '2027-03-08'];
    const controls = days.map((day, index) => saved({ id: `c${index}`, term: day < '2027-02' ? 1 : 2, dateFrom: day, dateTo: day }));
    expect(massarControlsOfYear(controls, []).map(control => `${control.term}.${control.exam}`)).toEqual(['1.1', '1.2', '1.3', '2.1']);
  });

  it('merge per Massar Contrôle for Massar\'s pages when classes sit it on different days', () => {
    const merged = mergedMassarControls(massarControlsOfYear([
      saved({ id: 'a', dateFrom: '2026-11-09', dateTo: '2026-11-13', classIds: ['cp'] }),
      saved({ id: 'b', dateFrom: '2026-11-16', dateTo: '2026-11-20', classIds: ['ce1'] }),
    ], []));
    expect(merged).toEqual([{ term: 1, exam: 1, subjectId: null, examFrom: '2026-11-09', examTo: '2026-11-20', classIds: ['ce1', 'cp'], linkFrom: '2026-11-09', linkTo: '2026-11-20' }]);
  });
});

describe('opening a Contrôle', () => {
  const valid = { dateFrom: '2026-12-07', dateTo: '2026-12-11', classIds: ['cp'], subjectIds: [] as string[] };
  it('accepts days in one semester of the year, for classes free those days, as many as the school holds', () => {
    expect(examControlProblem(valid, [saved()], '2026-2027')).toBeNull();
    // Another class may sit its own Contrôle on the same days.
    expect(examControlProblem({ ...valid, dateFrom: '2026-11-09', dateTo: '2026-11-13' }, [saved({ classIds: ['ce1'] })], '2026-2027')).toBeNull();
    const many = ['2026-10-05', '2026-10-19', '2026-11-02', '2026-11-16'].map((day, index) => saved({ id: `c${index}`, dateFrom: day, dateTo: day }));
    expect(examControlProblem(valid, many, '2026-2027')).toBeNull();
  });

  it('names what is wrong', () => {
    expect(examControlProblem({ ...valid, dateFrom: '2026-12-12' }, [], '2026-2027')).toBe('invalidDates');
    expect(examControlProblem({ ...valid, dateFrom: '2026-02-30' }, [], '2026-2027')).toBe('invalidDates');
    expect(examControlProblem({ ...valid, dateFrom: '2026-08-31', dateTo: '2026-09-02' }, [], '2026-2027')).toBe('outsideYear');
    expect(examControlProblem({ ...valid, dateFrom: '2027-01-28', dateTo: '2027-02-03' }, [], '2026-2027')).toBe('twoSemesters');
    expect(examControlProblem({ ...valid, classIds: [] }, [], '2026-2027')).toBe('noClasses');
    expect(examControlProblem({ ...valid, dateFrom: '2026-11-13', dateTo: '2026-11-14' }, [saved()], '2026-2027')).toBe('overlap');
  });

  it('keeps January in semester one, and knows each month\'s last day', () => {
    expect(examControlProblem({ ...valid, dateFrom: '2027-01-11', dateTo: '2027-01-15' }, [saved()], '2026-2027')).toBeNull();
    expect([monthEndOf('2026-11-04'), monthEndOf('2027-02-10'), monthEndOf('2026-12-31')]).toEqual(['2026-11-30', '2027-02-28', '2026-12-31']);
  });
});

describe('Contrôles of a few subjects, as collège holds them', () => {
  const maths = saved({ id: 'maths-pc', dateFrom: '2026-11-09', dateTo: '2026-11-13', classIds: ['1ac'], subjectIds: ['maths', 'pc'] });
  const french = saved({ id: 'fr', dateFrom: '2026-11-10', dateTo: '2026-11-12', classIds: ['1ac'], subjectIds: ['fr'] });
  const maths2 = saved({ id: 'maths-2', dateFrom: '2026-12-07', dateTo: '2026-12-07', classIds: ['1ac'], subjectIds: ['maths'] });
  const controls = [maths, french, maths2];
  const massar = massarControlsOfYear(controls, []);
  const fard = (exam: number, subjectId: string | null) => massarControlFor(massar, { term: 1, exam, classId: '1ac', subjectId })?.examFrom;

  it('number each subject\'s fards on their own, in date order', () => {
    expect([fard(1, 'maths'), fard(2, 'maths'), fard(1, 'pc'), fard(2, 'pc'), fard(1, 'fr')]).toEqual(['2026-11-09', '2026-12-07', '2026-11-09', undefined, '2026-11-10']);
    // A subject none of them tests has no fard.
    expect(fard(1, 'svt')).toBeUndefined();
    expect(controlNumbers(controls, maths2)).toEqual([2]);
    expect([...controlFirstDays(controls, '1ac', 'fr')]).toEqual(['2026-11-10']);
    expect([...controlFirstDays(controls, '1ac', 'svt')]).toEqual([]);
  });

  it('count a Contrôle of every subject in each subject\'s fards', () => {
    const all = saved({ id: 'all', dateFrom: '2026-10-05', dateTo: '2026-10-09', classIds: ['1ac'] });
    const mixed = massarControlsOfYear([all, maths], []);
    const of = (exam: number, subjectId: string | null) => massarControlFor(mixed, { term: 1, exam, classId: '1ac', subjectId })?.examFrom;
    expect([of(1, 'maths'), of(2, 'maths'), of(1, 'svt'), of(2, 'svt')]).toEqual(['2026-10-05', '2026-11-09', '2026-10-05', undefined]);
    expect(classControlNumber([all, maths], maths, '1ac', 'maths')).toBe(2);
  });

  it('number a subject\'s fards by its exams in Contrôles of every subject', () => {
    const weeks = ['2026-10-05', '2026-11-09', '2026-12-07'].map((day, index) =>
      saved({ id: `w${index + 1}`, dateFrom: day, dateTo: `${day.slice(0, 8)}${String(Number(day.slice(8)) + 4).padStart(2, '0')}`, classIds: ['1ac', '2ac'] }));
    // 1AC sits English in weeks 2 and 3 only, maths in all three; 2AC has no exam planned yet.
    const days = examDaysOf([
      { classId: '1ac', subjectId: 'en', date: '2026-11-10' }, { classId: '1ac', subjectId: 'en', date: new Date('2026-12-08T00:00:00Z') },
      { classId: '1ac', subjectId: 'maths', date: '2026-10-06' }, { classId: '1ac', subjectId: 'maths', date: '2026-11-11' }, { classId: '1ac', subjectId: 'maths', date: '2026-12-09' },
      { classId: null, subjectId: 'en', date: '2026-10-06' },
    ]);
    const massar = massarControlsOfYear(weeks, [], days);
    const of = (classId: string, exam: number, subjectId: string | null) => massarControlFor(massar, { term: 1, exam, classId, subjectId })?.examFrom;
    // English's first exam is its Fard 1, in week 2.
    expect([of('1ac', 1, 'en'), of('1ac', 2, 'en'), of('1ac', 3, 'en')]).toEqual(['2026-11-09', '2026-12-07', undefined]);
    expect([of('1ac', 1, 'maths'), of('1ac', 2, 'maths'), of('1ac', 3, 'maths')]).toEqual(['2026-10-05', '2026-11-09', '2026-12-07']);
    // Without exams of a subject, each Contrôle counts, as before.
    expect([of('1ac', 1, 'svt'), of('2ac', 1, 'en'), of('2ac', 2, 'en')]).toEqual(['2026-10-05', '2026-10-05', '2026-11-09']);
    expect(classControlNumber(weeks, weeks[1], '1ac', 'en', days)).toBe(1);
    expect(classControlNumber(weeks, weeks[0], '1ac', 'en', days)).toBe(0);
    // Without exam days the numbering is unchanged.
    expect(classControlNumber(weeks, weeks[1], '1ac', 'en')).toBe(2);
  });

  it('let two Contrôles of different subjects share days, not two of the same subject', () => {
    const input = { dateFrom: '2026-11-11', dateTo: '2026-11-11', classIds: ['1ac'] };
    expect(examControlProblem({ ...input, subjectIds: ['svt'] }, controls, '2026-2027')).toBeNull();
    expect(examControlProblem({ ...input, subjectIds: ['maths'] }, controls, '2026-2027')).toBe('overlap');
    // One of every subject shares a subject with each of them.
    expect(examControlProblem({ ...input, subjectIds: [] }, controls, '2026-2027')).toBe('overlap');
  });
});
