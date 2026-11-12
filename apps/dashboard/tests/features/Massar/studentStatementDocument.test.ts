import { expect, it } from 'bun:test';
import { MASSAR_DEFAULT_STATEMENT, type MassarSheetDetail } from '@sms/contracts';
import { buildStudentStatementDocument, classRanks, generalAverage, orderSubjects, previewStatementSheets, REMARKS, remarkBand, remarkLanguage, statementRowHeight, studentRemark, studentStatements } from '@/features/Massar/config/studentStatementDocument';

const student = (id: string, position: number) => ({ id, name: `تلميذ ${id}`, studentCode: `F${id}`, dateOfBirth: '2016-01-01', massarStudentId: null, position });
const sheet = (className: string, subjectName: string, components: Array<[string, string]>, students: ReturnType<typeof student>[], marks: MassarSheetDetail['marks'] = []) => ({
  sheet: { id: `${className}:${subjectName}`, className, subjectName }, schoolName: 'المؤسسة', yearLabel: '2025-2026', levelLabel: 'المستوى الخامس', maxMark: 10,
  round: { term: 1, exam: 1, termLabel: 'الدورة الأولى', examLabel: 'الفرض الأول' },
  components: components.map(([code, name]) => ({ code, name })), students, marks,
} as unknown as MassarSheetDetail);
const mark = (studentId: string, componentCode: string, value: number | null, absence: 'none' | 'justified' = 'none') => ({ studentId, componentCode, mark: value, absence });

const arabic = sheet('5APG-1', 'اللغة العربية', [['r', 'القراءة'], ['w', 'الإملاء']], [student('b', 1), student('a', 0)], [
  mark('a', 'r', 8.5), mark('a', 'w', null, 'justified'), mark('b', 'r', 0),
]);
const french = sheet('5APG-1', 'اللغة الفرنسية', [['d', 'Dictée']], [student('a', 0), student('b', 1)], [mark('b', 'd', 7)]);
const settings = (change: Partial<typeof MASSAR_DEFAULT_STATEMENT>) => ({ ...MASSAR_DEFAULT_STATEMENT, ...change });

it('gives each student of a class one statement with every subject, in Massar order', () => {
  const statements = studentStatements([arabic, french, sheet('4APG-2', 'اللغة العربية', [['r', 'القراءة']], [student('c', 0)])]);
  // Classes in order, then each class's students by their Massar position.
  expect(statements.map(item => [item.className, item.student.id])).toEqual([['4APG-2', 'c'], ['5APG-1', 'a'], ['5APG-1', 'b']]);
  expect(statements[1].units.map(unit => unit.subject)).toEqual(['اللغة العربية', 'اللغة الفرنسية']);
});

it('prints a missing mark blank and a justified absence as مبرر, never 0', () => {
  const [a, b] = studentStatements([arabic, french]);
  expect(a.units[0].parts.map(part => part.mark)).toEqual(['8.50', 'مبرر']);
  expect(a.units[1].parts[0].mark).toBe('');
  // A real zero is a mark.
  expect(b.units[0].parts[0].mark).toBe('0.00');
});

it('leaves out a subject whose sheet does not list the student', () => {
  const [a, b] = studentStatements([arabic, sheet('5APG-1', 'التربية الفنية', [['x', 'التربية الفنية']], [student('a', 0)])]);
  expect(a.units).toHaveLength(2);
  expect(b.units.map(unit => unit.subject)).toEqual(['اللغة العربية']);
});

it("prints the subjects in the school's order, any it does not list after them as they came", () => {
  const units = ['A', 'B', 'C', 'D'].map(subject => ({ subject }));
  expect(orderSubjects(units, ['C', 'A']).map(unit => unit.subject)).toEqual(['C', 'A', 'B', 'D']);
  expect(orderSubjects(units, []).map(unit => unit.subject)).toEqual(['A', 'B', 'C', 'D']);
  const [a] = studentStatements([arabic, french], settings({ order: ['اللغة الفرنسية'] }));
  expect(a.units.map(unit => unit.subject)).toEqual(['اللغة الفرنسية', 'اللغة العربية']);
});

it("averages a subject's entered parts only: a justified absence or a blank counts in nothing", () => {
  const [a, b] = studentStatements([arabic, french]);
  expect(a.units.map(unit => unit.average)).toEqual([8.5, null]);
  expect(b.units.map(unit => unit.average)).toEqual([0, 7]);
  expect([a.average, b.average]).toEqual([8.5, 3.5]);
});

it('weighs the general average by coefficient; 0 leaves a subject out', () => {
  expect(generalAverage([{ average: 8, coefficient: 3 }, { average: 4, coefficient: 1 }])).toBe(7);
  expect(generalAverage([{ average: 8, coefficient: 1 }, { average: 2, coefficient: 0 }, { average: null, coefficient: 4 }])).toBe(8);
  expect(generalAverage([{ average: null, coefficient: 1 }])).toBeNull();
  const [, b] = studentStatements([arabic, french], settings({ coefficients: { '5APG|اللغة الفرنسية': 3 } }));
  expect(b.average).toBe(5.25);
  // A coefficient belongs to one level: another level's leaves this one at 1.
  expect(studentStatements([arabic, french], settings({ coefficients: { '4APG|اللغة الفرنسية': 3 } }))[1].average).toBe(3.5);
});

