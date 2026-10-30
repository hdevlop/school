import { describe, expect, it } from 'bun:test';
import { importExamPlanningDto, saveExamPlanningDto } from '../../src/modules/examPlanning/ExamPlanningDto';
import { ExamPlanningService } from '../../src/modules/examPlanning/ExamPlanningService';

const entry = { id: 'arabic', date: '2026-11-09', subject: 'اللغة العربية', lessons: ['الجملة الاسمية'] };
const valid = { month: '2026-11', entries: [entry] };

function service(catalog = [{ id: 'cp', name: 'CP' }]) {
  const writes: unknown[] = [];
  const instance = Object.create(ExamPlanningService.prototype) as ExamPlanningService;
  Object.defineProperty(instance, 'year', { value: { id: 'year', label: '2026-2027' } });
  Object.assign(instance, { t: (key: string) => key, repository: {
    getAll: async () => catalog.map(cls => ({ ...cls, visible: null, months: null })),
    saveMonth: async (...args: unknown[]) => { writes.push(args); },
    saveVisibility: async (...args: unknown[]) => { writes.push(args); },
    importDocument: async (...args: unknown[]) => { writes.push(args); },
    clearContent: async (...args: unknown[]) => { writes.push(args); },
  } });
  return { instance, writes };
}

describe('independent exam planning', () => {
  it('clears content only for the classes returned by the owned year catalog', async () => {
    const { instance, writes } = service();
    await instance.clearContent();
    expect(writes).toEqual([[['cp']]]);
  });
  it('accepts bilingual plans without requiring an assessment, teacher assignment or semester field', () => {
    expect(saveExamPlanningDto.parse(valid)).toEqual(valid);
    expect(saveExamPlanningDto.parse({ month: '2026-11', entries: [] }).entries).toEqual([]);
  });
  it('rejects wrong-month dates, invalid calendar dates, duplicate IDs and oversized topics', () => {
    for (const entries of [[{ ...entry, date: '2026-10-09' }], [{ ...entry, date: '2026-11-31' }], [entry, entry], [{ ...entry, subject: ' ' }], [{ ...entry, lessons: ['x'.repeat(501)] }], [{ ...entry, lessons: Array(41).fill('Lesson') }], Array.from({ length: 201 }, (_, i) => ({ ...entry, id: `${i}` }))]) {
      expect(saveExamPlanningDto.safeParse({ ...valid, entries }).success).toBe(false);
    }
  });
  it('includes existing classes with no stored plan and defaults them to visible', async () => {
    expect(await service().instance.getAll()).toEqual([{ id: 'cp', name: 'CP', visible: true, months: {} }]);
  });
  it('refuses a class outside the scoped catalog and a month outside the selected year before writing', async () => {
    const { instance, writes } = service();
    await expect(instance.saveMonth('other-class', saveExamPlanningDto.parse(valid))).rejects.toThrow();
    await expect(instance.saveMonth('cp', { month: '2025-11', entries: [] })).rejects.toThrow();
    await expect(instance.saveVisibility(['other-class'])).rejects.toThrow();
    expect(writes).toHaveLength(0);
  });
  it('saves empty months and class visibility without requiring any graded records', async () => {
    const { instance, writes } = service();
    await instance.saveMonth('cp', { month: '2026-11', entries: [] });
    await instance.saveVisibility([]);
    expect(writes).toEqual([['cp', { month: '2026-11', entries: [] }], [['cp'], []]]);
  });

  it('rejects a different year or any unknown class before importing the batch', async () => {
    const { instance, writes } = service();
    const document = importExamPlanningDto.parse({ document: { format: 'school-exam-planning', version: 1,
      schoolYear: '2026-2027', exportedAt: new Date().toISOString(), classes: [{ name: 'CP', visible: false, months: {} }] } }).document;
    await expect(instance.importDocument({ ...document, schoolYear: '2025-2026' })).rejects.toThrow();
    await expect(instance.importDocument({ ...document, classes: [...document.classes, { ...document.classes[0], name: 'Foreign class' }] })).rejects.toThrow();
    expect(writes).toHaveLength(0);
    await instance.importDocument(document);
    expect(writes).toEqual([[document.classes.map(cls => ({ ...cls, id: 'cp' }))]]);
  });

  it('imports both ID-free and legacy files by name using only destination class IDs', async () => {
    const { instance, writes } = service([{ id: 'destination-cp', name: 'CP' }, { id: 'destination-ce1', name: 'CE1' }]);
    const legacy = { format: 'school-exam-planning', version: 1, schoolYear: '2026-2027', exportedAt: new Date().toISOString(), classes: [
      { id: 'source-cp', name: ' cp ', visible: false, months: { '2026-11': [entry], '2027-02': [] } },
      { id: 'source-ce1', name: 'CE1', visible: true, months: {} },
    ] };
    const document = importExamPlanningDto.parse({ document: legacy }).document;
    expect(document.classes.every(cls => !('id' in cls))).toBe(true);
    await instance.importDocument(document);
    await instance.importDocument(importExamPlanningDto.parse({ document }).document);
    const resolved = [
      { ...document.classes[0], id: 'destination-cp', name: 'CP' },
      { ...document.classes[1], id: 'destination-ce1' },
    ];
    expect(writes).toEqual([[resolved], [resolved]]);
  });

  it('rejects an unknown name even when a legacy ID matches a local class', async () => {
    const { instance, writes } = service();
    const document = importExamPlanningDto.parse({ document: { format: 'school-exam-planning', version: 1,
      schoolYear: '2026-2027', exportedAt: new Date().toISOString(), classes: [{ id: 'cp', name: 'Foreign class', visible: true, months: {} }] } }).document;
    await expect(instance.importDocument(document)).rejects.toThrow('examPlanning.json.unknownClasses');
    expect(writes).toHaveLength(0);
  });

  it('rejects ambiguous destination names before writing any part of the batch', async () => {
    const { instance, writes } = service([{ id: 'one', name: 'CP' }, { id: 'two', name: ' cp ' }]);
    const document = importExamPlanningDto.parse({ document: { format: 'school-exam-planning', version: 1,
      schoolYear: '2026-2027', exportedAt: new Date().toISOString(), classes: [{ name: 'CP', visible: false, months: {} }] } }).document;
    await expect(instance.importDocument(document)).rejects.toThrow('examPlanning.json.ambiguousClasses');
    expect(writes).toHaveLength(0);
  });
});
