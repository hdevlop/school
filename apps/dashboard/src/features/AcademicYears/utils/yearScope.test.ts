import { afterEach, describe, expect, it } from 'bun:test';
import { captureRequestHeaders, setDefaultRequestHeaders } from '@/lib/requestHeaders';
import { withAcademicYear, yearOfKey, yearScopedKey } from './yearScope';

let unbind = () => {};
afterEach(() => unbind());

describe('year-scoped cache keys', () => {
  it('names the resource first, then the account and the year', () => {
    const key = yearScopedKey('students', { accountScope: 'user-1', academicYear: '2025-2026' }, { onDate: '2025-10-01' });
    expect(key).toEqual(['students', 'user-1', 'academicYear', '2025-2026', { onDate: '2025-10-01' }]);
    expect(yearOfKey(key)).toBe('2025-2026');
  });

  it('keeps years and accounts apart', () => {
    const a = yearScopedKey('fees', { accountScope: 'user-1', academicYear: '2025-2026' });
    expect(a).not.toEqual(yearScopedKey('fees', { accountScope: 'user-1', academicYear: '2026-2027' }));
    expect(a).not.toEqual(yearScopedKey('fees', { accountScope: 'user-2', academicYear: '2025-2026' }));
  });

  it('reads no year from a key that is not year-scoped', () => {
    expect(yearOfKey(['students'])).toBeUndefined();
    expect(yearOfKey(['students', 'detail', 'id'])).toBeUndefined();
  });
});

describe('the year a request sends', () => {
  it("sends the key's year even when the tab has moved on (old cached refetch)", () => {
    unbind = setDefaultRequestHeaders(() => ({ 'X-Academic-Year': '2026-2027' }));
    const key = yearScopedKey('students', { accountScope: 'u', academicYear: '2025-2026' });
    const sent = withAcademicYear(yearOfKey(key), () => captureRequestHeaders());
    expect(sent['X-Academic-Year']).toBe('2025-2026');
  });

  it('keeps each of two overlapping requests on its own year when A finishes after B', async () => {
    unbind = setDefaultRequestHeaders(() => ({ 'X-Academic-Year': 'B' }));
    const request = (delay: number) => {
      const headers = captureRequestHeaders();
      return new Promise<Record<string, string>>((resolve) => setTimeout(() => resolve({ ...headers }), delay));
    };
    const a = withAcademicYear('2025-2026', () => request(20));
    const b = withAcademicYear('2026-2027', () => request(1));
    expect((await b)['X-Academic-Year']).toBe('2026-2027');
    expect((await a)['X-Academic-Year']).toBe('2025-2026');
  });

  it("falls back to the tab's selection without a label", () => {
    unbind = setDefaultRequestHeaders(() => ({ 'X-Academic-Year': '2026-2027' }));
    expect(withAcademicYear(undefined, () => captureRequestHeaders())['X-Academic-Year']).toBe('2026-2027');
  });
});
