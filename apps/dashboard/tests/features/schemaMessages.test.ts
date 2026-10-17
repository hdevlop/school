import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// PB1020 (2026-10-17): nineteen feature schemas refused input in English under
// a French page. A schema takes `t` and names a catalog key for every message;
// an English literal reaches every user in English.

const FEATURES = join(import.meta.dir, '../../src/features');

function schemaFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return schemaFiles(path);
    return /Schemas\.ts$/.test(name) && path.includes(`${join('config', '')}`) ? [path] : [];
  });
}

const MESSAGE_METHODS = new Set(['min', 'max', 'positive', 'nonnegative', 'negative', 'nonpositive', 'int',
  'regex', 'refine', 'superRefine', 'length', 'email', 'url', 'gt', 'gte', 'lt', 'lte', 'nonempty',
  'startsWith', 'endsWith', 'includes', 'multipleOf', 'finite', 'datetime', 'never', 'date', 'time', 'uuid']);

/** Single-quoted text handed to a zod check or a `message:`/`error:` option. */
function literalMessages(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(/'((?:\\.|[^'\\\n])*)'/g)) {
    const before = text.slice(Math.max(0, match.index! - 200), match.index);
    let isMessage = /\b(message|error):\s*$/.test(before);
    if (!isMessage && /[(,]\s*$/.test(before)) {
      let depth = 0;
      let index = before.length - 1;
      for (; index >= 0; index--) {
        if (before[index] === ')') depth++;
        else if (before[index] === '(') { if (depth === 0) break; depth--; }
      }
      isMessage = MESSAGE_METHODS.has(before.slice(0, index).match(/\.(\w+)\s*$/)?.[1] ?? '');
    }
    if (isMessage && /[A-Za-z]{2}/.test(match[1]!)) found.push(match[1]!);
  }
  return found;
}

describe('feature form schemas', () => {
  it('name a translated message instead of an English literal', () => {
    const files = schemaFiles(FEATURES);
    expect(files.length).toBeGreaterThan(25);
    const literals = files.flatMap((path) => literalMessages(readFileSync(path, 'utf8'))
      .map((message) => `${relative(FEATURES, path).replaceAll('\\', '/')}: ${message}`));
    expect(literals).toEqual([]);
  });

  it('recognises a literal message', () => {
    expect(literalMessages("z.string().min(2, 'Name too short')")).toEqual(['Name too short']);
    expect(literalMessages("z.string().min(2, t('validationMessages.nameTooLong'))")).toEqual([]);
    expect(literalMessages("z.number({ error: 'Must be a valid number' })")).toEqual(['Must be a valid number']);
  });
});
