import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'bun:test';

const SOURCE = resolve(import.meta.dir, '../../src');

const sourceFiles = (directory: string): string[] => readdirSync(directory).flatMap((name) => {
  const file = resolve(directory, name);
  if (statSync(file).isDirectory()) return sourceFiles(file);
  return /\.ts$/.test(name) ? [file] : [];
});

describe('@Headers parameter names', () => {
  /**
   * The pinned najm-core looks a named header up in a map with lowercased keys, so a
   * mixed-case name silently reads undefined and the route carries on without it.
   */
  test('each named header is lowercase, or is lowercased where it is read', () => {
    const offenders = sourceFiles(SOURCE).flatMap((file) => {
      const named = [...readFileSync(file, 'utf8').matchAll(/@Headers\(([^)]+)\)/g)].map((match) => match[1].trim());
      return named
        .filter((name) => !/^'[^A-Z']+'$/.test(name) && !name.endsWith('.toLowerCase('))
        .map((name) => `${file}: ${name}`);
    });
    expect(offenders).toEqual([]);
  });
});
