// Asks the running local chat real questions and scores each answer: the read
// it needed was called, the facts it must state are there, and it carries no
// failure text, leaked planning or stray-language words. Every question calls
// the paid answer model, so it is a script, never a test.
//
//   bun --env-file=apps/dashboard/.env.local scripts/chat-eval.ts [--runs 3] [--label name]
//     [--only id,id] [--base http://localhost:3102] [--cases <fixture.json>]
//
// Results go to out/chat-eval/<label>-<time>.json; the summary is printed.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

type Case = { id: string; lang: string; q: string; tools: string[]; include?: string[][]; exclude?: string[]; note?: string };
type Fixture = { academicYear: string; cases: Case[] };

const args = process.argv.slice(2);
const option = (name: string, fallback?: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const root = resolve(import.meta.dir, '..');
const base = option('base', 'http://localhost:3102')!;
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Use the local app');
const runs = Number(option('runs', '3'));
const label = option('label', 'run')!;
const only = option('only')?.split(',');
const fixture: Fixture = JSON.parse(readFileSync(option('cases', join(root, 'packages/server/tests/chat/fixtures/answers/demo-school.json'))!, 'utf8'));
const cases = fixture.cases.filter((c) => !only || only.includes(c.id));

// The chat's own failure notices and the leaks seen from OSS20B (2026-11-21).
const FAILURE = /ما قدرتش نكمل|لا يمكن الوصول إلى البيانات|could(?:n't| not) (?:finish|reach)|impossible de terminer/i;
const LEAK = /to=functions\.|^\s*(?:we (?:need|should|must|list|can)|let's|the user|name ==)|\bWe list\b/im;
const FOREIGN = /[\p{Script=Cyrillic}\p{Script=Han}\p{Script=Hebrew}\p{Script=Hangul}\p{Script=Greek}\p{Script=Devanagari}]|\b(?:hjälp|pressão|Leute|példa)/u;
const ARABIC = /\p{Script=Arabic}/u;

const email = process.env.ADMIN_EMAIL?.trim() || 'admin@admin.com';
const configured = process.env.ADMIN_PASSWORD;
const password = !configured || configured === 'replace-before-any-shared-environment' ? 'School2026' : configured;
const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
const token = (await login.json().catch(() => ({})))?.data?.accessToken;
if (!login.ok || !token) throw new Error(`Login failed (${login.status})`);
const auth = { Authorization: `Bearer ${token}` };

async function ask(question: string) {
  const started = performance.now();
  const response = await fetch(`${base}/api/chat?academicYear=${encodeURIComponent(fixture.academicYear)}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ id: crypto.randomUUID(), messages: [{ id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text: question }] }] }),
  });
  const raw = await response.text();
  const ms = Math.round(performance.now() - started);
  let answer = '';
  for (const line of raw.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    try {
      const event = JSON.parse(line.slice(6));
      if (event.type === 'text-delta') answer += event.delta ?? '';
    } catch { /* [DONE] */ }
  }
  const correlationId = response.headers.get('x-request-id');
  const record = correlationId
    ? await fetch(`${base}/api/chat-diagnostics/${encodeURIComponent(correlationId)}`, { headers: auth }).then((r) => r.json()).catch(() => null)
    : null;
  const diagnostics = record?.data ?? record;
  return { status: response.status, ms, answer: answer.trim(), correlationId, diagnostics };
}

function score(c: Case, reply: Awaited<ReturnType<typeof ask>>) {
  const tools: string[] = (reply.diagnostics?.tools ?? []).map((t: { name: string }) => t.name);
  const problems: string[] = [];
  if (reply.status !== 200) problems.push(`http ${reply.status}`);
  if (!reply.answer) problems.push('empty answer');
  if (FAILURE.test(reply.answer)) problems.push('failure text');
  if (LEAK.test(reply.answer)) problems.push('leaked planning or tool call');
  if (FOREIGN.test(reply.answer)) problems.push('stray-language words');
  if ((c.lang === 'ar' || c.lang === 'ary') && reply.answer && !ARABIC.test(reply.answer)) problems.push('not in Arabic script');
  if (c.tools.length === 0 && tools.length) problems.push(`called ${tools.join(',')} for no data`);
  if (c.tools.length && !c.tools.some((t) => tools.includes(t))) problems.push(`needed one of ${c.tools.join('|')}`);
  // "8,03" and "8.03" state the same fact (French answers use a decimal comma),
  // and OSS20B writes names with no-break spaces and hyphens ("EN‑NSAL").
  const answer = reply.answer.replace(/(\d),(\d)/g, '$1.$2').replace(/\s+/gu, ' ').replace(/[‐‑]/gu, '-');
  for (const group of c.include ?? []) if (!group.some((fact) => answer.includes(fact))) problems.push(`missing ${group[0]}`);
  for (const wrong of c.exclude ?? []) if (reply.answer.includes(wrong)) problems.push(`says ${wrong}`);
  return { tools, problems, pass: problems.length === 0 };
}

const results = [];
for (let run = 1; run <= runs; run++) {
  for (const c of cases) {
    const reply = await ask(c.q);
    const scored = score(c, reply);
    results.push({ run, id: c.id, ms: reply.ms, correlationId: reply.correlationId, routing: reply.diagnostics?.routingStatus, ...scored, answer: reply.answer });
    console.log(`${scored.pass ? 'PASS' : 'FAIL'} r${run} ${c.id} ${reply.ms}ms [${scored.tools.join(', ')}]${scored.pass ? '' : ` :: ${scored.problems.join('; ')}`}`);
  }
}

const passed = results.filter((r) => r.pass).length;
const times = results.map((r) => r.ms).sort((a, b) => a - b);
console.log(`\n${label}: ${passed}/${results.length} passed (${Math.round((100 * passed) / results.length)}%), median ${times[Math.floor(times.length / 2)]} ms`);
for (const c of cases) {
  const rows = results.filter((r) => r.id === c.id);
  console.log(`  ${c.id}: ${rows.filter((r) => r.pass).length}/${rows.length}`);
}
const problems = new Map<string, number>();
for (const r of results) {
  for (const p of r.problems) {
    const kind = p.replace(/needed one of .*/, 'needed read not called').replace(/missing .*/, 'missing fact').replace(/says .*/, 'states a wrong fact');
    problems.set(kind, (problems.get(kind) ?? 0) + 1);
  }
}
console.log(`  problems: ${[...problems].map(([p, n]) => `${p} ×${n}`).join(', ') || 'none'}`);

const outDir = join(root, 'out', 'chat-eval');
mkdirSync(outDir, { recursive: true });
const file = join(outDir, `${label}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
writeFileSync(file, JSON.stringify({ label, base, runs, passed, total: results.length, results }, null, 2));
console.log(`Details: ${file}`);
