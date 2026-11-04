import { describe, expect, it } from 'bun:test';
import { fileURLToPath } from 'node:url';

describe('the student profile', () => {
  it('shows and requests grades only with read:grades', () => {
    const result = Bun.spawnSync([process.execPath, fileURLToPath(new URL('./studentProfileGrades.fixture.tsx', import.meta.url))], { cwd: process.cwd(), stdout: 'pipe', stderr: 'pipe' });
    expect(result.stderr.toString()).toBe('');
    expect(result.stdout.toString()).toContain('student profile grades verified');
    expect(result.exitCode).toBe(0);
  }, 60_000);
});
