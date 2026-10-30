/** Fill existing students via internal MCP only; never replays student imports. */
import { resolveBirthplace, type BirthplaceValues } from '@sms/contracts/birthplaces';

type Student = BirthplaceValues & { id: string; studentCode: string };
const keys = ['birthplaceId', 'birthplace', 'birthplaceArabic'] as const;
const text = (value: string | null | undefined) => value?.trim() || '';

export function planBirthplaceUpdate(existing: BirthplaceValues, source: BirthplaceValues):
  { status: 'unchanged' | 'conflict' | 'missingSource' } | { status: 'update'; fields: BirthplaceValues } {
  const desired = resolveBirthplace(source);
  if (!desired.birthplace && !desired.birthplaceArabic) return { status: 'missingSource' };
  const current = resolveBirthplace(existing);
  // Compare canonical names too, so Fes/Fès and Casa/Casablanca agree.
  if (keys.some(key => text(current[key]) && text(desired[key]) && text(current[key]) !== text(desired[key]))) return { status: 'conflict' };
  const merged = resolveBirthplace({
    birthplaceId: desired.birthplaceId || existing.birthplaceId,
    birthplace: existing.birthplace || desired.birthplace,
    birthplaceArabic: existing.birthplaceArabic || desired.birthplaceArabic,
  });
  if (keys.every(key => text(existing[key]) === text(merged[key]))) return { status: 'unchanged' };
  return { status: 'update', fields: merged };
}

async function main() {
  const args = process.argv.slice(2);
  const argument = (name: string) => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : undefined; };
  const file = argument('--file');
  const academicYear = argument('--year');
  if (!file || !academicYear || args.includes('--help')) {
    console.log('Usage: bun scripts/backfill-student-birthplaces.ts --file <students.json> --year 2026-2027 [--base http://localhost:3102] [--apply]\nAuth: SCHOOL_ADMIN_EMAIL and SCHOOL_ADMIN_PASSWORD environment variables. Defaults to dry run. Conflicting existing birthplaces are preserved.');
    if (!args.includes('--help')) process.exitCode = 1;
    return;
  }
  if (!/^\d{4}-\d{4}$/.test(academicYear)) throw new Error('Invalid academic year');
  const base = (argument('--base') || 'http://localhost:3102').replace(/\/$/, '');
  const url = new URL(base);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('Use HTTPS except for the local app');
  const email = process.env.SCHOOL_ADMIN_EMAIL;
  const password = process.env.SCHOOL_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set SCHOOL_ADMIN_EMAIL and SCHOOL_ADMIN_PASSWORD');
  const rows: unknown = await Bun.file(file).json();
  if (!Array.isArray(rows)) throw new Error('Expected a JSON array of students');
  const input = new Map<string, BirthplaceValues>();
  for (const row of rows) {
    if (!row || typeof row !== 'object' || typeof row.studentCode !== 'string') throw new Error('Every row needs a studentCode');
    const code = row.studentCode.trim();
    if (!code || input.has(code)) throw new Error('Blank or duplicate studentCode in source');
    for (const key of keys) if (row[key] != null && (typeof row[key] !== 'string' || row[key].length > (key === 'birthplaceId' ? 50 : 200))) throw new Error('Invalid birthplace field in source');
    // Whitelist birthplace only. Never carry nested financial/enrollment data.
    input.set(code, resolveBirthplace(Object.fromEntries(keys.map(key => [key, row[key]]))));
  }
  const loginResponse = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(30_000) });
  const login = await loginResponse.json();
  const accessToken = login.data?.accessToken;
  if (!loginResponse.ok || !accessToken) throw new Error(`Login failed (${loginResponse.status})`);
  let requestId = 0;
  async function rpc(method: string, params?: unknown) {
    const response = await fetch(`${base}/api/mcp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method, ...(params ? { params } : {}) }), signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`MCP failed (${response.status})`);
    const raw = await response.text();
    const payload = raw.trim().startsWith('{') ? raw : raw.split('\n').filter(line => line.startsWith('data: ')).at(-1)?.slice(6);
    if (!payload) throw new Error('Empty MCP response');
    const result = JSON.parse(payload);
    if (result.error) throw new Error(`MCP error: ${result.error.message}`);
    return result.result;
  }
  async function call(name: string, fields: Record<string, unknown>) {
    const result = await rpc('tools/call', { name, arguments: { ...fields, academicYear } });
    if (result.isError) throw new Error(`MCP tool ${name} refused the operation`);
    const block = result.content?.find((item: { type: string }) => item.type === 'text');
    const parsed = result.structuredContent ?? (block ? JSON.parse(block.text) : undefined);
    if (parsed === undefined) throw new Error('MCP result has no data');
    return parsed.data ?? parsed;
  }
  const registry = await rpc('tools/list');
  const updateTool = registry.tools?.find((tool: { name: string }) => tool.name === 'students_update');
  if (!keys.every(key => key in (updateTool?.inputSchema?.properties ?? {}))) throw new Error('The running app does not expose birthplace updates yet');
  const students: Student[] = await call('students_get_students', {});
  if (!Array.isArray(students)) throw new Error('Student list is not an array');
  const byCode = new Map(students.map(student => [student.studentCode, student]));
  if (byCode.size !== students.length) throw new Error('Ambiguous student codes returned by server');
  const counts = { input: input.size, listedStudents: students.length, found: 0, missingStudent: 0, missingSource: 0, conflict: 0, unchanged: 0, planned: 0, updated: 0 };
  for (const [code, source] of input) {
    let existing = byCode.get(code);
    if (!existing) { counts.missingStudent++; continue; }
    counts.found++;
    // Re-read immediately before a write; preserve records edited since list.
    if (args.includes('--apply')) existing = await call('students_get_student_by_id', { id: existing.id });
    const plan = planBirthplaceUpdate(existing, source);
    if (plan.status !== 'update') { counts[plan.status]++; continue; }
    counts.planned++;
    if (!args.includes('--apply')) continue;
    const saved: Student = await call('students_update', { id: existing.id, ...plan.fields });
    if (keys.some(key => text(saved[key]) !== text(plan.fields[key]))) throw new Error('Server did not persist the expected birthplace');
    counts.updated++;
    if (counts.updated % 50 === 0) console.log(`Updated ${counts.updated} birthplaces`);
  }
  console.log(JSON.stringify({ mode: args.includes('--apply') ? 'apply' : 'dry-run', ...counts }, null, 2));
}

if (import.meta.main) main().catch(error => { console.error(error instanceof Error ? error.message : 'Backfill failed'); process.exitCode = 1; });
