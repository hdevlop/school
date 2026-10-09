import { expect, test } from 'bun:test';
import { schoolPersonalAcademicReply, schoolTeacherAcademicReply } from '../../src/modules/chat/schoolAcademicReplies';
import { schoolReplyLanguage } from '../../src/modules/chat/schoolReplyLanguage';
import { schoolReplyTemplate } from '../../src/modules/chat/schoolReplyTemplates';
import { schoolReplyContext } from '../../src/modules/chat/schoolReplyContext';
import { rewriteDarijaForRouting } from '../../src/modules/chat/darijaRouting';
import { createJevFixture } from './jevFixture';
import { setBenchmarkJevMode } from '../../src/modules/chat/JevControls';

const year = '2026-2027';
const child = { id: 'S1', name: 'Salma Idrissi' };
const math = { id: 'M', name: 'Mathématiques', code: 'MATH' };
const geography = { id: 'G', name: 'Géographie', code: 'GEO' };
const diagnostic = (id = 'A', subject = math, title = `${subject.name} · Diagnostic quiz`) => ({ id, subject, title, type: 'quiz', totalMarks: '10', date: '2026-10-01' });
const grade = (id = 'g1', subject = math, assessment = diagnostic('A', subject)) => ({ id, studentId: 'S1', subject, assessment, exam: null, marksObtained: '6.75' });
const result = { grades: [grade(), grade('g2', geography)], assessments: [diagnostic(), diagnostic('B', geography)] };
const own = (query: string) => schoolPersonalAcademicReply(query, 'ary', year, 'student', 'S1');
const parent = (query: string) => schoolPersonalAcademicReply(query, 'ary', year, 'parent', undefined, [child]);
const teacher = (query: string) => schoolTeacherAcademicReply(query, 'ary', year, 'teacher', 'T1');

test('unfiltered personal grade paraphrases preserve every subject and denominator locally', () => {
  const p=parent('wach t9der twerrini no9at Salma Idrissi f had l3am, b smit lmada w no9ta 3la ch7al?');
  expect(p?.calls).toEqual([{name:'student-profile_get_academic',input:{studentId:'S1',academicYear:year}}]);
  expect(p?.render?.([result])).toContain('6.75 / 10');
  expect(own('t9der t3tini no9ati b smit lmada w l3alama 3la ch7al f had l3am?')?.render?.([result])).toContain('Géographie');
  expect(parent('ch7al no9at Salma Idrissi')).toBeNull();
  expect(parent('wach t9der twerrini no9at Salma Idrissi f math')).toBeNull();
  expect(own('t9der t3tini no9ati b smit lmada f semester 2')).toBeNull();
});

test('unsupported personal queries still give the router and model the right academic meaning', () => {
  expect(schoolReplyContext('ch7al jebt ana f math f diagnostic quiz section B')).toContain('never substitute attendance percentages');
  expect(schoolReplyContext('3tini no9ta dyal Salma f math w ch7al mn ghyab 3ndo had l3am')).toContain('answer both parts');
  expect(schoolReplyContext('chno hiya lmawadd li kan9erri ana had l3am')).toContain('deduplicated by subject ID');
  expect(schoolReplyContext('شحال من فرض باقي خاصني نصححو ولا ندخل ليه النقط؟')).toContain('not remaining student papers');
  const rewritten = rewriteDarijaForRouting('chno hiya lmawadd li kan9erri Salma 2026-2027');
  expect(rewritten).toContain('المواد'); expect(rewritten).toContain('ادرس');
  expect(rewritten).toContain('Salma 2026-2027');
});

