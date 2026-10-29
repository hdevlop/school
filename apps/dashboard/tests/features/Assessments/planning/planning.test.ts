import { afterEach, describe, expect, it } from 'bun:test';
import { buildPlanningDocument, printPlanningDocument, type PlanningDocumentOptions } from '@/features/Assessments/planning/planningDocument';
import { classDocumentColors, filterPlanningAssessments, planningClasses, revisionGroups, type PlanningAssessment } from '@/features/Assessments/planning/planningModel';

const records: PlanningAssessment[] = [
  { id: 'math', title: 'Numbers', date: '2026-11-11', status: 'scheduled', class: { id: 'cp', name: 'CP' }, section: { id: 'a', name: 'A' }, sectionIds: ['a', 'b'], subject: { id: 'math', name: 'Mathématiques' }, planning: { round: 'Contrôle 1', semester: 1, groups: [{ label: '', language: 'fr', lessons: ['Les nombres de 0 à 5'] }] } },
  { id: 'arabic', title: 'اللغة العربية', date: '2026-11-09', status: 'scheduled', class: { id: 'ce2', name: 'CE2' }, section: { id: 'c', name: 'C' }, description: '• الجملة الاسمية\nالجملة الفعلية' },
  { id: 'french', title: 'French', date: '2026-11-10', status: 'scheduled', class: { id: 'cp', name: 'CP' }, section: { id: 'a', name: 'A' }, planning: { round: 'Contrôle 1', semester: 1, groups: [{ label: 'Grammaire', language: 'fr', lessons: ['La phrase'] }, { label: 'الإملاء', language: 'ar', lessons: ['همزة الوصل'] }] } },
];
const options: PlanningDocumentOptions = { title: 'Calendrier des contrôles n°1', schoolName: 'École', academicYear: '2026/2027', semester: 1, language: 'fr', assetOrigin: 'https://school.example', labels: { semester: 'Semestre', academicYear: 'Année scolaire', class: 'Classe', lessons: 'Leçons ciblées', subject: 'Matière', date: 'Date', sections: 'Sections' } };

describe('planning selection and document', () => {
  it('uses official class aliases for the six reference colors and sorts classes academically', () => {
    expect(classDocumentColors('CP')).toEqual(['#D94F8A', '#FCE8F1']);
    expect(classDocumentColors('3APG')).toEqual(['#2E9A57', '#E5F4EB']);
    expect(classDocumentColors('CE6')).toEqual(['#7A4DBA', '#EFE8F8']);
    expect(planningClasses(records).map(cls => cls.id)).toEqual(['cp', 'ce2']);
  });

  it('filters inclusive dates, round, class and every target section while excluding cancelled assessments', () => {
    const input = [...records, { ...records[0], id: 'cancelled', status: 'cancelled' }, { ...records[0], id: 'later', planning: { ...records[0].planning!, semester: 2 as const } }];
    expect(filterPlanningAssessments(input, { classId: 'cp', sectionId: 'b', from: '2026-11-11', to: '2026-11-11', round: 'Contrôle 1', semester: 1 }).map(row => row.id)).toEqual(['math']);
    expect(filterPlanningAssessments(input, { round: '' }).map(row => row.id)).toEqual(['arabic']);
    expect(filterPlanningAssessments(input, { classId: 'ce2' }).map(row => row.id)).toEqual(['arabic']);
  });

  it('reads legacy descriptions without rewriting them, and uses saved revision groups when present', () => {
    expect(revisionGroups(records[1])).toEqual([{ label: '', language: 'ar', lessons: ['الجملة الاسمية', 'الجملة الفعلية'] }]);
    expect(revisionGroups(records[0])).toEqual(records[0].planning!.groups);
    expect(records[1].description).toBe('• الجملة الاسمية\nالجملة الفعلية');
  });

  it('prints separate class sheets, merges dates across subject areas, and preserves Arabic direction and colors', () => {
    const html = buildPlanningDocument(records, options);
    expect(html.match(/<section class="sheet"/g)).toHaveLength(2);
    expect(html.indexOf('>1APG<')).toBeLessThan(html.indexOf('>3APG<'));
    expect(html).toContain('rowspan="2"');
    expect(html).toContain('lang="ar" dir="rtl"');
    expect(html).toContain('--document-accent:#D94F8A');
    expect(html).toContain('print-color-adjust:exact');
    expect(html).toContain('@page{size:A4 portrait');
    expect(html).toContain('break-after:page');
    expect(html).toContain('https://school.example/fonts/assessment-planning/FreeSerif.ttf');
  });

  it('labels both semesters when the chosen dates span them, separately for each class', () => {
    const later = { ...records[0], id: 'february', date: '2027-02-01', planning: { ...records[0].planning!, semester: 2 as const } };
    const html = buildPlanningDocument([records[0], later], { ...options, semester: null });
    expect(html).toContain('Semestre 1 / 2');
    expect(html).toContain('01/02/2027');
    expect(html).not.toContain('null');
  });

  it('escapes lesson, class, title, school and translated label text and blocks active logo URLs', () => {
    const canary = '<img src=x onerror="alert(1)">';
    const record = { ...records[0], class: { id: 'class', name: canary }, planning: { ...records[0].planning!, groups: [{ label: canary, language: 'ar' as const, lessons: [canary] }] } };
    const html = buildPlanningDocument([record], { ...options, title: canary, schoolName: canary, schoolLogo: 'javascript:alert(1)', labels: { ...options.labels, lessons: canary } });
    expect(html).not.toContain(canary);
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<script');
  });
});

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
afterEach(() => { if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else Reflect.deleteProperty(globalThis, 'window'); });

it('waits for fonts and the school logo before opening the print dialog', async () => {
  let fontsReady!: () => void;
  let logoReady!: () => void;
  let printed = false;
  const writes: string[] = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    open: () => ({ closed: false, document: { write: (html: string) => writes.push(html), close() {}, fonts: { ready: new Promise<void>(resolve => { fontsReady = resolve; }) }, images: [{ complete: false, addEventListener: (type: string, callback: () => void) => { if (type === 'load') logoReady = callback; } }] }, focus() {}, print() { printed = true; } }),
  } });
  const printing = printPlanningDocument('<p>document</p>');
  expect(printed).toBe(false);
  fontsReady();
  await Promise.resolve();
  expect(printed).toBe(false);
  logoReady();
  await expect(printing).resolves.toBe(true);
  expect(writes).toEqual(['<p>document</p>']);
  expect(printed).toBe(true);
});

it('reports a blocked print window without pretending to export a PDF', async () => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { open: () => null } });
  await expect(printPlanningDocument('<p>document</p>')).resolves.toBe(false);
});
