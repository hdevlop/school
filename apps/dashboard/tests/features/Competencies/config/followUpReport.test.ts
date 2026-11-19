import { describe, expect, it } from 'bun:test';
import type { CompetencyDomain, CompetencyEvaluation, MassarSheetDetail } from '@sms/contracts';
import { schoolI18n, type SchoolTranslationKey } from '@sms/contracts/locales';
import { appreciation, followUps, isRoomy, partAxes, profileAxes, radar, standing, strengthsAndNeeds } from '@/features/Competencies/config/followUpReport';
import { analyze, classify, comparableClassMean, linkParts, rankLabel } from '@/features/Competencies/config/followUpAnalysis';
import { buildFollowUpDocument, followUpRoundLabels, wrapLabel, type FollowUpPrintOptions } from '@/features/Competencies/config/followUpDocument';

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
    for (const mode of ['preview', 'print'] as const) {
      const html = buildFollowUpDocument([amina, badr], documentOptions, mode);
      expect(html).toContain('<bdi dir="ltr">7.3</bdi>');
      expect(html).toContain('<bdi dir="ltr">−0.3</bdi>');
      expect(html).toContain('<bdi dir="ltr">+0.3</bdi>');
      expect(html).toContain('<bdi dir="ltr">7</bdi>');
    }
  });

  it('follows the competencies up to the Contrôle\'s month, with the current level and its trend', () => {
    expect(amina.examMonth).toBe('2026-11');
    expect(amina.months).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(amina.domains[0].lines.map(({ current, trend }) => [current, trend])).toEqual([
      ['advanced', 'up'], ['beginning', 'down'], ['in_progress', null],
    ]);
    expect(amina.indicators).toMatchObject({ level: 3, acquired: 1, support: 1, total: 3, mastery: 33 });
    expect(amina.indicators.distribution).toEqual({ not_acquired: 0, beginning: 1, in_progress: 1, advanced: 1, mastered: 0 });
  });

  // Each month has its own list: one taken off in October keeps its levels in a November report, one added after it is not there.
  it('lists the competencies followed in the months up to the Contrôle', () => {
    const year: CompetencyDomain[] = [{
      ...domains[0],
      competencies: [
        ...domains[0].competencies,
        { id: 'ended', domainId: 'd', name: 'ended', altName: null, position: 3, untilMonth: '2026-10' },
        { id: 'later', domainId: 'd', name: 'later', altName: null, position: 4, fromMonth: '2026-12' },
      ],
    }, { id: 'future', teacherAssignmentId: 't', name: 'future', altName: null, position: 1, fromMonth: '2027-01', competencies: [] }];
    const [report] = followUps({ sheet, domains: year, evaluations: [...evaluations, level('a', 'ended', '2026-09', 'mastered')], remarks: [], months: MONTHS });
    expect(report.domains.map((block) => [block.name, block.lines.map((line) => line.name)])).toEqual([['القراءة', ['c1', 'c2', 'c3', 'ended']]]);
    expect(report.domains[0].lines[3].current).toBe('mastered');
    expect(report.indicators.total).toBe(4);
  });

  it('takes the Massar remark of the Contrôle, else the month\'s remark for the parents', () => {
    expect(amina.remark).toBe('مستوى متوسط في القراءة.');
    expect(badr.remark).toBe('Remarque du mois');
  });

  it('draws the radar from the centre to the maximum', () => {
    const chart = radar(partAxes(amina.parts), 10, 100, 0);
    expect(chart.pupil[0]).toEqual({ x: 50, y: 15 });
    expect(chart.rings).toHaveLength(4);
  });

  it('uses the exact mean for the label in the analysis and the printed tile', () => {
    const competencies = Array.from({ length: 11 }, (_, i) => ({ ...domains[0].competencies[0], id: String(i) }));
    const [report] = followUps({ sheet, domains: [{ ...domains[0], competencies }], months: MONTHS, remarks: [],
      evaluations: competencies.map((skill, i) => level('a', skill.id, '2026-11', i < 6 ? 'advanced' : 'mastered')),
    });
    const label = rankLabel(key => key);
    expect(report.indicators.level).toBe(49 / 11);
    expect(label(3.5)).toEndWith('in_progress');
    expect(label(3.51)).toEndWith('advanced');
    expect(label(report.indicators.level!)).toEndWith('advanced');
    expect(buildFollowUpDocument([report], documentOptions)).toContain('competencies.levels.advanced · competencies.report.indLevel');
  });

  it('breaks incomplete radar outlines and keeps true zeros at the centre', () => {
    const partial = { ...badr, parts: badr.parts.map((part, i) => i === 0 ? { ...part, mark: 0 } : part) };
    const chart = radar(partAxes(partial.parts), 10, 210, 40);
    expect(chart.pupil[0]).toEqual({ x: 105, y: 105 });
    expect(chart.pupil[2]).toBeNull();
    for (const mode of ['preview', 'print'] as const) {
      const html = buildFollowUpDocument([partial], documentOptions, mode);
      expect(html).not.toContain('fill="#2a78d6" fill-opacity');
      expect(html.match(/<circle [^>]*fill="#2a78d6"/g)).toHaveLength(2);
    }
  });

  it('profiles each competency\'s current level beside the class\'s mean', () => {
    expect(amina.skills).toEqual([
      { id: 'c1', name: 'c1', rank: 4, classAverage: 4 },
      { id: 'c2', name: 'c2', rank: 2, classAverage: 2 },
      { id: 'c3', name: 'c3', rank: 3, classAverage: 3 },
    ]);
    expect(badr.skills.map((skill) => skill.rank)).toEqual([null, null, null]);
  });

  it('draws the profile on the competencies when the Contrôle has fewer than three parts', () => {
    const onePart = { ...amina, parts: amina.parts.slice(0, 1) };
    expect(profileAxes(amina, 10)?.kind).toBe('parts');
    expect(profileAxes(onePart, 10)).toMatchObject({ kind: 'skills', max: 5 });
    // A pupil with no level yet, or fewer than three competencies, keeps the bars.
    expect(profileAxes({ ...badr, parts: onePart.parts }, 10)).toBeNull();
    expect(profileAxes({ ...onePart, skills: amina.skills.slice(0, 2) }, 10)).toBeNull();
    const html = buildFollowUpDocument([onePart], documentOptions);
    // Left to right on an Arabic page too, so the labels beside the rings grow outward, never over them.
    expect(html).toContain('<svg class="radar" direction="ltr"');
    expect(html).not.toContain('class="bar-row"');
    expect(buildFollowUpDocument([{ ...badr, parts: onePart.parts }], documentOptions)).toContain('class="bar-row"');
  });

  it('ranks the pupil in the class, beside the class\'s highest and lowest marks', () => {
    expect(amina.standing.total).toEqual({ rank: 2, ranked: 2, high: 7.5, low: 7 });
    expect(badr.standing.total).toEqual({ rank: 1, ranked: 2, high: 7.5, low: 7 });
    expect(amina.standing.parts.r).toEqual({ rank: 2, ranked: 2, high: 9, low: 7 });
    // Badr's absent part counts in no rank: Amina is first of one, and Badr has none.
    expect(amina.standing.parts.o).toEqual({ rank: 1, ranked: 1, high: 6, low: 6 });
    expect(badr.standing.parts.o.rank).toBeNull();
    // Ties share a rank.
    expect(standing(8, [9, 8, 8, 6]).rank).toBe(2);
    expect(standing(6, [9, 8, 8, 6]).rank).toBe(4);
    const html = buildFollowUpDocument([amina], documentOptions);
    expect(html).toContain('<th class="label">competencies.report.rank</th>');
    expect(html).toContain('<td class="total"><b><span dir="ltr">2<small>/2</small></span></b></td>');
    expect(html).toContain('<th class="label">competencies.report.classHigh</th>');
  });

  it('fills a short report\'s page: larger, with the strengths and the areas to improve', () => {
    const [short, shortBadr] = followUps({ sheet: { ...sheet, components: sheet.components.slice(0, 1) }, domains, evaluations, remarks: [], months: MONTHS });
    expect(isRoomy(short)).toBe(true);
    expect(isRoomy(amina)).toBe(false);
    expect(strengthsAndNeeds(short).strengths.map((line) => line.id)).toEqual(['c1']);
    // Weakest first.
    expect(strengthsAndNeeds(short).needs.map((line) => line.id)).toEqual(['c2', 'c3']);
    const html = buildFollowUpDocument([short], { ...documentOptions, needOf: (_, name) => `aide ${name}` });
    expect(html).toContain('<section class="sheet roomy">');
    expect(html).toContain('competencies.report.focus');
    expect(html).toContain('<b>c2</b> <small style="color:#f97316">competencies.levels.beginning</small><p dir="auto">aide c2</p>');
    // The section takes number 4, the observations follow it.
    expect(html).toContain('<span class="n">4</span>competencies.report.focus');
    expect(html).toContain('<span class="n">6</span>competencies.report.inspector');
    // A pupil with no level yet has no such section, and the long report none at all.
    expect(buildFollowUpDocument([shortBadr], documentOptions)).not.toContain('competencies.report.focus');
    expect(buildFollowUpDocument([amina], documentOptions)).not.toContain('competencies.report.focus');
  });

  it('prints a single part once, its measures side by side in one row', () => {
    expect(buildFollowUpDocument([amina], documentOptions)).toContain('<th>القراءة</th>');
    const html = buildFollowUpDocument([{ ...amina, parts: amina.parts.slice(0, 1) }], documentOptions);
    expect(html).not.toContain('<th>القراءة</th>');
    expect(html).toContain('<table class="marks flat"><thead><tr><th class="total">الفرض الأول</th><th>competencies.report.classAverage</th>');
    expect(html.match(/<table class="marks flat">[\s\S]*?<\/table>/)?.[0].match(/<tr>/g)).toHaveLength(2);
    // An absent pupil's only part reads absent on the average.
    const absent = buildFollowUpDocument([{ ...badr, parts: badr.parts.slice(2), average: null }], documentOptions);
    expect(absent).toContain('<td class="total muted">competencies.report.absent</td>');
    expect(absent).not.toMatch(/<td class="[^"]*" class=/);
  });

  it('wraps a long radar label on whole words', () => {
    expect(wrapLabel('Reconnaître les formes géométriques')).toEqual(['Reconnaître les', 'formes', 'géométriques']);
    expect(wrapLabel('القراءة')).toEqual(['القراءة']);
  });

  it('prints one escaped page per pupil, right to left in Arabic', () => {
    const html = buildFollowUpDocument([{ ...amina, student: { ...amina.student, name: 'وهبي <script>' } }, badr], documentOptions);
    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html.match(/<section class="sheet">/g)).toHaveLength(2);
    expect(html).toContain('وهبي &lt;script&gt;');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('/images/massar/ministry.png');
    expect(html).toContain('fr:competencies.report.marks');
    expect(html).toContain('<th class="domain" rowspan="3">القراءة</th>');
    expect(html).toMatch(/<td class="share"[^>]*><bdi dir="ltr">80%<\/bdi><\/td>/);
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

  it('uses the translated control and semester everywhere in a French report', () => {
    const t: FollowUpPrintOptions['t'] = (key, params) => schoolI18n.translate('fr', key as SchoolTranslationKey, params);
    const labels = followUpRoundLabels(sheet.round, 'fr', t);
    expect(labels).toEqual({ examLabel: 'Contrôle 1', termLabel: 'Semestre 1' });
    expect(followUpRoundLabels(sheet.round, 'ar', t)).toEqual({ examLabel: 'الفرض الأول', termLabel: 'الدورة الأولى' });
    expect(followUpRoundLabels({ ...sheet.round, exam: 4 }, 'fr', t).examLabel).toBe(t('massar.flow.activities'));
    const options = { ...documentOptions, ...labels, t, language: 'fr', dir: 'ltr' as const, subjectName: 'Français' };
    const [first, ...rest] = amina.parts;
    const report = { ...amina, parts: [{ ...first, name: 'Orthographe/Dictée' }, ...rest] };
    for (const mode of ['preview', 'print'] as const) {
      const html = buildFollowUpDocument([report], options, mode);
      expect(html).toContain('<th class="label">Contrôle 1</th>');
      expect(html).toContain('<th title="Orthographe/Dictée">Ortho./Dictée</th>');
      expect(html).toContain('>Orthographe/Dictée</text>');
      expect(html).toContain('Semestre 1');
      expect(html).not.toContain('الفرض الأول');
    }
  });

  it('makes room to edit an empty analysis in the preview and prints only the edited text', () => {
    const options = { ...documentOptions, editableAnalysis: true, analysisOf: () => '' };
    const preview = buildFollowUpDocument([amina], options, 'preview');
    expect(preview.indexOf('data-analysis-editor')).toBeGreaterThan(preview.indexOf('<table class="competencies">'));
    expect(preview.indexOf('data-analysis-editor')).toBeLessThan(preview.indexOf('<div class="notes">'));
    const print = buildFollowUpDocument([amina], { ...options, analysisOf: () => 'نص محرر <مثال>' });
    expect(print).toContain('<li dir="auto">نص محرر &lt;مثال&gt;</li>');
    expect(print).not.toContain('data-analysis-editor');
  });

  it('uses compact print for a wide Arabic grid and includes the full edited analysis and teacher comment', () => {
    const report = { ...amina, parts: [...amina.parts, ...amina.parts], remark: 'السطر الأول\nالسطر الأخير' };
    const html = buildFollowUpDocument([report], { ...documentOptions, analysisOf: () => 'نص يدوي\nتتمة التحليل' });
    expect(html).toContain('<section class="sheet dense">');
    expect(html).toContain('السطر الأول\nالسطر الأخير');
    expect(html).toContain('<li dir="auto">نص يدوي</li><li dir="auto">تتمة التحليل</li>');
    expect(html.split('<div class="notes">')[1].match(/<i class="line"><\/i>/g)).toHaveLength(2);
  });
});

