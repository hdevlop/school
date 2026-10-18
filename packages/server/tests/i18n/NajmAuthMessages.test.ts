import { describe, expect, it } from 'bun:test';
import { AUTH_LOCALES } from 'najm-auth';
import { translations } from '@sms/contracts/locales';

// najm-auth's refusals and confirmations read School's catalog in the request
// language and fall back to najm-auth's own English, its only language. A key
// School lacks therefore reaches a French or Arabic user in English: PB1023
// (2026-10-18) found a pending account's sign-in refused with "Account is
// inactive. Please contact support." on the French login page.

const LANGUAGES = ['en', 'fr', 'ar', 'es'] as const;

function flatten(node: unknown, prefix = ''): [string, string][] {
  if (typeof node === 'string') return [[prefix, node]];
  if (!node || typeof node !== 'object') return [];
  return Object.entries(node).flatMap(([key, value]) => flatten(value, prefix ? `${prefix}.${key}` : key));
}

function lookup(language: string, key: string): unknown {
  return key.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    (translations as Record<string, unknown>)[language],
  );
}

const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]!);

describe('najm-auth messages', () => {
  // A translation may leave a placeholder out (the French invite subject says
  // "votre compte", not the account label) but never use one najm-auth does
  // not fill, which would reach the user as a raw `{{name}}`.
  it('has every najm-auth message key in every language, using only najm-auth\'s placeholders', () => {
    const keys = flatten(AUTH_LOCALES.en);
    expect(keys.length).toBeGreaterThan(80);

    const problems: string[] = [];
    for (const [key, english] of keys) {
      for (const language of LANGUAGES) {
        const text = lookup(language, key);
        if (typeof text !== 'string') problems.push(`${key}: missing in ${language}`);
        else {
          const unknown = placeholders(text).filter((name) => !placeholders(english).includes(name));
          if (unknown.length) problems.push(`${key}: ${language} uses ${unknown.join(', ')}, which najm-auth does not fill`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
