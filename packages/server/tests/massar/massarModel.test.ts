import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { massarModel } from '../../src/modules/massar/massarModel';
import { MassarService } from '../../src/modules/massar/MassarService';
import { MassarValidator } from '../../src/modules/massar/MassarValidator';

// 0030 المعلوميات: no Massar export had it yet; the school confirmed Massar grades it in collège (2026-11-09).
const COLLEGE_SUBJECTS = ['0011', '0012', '0013', '0018', '0019', '0020', '0023', '0024', '0026', '0030'];
const TERM_LABELS: Record<number, string> = { 1: 'الدورة الأولى', 2: 'الدورة الثانية' };
const exams = (level: string, code: string, term = 1) => massarModel([]).get(level)!.get(code)!.rounds!.filter(round => round.term === term).map(round => round.exam);

describe('Massar default model', () => {
  it('holds the collège levels read from 2026/27 exports, each subject with its tests in both terms', () => {
    const model = massarModel([]);
    for (const level of ['1APIC', '2APIC', '3APIC']) {
      expect([...model.get(level)!.keys()]).toEqual(COLLEGE_SUBJECTS);
      for (const subject of model.get(level)!.values()) {
        // As a single-test export of the first test would say, so a file of this year confirms it unchanged.
        expect(subject.components).toEqual([{ code: '1', name: 'الفرض الأول' }]);
        expect(subject.rounds!.every(round => round.termLabel === TERM_LABELS[round.term] && round.components[0].code === String(round.exam))).toBe(true);
        // The files show the first term only; the school confirmed the second repeats its tests.
        const term = (n: number) => subject.rounds!.filter(round => round.term === n).map(({ exam, examLabel, components }) => ({ exam, examLabel, components }));
        expect(term(1).length).toBeGreaterThan(0);
        expect(term(2)).toEqual(term(1));
      }
    }
    // French has four tests: Massar codes the fourth 5, after integrated activities (4).
    expect(model.get('1APIC')!.get('0012')!.rounds!.filter(round => round.term === 1).map(round => [round.exam, round.examLabel])).toEqual([[1, 'الفرض الأول'], [2, 'الفرض الثاني'], [3, 'الفرض الثالث'], [4, 'الأنشطة المندمجة'], [5, 'الفرض الرابع']]);
    expect(exams('1APIC', '0019')).toEqual([1, 2, 3]);
    expect(exams('1APIC', '0018')).toEqual([1, 2, 3, 4]);
    expect(exams('2APIC', '0018')).toEqual([1, 2, 3, 4]);
    expect(exams('2APIC', '0012')).toEqual([1, 2, 3, 4, 5]);
    expect(exams('3APIC', '0018')).toEqual([1, 2, 4]);
    for (const level of ['1APIC', '2APIC', '3APIC']) expect(model.get(level)!.get('0030')!.name).toBe('المعلوميات');
    expect(model.get('1APG')!.get('0011')!.rounds).toEqual([]);
  });
  it('lets the previous year replace a subject, keeping the model\'s tests only where that year saw none', () => {
    const own = { term: 1, exam: 2, termLabel: 'الدورة الأولى', examLabel: 'الفرض الثاني', components: [{ code: '2', name: 'الفرض الثاني' }] };
    const model = massarModel([
      { level: '1APIC', code: '0019', name: 'الرياضيات', components: [{ code: '1', name: 'الفرض الأول' }], rounds: [own] },
      { level: '1APIC', code: '0011', name: 'اللغة العربية', components: [{ code: '1', name: 'الفرض الأول' }], rounds: [] },
    ]);
    expect(model.get('1APIC')!.get('0019')!.rounds).toEqual([own]);
    expect(model.get('1APIC')!.get('0011')!.rounds!.map(round => [round.term, round.exam])).toEqual([[1, 1], [1, 2], [1, 4], [2, 1], [2, 2], [2, 4]]);
  });
  it('adds a collège model subject with its tests, so it gets grids after the first test', async () => {
    const added: Array<{ code: string; observedRounds: Array<{ term: number; exam: number }> }> = [];
    const repository = {
      setup: async () => ({ levels: [{ id: 'level', code: '3APIC' }], subjects: [], appSubjects: [] }),
      previousYearSubjects: async () => [], addModelSubject: async (data: typeof added[number]) => { added.push(data); },
    };
    await (new MassarService(repository as any, new MassarValidator(), {} as any, {} as any, {} as any) as any).applyModel();
    expect(added.map(subject => subject.code)).toEqual(COLLEGE_SUBJECTS);
    expect(added.find(subject => subject.code === '0023')!.observedRounds.map(round => `${round.term}.${round.exam}`)).toEqual(['1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '2.3', '2.4']);
  });
  it('gives the open Contrôles a subject the model gained after the year was set up, once', async () => {
    const known = new Set(['0011']);
    let applied = 0;
    const repository = {
      levelSubjectCodes: async () => [{ code: '1APIC', subjects: known }],
      previousYearSubjects: async () => [],
      lock: async () => {},
      relinkTeachers: async () => {}, sheets: async () => [], completedMarkCounts: async () => [],
    };
    const service = new MassarService(repository as any, new MassarValidator(), {} as any, {} as any, {} as any) as any;
    service.year = { id: 'year', status: 'active' };
    service.addMissingSheets = async () => { applied++; COLLEGE_SUBJECTS.forEach(code => known.add(code)); };
    await service.sheets('round');
    await service.sheets('round');
    expect(applied).toBe(1);
  });
});
