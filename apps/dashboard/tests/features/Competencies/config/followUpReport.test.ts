import { describe, expect, it } from 'bun:test';
import type { CompetencyDomain, CompetencyEvaluation, MassarSheetDetail } from '@sms/contracts';
import { appreciation, followUps, radar } from '@/features/Competencies/config/followUpReport';
import { analyze, classify, linkParts } from '@/features/Competencies/config/followUpAnalysis';
import { buildFollowUpDocument, type FollowUpPrintOptions } from '@/features/Competencies/config/followUpDocument';

const MONTHS = ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06'];
const student = (id: string, name: string, position: number) => ({ id, studentCode: `F${position}`, name, dateOfBirth: '2018-01-01', massarStudentId: null, position });
const sheet = {
  sheet: { id: 'sh', roundId: 'r', className: '3APG-1', subjectName: 'اللغة العربية', teacherName: 'ذة. فاطمة', status: 'in_progress', missing: 0, total: 0, revision: 1, termLabel: 'الدورة الأولى', examLabel: 'الفرض الأول', roundStatus: 'open' },
  round: { id: 'r', term: 1, exam: 1, termLabel: 'الدورة الأولى', examLabel: 'الفرض الأول', status: 'open' },
  components: [{ code: 'r', name: 'القراءة' }, { code: 'w', name: 'الإملاء' }, { code: 'o', name: 'التعبير' }],
  maxMark: 10,
  students: [student('a', 'وهبي مليا', 1), student('b', 'بدر', 2)],
  marks: [
    { studentId: 'a', componentCode: 'r', mark: 7, absence: 'none' }, { studentId: 'a', componentCode: 'w', mark: 8, absence: 'none' }, { studentId: 'a', componentCode: 'o', mark: 6, absence: 'none' },
    { studentId: 'b', componentCode: 'r', mark: 9, absence: 'none' }, { studentId: 'b', componentCode: 'w', mark: 6, absence: 'none' }, { studentId: 'b', componentCode: 'o', mark: null, absence: 'justified' },
  ],
  remarks: [{ studentId: 'a', remark: 'مستوى متوسط في القراءة.' }],
  canEdit: true, canReopen: false, schoolName: 'مدرسة', levelLabel: 'الثالث ابتدائي', yearLabel: '2026-2027', examFrom: '2026-11-10',
} as MassarSheetDetail;
const domains: CompetencyDomain[] = [{
  id: 'd', teacherAssignmentId: 't', name: 'القراءة', altName: null, position: 0,
  competencies: ['c1', 'c2', 'c3'].map((id, position) => ({ id, domainId: 'd', name: id, altName: null, position })),
}];
const level = (studentId: string, competencyId: string, month: string, value: CompetencyEvaluation['level']): CompetencyEvaluation => ({ studentId, competencyId, month, level: value });
const evaluations = [
  level('a', 'c1', '2026-10', 'in_progress'), level('a', 'c1', '2026-11', 'advanced'),
  level('a', 'c2', '2026-10', 'in_progress'), level('a', 'c2', '2026-11', 'beginning'),
  level('a', 'c3', '2026-11', 'in_progress'),
  // After the Contrôle's month: left out.
  level('a', 'c3', '2026-12', 'mastered'),
];
const [amina, badr] = followUps({ sheet, domains, evaluations, remarks: [{ studentId: 'b', month: '2026-11', body: 'Remarque du mois', updatedAt: '' }], months: MONTHS });
const documentOptions: FollowUpPrintOptions = {
  language: 'ar', dir: 'rtl', t: (key) => key, caption: (key) => `fr:${key}`, school: { name: 'مدرسة', logo: 'javascript:alert(1)' },
  assetOrigin: 'http://localhost', subjectName: 'اللغة العربية', className: '3APG-1', levelLabel: 'الثالث ابتدائي',
  examLabel: 'الفرض الأول', termLabel: 'الدورة الأولى', yearLabel: '2026-2027', teacherName: 'ذة. فاطمة', maxMark: 10,
  analysisOf: (report) => (report.student.id === 'a' ? 'سطر أول\nسطر <ثان>' : ''),
};

