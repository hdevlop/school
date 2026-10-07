import { describe, expect, it } from 'bun:test';
import { validateRoleFixtures } from '../chatbot-role-fixtures.mjs';
import { mkdtemp, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const pupil = id => ({ id, name: `Demo pupil ${id}`, parentPhones: ['+212-fixture-phone'] });
const fixture = () => ({ version: 1, source: 'internal-school-mcp-rest', capturedAt: '2026-10-05T12:00:00Z', people: {
  year: '2026-2027',
  parent: { email: 'parent@example.invalid', children: [pupil('one'), pupil('two')], other: pupil('three') },
  teacher: { email: 'teacher@example.invalid', assignments: 1, studentCount: 2,
    ownStudentIds: ['one', 'two'], other: pupil('three') },
  student: { email: 'student@example.invalid', self: pupil('one'), other: pupil('three') },
  followUp: pupil('two'),
} });

describe('private API role fixtures', () => {
  it('accepts scoped members with provable outsiders and leaves input unchanged', () => {
    const value = fixture();
    const before = structuredClone(value);
    expect(validateRoleFixtures(value)).toBe(value.people);
    expect(value).toEqual(before);
  });
  it('rejects supposed outsiders that belong to the parent, teacher or student', () => {
    for (const edit of [
      value => { value.people.parent.other.id = 'one'; },
      value => { value.people.teacher.other.id = 'two'; },
      value => { value.people.student.other.id = 'one'; },
    ]) {
      const value = fixture(); edit(value);
      expect(() => validateRoleFixtures(value)).toThrow('Invalid internal-API role fixtures');
    }
  });
  it('rejects missing provenance, duplicate children, inconsistent counts and meaningless phone cases', () => {
    for (const edit of [
      value => { value.source = 'database-query'; },
      value => { value.capturedAt = 'invalid'; },
      value => { value.people.parent.children[1].id = 'one'; },
      value => { value.people.teacher.studentCount = 3; },
      value => { value.people.student.other.parentPhones = []; },
      value => { value.people.year = '2026'; },
    ]) {
      const value = fixture(); edit(value);
      expect(() => validateRoleFixtures(value)).toThrow();
    }
  });
  it('preflights private fixtures offline and blocks live work without a request allowance', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'school-role-fixtures-'));
    const path = join(directory, 'private.json');
    await Bun.write(path, JSON.stringify(fixture()));
    try {
      for (const preflight of [true, false]) {
        const child = Bun.spawn([Bun.which('bun'), resolve('scripts/chatbot-roles.mjs'),
          '--base-url=http://127.0.0.1:1', `--fixtures-file=${path}`, ...(preflight ? ['--preflight'] : [])], {
          env: { ...process.env, ADMIN_EMAIL: '', ADMIN_PASSWORD: '' }, stdout: 'pipe', stderr: 'pipe',
        });
        const [code, stdout, stderr] = await Promise.all([child.exited,
          new Response(child.stdout).text(), new Response(child.stderr).text()]);
        expect(code).toBe(preflight ? 0 : 1);
        if (preflight) expect(JSON.parse(stdout)).toMatchObject({ valid: true, plannedChatRequests: 12 });
        else expect(stderr).toContain('Declare --max-requests');
        expect(stdout).not.toContain('example.invalid');
        expect(stdout).not.toContain('+212-fixture-phone');
      }
    } finally {
      await unlink(path);
      await rmdir(directory);
    }
  });
});
