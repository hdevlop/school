import { afterEach, describe, expect, it } from 'bun:test';
import { z } from 'zod';
import { zodLocaleFor } from '@/providers/zodLanguage';

// PB1022 (2026-10-18): zod's own messages were English in the dashboard, and
// "Invalid input" in the production bundle, which drops zod's `config(en())`.
const messageOf = (schema: z.ZodTypeAny, value: unknown) => {
  const result = schema.safeParse(value);
  if (result.success) throw new Error('expected a refusal');
  return result.error.issues[0]!.message;
};
const method = z.enum(['cash', 'check']);

describe('zod messages in the interface language', () => {
  afterEach(() => { z.config(zodLocaleFor('en')); });

  it('follows the interface language, regional variants included', () => {
    z.config(zodLocaleFor('fr-MA'));
    expect(messageOf(method, 'card')).toBe('Option invalide : une valeur parmi "cash"|"check" attendue');
    z.config(zodLocaleFor('es'));
    expect(messageOf(method, 'card')).toMatch(/^Opción inválida/);
    z.config(zodLocaleFor('ar'));
    expect(messageOf(method, 'card')).toMatch(/[؀-ۿ]/);
  });

  it('falls back to English for an unsupported or missing language', () => {
    z.config(zodLocaleFor('de'));
    expect(messageOf(method, 'card')).toBe('Invalid option: expected one of "cash"|"check"');
    z.config(zodLocaleFor(undefined));
    expect(messageOf(method, 'card')).toMatch(/^Invalid option/);
  });

  it('replaces the generic message a bundle without zod\'s English leaves', () => {
    z.config({ localeError: undefined });
    expect(messageOf(method, 'card')).toBe('Invalid input');
    z.config(zodLocaleFor('fr'));
    expect(messageOf(method, 'card')).toMatch(/^Option invalide/);
  });
});