describe('the follow-up report after a Massar Contrôle', () => {
  it('appraises a mark from its share of the maximum', () => {
    expect([6, 7, 7.5, 8, 9, 4].map((mark) => appreciation(mark, 10))).toEqual(['average', 'good', 'good', 'veryGood', 'excellent', 'weak']);
  });

  it('sets each part\'s mark beside the class average, and the subject average beside the class\'s', () => {
    expect(amina.parts.map(({ mark, classAverage, diff, appreciation: grade }) => ({ mark, classAverage, diff, grade }))).toEqual([
      { mark: 7, classAverage: 8, diff: -1, grade: 'good' },
      { mark: 8, classAverage: 7, diff: 1, grade: 'veryGood' },
      { mark: 6, classAverage: 6, diff: 0, grade: 'average' },
    ]);
    expect(amina.average).toBe(7);
    // Badr's absent part counts in no average.
    expect(badr.parts[2]).toMatchObject({ mark: null, absent: true });
    expect(badr.average).toBe(7.5);
    expect(amina.classAverage).toBe(7.25);
    expect(amina.diff).toBe(-0.25);
  });

  it('follows the competencies up to the Contrôle\'s month, with the current level and its trend', () => {
    expect(amina.examMonth).toBe('2026-11');
    expect(amina.months).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(amina.domains[0].lines.map(({ current, trend }) => [current, trend])).toEqual([
      ['advanced', 'up'], ['beginning', 'down'], ['in_progress', null],
    ]);
    expect(amina.domains[0]).toMatchObject({ average: 3, acquiredShare: 33 });
    expect(amina.indicators).toMatchObject({ level: 3, acquired: 1, support: 1, total: 3, mastery: 33 });
    expect(amina.indicators.distribution).toEqual({ not_acquired: 0, beginning: 1, in_progress: 1, advanced: 1, mastered: 0 });
  });

  it('takes the Massar remark of the Contrôle, else the month\'s remark for the parents', () => {
    expect(amina.remark).toBe('مستوى متوسط في القراءة.');
    expect(badr.remark).toBe('Remarque du mois');
  });

  it('draws the radar from the centre to the maximum', () => {
    const chart = radar(amina.parts, 10, 100, 0);
    expect(chart.pupil[0]).toEqual({ x: 50, y: 15 });
    expect(chart.rings).toHaveLength(4);
  });

  it('prints one escaped page per pupil, right to left in Arabic', () => {
    const html = buildFollowUpDocument([{ ...amina, student: { ...amina.student, name: 'وهبي <script>' } }, badr], documentOptions);
    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html.match(/<section class="sheet">/g)).toHaveLength(2);
    expect(html).toContain('وهبي &lt;script&gt;');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('/images/massar/ministry.png');
    expect(html).toContain('fr:competencies.report.marks');
    // The analysis prints line by line, escaped, and only where there is one.
    expect(html).toContain('<li dir="auto">سطر &lt;ثان&gt;</li>');
    expect(html.match(/class="analysis"/g)).toHaveLength(1);
    expect(html).toContain('@page{size:A4 portrait;margin:0}');
    expect(html).not.toContain('table-scroll');
  });

  it('previews the same report with a fluid layout and keyboard-scrollable tables', () => {
    const html = buildFollowUpDocument([amina], documentOptions, 'preview');
    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html).toContain('<p class="context"><bdi>اللغة العربية</bdi>');
    expect(html).toContain('<div class="table-scroll" tabindex="0" role="region" aria-label="competencies.report.marks">');
    expect(html).toContain('<div class="table-scroll" tabindex="0" role="region" aria-label="competencies.report.competencies">');
    expect(html).toContain('<li dir="auto">سطر &lt;ثان&gt;</li>');
  });
});

