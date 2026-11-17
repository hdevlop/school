import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FEATURES, seedSemantics } from '../../src/modules/chat/routing/seedSemantics';

// The per-feature routing phrases written as docs/chat-routing describes, and
// the tests written for them by a separate session.
const routing = join(import.meta.dir, '..', '..', 'src', 'modules', 'chat', 'routing');
const featureDir = join(routing, 'semantics');
const testDir = join(import.meta.dir, 'fixtures', 'routing');
const LANGS = new Set(['darija', 'darija-latn', 'darija-fr', 'fr', 'ar', 'en', 'es']);
// A tool scores by its single best phrase. Measured 2026-11-16 on 200 grades
// questions: 10 phrases per tool tripled grades routing (12% -> 33% right
// tool first) and left 120 other questions almost unchanged (45 -> 44 of 82);
// 20 or 60 per tool pulled other features' questions (39 of 82).
const MAX_PER_TOOL = 12;

type Phrase = { lang?: string; phrase: string };
type Feature = { items: { toolName: string; phrases: Phrase[] }[] };
const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8'));
const files = readdirSync(featureDir).filter((name) => name.endsWith('.json'));
const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

describe('routing semantics', () => {
  it('seeds every feature file', () => {
    expect(Object.keys(FEATURES).sort()).toEqual(files.map((name) => name.replace(/\.json$/, '')).sort());
    const shipped = read<Feature>(join(routing, 'semantics.json'));
    const total = (seed: Feature) => seed.items.reduce((n, item) => n + item.phrases.length, 0);
    const features = files.reduce((n, name) => n + total(read<Feature>(join(featureDir, name))), 0);
    expect(total(seedSemantics)).toBe(total(shipped) + features);
  });

  it('gives each tool to one feature file, with at most 12 phrases in known languages', () => {
    const owner = new Map<string, string>();
    for (const name of files) {
      for (const item of read<Feature>(join(featureDir, name)).items) {
        expect(owner.get(item.toolName) ?? name).toBe(name);
        owner.set(item.toolName, name);
        expect(item.phrases.length).toBeGreaterThan(0);
        expect(item.phrases.length).toBeLessThanOrEqual(MAX_PER_TOOL);
        for (const phrase of item.phrases) {
          expect(LANGS.has(phrase.lang ?? '')).toBe(true);
          expect(phrase.phrase.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('never copies a test question into a phrase', () => {
    const questions = new Set(readdirSync(testDir).filter((name) => name.endsWith('.json'))
      .flatMap((name) => read<{ cases: { q: string }[] }>(join(testDir, name)).cases.map((c) => normalize(c.q))));
    const copied = seedSemantics.items.flatMap((item) => item.phrases)
      .map((phrase) => phrase.phrase).filter((phrase) => questions.has(normalize(phrase)));
    expect(copied).toEqual([]);
  });
});