it('ranks within each class: equal averages to the hundredth share a rank, and a student with none is not ranked', () => {
  expect(classRanks([7, 9, 7, 5, null])).toEqual([2, 1, 2, 4, null]);
  expect(classRanks([7.001, 6.999])).toEqual([1, 1]);
  const statements = studentStatements([arabic, french, sheet('4APG-2', 'اللغة العربية', [['r', 'القراءة']], [student('c', 0)])]);
  expect(statements.map(item => [item.student.id, item.rank, item.ranked])).toEqual([['c', null, 0], ['a', 1, 2], ['b', 2, 2]]);
});

it('prints one page per student with the Contrôle in the title and escapes what it shows', () => {
  const html = buildStudentStatementDocument([arabic, sheet('5APG-1', '<b>x</b>', [['z', 'z']], [student('a', 0)])], { language: 'ar', title: 'Statements' });
  expect(html.match(/<section class="sheet"/g)).toHaveLength(2);
  expect(html).toContain('بيان نقط المراقبة : الفرض الأول - الدورة الأولى');
  expect(html).toContain('2025/2026');
  expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  expect(html).not.toContain('<b>x</b>');
  // The subject cell spans its parts.
  expect(html).toContain('<td class="unit" rowspan="2"');
});

it('adds the averages, the rank and the coefficients only when the school asks for them', () => {
  const plain = buildStudentStatementDocument([arabic, french], { language: 'ar', title: 'S' });
  for (const text of ['معدل الوحدة', 'المعدل العام', 'الرتبة في القسم', 'المعامل', 'class="result"']) expect(plain).not.toContain(text);
  const full = buildStudentStatementDocument([arabic, french], { language: 'ar', title: 'S', settings: settings({ subjectAverage: true, generalAverage: true, rank: true, coefficients: { '5APG|اللغة الفرنسية': 3 } }) });
  expect(full).toContain('<th>معدل الوحدة</th>');
  expect(full).toContain('<td class="average" rowspan="2" dir="ltr">8.50</td>');
  expect(full).toContain('المعدل العام');
  expect(full).toContain('<bdi dir="ltr">5.25<small> / 10</small></bdi>');
  expect(full).toContain('<bdi dir="ltr">2<small> / 2</small></bdi>');
  expect(full).toContain('المعامل <bdi dir="ltr">3</bdi>');
  // The rank alone shows the coefficients it was weighed with, but not the average itself.
  const rankOnly = buildStudentStatementDocument([arabic, french], { language: 'ar', title: 'S', settings: settings({ rank: true }) });
  expect(rankOnly).toContain('الرتبة في القسم');
  expect(rankOnly).not.toContain('المعدل العام');
});

it("ranks each subject within the class by the subject's average, among the students who have one", () => {
  const [a, b] = studentStatements([arabic, french]);
  // Arabic: a 8.5, b 0; French: only b has a mark.
  expect(a.units.map(unit => [unit.subject, unit.rank, unit.ranked])).toEqual([['اللغة العربية', 1, 2], ['اللغة الفرنسية', null, 1]]);
  expect(b.units.map(unit => [unit.subject, unit.rank, unit.ranked])).toEqual([['اللغة العربية', 2, 2], ['اللغة الفرنسية', 1, 1]]);
});

it('adds the subject rank column when asked, on collège statements too', () => {
  const html = buildStudentStatementDocument([arabic, french], { language: 'ar', title: 'S', settings: settings({ subjectRank: true }) });
  // Out of how many is said once, in the header, as the mark's maximum is.
  expect(html).toContain('<th>الرتبة<small dir="ltr">/2</small></th>');
  expect(html).toContain('<td class="rank" rowspan="2" dir="ltr">1</td>');
  // No mark in the subject, no rank.
  expect(html).toContain('<td class="rank" rowspan="1" dir="ltr"></td>');
  // A subject fewer students have a mark in says its own count (b's French: 1 of 1, while Arabic ranks 2).
  expect(html).toContain('<td class="rank" rowspan="1" dir="ltr">1<small> / 1</small></td>');
  const college = buildStudentStatementDocument([sheet('1APIC-1', 'الرياضيات', [['m', 'الفرض الأول']], [student('a', 0), student('b', 1)], [mark('a', 'm', 12), mark('b', 'm', 15)])], { language: 'ar', title: 'S', settings: settings({ subjectRank: true, subjectAverage: true }) });
  expect(college).toContain('<td class="rank" dir="ltr">2</td>');
  expect(college).not.toContain('معدل الوحدة');
  // Settings saved before the subject rank existed print without it.
  const { subjectRank: _subjectRank, ...older } = settings({ subjectAverage: true });
  expect(buildStudentStatementDocument([arabic], { language: 'ar', title: 'S', settings: older as never })).not.toContain('<th>الرتبة</th>');
});

