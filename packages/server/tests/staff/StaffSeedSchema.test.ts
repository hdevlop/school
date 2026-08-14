import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

describe('seed container and physical staff-assignment schema', () => {
  it('keeps StudentService dependencies in constructor order', () => {
    const source = readFileSync(
      new URL('../../src/modules/seed.ts', import.meta.url),
      'utf8',
    );
    const registration = source.match(
      /registerSeedDeps\(seedContainer, StudentService, \[([\s\S]*?)\]\);/,
    )?.[1];

    expect(registration).toBeDefined();
    expect(
      [...registration!.matchAll(/^\s*([A-Za-z]+),$/gm)].map((match) => match[1]),
    ).toEqual([
      'StudentRepository',
      'StudentValidator',
      'UserService',
      'AuthService',
      'ParentService',
      'FeeService',
      'StudentRouteService',
      'StorageService',
    ]);
  });

  it('repairs only the two tables omitted by historical migrations', () => {
    const sql = readFileSync(
      new URL(
        '../../src/database/migrations/0045_staff_assignment_schema_repair.sql',
        import.meta.url,
      ),
      'utf8',
    );

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "security_assignments"');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "bus_assistant_assignments"');
    expect(sql).not.toMatch(/\b(?:ALTER|DROP|TRUNCATE)\b/i);
  });

  it('registers the repair immediately after the Auth v3 repair', () => {
    const journal = JSON.parse(
      readFileSync(
        new URL('../../src/database/migrations/meta/_journal.json', import.meta.url),
        'utf8',
      ),
    ) as { entries: Array<{ idx: number; tag: string }> };

    expect(journal.entries.slice(-2).map(({ idx, tag }) => ({ idx, tag }))).toEqual([
      { idx: 44, tag: '0044_auth_v3_schema_repair' },
      { idx: 45, tag: '0045_staff_assignment_schema_repair' },
    ]);
  });
});
