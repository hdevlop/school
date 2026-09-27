import { describe, expect, it } from 'bun:test';
import { AcademicYearValidator } from '../../src/modules/academicYears/AcademicYearValidator';
import { resolveRequestYear } from '../../src/modules/academicYears/requestYear';
import { USER } from '../../src/najm';
import { yearRegistry } from './fixtures/yearRegistry';

const oldYear = {
  id: 'year-old', label: '2025-2026', status: 'closed',
  reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31',
};
const activeYear = { ...oldYear, id: 'year-active', label: '2026-2027', status: 'open' };

function registry(pointer: string | null = activeYear.id) {
  return new AcademicYearValidator(yearRegistry([oldYear, activeYear], { activeAcademicYearId: pointer, currentAcademicYear: activeYear.label }) as any);
}

function request(role: string | undefined, header?: string) {
  const validator = registry();
  return resolveRequestYear({
    header: (name) => name === 'X-Academic-Year' ? header : undefined,
    query: () => undefined,
    container: {
      get: (token) => token === USER ? (role ? { id: 'user-1', role } : null) : undefined,
      resolve: async () => validator as any,
    },
  });
}

describe('other school years: administrators and accounting only', () => {
  // One rule, applied to every request before its handler runs: other roles
  // work in the active year and are refused another year before any read.
  for (const role of ['teacher', 'parent', 'student', 'counselor', undefined]) {
    it(`keeps ${role ?? 'a request without a user'} to the active year`, async () => {
      await expect(request(role, oldYear.label)).rejects.toThrow('administrators and accounting only');
      expect((await request(role, activeYear.label)).id).toBe(activeYear.id);
      expect((await request(role)).id).toBe(activeYear.id);
    });
  }

  it('gives administrators and accounting the past year, and the active year by default', async () => {
    for (const role of ['admin', 'principal', 'accounting']) {
      expect((await request(role, oldYear.label)).id).toBe(oldYear.id);
      expect((await request(role)).id).toBe(activeYear.id);
    }
  });

  it('uses the registry pointer, with a label fallback only when it is absent', async () => {
    await expect(registry(oldYear.id).resolve(activeYear.label, 'parent')).rejects.toThrow('administrators and accounting only');
    expect((await registry(oldYear.id).resolve(oldYear.label, 'parent')).id).toBe(oldYear.id);
    expect((await registry(null).resolve(activeYear.label, 'student')).id).toBe(activeYear.id);
    await expect(registry(null).resolve(oldYear.label, 'student')).rejects.toThrow('administrators and accounting only');
  });
});
