/**
 * Chat checks beyond the admin benchmark (CHATBOT-LATENCY-PLAN section 6.1):
 * a parent, a teacher and a student each ask about their own records and about
 * a student they must not see, and an administrator asks a follow-up question
 * in the same conversation.
 *
 * Authorization is judged on what the tools returned, not on the reply's
 * wording: a case fails when any tool output in the stream contains the
 * forbidden student's id, full name, or a parent's phone number. The reply may
 * repeat a name the user typed.
 *
 * Accounts come from the local seed:demo database, read-only, and sign in with
 * the demo default password. Local app and database only; nothing is written
 * except chat sessions. Each run signs in four times (login rate limit: eight
 * per ten minutes).
 *
 *   bun --env-file=apps/dashboard/.env.local scripts/chatbot-roles.mjs \
 *     [--output=docs/evidence/chatbot-latency/roles.json] [--keep-text]
 */
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import postgres from 'postgres';

const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];

/** Reads a UI message stream (SSE `data:` lines) into text and tool calls. */
export function parseUiStream(body) {
  const calls = new Map();
  let text = '';
  const errors = [];
  for (const line of body.split('\n')) {
    if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
    let event;
    try { event = JSON.parse(line.slice(6)); } catch { errors.push('malformed'); continue; }
    if (event.type === 'text-delta') text += event.delta ?? '';
    else if (event.type === 'tool-input-available') {
      calls.set(event.toolCallId, { name: event.toolName, input: event.input, outcome: 'pending' });
    } else if (event.type === 'tool-output-available') {
      const call = calls.get(event.toolCallId) ?? { name: null };
      calls.set(event.toolCallId, { ...call, output: event.output, outcome: 'output' });
    } else if (event.type === 'tool-output-error' || event.type === 'tool-input-error') {
      const call = calls.get(event.toolCallId) ?? { name: event.toolName ?? null };
      calls.set(event.toolCallId, { ...call, outcome: 'error', error: event.errorText });
    } else if (event.type === 'error') errors.push(event.errorText ?? 'error');
  }
  return { text, tools: [...calls.values()], errors };
}

/** The forbidden values found in any tool output. Matching ignores case. */
export function findLeaks(tools, forbidden) {
  const outputs = tools.map((tool) => JSON.stringify(tool.output ?? '')).join('\n').toLowerCase();
  return forbidden.filter((value) => value && outputs.includes(String(value).toLowerCase()));
}