describe('the analysis of marks against competencies', () => {
  const label = (rank: number) => `L${Math.round(rank)}`;
  const options = { maxMark: 10, language: 'ar' as const, gender: 'F' as const, levelLabel: label };

  it('compares matched pupils only and gives class context for a shared gap', () => {
    const highMark = { ...amina, average: 9, parts: amina.parts.slice(0, 1) };
    const comparison = comparableClassMean([highMark, amina, badr, { ...amina, average: null }]);
    expect(comparison).toEqual({ mark: 8, level: 3 });
    expect(comparableClassMean([amina, badr])).toBeNull();
    expect(analyze(highMark, { ...options, language: 'fr', classComparison: comparison })).toContain('la moyenne au contrôle est de 8/10 et le niveau moyen des compétences de 3/5');
    expect(analyze(highMark, options)).toContain('نتيجة الفرض أعلى');
    expect(analyze({ ...highMark, average: 8.5 }, options)).not.toContain('نتيجة الفرض أعلى');
  });

  it('names up to two developing skills and gives one activity on a long report', () => {
    const names = ['حل المسائل', 'الإنشاءات الهندسية', 'المحيط والمساحة'];
    const developing = { ...amina, domains: [{ ...amina.domains[0],
      lines: amina.domains[0].lines.map((line, i) => ({ ...line, name: names[i], current: 'in_progress' as const })),
    }] };
    const guidance = analyze(developing, options).split('\n').at(-1)!;
    expect(guidance).toContain('«حل المسائل» و«الإنشاءات الهندسية»');
    expect(guidance).toContain('رسم المعطيات');
    expect(guidance).not.toContain(names[2]);
    expect(analyze(developing, { ...options, priorities: false })).not.toContain('كفايات تحتاج إلى تثبيت');
  });

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
        { id: 'r', name: 'القراءة', lines: [{ id: 'c1', name: 'القراءة السليمة', levels: {}, current: 'advanced' as const, trend: 'up' as const }] },
        { id: 'w', name: 'الكتابة', lines: [{ id: 'c2', name: 'الإملاء', levels: {}, current: 'beginning' as const, trend: 'down' as const }] },
        { id: 'o', name: 'التواصل الشفهي', lines: [{ id: 'c3', name: 'الاستماع والفهم', levels: {}, current: 'in_progress' as const, trend: 'up' as const }] },
      ],
    };
    expect(linkParts(report).map((link) => [link.part.name, link.lines.map((line) => line.id)])).toEqual([
      ['الإملاء', ['c2']], ['القراءة', ['c1']], ['الاستماع والتحدث', ['c3']],
    ]);
    expect(analyze(report, options).split('\n')).toEqual([
      'بلغ معدل الفرض 7/10، وهو أقل من معدل القسم (7.3/10) بفارق 0.3.',
      'في مكوّن «الإملاء»، جاءت نقطة الفرض (8/10) أعلى من المستوى المسجّل في تقييم الكفايات المرتبطة به (L2) (فوق معدل القسم).',
      'بمقارنة آخر تقييمين متاحين لكل كفاية، بلغ عدد الكفايات التي تحسّنت 2 والتي تراجعت 1.',
      // What helps, from the remark book's own sentence for the skill.
      'أولوية للدعم – الإملاء: تحتاج إلى دعم في الربط بين الحرف والصوت المناسب له.',
    ]);
  });

  it('explains the mark, its class comparison and missing competency evidence in both languages', () => {
    const marksOnly = { ...badr, average: 18, classAverage: 14.32, diff: 3.68, indicators: { ...badr.indicators, total: 8 } };
    expect(analyze(marksOnly, { ...options, maxMark: 20 })).toBe([
      'بلغ معدل الفرض 18/20، وهو أعلى من معدل القسم (14.3/20) بفارق 3.7.',
      'لم يُسجّل أي تقييم للكفايات حتى شهر الفرض (0 من أصل 8).',
    ].join('\n'));
    const french = analyze(marksOnly, { ...options, maxMark: 20, language: 'fr' });
    expect(french).toContain('18/20');
    expect(french).toContain('0 sur 8');
    expect(analyze({ ...marksOnly, average: 14.34, diff: 0.02 }, { ...options, maxMark: 20, language: 'fr' }))
      .toStartWith('La moyenne au contrôle est de 14.3/20.');
    expect(analyze({ ...badr, average: 0, classAverage: 0, diff: 0 }, options)).toContain('0/10، وهو يساوي معدل القسم');
    expect(analyze({ ...badr, average: 0, classAverage: null, diff: null }, options)).toStartWith('بلغ معدل الفرض 0/10.');
  });

  it('reports partial coverage without comparing the exam to a whole-catalog level', () => {
    const [partial] = followUps({ sheet, domains, evaluations: [level('a', 'c1', '2026-10', 'mastered')], remarks: [], months: MONTHS });
    expect(analyze(partial, options).split('\n')).toEqual([
      'بلغ معدل الفرض 7/10، وهو أقل من معدل القسم (7.3/10) بفارق 0.3.',
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

  it('leaves the priorities out when the page lists the areas to improve itself', () => {
    const lines = analyze(amina, { ...options, priorities: false }).split('\n');
    expect(lines.some((line) => line.startsWith('أولوية للدعم'))).toBe(false);
    expect(analyze(amina, options)).toContain('أولوية للدعم');
  });

  it('describes a trend across skipped months as a comparison of recorded assessments', () => {
    const [report] = followUps({ sheet, domains, months: MONTHS, remarks: [], evaluations: [
      level('a', 'c1', '2026-09', 'beginning'), level('a', 'c1', '2026-11', 'advanced'),
    ] });
    expect(analyze(report, options)).toContain('في «c1»، انتقل المستوى من «L2» إلى «L4».');
    expect(analyze(report, { ...options, language: 'fr' })).toContain('Pour « c1 », le niveau est passé de « L2 » à « L4 ».');
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
