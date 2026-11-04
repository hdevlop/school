import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'bun:test';

const ROOT = resolve(import.meta.dir, '../../../..');
const IMAGES = resolve(ROOT, 'apps/dashboard/public/images');
const THEME = resolve(ROOT, 'packages/server/src/theme');
const KB = 1024;

const oversized = (directory: string, matches: RegExp, limit: number) => readdirSync(directory)
  .filter((name) => matches.test(name))
  .map((name) => ({ name, kb: Math.round(statSync(resolve(directory, name)).size / KB) }))
  .filter(({ kb }) => kb * KB > limit);

/**
 * These load on a phone's first screens or fill long lists. A generated 1254 px
 * PNG of about a megabyte once sat behind a 56 px avatar, and the sign-in page
 * took half a minute on a slow connection because of three such files.
 */
describe('bundled image budgets', () => {
  test('a default portrait or fee icon stays small', () => {
    expect(oversized(IMAGES, /^(admin|[A-Za-z]+_(male|female)(_v2)?)\.png$/, 25 * KB)).toEqual([]);
    expect(oversized(resolve(IMAGES, 'fee-types'), /\.png$/, 25 * KB)).toEqual([]);
  });

  test('the sign-in artwork stays small', () => {
    expect(oversized(IMAGES, /^auth-background/, 40 * KB)).toEqual([]);
    expect(oversized(THEME, /^auth-hero\./, 200 * KB)).toEqual([]);
  });

  test('a factory logo stays small', () => {
    expect(oversized(THEME, /^(auth-logo|sidebar-logo-(expanded|collapsed))\./, 80 * KB)).toEqual([]);
  });
});
