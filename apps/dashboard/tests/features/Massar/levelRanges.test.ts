import { expect, it } from 'bun:test';
import { levelRanges } from '@/features/Massar/config/massarModel';

it('writes levels as ranges per cycle, primary first, a gap starting a new range', () => {
  expect(levelRanges(['3APIC', '1APG', '2APG', '3APG', '4APG', '5APG', '6APG', '1APIC', '2APIC'])).toBe('1APG–6APG · 1APIC–3APIC');
  expect(levelRanges(['4APG', '5APG', '6APG', '1APIC'])).toBe('4APG–6APG · 1APIC');
  expect(levelRanges(['1APG', '3APG', '4APG', '3APG'])).toBe('1APG · 3APG–4APG');
  expect(levelRanges(['TC'])).toBe('TC');
  expect(levelRanges([])).toBe('');
});