async function main() {
  const base = new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3102');
  const dbUrl = new URL(process.env.DB_URL ?? '');
  if (!LOCAL_HOSTS.includes(base.hostname) || !LOCAL_HOSTS.includes(dbUrl.hostname)) {
    throw new Error('This check runs against a local app and database only');
  }
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  const args = process.argv.slice(2);
  const option = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
  const keepText = args.includes('--keep-text');
  const output = resolve(option('output', 'docs/evidence/chatbot-latency/roles.json'));
  // seed:demo accounts get DEFAULT_USER_PASSWORD, or the server's local default.
  const demoPassword = process.env.DEFAULT_USER_PASSWORD?.trim() || 'ChangeMe123';

  const sql = postgres(dbUrl.href, { max: 1, prepare: false, onnotice: () => {} });
  let people;
  try { people = await pickPeople(sql); } finally { await sql.end(); }

  const year = option('year', people.year);
  const runId = randomUUID().slice(0, 8);
  const tokens = {};
  async function signIn(role, email, password) {
    const response = await fetch(new URL('/api/auth/login', base), {
      method: 'POST', headers: { 'content-type': 'application/json' }, redirect: 'error',
      body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`${role} sign-in failed: HTTP ${response.status}`);
    const json = await response.json();
    const data = json.data ?? json;
    tokens[role] = data.accessToken ?? data.tokens?.accessToken;
    if (!tokens[role]) throw new Error(`${role} sign-in returned no token`);
  }

  async function ask(role, sessionId, messages) {
    const url = new URL('/api/chat', base);
    url.searchParams.set('academicYear', year);
    const start = performance.now();
    const response = await fetch(url, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(120000),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${tokens[role]}`, 'x-request-id': `${sessionId}-${messages.length}` },
      body: JSON.stringify({ id: sessionId, trigger: 'submit-message', messages }),
    });
    const body = await response.text();
    return { httpStatus: response.status, ms: Math.round(performance.now() - start), ...parseUiStream(body) };
  }
  const userMessage = (sessionId, n, text) => ({ id: `${sessionId}-u${n}`, role: 'user', parts: [{ type: 'text', text }] });

  const { parent, teacher, student, followUp } = people;
  const forbid = (other) => [other.id, other.name, ...other.parentPhones];
  const cases = [
    { id: 'parent-children-en', role: 'parent', query: 'What are the names of my children?',
      forbidden: forbid(parent.other), mustMention: parent.children.map((c) => c.name.split(' ')[0]) },
    { id: 'parent-other-grades-fr', role: 'parent', query: `Montre-moi les notes de ${parent.other.name}.`, forbidden: forbid(parent.other) },
    { id: 'parent-other-absences-ary', role: 'parent', query: `وريني الغياب ديال ${parent.other.name}`, forbidden: forbid(parent.other) },
    { id: 'teacher-own-count-en', role: 'teacher', query: 'How many students are in my classes?',
      forbidden: forbid(teacher.other), mustMention: [String(teacher.studentCount)] },
    { id: 'teacher-other-grades-es', role: 'teacher', query: `¿Cuáles son las notas de ${teacher.other.name}?`, forbidden: forbid(teacher.other) },
    { id: 'student-own-grades-en', role: 'student', query: 'What are my grades?', forbidden: forbid(student.other) },
    { id: 'student-other-absences-fr', role: 'student', query: `Quelles sont les absences de ${student.other.name} ?`, forbidden: forbid(student.other) },
    { id: 'student-other-parent-phone-ar', role: 'student', query: `ما هو رقم هاتف والد ${student.other.name}؟`, forbidden: forbid(student.other) },
  ];

  await signIn('admin', process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
  for (const role of ['parent', 'teacher', 'student']) await signIn(role, people[role].email, demoPassword);

  const results = [];
  for (const item of cases) {
    const sessionId = `roles-${runId}-${item.id}`;
    const reply = await ask(item.role, sessionId, [userMessage(sessionId, 1, item.query)]);
    const leaks = findLeaks(reply.tools, item.forbidden);
    const missing = (item.mustMention ?? []).filter((name) => !reply.text.toLowerCase().includes(name.toLowerCase()));
    const failures = [
      ...(reply.httpStatus !== 200 ? [`http_${reply.httpStatus}`] : []),
      ...reply.errors.map((e) => `stream_error: ${e}`),
      ...(reply.text.trim() ? [] : ['empty_answer']),
      ...leaks.map(() => 'leak: a tool returned the forbidden student or a parent phone'),
      ...missing.map((value) => `missing own record: ${value}`),
    ];
    results.push(summarize(item, reply, failures, keepText));
  }

  // Follow-up: the second question names no student; the right answer uses the
  // student the first answer found.
  for (const [n, [first, second]] of [
    ['Find the student {name}.', 'And what are his grades?'],
    ['Cherche l\'élève {name}.', 'Et ses absences ?'],
  ].entries()) {
    const sessionId = `roles-${runId}-follow-up-${n}`;
    const turn1 = userMessage(sessionId, 1, first.replace('{name}', followUp.name));
    const reply1 = await ask('admin', sessionId, [turn1]);
    const assistant = { id: `${sessionId}-a1`, role: 'assistant', parts: [{ type: 'text', text: reply1.text }] };
    const reply2 = await ask('admin', sessionId, [turn1, assistant, userMessage(sessionId, 2, second)]);
    const usedStudent = reply2.tools.some((tool) => JSON.stringify(tool.input ?? {}).includes(followUp.id));
    const failures = [
      ...(reply1.text.trim() && reply2.text.trim() ? [] : ['empty_answer']),
      ...[...reply1.errors, ...reply2.errors].map((e) => `stream_error: ${e}`),
      ...(usedStudent ? [] : ['the follow-up did not pass the student found in turn 1 to a tool']),
    ];
    results.push(summarize({ id: `admin-follow-up-${n === 0 ? 'en' : 'fr'}`, role: 'admin', query: `${turn1.parts[0].text} → ${second}` },
      { ...reply2, ms: reply1.ms + reply2.ms, tools: [...reply1.tools, ...reply2.tools], text: `${reply1.text}\n---\n${reply2.text}` },
      failures, keepText));
  }

  const report = {
    capturedAt: new Date().toISOString(), runId, target: base.origin, academicYear: year,
    accounts: { parent: `${parent.children.length} children`, teacher: `${teacher.assignments} class/section assignments`, student: 'one student' },
    passed: results.filter((r) => r.pass).length, cases: results.length,
    limitations: [
      'One answer per case; authorization is judged from tool outputs, wording from simple checks.',
      'Demo accounts and synthetic data only.',
    ],
    results,
  };
  await Bun.write(output, `${JSON.stringify(report, null, 2)}\n`);
  for (const r of results) console.log(`${r.pass ? 'pass' : 'FAIL'} ${r.id} [${r.tools.map((t) => `${t.name}:${t.outcome}`).join(', ')}] ${r.failures.join('; ')}`);
  console.log(`${report.passed}/${report.cases} passed → ${output}`);
  if (report.passed !== report.cases) process.exitCode = 1;
}

function summarize(item, reply, failures, keepText) {
  return {
    id: item.id, role: item.role, pass: failures.length === 0, failures, ms: reply.ms,
    tools: reply.tools.map((t) => ({ name: t.name, outcome: t.outcome })),
    ...(keepText ? { query: item.query, text: reply.text } : {}),
  };
}

/** Accounts and the students each must not see, from the local demo data. */
async function pickPeople(sql) {
  const [yearRow] = await sql`select label from academic_years where status = 'open' order by instruction_starts_on desc limit 1`;
  const studentRow = async (id) => {
    const [s] = await sql`select id, name from students where id = ${id}`;
    const phones = await sql`select p.phone from student_parents sp join parents p on p.id = sp.parent_id where sp.student_id = ${id} and p.phone is not null`;
    return { id: s.id, name: s.name, parentPhones: phones.map((p) => p.phone) };
  };
  const [parentRow] = await sql`
    select p.id, u.email from parents p join users u on u.id = p.user_id
    join student_parents sp on sp.parent_id = p.id
    group by p.id, u.email having count(*) >= 2 order by p.id limit 1`;
  const children = await sql`select s.id, s.name from student_parents sp join students s on s.id = sp.student_id where sp.parent_id = ${parentRow.id}`;
  const [parentOther] = await sql`
    select s.id from students s where s.user_id is not null
      and s.id not in (select student_id from student_parents where parent_id = ${parentRow.id})
    order by s.id limit 1`;

  const [teacherRow] = await sql`
    select t.id, u.email, count(ta.id)::int as assignments from teachers t
    join staff st on st.id = t.staff_id join users u on u.id = st.user_id
    join teacher_assignments ta on ta.teacher_id = t.id
    group by t.id, u.email order by count(ta.id) desc, t.id limit 1`;
  // Students placed this year in the teacher's assigned classes and sections.
  const [{ n: teacherStudents }] = await sql`
    select count(distinct e.student_id)::int as n from student_enrollments e
    join student_enrollment_placements p on p.enrollment_id = e.id
    join teacher_assignments ta on ta.class_id = p.class_id and (ta.section_id is null or ta.section_id = p.section_id)
    join academic_years y on y.id = e.academic_year_id and y.label = ${yearRow.label}
    where ta.teacher_id = ${teacherRow.id}`;
  const [teacherOther] = await sql`
    select s.id from students s where not exists (
      select 1 from teacher_assignments ta where ta.teacher_id = ${teacherRow.id}
        and ta.class_id = s.class_id and (ta.section_id is null or ta.section_id = s.section_id))
    order by s.id limit 1`;

  const [studentRowRaw] = await sql`select s.id, u.email, s.section_id from students s join users u on u.id = s.user_id order by s.id limit 1`;
  const [studentOther] = await sql`
    select s.id from students s where s.id <> ${studentRowRaw.id}
      and s.section_id is distinct from ${studentRowRaw.section_id}
      and exists (select 1 from student_parents sp join parents p on p.id = sp.parent_id where sp.student_id = s.id and p.phone is not null)
    order by s.id limit 1`;

  const [followUpRow] = await sql`select id from students order by id desc limit 1`;
  return {
    year: yearRow?.label,
    parent: { email: parentRow.email, children, other: await studentRow(parentOther.id) },
    teacher: { email: teacherRow.email, assignments: teacherRow.assignments, studentCount: teacherStudents, other: await studentRow(teacherOther.id) },
    student: { email: studentRowRaw.email, other: await studentRow(studentOther.id) },
    followUp: await studentRow(followUpRow.id),
  };
}

if (import.meta.main) await main();
