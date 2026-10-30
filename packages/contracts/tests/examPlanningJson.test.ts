import { describe, expect, it } from 'bun:test';
import { parseExamPlanningJson, resolveExamPlanningClasses, type ExamPlanningJson } from '../src/examPlanningJson';
import type { ExamPlanningEntry } from '../src/examPlanning';

const entry: ExamPlanningEntry = { id: 'arabic', date: '2026-11-09', subject: 'اللغة العربية', lessons: ['الجملة الاسمية'] };
const document: ExamPlanningJson = { format: 'school-exam-planning', version: 1, schoolYear: '2026-2027', exportedAt: '2026-10-29T12:00:00.000Z', classes: [
  { name: 'CP', visible: false, months: { '2026-11': [entry], '2027-02': [] } },
] };

describe('exam planning JSON contract', () => {
  it('round trips Arabic, visibility and explicitly empty months', () => {
    expect(parseExamPlanningJson(JSON.parse(JSON.stringify(document)))).toEqual({ success: true, data: document });
  });

  it('removes database class IDs from new exports and accepts older exports with different IDs', () => {
    const legacy = { ...document, classes: [{ ...document.classes[0], id: 'source-machine-class' }] };
    expect(parseExamPlanningJson(legacy)).toEqual({ success: true, data: document });
    expect(JSON.stringify(parseExamPlanningJson(legacy))).not.toContain('source-machine-class');
    expect(parseExamPlanningJson({ ...legacy, classes: [{ ...legacy.classes[0], id: 42 }] }).success).toBe(false);
  });

  it('matches names across databases, ignoring case, surrounding whitespace and Unicode composition', () => {
    const incoming = { ...document, classes: [{ ...document.classes[0], name: '  cp  ' }] };
    expect(resolveExamPlanningClasses(incoming, [{ id: 'destination-cp', name: 'CP' }])).toEqual({
      success: true, classes: [{ ...document.classes[0], id: 'destination-cp' }],
    });
    const unicode = { ...document, classes: [{ ...document.classes[0], name: 'E\u0301cole' }] };
    expect(resolveExamPlanningClasses(unicode, [{ id: 'destination', name: 'École' }]).success).toBe(true);
  });

  it('refuses unknown or ambiguous destination names and duplicate source names', () => {
    expect(resolveExamPlanningClasses(document, [{ id: 'cp', name: 'CE1' }])).toEqual({ success: false, error: 'unknownClasses' });
    expect(resolveExamPlanningClasses(document, [{ id: 'one', name: 'CP' }, { id: 'two', name: ' cp ' }]))
      .toEqual({ success: false, error: 'ambiguousClasses' });
    const duplicate = { ...document, classes: [{ ...document.classes[0], id: 'one' }, { ...document.classes[0], id: 'two', name: ' cp ' }] };
    expect(parseExamPlanningJson(duplicate).success).toBe(false);
    expect(resolveExamPlanningClasses(duplicate, [{ id: 'destination-cp', name: 'CP' }]))
      .toEqual({ success: false, error: 'ambiguousClasses' });
  });

  it('normalizes lesson whitespace without accepting extra fields or an invalid export timestamp', () => {
    const value = { ...document, classes: [{ ...document.classes[0], months: { '2026-11': [{ ...entry, subject: '  Arabic  ', lessons: ['  Lesson  '] }] } }] };
    const result = parseExamPlanningJson(value);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.classes[0].months['2026-11'][0]).toEqual({ ...entry, subject: 'Arabic', lessons: ['Lesson'] });
    expect(parseExamPlanningJson({ ...document, exportedAt: '2026-02-31T12:00:00Z' }).success).toBe(false);
    expect(parseExamPlanningJson({ ...document, classes: [{ ...document.classes[0], months: { '2026-11': [{ ...entry, assessmentId: 'unrelated' }] } }] }).success).toBe(false);
  });

  it('accepts the lesson language older plans stored, and drops it', () => {
    const legacy = { ...document, classes: [{ ...document.classes[0], months: { ...document.classes[0].months, '2026-11': [{ ...entry, language: 'ar' }] } }] };
    expect(parseExamPlanningJson(legacy)).toEqual({ success: true, data: document });
  });

  it('rejects unrelated JSON, unsupported versions, duplicate classes and foreign-year months', () => {
    for (const value of [null, [], {}, { ...document, version: 2 }, { ...document, format: 'school-fees' },
      { ...document, schoolYear: '2026-2028' }, { ...document, classes: [] }, { ...document, classes: [...document.classes, ...document.classes] },
      { ...document, classes: [{ ...document.classes[0], months: { '2025-11': [] } }] },
      { ...document, unexpected: true }]) {
      expect(parseExamPlanningJson(value).success).toBe(false);
    }
  });

  it('validates every entry and its month before allowing an import', () => {
    for (const entries of [[{ ...entry, date: '2026-11-31' }], [{ ...entry, date: '2026-12-01' }], [entry, entry],
      [{ ...entry, subject: ' ' }], [{ ...entry, language: 'unknown' }], [{ ...entry, lessons: ['x'.repeat(501)] }],
      [{ ...entry, lessons: Array(41).fill('Lesson') }], Array.from({ length: 201 }, (_, id) => ({ ...entry, id: String(id) }))]) {
      expect(parseExamPlanningJson({ ...document, classes: [{ ...document.classes[0], months: { '2026-11': entries } }] }).success).toBe(false);
    }
  });
});