describe('the analysis of marks against competencies', () => {
  const label = (rank: number) => `L${Math.round(rank)}`;
  const options = { maxMark: 10, language: 'ar' as const, gender: 'F' as const, levelLabel: label };

  it('classifies a mark against a level, both in percent', () => {
    expect(classify(75, 80)).toBe('strong');
    expect(classify(60, 60)).toBe('fair');
    expect(classify(45, 40)).toBe('weak');
    expect(classify(80, 40)).toBe('markAbove');
    expect(classify(40, 80)).toBe('levelAbove');
  });

  it('links a part to the competency of its name, else the domain, else through the table', () => {
    const report = {
      ...amina,
      parts: [
        { code: '1', name: 'الإملاء', mark: 8, absent: false, classAverage: 7, diff: 1, appreciation: 'veryGood' as const },
        { code: '2', name: 'القراءة', mark: 4, absent: false, classAverage: 6, diff: -2, appreciation: 'weak' as const },
        { code: '3', name: 'الاستماع والتحدث', mark: 7, absent: false, classAverage: 7, diff: 0, appreciation: 'good' as const },
        { code: '4', name: 'مشروع الوحدة', mark: 7, absent: false, classAverage: 7, diff: 0, appreciation: 'good' as const },
      ],
      domains: [
        { id: 'r', name: 'القراءة', average: 4, acquiredShare: 100, lines: [{ id: 'c1', name: 'القراءة السليمة', levels: {}, current: 'advanced' as const, trend: 'up' as const }] },
        { id: 'w', name: 'الكتابة', average: 2, acquiredShare: 0, lines: [{ id: 'c2', name: 'الإملاء', levels: {}, current: 'beginning' as const, trend: 'down' as const }] },
        { id: 'o', name: 'التواصل الشفهي', average: 3, acquiredShare: 0, lines: [{ id: 'c3', name: 'الاستماع والفهم', levels: {}, current: 'in_progress' as const, trend: 'up' as const }] },
      ],
    };
    expect(linkParts(report).map((link) => [link.part.name, link.lines.map((line) => line.id)])).toEqual([
      ['الإملاء', ['c2']], ['القراءة', ['c1']], ['الاستماع والتحدث', ['c3']],
    ]);
    expect(analyze(report, options).split('\n')).toEqual([
      'بلغ معدل الفرض 7/10، وهو أقل من معدل القسم (7.25/10) بفارق 0.25.',
      'بلغ عدد الكفايات المقيّمة 3 من أصل 3، ومتوسط مستواها «L3».',
      'تتقارب نتيجة الفرض مع متوسط مستوى الكفايات.',
      'في مكوّن «الإملاء»، جاءت نقطة الفرض (8/10) أعلى من المستوى المسجّل في تقييم الكفايات المرتبطة به (L2) (فوق معدل القسم).',
      'في مكوّن «القراءة»، جاء المستوى المسجّل في تقييم الكفايات المرتبطة به (L4) أعلى من نقطة الفرض (4/10) (دون معدل القسم).',
      'في مكوّن «الاستماع والتحدث»، تنسجم النقطة (7/10) مع مستوى الكفايات المرتبطة به (L3)، ويُستحسن مواصلة التمرّن.',
      'بمقارنة آخر تقييمين متاحين لكل كفاية، بلغ عدد الكفايات التي تحسّنت 2 والتي تراجعت 1.',
      // What helps, from the remark book's own sentence for the skill.
      'أولوية للدعم – الإملاء: تحتاج إلى دعم في الربط بين الحرف والصوت المناسب له.',
    ]);
  });

  it('explains the mark, its class comparison and missing competency evidence in both languages', () => {
    const marksOnly = { ...badr, average: 18, classAverage: 14.32, diff: 3.68, indicators: { ...badr.indicators, total: 8 } };
    expect(analyze(marksOnly, { ...options, maxMark: 20 })).toBe([
      'بلغ معدل الفرض 18/20، وهو أعلى من معدل القسم (14.32/20) بفارق 3.68.',
      'لم يُسجّل أي تقييم للكفايات حتى شهر الفرض (0 من أصل 8).',
    ].join('\n'));
    const french = analyze(marksOnly, { ...options, maxMark: 20, language: 'fr' });
    expect(french).toContain('18/20');
    expect(french).toContain('0 sur 8');
    expect(analyze({ ...badr, average: 0, classAverage: 0, diff: 0 }, options)).toContain('0/10، وهو يساوي معدل القسم');
    expect(analyze({ ...badr, average: 0, classAverage: null, diff: null }, options)).toStartWith('بلغ معدل الفرض 0/10.');
  });

  it('reports partial coverage without comparing the exam to a whole-catalog level', () => {
    const [partial] = followUps({ sheet, domains, evaluations: [level('a', 'c1', '2026-10', 'mastered')], remarks: [], months: MONTHS });
    expect(analyze(partial, options).split('\n')).toEqual([
      'بلغ معدل الفرض 7/10، وهو أقل من معدل القسم (7.25/10) بفارق 0.25.',
      'بلغ عدد الكفايات المقيّمة 1 من أصل 3، ومتوسط مستواها «L5».',
    ]);
    expect(analyze({ ...partial, average: null, parts: [] }, options)).toBe('بلغ عدد الكفايات المقيّمة 1 من أصل 3، ومتوسط مستواها «L5».');
  });

  it('requires both oral and reading evidence for their combined component', () => {
    const part = { ...amina.parts[0], name: 'الاِستماع والتحدث والقراءة' };
    const twoDomains = [
      { ...amina.domains[0], name: 'التواصل الشفهي', lines: [amina.domains[0].lines[0]] },
      { ...amina.domains[0], name: 'القراءة', lines: [amina.domains[0].lines[1]] },
    ];
    const combined = { ...amina, parts: [part], domains: twoDomains };
    expect(linkParts(combined).map((link) => [link.rank, link.lines.map((line) => line.id)])).toEqual([[3, ['c1', 'c2']]]);
    expect(linkParts({ ...combined, domains: twoDomains.slice(0, 1) })).toEqual([]);
    expect(linkParts({ ...combined, domains: [twoDomains[0], { ...twoDomains[1], lines: [{ ...twoDomains[1].lines[0], current: null }] }] })).toEqual([]);
  });

  it('describes a trend across skipped months as a comparison of recorded assessments', () => {
    const [report] = followUps({ sheet, domains, months: MONTHS, remarks: [], evaluations: [
      level('a', 'c1', '2026-09', 'beginning'), level('a', 'c1', '2026-11', 'advanced'),
    ] });
    expect(analyze(report, options)).toContain('آخر تقييمين');
    expect(analyze(report, { ...options, language: 'fr' })).toContain('deux dernières évaluations');
  });

  it('keeps undated and out-of-year exams independent of subsequent evaluations and remarks', () => {
    for (const examFrom of [null, '2025-11-04']) {
      const input = { sheet: { ...sheet, examFrom }, domains, months: MONTHS, remarks: [{ studentId: 'b', month: '2026-12', body: 'later remark', updatedAt: '' }] };
      const original = followUps({ ...input, evaluations: [] });
      expect(followUps({ ...input, evaluations })).toEqual(original);
      expect(original[0]).toMatchObject({ examMonth: null, months: [], average: 7, remark: sheet.remarks[0].remark, indicators: { level: null } });
      expect(original[1].remark).toBeNull();
      expect(analyze(original[0], options)).toContain('لعدم توفر تاريخ');
    }
  });

  it('says nothing for a pupil with neither marks nor levels', () => {
    expect(analyze({ ...amina, average: null, parts: [], domains: [], indicators: { ...amina.indicators, level: null } }, options)).toBe('');
  });
});
