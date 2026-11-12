import { expect, it } from 'bun:test';
import { MASSAR_DEFAULT_STATEMENT } from '@sms/contracts';
import { massarStatementDto, normalizeStatement } from '../../src/modules/massar/MassarDto';

const valid = { ...MASSAR_DEFAULT_STATEMENT, order: ['الرياضيات', 'اللغة العربية'], coefficients: { 'الرياضيات': 2 }, generalAverage: true };

it('accepts the statement settings and refuses an out-of-range coefficient or a missing switch', () => {
  expect(massarStatementDto.safeParse(valid).success).toBe(true);
  expect(massarStatementDto.safeParse({ ...valid, coefficients: { 'الرياضيات': 11 } }).success).toBe(false);
  expect(massarStatementDto.safeParse({ ...valid, coefficients: { 'الرياضيات': -1 } }).success).toBe(false);
  expect(massarStatementDto.safeParse({ ...valid, order: [' '] }).success).toBe(false);
  const { rank: _rank, ...missing } = valid;
  expect(massarStatementDto.safeParse(missing).success).toBe(false);
});

it('stores each subject once and only the coefficients that differ from 1', () => {
  expect(normalizeStatement({ ...valid, order: ['أ', 'ب', 'أ'], coefficients: { 'أ': 1, 'ب': 0, 'ج': 1.333 } }))
    .toEqual({ ...valid, order: ['أ', 'ب'], coefficients: { 'ب': 0, 'ج': 1.33 } });
});