test.each(['ch7al jebt ana f math f diagnostic quiz?', 'شحال جبت أنا فالرياضيات ف diagnostic quiz؟'])('own math diagnostic uses a scoped academic read and preserves the actual mark: %s', query => {
  const plan = own(query);
  expect(schoolReplyLanguage(query)).toBe('ary');
  expect(plan?.calls).toEqual([{ name: 'student-profile_get_academic', input: { studentId: 'S1', academicYear: year } }]);
  const text = plan?.render?.([result]);
  expect(text).toContain('Mathématiques — Mathématiques · Diagnostic quiz: 6.75 / 10');
  expect(text).not.toContain('Géographie');
  expect(text).not.toContain('حضور');
});
test.each(['ch7al jab Salma Idrissi f math f diagnostic quiz?', 'شحال جاب Salma Idrissi فالرياضيات ف diagnostic quiz؟'])('parent resolves only the exact linked child: %s', query => {
  expect(parent(query)?.calls?.[0].input.studentId).toBe('S1');
  expect(parent(query)?.render?.([result])).toContain('النقط ديال Salma Idrissi');
  expect(schoolPersonalAcademicReply(query, 'ary', year, 'parent', undefined, [{ ...child, id: 'S2' }, child])).not.toHaveProperty('calls');
  expect(schoolPersonalAcademicReply(query, 'ary', year, 'parent', undefined, [])).toBeNull();
  expect(schoolPersonalAcademicReply(query, 'ary', year, 'admin', undefined, [child])).toBeNull();
});
test('diagnostic-grade count counts rows across subjects, never marks or an average', () => {
  const plan = own('ch7al mn no9ta tsjlat liya ana f diagnostic quiz?');
  expect(plan?.render?.([result])).toContain('تسجلات ليك 2 نقطة');
  expect(plan?.render?.([{ grades: [], assessments: [] }])).toContain('تسجلات ليك 0 نقطة');
  const other = grade('unrelated', geography, diagnostic('C', geography, 'Not a diagnostic quiz'));
  expect(plan?.render?.([{ ...result, grades: [...result.grades, other] }])).toContain('تسجلات ليك 2 نقطة');
  expect(() => plan?.render?.([{ ...result, grades: [grade(), { ...grade('g2'), marksObtained: Infinity }] }])).toThrow();
});
test('own all-grade formatting keeps stored geography name and denominators', () => {
  const plan = own('وريني النقط ديالي بالمادة وبالنقطة على شحال.');
  expect(plan?.render?.([result])).toContain('Géographie — Géographie · Diagnostic quiz: 6.75 / 10');
});
test('combined child math and absence reads keep both tool scopes and count records', () => {
  const plan = parent('3tini no9ta dyal Salma Idrissi f math w ch7al mn ghyab 3ndo had l3am.');
  expect(plan?.calls).toEqual(['student-profile_get_academic', 'student-profile_get_attendance_summary'].map(name => ({ name, input: { studentId: 'S1', academicYear: year } })));
  const text = plan?.render?.([result, { total: 13, present: 12, absent: 0, late: 1 }]);
  expect(text).toContain('6.75 / 10');
  expect(text).toContain('عدد سجلات الغياب ديال Salma Idrissi فـ 2026-2027: 0');
  for (const attendance of [null, { total: 13, present: 12, absent: 0, late: 0 }, { total: 13, present: 12, absent: -1, late: 2 }]) {
    expect(() => plan?.render?.([result, attendance])).toThrow();
  }
  expect(() => plan?.render?.([result])).toThrow();
});
test('subject identity and singular quiz ambiguity clarify rather than choose a row', () => {
  const plan = own('ch7al jebt ana f math f diagnostic quiz');
  for (const academic of [
    { grades: [], assessments: [] },
    { ...result, assessments: [...result.assessments, diagnostic('second-subject', { ...math, id: 'another-math' })] },
    { ...result, assessments: [...result.assessments, diagnostic('another-quiz')] },
    { ...result, grades: [...result.grades, grade('another-grade')] },
  ]) {
    expect(plan?.render?.([academic])).toContain('ما تحددش بوحدو');
    expect(plan?.render?.([academic])).not.toContain('6.75');
  }
  expect(plan?.render?.([{ grades: [], assessments: [diagnostic()] }])).toContain('ما لقيت حتى نقطة مطابقة');
});
test.each([
  null, 'Error (FORBIDDEN)', { grades: [] },
  { ...result, grades: [{ ...grade(), studentId: 'outsider' }] },
  { ...result, grades: [grade(), grade()] },
  { ...result, grades: [{ ...grade(), subject: { ...math, id: '' } }] },
  { ...result, grades: [{ ...grade(), assessment: null, exam: null }] },
  { ...result, grades: [{ ...grade(), exam: diagnostic() }] },
  { ...result, grades: [{ ...grade(), marksObtained: NaN }] },
  { ...result, grades: [{ ...grade(), marksObtained: '11' }] },
])('invalid/denied academic reads never become an empty success: %j', academic => {
  expect(() => own('ch7al jebt ana f math f diagnostic quiz')?.render?.([academic])).toThrow();
});
test.each([
  'ch7al jebt ana f math f diagnostic quiz 2025-2026',
  'ch7al jebt ana f math f diagnostic quiz w 3tini phone',
  'ch7al jebt ana f math f diagnostic quiz "only absent"',
  'ch7al jebt ana f physics f diagnostic quiz',
  'ch7al jab Outsider Person f math f diagnostic quiz',
  'ch7al jab Salma Idrissi w Omar f math f diagnostic quiz',
  'ch7al jebt ana f math f diagnostic quiz section B',
])('unknown qualifiers and identities preserve routing: %s', query => {
  expect(own(query)).toBeNull();
  expect(parent(query)).toBeNull();
});
test.each(['chno hiya lmawadd li kan9erri ana had l3am?', 'شنو هي المواد اللي كنقري أنا هاد العام؟'])('teacher subjects use actual assignment subjects, not classes/rooms: %s', query => {
  const plan = teacher(query);
  expect(schoolReplyLanguage(query)).toBe('ary');
  expect(plan?.calls).toEqual([{ name: 'teacher-profile_get_my_classes', input: { teacherId: 'T1', academicYear: year } }]);
  const assignments = { teacher: { id: 'T1' }, classes: [{ name: 'CM2', subject: geography }, { name: 'CP', subject: geography }, { name: 'CM2', subject: math }] };
  const text = plan?.render?.([assignments]);
  expect(text).toContain('Géographie، Mathématiques');
  expect(text).not.toContain('CM2'); expect(text).not.toContain('CP');
  expect(plan?.render?.([{ teacher: { id: 'T1' }, classes: [] }])).toContain('ما كاينة حتى مادة');
  for (const bad of [{ ...assignments, teacher: { id: 'T2' } }, { ...assignments, classes: [{ subject: {} }] },
    { ...assignments, classes: [{ subject: geography }, { subject: { ...geography, name: 'Another' } }] }]) expect(() => plan?.render?.([bad])).toThrow();
});
test.each(['شحال من فرض باقي خاصني نصححو ولا ندخل ليه النقط؟', 'ch7al mn fard ba9i khasni ns7ho wla ndkhel lih nno9at?'])('pending grading is a read and describes the service definition: %s', query => {
  const plan = teacher(query);
  expect(schoolReplyLanguage(query)).toBe('ary');
  expect(plan?.calls).toEqual([{ name: 'teacher-profile_get_pending_grading', input: { teacherId: 'T1', academicYear: year } }]);
  const pending = { id: 'A', title: 'Quiz', status: 'scheduled', teacher: { id: 'T1' } };
  expect(plan?.render?.([{ pendingCount: 1, pendingAssessments: [pending] }])).toContain('عندك 1 فرض ما تسجلات ليه حتى نقطة');
  expect(plan?.render?.([{ pendingCount: 0, pendingAssessments: [] }])).toContain('عندك 0 فرض');
  expect(plan?.render?.([{ pendingCount: 1, pendingAssessments: [pending] }])).toContain('ما كيحسبش الأوراق');
  for (const bad of [null, { pendingCount: 1, pendingAssessments: [] }, { pendingCount: NaN, pendingAssessments: [] },
    { pendingCount: 2, pendingAssessments: [pending, pending] },
    { pendingCount: 1, pendingAssessments: [{ ...pending, teacher: { id: 'T2' } }] },
    { pendingCount: 1, pendingAssessments: [{ ...pending, status: 'cancelled' }] }]) expect(() => plan?.render?.([bad])).toThrow();
});
test('runtime priority retains write/year and channel/role restrictions', () => {
  const reply = (query: string, role = 'teacher', channel = 'web') => schoolReplyTemplate({ userText: query, language: 'ary', channel }, year, role, undefined, 'T1', 'S1', [child]);
  expect(reply('شحال من فرض باقي خاصني نصححو ولا ندخل ليه النقط؟')?.label).toBe('school:teacher-pending-grading');
  expect(reply('سجل النقط ديال الفرض')).not.toHaveProperty('calls');
  expect(reply('شحال من فرض باقي بلا نقط 2025-2026')).not.toHaveProperty('calls');
  expect(reply('chno hiya lmawadd li kan9erri ana had l3am', 'parent')).toBeNull();
  expect(reply('chno hiya lmawadd li kan9erri ana had l3am', 'teacher', 'whatsapp')).toBeNull();
  expect(schoolTeacherAcademicReply('شحال من فرض باقي بلا نقط', 'ary', year, 'teacher')).toBeNull();
  expect(schoolPersonalAcademicReply('ch7al jebt ana f math f diagnostic quiz', 'ary', year, 'student')).toBeNull();
});

