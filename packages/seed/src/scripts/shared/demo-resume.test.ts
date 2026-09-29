import { describe, expect, it } from 'bun:test';
import { getDemoResumeFrom } from './demo-resume';

describe('demo seed recovery options', () => {
  it('starts normally without a recovery option', () => {
    expect(getDemoResumeFrom(['--year=2025-2026'])).toBeUndefined();
  });

  it('accepts the supported recovery boundary in either CLI form', () => {
    expect(getDemoResumeFrom(['--resume-from=announcements'])).toBe('announcements');
    expect(getDemoResumeFrom(['--resume-from', 'announcements'])).toBe('announcements');
  });

  it('rejects missing and unsupported recovery boundaries', () => {
    for (const args of [['--resume-from'], ['--resume-from='], ['--resume-from=payroll']]) {
      expect(() => getDemoResumeFrom(args)).toThrow('Supported demo recovery');
    }
  });
});
