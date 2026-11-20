import { describe, expect, it } from 'bun:test';
import type { CompetencyDomain, CompetencyEvaluation, MassarSheetDetail } from '@sms/contracts';
import { followUps } from '@/features/Competencies/config/followUpReport';
import { analyzeClass, classNote, classReport, deviation, median, supportGroups } from '@/features/Competencies/config/classReport';
import { buildClassReportDocument, ONE_PAGE_PUPILS, pageFit, type ClassReportPrintOptions } from '@/features/Competencies/config/classReportDocument';

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

  // Measured in Chrome: up to 26 pupils keep the report on one A4 page; a larger class prints on both sides, rows at full size.
  it('keeps up to 26 pupils on one page, and prints a larger class on two sides', () => {
    expect([20, 21, 26, 27, 32, 45].map(pageFit)).toEqual(['roomy', 'dense', 'dense', 'split', 'split', 'split']);
    expect(ONE_PAGE_PUPILS).toBe(26);
    // The screen reflows instead.
    expect(buildClassReportDocument(report, options, 'preview')).toContain('class="sheet roomy"');
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
});
