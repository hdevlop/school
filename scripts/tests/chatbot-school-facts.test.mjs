import { expect, it } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const powershell = Bun.which('powershell') ?? Bun.which('pwsh');

it.skipIf(!powershell)('captures French/Arabic MCP and REST names as UTF-8 even without a response charset', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'school-facts-'));
  const output = join(directory, 'facts.json');
  const envFile = join(directory, 'mock.env');
  await Bun.write(envFile, 'ADMIN_EMAIL=mock@example.invalid\nADMIN_PASSWORD=mock-password\n');
  const invoked = [];
  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, async fetch(request) {
    const json = (value) => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
    const path = new URL(request.url).pathname;
    if (path === '/api/auth/login') return json({ data: { accessToken: 'mock-token' } });
    if (path === '/api/classes') return json({ data: [{ name: 'CP', description: 'Cours Préparatoire', level: 'Primaire', sections: [{ name: 'A' }] }] });
    if (path === '/api/mcp') {
      expect(request.headers.get('accept')).toContain('text/event-stream');
      const body = await request.json();
      if (body.method === 'tools/list') return json({ result: { tools: ['exams_get_upcoming_exams', 'students_get_student_count', 'teachers_get_teacher_count'].map((name) => ({ name })) } });
      invoked.push(body.params.name);
      expect(body.params.arguments.academicYear).toBe('2026-2027');
      const value = body.params.name === 'exams_get_upcoming_exams'
        ? [{ title: 'امتحان الرياضيات', subject: { name: 'Mathématiques' }, class: { name: 'CP' }, section: { name: 'A' }, date: '2026-10-17', startTime: '09:00:00', endTime: '11:00:00' }]
        : { count: body.params.name.startsWith('students') ? 100 : 50 };
      return json({ result: { content: [{ type: 'text', text: JSON.stringify(value) }] } });
    }
    return new Response(null, { status: 404 });
  } });
  try {
    const process = Bun.spawn([powershell, '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolve('scripts/chatbot-school-facts.ps1'),
      '-BaseUrl', `http://127.0.0.1:${server.port}`, '-Output', output, '-EnvFile', envFile], { stdout: 'pipe', stderr: 'pipe' });
    const [exitCode, stderr] = await Promise.all([process.exited, new Response(process.stderr).text(), new Response(process.stdout).text()]);
    expect({ exitCode, stderr }).toEqual({ exitCode: 0, stderr: '' });
    const facts = await Bun.file(output).json();
    expect(facts.classes[0].description).toBe('Cours Préparatoire');
    expect(facts.upcomingExams[0].subject).toBe('Mathématiques');
    expect(facts.upcomingExams[0].title).toBe('امتحان الرياضيات');
    expect(facts.studentCount).toBe(100);
    expect(invoked).toHaveLength(3);
  } finally { server.stop(true); await rm(directory, { recursive: true, force: true }); }
}, 15000);