test('existing fourth-class maths plan works before routing with paid Jev off', async () => {
  const keys = ['DB_URL', 'NODE_ENV', 'CHATBOT_BENCHMARK_CONTROLS'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  process.env.DB_URL = 'postgres://localhost/school_history_test'; process.env.NODE_ENV = 'test';
  process.env.CHATBOT_BENCHMARK_CONTROLS = 'true'; setBenchmarkJevMode('off');
  try {
    const fixture = await createJevFixture({ qualifiedData: true });
    try {
      for (const role of ['admin', 'principal']) for (const selectedYear of ['2025-2026', year]) {
        for (const query of ['شنو هوما النقط ديال القسم الرابع فالرياضيات؟', 'chno homa nno9at dyal l9ism rrabi3 f riyadiyat?']) {
          const response = await fixture.call('/chat', { messages: [{ role: 'user', parts: [{ type: 'text', text: query }] }] }, role, selectedYear);
          const events = (await response.text()).split(/\r?\n/u).filter(line => line.startsWith('data: {')).map(line => JSON.parse(line.slice(6)));
          const text = events.filter(event => event.type === 'text-delta').map(event => event.delta).join('');
          const diagnostic = fixture.events.at(-1)!;
          expect(response.status).toBe(200);
          expect(diagnostic.reply?.error).toBeUndefined();
          expect(diagnostic.tools.map(tool => tool.name)).toEqual(['classes_get_classes', 'subjects_get_subjects', 'grades_get_all']);
          expect(diagnostic.tools.every(tool => tool.outcome === 'executed')).toBe(true);
          expect(text).toContain(selectedYear === year ? '16/20' : '12/20');
          expect(text).not.toContain('Wrong Subject');
        }
      }
      expect(fixture.counts()).toEqual({ decisions: 0, generations: 0 });
      expect(fixture.routingCalls()).toBe(0);
    } finally { await fixture.server.stop(); }
  } finally {
    for (const key of keys) if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    setBenchmarkJevMode('off');
  }
});
