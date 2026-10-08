import { afterEach, beforeEach, expect, test } from 'bun:test';
import { schoolFilteredReply, schoolFilteredReplyKind } from '../../src/modules/chat/schoolFilteredReplies';
import { schoolReplyTemplate } from '../../src/modules/chat/schoolReplyTemplates';
import { schoolReplyLanguage } from '../../src/modules/chat/schoolReplyLanguage';
import { createJevFixture } from './jevFixture';
import { setBenchmarkJevMode } from '../../src/modules/chat/JevControls';
const corpus = await Bun.file('datasets/chatbot-latency/darija-tool-selection-20261008.json').json();
const cases = corpus.cases.filter((x: { id: string }) => [31,32,91,92,93,94].includes(Number(x.id.split('q').at(-1))));
const girls = 'شحال من بنت كاينة فالمدرسة؟';
const maths = '3tini smiyat dyal lasatida li kay9erriw riyadiyat.';
const readPlan = (query: string) => {
  const plan = schoolFilteredReply(query, 'ary', '2026-2027', 'admin');
  if (!plan || 'text' in plan) throw Error('Expected read plan'); return plan;
};
test.each(cases)('closed Darija request recognized without rewriting $id', (item: { query: string }) => {
  expect(schoolFilteredReplyKind(item.query)).not.toBeNull();
  expect(schoolReplyLanguage(item.query)).toBe('ary');
});
test.each([girls+' zid tilmid jdid', maths+' f l9ism A', 'شحال من بنت كاينة فالمدرسة سنة 2025-2026؟',
  'شحال من بنت غايبة اليوم؟', 'شحال خلص الولي حسن هاد الشهر؟', 'زيد بنت فالمدرسة',
  'ما تعطينيش السميات ديال الأساتذة اللي كيقريو الرياضيات', '"'+maths+'"'])('qualifiers, names, quotes and mutations stay outside this scope: %s', query => {
  expect(schoolFilteredReplyKind(query)).toBeNull();
});
test('girls count uses unique authorized identities and reports incomplete gender explicitly', () => {
  const plan = readPlan(girls);
  expect(plan.calls).toEqual([{ name: 'students_get_students', input: { academicYear: '2026-2027' } }]);
  expect(plan.render([[{ id: 'a', gender: 'female' }, { id: 'b', gender: 'male' }]])).toContain('1 تلميذة');
  expect(plan.render([[{ id: 'a', gender: 'female' }, { id: 'b', gender: null }, { id: 'c' }]])).toContain('2 سجل');
  expect(plan.render([[{ id: 'a', gender: 'other' }]])).toContain('ما نقدرش نأكد');
  expect(plan.render([[]])).toContain('0 تلميذة');
  for (const value of [{}, null, [{ gender: 'female' }], [{ id: 'a' }, { id: 'a' }]]) expect(() => plan.render([value])).toThrow();
  expect(() => plan.render([])).toThrow();
});
test('maths teacher filtering uses subject IDs and scoped assignments, never specialization', () => {
  const plan = readPlan(maths);
  expect(plan.calls.map(call => call.name)).toEqual(['subjects_get_subjects', 'teachers_get_teachers']);
  const subjects = [{ id: 'm', name: 'Mathématiques', code: 'MATH' }, { id: 'p', name: 'Physique' }];
  const text = plan.render([subjects, [{ id: 'a', name: 'Fatima', assignments: [{ subjectIds: ['m'] }, { subjectIds: ['m'] }] },
    { id: 'b', name: 'Hassan', specialization: 'Mathématiques', assignments: [{ subjectIds: ['p'] }] }]]);
  expect(text).toContain('Fatima'); expect(text).not.toContain('Hassan'); expect(text.match(/Fatima/gu)).toHaveLength(1);
  expect(plan.render([subjects, []])).toContain('ما كاين حتى أستاذ');
  expect(plan.render([[], []])).toContain('ما نقدرش نحدد');
  expect(() => plan.render([subjects, [{ id: 'a', name: 'Fatima' }]])).toThrow();
  expect(() => plan.render([subjects, [{ id: 'a', name: 'Fatima', assignments: [{ subjectIds: [null] }] }]])).toThrow();
});
test.each(['parent','student','teacher','accounting',undefined])('restricted actor gets no school-wide tool plan: %s', role => {
  for (const query of [girls, maths]) {
    const plan = schoolFilteredReply(query, 'ary', '2026-2027', role);
    expect(plan?.label).toBe('school:filtered-read-denied'); expect(plan).not.toHaveProperty('calls');
  }
});
test('year is required for privileged reads; unidentified parent never triggers a payment read', () => {
  expect(schoolFilteredReply(girls, 'ary', undefined, 'admin')).toBeNull();
  for (const role of ['admin','principal','teacher','parent','student']) {
    const plan = schoolFilteredReply('شحال خلص هاد الولي هاد الشهر؟', 'ary', undefined, role);
    expect(plan?.label).toBe('school:parent-identity'); expect(plan).not.toHaveProperty('calls');
  }
  expect(schoolReplyTemplate({ userText: girls, language: 'ary', channel: 'whatsapp' }, '2026-2027', 'admin')).toBeNull();
});

