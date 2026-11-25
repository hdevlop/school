import { describe, expect, it } from 'bun:test';
import type { CompetencyDomain, CompetencyEvaluation, MassarSheetDetail } from '@sms/contracts';
import { followUps } from '@/features/Competencies/config/followUpReport';
import { analyzeClass, classNote, classReport, deviation, median, supportCapacity, supportGroups, supportList } from '@/features/Competencies/config/classReport';
import { buildClassReportDocument, buildClassReportsDocument, LARGE_PRINT_PUPILS, pageFit, type ClassReportPrintOptions } from '@/features/Competencies/config/classReportDocument';
import { buildSupportListDocument, SUPPORT_LIST_SIZE } from '@/features/Competencies/config/supportListDocument';

const MONTHS = ['2026-09', '2026-10', '2026-11', '2026-12'];
const student = (id: string, name: string, position: number) => ({ id, studentCode: `F${position}`, name, dateOfBirth: '2016-01-01', massarStudentId: null, position });
const sheet = {
  sheet: { id: 'sh', roundId: 'r', className: '6APG-1', subjectName: 'Mathématiques', teacherName: 'Moslih', status: 'in_progress', missing: 0, total: 0, revision: 1, termLabel: 'الدورة الأولى', examLabel: 'الفرض الأول', roundStatus: 'open' },
  round: { id: 'r', term: 1, exam: 1, termLabel: 'الدورة الأولى', examLabel: 'الفرض الأول', status: 'open' },
  components: [{ code: 'm', name: 'الرياضيات' }],
  maxMark: 10,
  // Massar's order: Badr is listed first, Amina has the best mark, Chama has none.
  students: [student('b', 'Badr', 1), student('a', 'Amina', 2), student('c', 'Chama', 3), student('d', 'Driss', 4)],
  marks: [
    { studentId: 'a', componentCode: 'm', mark: 9.5, absence: 'none' },
    { studentId: 'b', componentCode: 'm', mark: 7, absence: 'none' },
    { studentId: 'c', componentCode: 'm', mark: null, absence: 'justified' },
    { studentId: 'd', componentCode: 'm', mark: 4, absence: 'none' },
  ],
  remarks: [],
  canEdit: true, canReopen: false, schoolName: 'École', levelLabel: 'السادس ابتدائي', yearLabel: '2026-2027', examFrom: '2026-11-12',
} as MassarSheetDetail;
const domains: CompetencyDomain[] = [{
  id: 'd1', teacherAssignmentId: 't', name: 'الأعداد', altName: null, position: 0,
  competencies: ['c1', 'c2', 'c3'].map((id, position) => ({ id, domainId: 'd1', name: `كفاية ${id}`, altName: null, position })),
}];
const level = (studentId: string, competencyId: string, month: string, value: CompetencyEvaluation['level']): CompetencyEvaluation => ({ studentId, competencyId, month, level: value });
const evaluations = [
  level('a', 'c1', '2026-09', 'in_progress'), level('a', 'c1', '2026-11', 'mastered'),
  level('a', 'c2', '2026-09', 'advanced'), level('a', 'c2', '2026-11', 'mastered'),
  level('a', 'c3', '2026-11', 'advanced'),
  level('b', 'c1', '2026-09', 'advanced'), level('b', 'c1', '2026-11', 'in_progress'),
  level('b', 'c2', '2026-11', 'advanced'),
  level('d', 'c1', '2026-09', 'beginning'), level('d', 'c1', '2026-11', 'beginning'),
  level('d', 'c2', '2026-11', 'not_acquired'),
  level('d', 'c3', '2026-11', 'in_progress'),
];
const reports = followUps({ sheet, domains, evaluations, remarks: [], months: MONTHS });
const report = classReport(reports, 10);
const labels = {
  language: 'ar' as const, maxMark: 10,
  levelLabel: (rank: number) => `L${Math.round(rank)}`, appreciationLabel: (grade: string) => grade, monthLabel: (month: string) => month,
};
/** The support groups of a printed list: each one's pupils and competencies, in order. */
const supportGroupsOf = (html: string) => html.split('<div class="group">').slice(1).map((chunk) => ({
  pupils: [...chunk.matchAll(/class="who[^"]*"><bdi>([^<]*)/g)].map((match) => match[1]),
  skills: [...chunk.matchAll(/class="what"><bdi>([^<]*)/g)].map((match) => match[1]),
}));
const options: ClassReportPrintOptions = {
  language: 'ar', dir: 'rtl', t: (key, params) => (params ? `${key}${JSON.stringify(params)}` : key), caption: (key) => `fr:${key}`,
  school: { name: 'École', logo: 'javascript:alert(1)' }, assetOrigin: 'http://localhost', subjectName: 'Mathématiques',
  className: '6APG-1', levelLabel: 'السادس ابتدائي', examLabel: 'الفرض الأول', termLabel: 'الدورة الأولى', yearLabel: '2026-2027',
  teacherName: 'Moslih', maxMark: 10, dateLabel: '20/11/2026', analysis: 'سطر <أول>\nسطر ثان', note: '',
};

describe('the class report after a Massar Contrôle', () => {
  it('measures the marks of the pupils who have one', () => {
    expect(median([4, 9.5, 7])).toBe(7);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(deviation([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
    expect(report).toMatchObject({ pupils: 4, marked: 3, mean: 6.83, high: 9.5, low: 4, median: 7, passed: 2, passRate: 67 });
    expect(report.distribution).toEqual({ excellent: 1, veryGood: 0, good: 1, average: 0, weak: 1 });
  });

  it('ranks the pupils by mark, those without one last, and keeps their levels and progress', () => {
    expect(report.rows.map((row) => [row.report.student.id, row.rank])).toEqual([['a', 1], ['b', 2], ['d', 3], ['c', null]]);
    const [amina, badr, driss] = report.rows;
    expect(amina.levels).toEqual({ c1: 'mastered', c2: 'mastered', c3: 'advanced' });
    // Against September: Amina rose on two, Badr fell on one, Driss stayed.
    expect([amina, badr, driss].map((row) => [row.up, row.down])).toEqual([[2, 0], [0, 1], [0, 0]]);
    expect([report.up, report.down]).toEqual([2, 1]);
  });

  it('sets each competency\'s class level now beside its level at the first assessment', () => {
    expect(report.baselineMonth).toBe('2026-09');
    const [c1, c2, c3] = report.domains[0].skills;
    expect(c1).toMatchObject({ baseline: 3, current: 3.33, mastery: 33 });
    expect(c2).toMatchObject({ baseline: 4, current: 3.33, mastery: 67 });
    // Not assessed in September.
    expect(c3.baseline).toBeNull();
    expect(c1.support.map((pupil) => pupil.id)).toEqual(['d']);
    expect(c1.consolidate.map((pupil) => pupil.id)).toEqual(['b']);
    expect(report.needSupport).toBe(1);
    expect(report.acquiredShare).toBe(50);
    expect(supportGroups(report).map((skill) => skill.id)).toEqual(['c1', 'c2', 'c3']);
  });

  it('has no first assessment when the class was only assessed in the Contrôle\'s month', () => {
    const late = classReport(followUps({ sheet, domains, evaluations: evaluations.filter((item) => item.month === '2026-11'), remarks: [], months: MONTHS }), 10);
    expect(late.baselineMonth).toBeNull();
    expect([late.up, late.down]).toEqual([0, 0]);
  });

  it('says why there is no level, and draws no empty profile, when none was set up to the Contrôle', () => {
    const none = classReport(followUps({ sheet, domains, evaluations: [], remarks: [], months: MONTHS }), 10);
    expect(analyzeClass(none, labels).split('\n').at(-1)).toBe('لم يُسجَّل أي تقييم للكفايات حتى شهر الفرض.');
    const undated = classReport(followUps({ sheet: { ...sheet, examFrom: null }, domains, evaluations, remarks: [], months: MONTHS }), 10);
    expect(analyzeClass(undated, labels)).toContain('لعدم توفر تاريخ للفرض');
    const html = buildClassReportDocument(none, options);
    expect(html).toContain('competencies.classReport.noLevels');
    expect(html).not.toContain('class="bar-row"');
  });

  it('reads the results in sentences, and suggests the teacher\'s remark', () => {
    const lines = analyzeClass(report, labels).split('\n');
    expect(lines[0]).toContain('6.8/10');
    expect(lines[1]).toContain('حصل 2 من أصل 3');
    expect(lines.some((line) => line.includes('مقارنة بتقييم 2026-09: 2 حالة تحسّن مقابل 1 حالة تراجع'))).toBe(true);
    expect(lines.at(-1)).toBe('1 تلميذ(ة) في حاجة إلى دعم في كفاية واحدة على الأقل.');
    expect(classNote(report, { ...labels, language: 'fr' })).toContain('moyens');
  });

  // Measured in Chrome (6 to 12 competencies): up to 28 pupils the table's large rows fill the front, up to 45 the
  // regular ones do; the back holds the profile, appraisals, eight support groups, the analysis and both remarks.
  it('prints every class on the two sides of one sheet, the rows large up to 28 pupils', () => {
    expect([12, 28, 29, 45].map(pageFit)).toEqual(['large', 'large', 'regular', 'regular']);
    expect(LARGE_PRINT_PUPILS).toBe(28);
    const html = buildClassReportDocument(report, options);
    expect(html).toContain('class="sheet duplex large"');
    expect(html).toContain('.duplex .cards{break-before:page}');
    // The screen reflows instead.
    expect(buildClassReportDocument(report, options, 'preview')).toContain('class="sheet screen"');
  });

  it('prints every class in one document, each from a new sheet in its own language', () => {
    const french = { ...options, language: 'fr', dir: 'ltr' as const, className: '6APG-2' };
    const html = buildClassReportsDocument([{ report, options }, { report, options: french }]);
    expect(html.match(/<section class="sheet /g)).toHaveLength(2);
    expect(html).toContain('lang="ar" dir="rtl"');
    expect(html).toContain('lang="fr" dir="ltr"');
    expect(html.indexOf('6APG-1')).toBeLessThan(html.indexOf('6APG-2'));
    expect(html).toContain('.sheet+.sheet{break-before:page}');
    expect(buildClassReportsDocument([])).toBe('');
  });

  it('prints one escaped A4 page with every pupil and the class rows', () => {
    for (const mode of ['print', 'preview'] as const) {
      const html = buildClassReportDocument(report, { ...options, highlightId: 'b' }, mode);
      expect(html).not.toContain('javascript:');
      expect(html).toContain('سطر &lt;أول&gt;');
      expect(html.match(/<tbody>[\s\S]*<\/tbody>/)![0].match(/<tr/g)).toHaveLength(4);
      expect(html).toContain('competencies.classReport.baselineRow');
      expect(html.includes('class="me"')).toBe(mode === 'preview');
    }
  });

  it('lists the pupils needing support, those with the most competencies first, and groups them', () => {
    expect(supportList(report).map((pupil) => [pupil.report.student.id, pupil.skills.map((skill) => [skill.id, skill.level])]))
      .toEqual([['d', [['c1', 'beginning'], ['c2', 'not_acquired']]]]);
    // Badr falls to Début on c3: one competency, after Driss's two.
    const more = classReport(followUps({ sheet, domains, evaluations: [...evaluations, level('b', 'c3', '2026-11', 'beginning')], remarks: [], months: MONTHS }), 10);
    expect(supportList(more).map((pupil) => pupil.report.student.id)).toEqual(['d', 'b']);
    const html = buildSupportListDocument(more, options);
    expect(html).not.toContain('javascript:');
    const rows = (page: string, table: string) => page.match(new RegExp(`<table class="list ${table}">[\\s\\S]*?<tbody>([\\s\\S]*?)</tbody>`))?.[1]
      .match(/(?<=<td class="pupil"><bdi>)[^<]*/g);
    const levels = (page: string) => page.match(/<table class="list levels">[\s\S]*?<\/table>/)![0];
    // A one-part Contrôle: its mark and appraisal open the competencies table; no marks table.
    expect(rows(html, 'marks')).toBeUndefined();
    expect(html).not.toContain('competencies.supportList.marks');
    expect(rows(html, 'levels')).toEqual(['Driss', 'Badr']);
    expect(levels(html)).toContain('<td class="mark total"><span class="down"><b><bdi dir="ltr">4</bdi></b></span></td>');
    // Driss needs c1 and c2, Badr c3: two groups.
    expect(supportGroupsOf(html)).toEqual([{ pupils: ['Driss'], skills: ['كفاية c1', 'كفاية c2'] }, { pupils: ['Badr'], skills: ['كفاية c3'] }]);
    // Only the competencies someone needs support in get a column.
    expect(html.match(/<th class="v"/g)).toHaveLength(3);
    // Several parts: their marks in a table of their own, the same pupils in the same order.
    const twoParts = {
      ...sheet, components: [{ code: 'm', name: 'Calcul' }, { code: 'n', name: 'Géométrie' }],
      marks: [...sheet.marks, ...sheet.marks.map((item) => ({ ...item, componentCode: 'n' }))],
    } as MassarSheetDetail;
    const split = buildSupportListDocument(classReport(followUps({
      sheet: twoParts, domains, evaluations: [...evaluations, level('b', 'c3', '2026-11', 'beginning')], remarks: [], months: MONTHS,
    }), 10), options);
    expect(rows(split, 'marks')).toEqual(['Driss', 'Badr']);
    expect(rows(split, 'levels')).toEqual(['Driss', 'Badr']);
    expect(split).toContain('<th class="part">Géométrie</th>');
    expect(levels(split)).not.toContain('class="mark total"');
    expect(html).toContain('@page{size:A4 portrait;margin:0}');
    expect(html).toContain('competencies.supportList.summary{&quot;count&quot;:2,&quot;total&quot;:4}');
  });

  it('names each pupil once per group: competencies needing the very same pupils share one', () => {
    // c2 needs Driss and Chama, c1 Driss alone: two groups, the larger first, each pupil in the list's order, without level numbers.
    const both = classReport(followUps({ sheet, domains, evaluations: [...evaluations, level('c', 'c2', '2026-11', 'beginning')], remarks: [], months: MONTHS }), 10);
    const html = buildSupportListDocument(both, options);
    expect(supportGroupsOf(html)).toEqual([{ pupils: ['Driss', 'Chama'], skills: ['كفاية c2'] }, { pupils: ['Driss'], skills: ['كفاية c1'] }]);
    expect(html.match(/<div class="groups">[\s\S]*$/)![0]).not.toContain('class="lv"');
    expect(html).toContain('competencies.supportList.group{&quot;number&quot;:2}');
    // Chama on c1 too: both competencies now need the same two pupils, one group.
    const same = classReport(followUps({ sheet, domains, evaluations: [...evaluations, level('c', 'c2', '2026-11', 'beginning'), level('c', 'c1', '2026-11', 'beginning')], remarks: [], months: MONTHS }), 10);
    expect(supportGroupsOf(buildSupportListDocument(same, options))).toEqual([{ pupils: ['Driss', 'Chama'], skills: ['كفاية c1', 'كفاية c2'] }]);
  });

  it('keeps only the pupils who need it most when the teacher chooses how many', () => {
    expect(SUPPORT_LIST_SIZE).toBe(6);
    const more = classReport(followUps({ sheet, domains, evaluations: [...evaluations, level('b', 'c3', '2026-11', 'beginning')], remarks: [], months: MONTHS }), 10);
    const html = buildSupportListDocument(more, options, 1);
    expect(html.match(/(?<=<td class="pupil"><bdi>)[^<]*/g)).toEqual(['Driss']);
    // Badr's c3 leaves the table and the groups; the summary still counts both, and says the list is shorter.
    expect(html.match(/<th class="v"/g)).toHaveLength(2);
    expect(supportGroupsOf(html)).toEqual([{ pupils: ['Driss'], skills: ['كفاية c1', 'كفاية c2'] }]);
    expect(html).not.toContain('Badr');
    expect(html).toContain('competencies.supportList.summary{&quot;count&quot;:2,&quot;total&quot;:4}');
    expect(html).toContain('competencies.supportList.limited{&quot;count&quot;:1}');
    expect(buildSupportListDocument(more, options, 5)).not.toContain('competencies.supportList.limited');
  });

  it('makes up a group larger than the pupils needing support with the next weakest, at En cours', () => {
    // Only Driss is at Début or less; Badr is at En cours on c1; Amina and Chama on nothing.
    expect(supportCapacity(report)).toBe(2);
    expect(supportList(report, SUPPORT_LIST_SIZE).map((pupil) => [pupil.report.student.id, pupil.added])).toEqual([['d', false], ['b', true]]);
    const html = buildSupportListDocument(report, options, SUPPORT_LIST_SIZE);
    expect(html).toContain('<tr class="added">');
    expect(html).toContain('competencies.supportList.completed{&quot;count&quot;:1}');
    expect(html).not.toContain('competencies.supportList.limited');
    // c1's group: Driss (Début) and Badr (En cours, drawn lighter); its count of pupils at ≤ 2 stays 1.
    expect(supportGroupsOf(html)).toEqual([{ pupils: ['Driss', 'Badr'], skills: ['كفاية c1'] }, { pupils: ['Driss'], skills: ['كفاية c2'] }]);
    expect(html).toContain('<span class="who added"><bdi>Badr</bdi></span>');
    expect(html.match(/<tfoot>[\s\S]*?<\/tfoot>/g)![0]).toContain('<td><b class="down"><bdi dir="ltr">1</bdi></b></td>');
  });

  it('says so when no pupil needs support', () => {
    const fine = classReport(followUps({ sheet, domains, evaluations: evaluations.filter((item) => item.studentId !== 'd'), remarks: [], months: MONTHS }), 10);
    expect(supportList(fine)).toEqual([]);
    const html = buildSupportListDocument(fine, options);
    expect(html).toContain('competencies.supportList.none');
    expect(html).not.toContain('class="group"');
  });
});
