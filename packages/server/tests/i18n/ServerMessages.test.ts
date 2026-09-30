import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { translations } from '@sms/contracts/locales';

// The server answers in the request's language only when a refusal names a
// catalog key. A literal message reaches every user in English, and a key
// the catalog lacks reaches them raw; `i18n:check` scans the dashboard only.

const SRC = join(import.meta.dir, '../../src');
const LANGUAGES = ['en', 'fr', 'ar', 'es'] as const;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

function lookup(language: string, key: string): unknown {
  return key.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    (translations as Record<string, unknown>)[language],
  );
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]!).sort();
}

const files = sources(SRC).map((path) => ({ path: relative(SRC, path).replaceAll('\\', '/'), text: readFileSync(path, 'utf8') }));

/** Every catalog key a server file hands to a translator, with where it is. */
function referencedKeys() {
  const keys = new Map<string, string>();
  for (const { path, text } of files) {
    for (const [, prefix, property] of text.matchAll(/@I18n\('([^']+)'\)\s*(?:private|protected|public)?\s*(?:readonly\s+)?(\w+)!/g)) {
      for (const [, key] of text.matchAll(new RegExp(`this\\.${property}\\(\\s*'([^']+)'`, 'g'))) {
        keys.set(`${prefix}.${key}`, path);
      }
    }
    // najm's global `t`, which reads the request language.
    if (/import \{[^}]*\bt\b[^}]*\} from '(?:\.\.\/)+najm'/.test(text) || /import \{[^}]*\bt\b[^}]*\} from 'najm-i18n'/.test(text)) {
      for (const [, key] of text.matchAll(/(?<![\w.])t\(\s*'([^']+\.[^']+)'/g)) keys.set(key!, path);
    }
  }
  return keys;
}

describe('server error messages', () => {
  it('names a catalog key instead of an English literal', () => {
    const literals = files.flatMap(({ path, text }) =>
      [...text.matchAll(/Err(?:\.\w+)?\(\s*(?:\d{3}\s*,\s*)?(['`])((?:\\.|(?!\1).)*)\1/g)]
        .map((match) => `${path}: ${match[2]}`));
    expect(literals).toEqual([]);
  });

  it('has every key it names in every language, with the same placeholders', () => {
    const keys = referencedKeys();
    expect(keys.size).toBeGreaterThan(300);

    const problems: string[] = [];
    for (const [key, path] of keys) {
      const english = lookup('en', key);
      if (typeof english !== 'string') {
        problems.push(`${key} (${path}): missing in en`);
        continue;
      }
      for (const language of LANGUAGES.slice(1)) {
        const text = lookup(language, key);
        if (typeof text !== 'string') problems.push(`${key} (${path}): missing in ${language}`);
        else if (placeholders(text).join() !== placeholders(english).join()) {
          problems.push(`${key} (${path}): ${language} placeholders differ from en`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