const keys = ['DB_URL','NODE_ENV','CHATBOT_BENCHMARK_CONTROLS','CHATBOT_JEV_BILLING_MODE'];
const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
let fixture: Awaited<ReturnType<typeof createJevFixture>> | undefined;
beforeEach(() => {
  process.env.DB_URL = 'postgres://localhost/school_history_test'; process.env.NODE_ENV = 'test';
  process.env.CHATBOT_BENCHMARK_CONTROLS = 'true'; process.env.CHATBOT_JEV_BILLING_MODE = 'abort'; setBenchmarkJevMode('off');
});
afterEach(async () => {
  await fixture?.server.stop(); fixture = undefined;
  for (const key of keys) if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key];
  setBenchmarkJevMode('off');
});
const messages = (query: string) => [{ role: 'user', parts: [{ type: 'text', text: query }] }];
const answerText = (stream: string) => stream.split(/\r?\n/u).filter(line => line.startsWith('data: {'))
  .map(line => JSON.parse(line.slice(6))).filter(event => event.type === 'text-delta').map(event => event.delta).join('');
test('six reviewed requests use real HTTP/MCP plans and populated year-scoped answers without AI calls', async () => {
  fixture = await createJevFixture();
  for (const role of ['admin','principal']) for (const year of ['2025-2026','2026-2027']) for (const item of cases) {
    const response = await fixture.call('/chat', { messages: messages(item.query) }, role, year);
    expect(response.status).toBe(200); const stream = answerText(await response.text()); const event = fixture.events.at(-1)!;
    expect(event.reply?.error).toBeUndefined();
    const kind = schoolFilteredReplyKind(item.query);
    expect(event.tools.map(tool => tool.name)).toEqual(kind === 'girls' ? ['students_get_students']
      : kind === 'maths-teachers' ? ['subjects_get_subjects','teachers_get_teachers'] : []);
    expect(event.tools.every(tool => tool.outcome === 'executed')).toBe(true);
    if (kind === 'girls') expect(stream).toContain(`${year === '2026-2027' ? 2 : 1} تلميذة`);
    if (kind === 'maths-teachers') { expect(stream).toContain(`Math Teacher ${year}`); expect(stream).not.toContain('Physics Teacher'); }
    if (kind === 'parent-identity') expect(stream).toContain('شكون الولي');
  }
  expect(fixture.counts()).toEqual({ decisions: 0, generations: 0 });
});
test('family and teacher chats cannot turn the filtered request into a school-wide read', async () => {
  fixture = await createJevFixture();
  for (const role of ['parent','student','teacher']) for (const query of [girls, maths, 'شحال خلص هاد الولي هاد الشهر؟']) {
    const response = await fixture.call('/chat', { messages: messages(query) }, role);
    expect(response.status).toBe(200); await response.text();
    expect(fixture.events.at(-1)?.tools).toEqual([]);
  }
  expect(fixture.counts()).toEqual({ decisions: 0, generations: 0 });
  for (const role of ['parent','student','teacher']) for (const name of ['students_get_students','teachers_get_teachers','subjects_get_subjects']) {
    const response = await fixture.call('/mcp', { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: {} } }, role);
    const body = await response.json();
    expect(Boolean(body.error || body.result?.isError)).toBe(true);
  }
});