it('drops the parts column and the subject average where every subject has one part, as in collège', () => {
  const college = [
    sheet('1APIC-1', 'الرياضيات', [['m', 'الفرض الأول']], [student('a', 0)], [mark('a', 'm', 18)]),
    sheet('1APIC-1', 'اللغة العربية', [['m', 'الفرض الأول']], [student('a', 0)], [mark('a', 'm', 16)]),
  ];
  const html = buildStudentStatementDocument(college, { language: 'ar', title: 'S', settings: settings({ subjectAverage: true, generalAverage: true }) });
  expect(html).toContain('<th>المادة</th>');
  for (const text of ['المكونات', 'معدل الوحدة', 'class="part"', '<td class="average"']) expect(html).not.toContain(text);
  // The exam's name is in the title, once, not on every row.
  expect(html.match(/الفرض الأول/g)).toHaveLength(1);
  expect(html).toContain('<td class="mark" dir="ltr">18.00</td>');
  expect(html).toContain('17.00<small> / 10</small>');
  // A class with subjects of several parts keeps both columns.
  expect(buildStudentStatementDocument([arabic, french], { language: 'ar', title: 'S', settings: settings({ subjectAverage: true }) })).toContain('<th>المكونات</th>');
});

it("previews one example student of a level, on that level's subjects only, with marks within its maximum", () => {
  const setup = { yearLabel: '2026-2027', levels: [{ id: 'p5', code: '5APG' }, { id: 'c1', code: '1APIC' }],
    subjects: [
      { id: 's1', levelId: 'p5', code: 'AR', name: 'اللغة العربية', components: [{ code: 'r', name: 'القراءة' }, { code: 'w', name: 'الإملاء' }] },
      { id: 's2', levelId: 'c1', code: 'MA', name: 'الرياضيات', components: [{ code: 'm', name: 'الرياضيات' }] },
    ] } as never;
  const primary = previewStatementSheets(setup, 'p5'), college = previewStatementSheets(setup, 'c1');
  expect(primary.map(sheet => [sheet.sheet.className, sheet.sheet.subjectName, sheet.maxMark])).toEqual([['5APG-1', 'اللغة العربية', 10]]);
  expect(college[0].maxMark).toBe(20);
  for (const sheet of [...primary, ...college]) for (const item of sheet.marks) expect(item.mark! >= sheet.maxMark * 0.55 && item.mark! <= sheet.maxMark * 0.95).toBe(true);
  expect(studentStatements(primary)).toHaveLength(1);
  expect(previewStatementSheets(setup, 'missing')).toEqual([]);
});

it('shares the page between the rows, within a hand-writable height', () => {
  expect(statementRowHeight(3)).toBe(12);
  expect(statementRowHeight(25)).toBeCloseTo(8);
  expect(statementRowHeight(25, 18)).toBeCloseTo(7.3);
  expect(statementRowHeight(60)).toBe(6);
});

it('writes remarks by band, in the subject language, varied between students but stable on reprint', () => {
  expect([9, 8, 7, 6, 5, 4.9, null].map(mark => remarkBand(mark, 10))).toEqual([0, 1, 2, 3, 4, 5, null]);
  expect(remarkBand(18, 20)).toBe(0);
  expect([remarkLanguage('اللغة الفرنسية'), remarkLanguage('اللغة الإنجليزية')]).toEqual(['fr', 'en']);
  // Subjects taught in Arabic are always remarked in Arabic.
  for (const subject of ['اللغة العربية', 'التربية الإسلامية', 'الاجتماعيات', 'التاريخ والجغرافيا']) expect(remarkLanguage(subject, '5APG-1')).toBe('ar');
  // Any other subject's teacher mostly writes in French (about 9 in 10), else Arabic; the same for that subject of that class.
  const classes = ['1', '2', '3', '4', '5', '6'].flatMap(level => [`${level}APG-1`, `${level}APG-2`, `${level}APG-3`]);
  const others = ['الرياضيات', 'النشاط العلمي', 'التربية البدنية', 'التربية الفنية', 'المعلوميات'].flatMap(subject => classes.map(cls => remarkLanguage(subject, cls)));
  const frenchShare = others.filter(language => language === 'fr').length / others.length;
  expect(frenchShare).toBeGreaterThan(0.75);
  expect(others).toContain('ar');
  expect(remarkLanguage('الرياضيات', '1APG-1')).toBe(remarkLanguage('الرياضيات', '1APG-1'));
  expect(studentRemark(8.5, 10, 'اللغة الفرنسية', 'a')).toBe(studentRemark(8.5, 10, 'اللغة الفرنسية', 'a'));
  expect(studentRemark(null, 10, 'الرياضيات', 'a')).toBe('');
  const french = new Set(Array.from({ length: 30 }, (_, index) => studentRemark(8.5, 10, 'اللغة الفرنسية', `s${index}`)));
  expect(french.size).toBeGreaterThan(1);
  for (const remark of french) expect(REMARKS.fr[1]).toContain(remark);
  // On one page, two subjects in the same band get two different wordings.
  const used = new Set<string>();
  expect(studentRemark(9.5, 10, 'الرياضيات', 'a', used)).not.toBe(studentRemark(9.5, 10, 'النشاط العلمي', 'a', used));
});
