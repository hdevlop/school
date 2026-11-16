// Turns one feature's phrase and test files into the two files the RAG studio
// imports, so they can be tried by hand before they are wired into the seed.
//
//   node scripts/chat-routing-to-studio.mjs <feature> [outDir]
//
// Reads  packages/server/src/modules/chat/routing/semantics/<feature>.json
//        packages/server/tests/chat/fixtures/routing/<feature>.json
// Writes <outDir>/<feature>.semantics.studio.json   (Semantics → Import JSON)
//        <outDir>/<feature>.tests.studio.json       (Routing tests → Import)
//
// A studio test passes only when every expected tool is offered, so each case
// expects its first (best) tool. Refusals have no tool and are left out: they
// are checked in the chat itself, not in routing.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// out/ is ignored by git: these files are a by-product, not a source.
const [feature, outDir = 'out/chat-routing'] = process.argv.slice(2);
if (!feature) {
  console.error('usage: node scripts/chat-routing-to-studio.mjs <feature> [outDir]');
  process.exit(1);
}

const root = resolve(import.meta.dirname, '..');
const semanticsPath = join(root, 'packages/server/src/modules/chat/routing/semantics', `${feature}.json`);
const testsPath = join(root, 'packages/server/tests/chat/fixtures/routing', `${feature}.json`);
const out = resolve(root, outDir);
mkdirSync(out, { recursive: true });

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

if (existsSync(semanticsPath)) {
  const { items } = readJson(semanticsPath);
  const studio = {
    items: items.map(({ toolName, phrases }) => ({
      toolName,
      phrases: phrases.map(({ phrase, lang }) => ({ phrase, lang })),
    })),
  };
  const target = join(out, `${feature}.semantics.studio.json`);
  writeFileSync(target, `${JSON.stringify(studio, null, 2)}\n`);
  const count = studio.items.reduce((sum, item) => sum + item.phrases.length, 0);
  console.log(`${count} phrases for ${studio.items.length} tools -> ${target}`);
} else {
  console.log(`no phrase file yet: ${semanticsPath}`);
}

if (existsSync(testsPath)) {
  const { cases } = readJson(testsPath);
  const routed = cases.filter((c) => Array.isArray(c.tools) && c.tools.length > 0);
  const studio = {
    mode: 'append',
    tests: routed.map((c) => ({
      name: `${c.id}${c.lookalike ? ' (look-alike)' : ''} ${c.as}: ${c.want}`.slice(0, 200),
      query: c.q,
      lang: c.lang,
      expectedTools: [c.tools[0]],
    })),
  };
  const target = join(out, `${feature}.tests.studio.json`);
  writeFileSync(target, `${JSON.stringify(studio, null, 2)}\n`);
  console.log(`${studio.tests.length} routing tests (${cases.length - routed.length} refusals left out) -> ${target}`);
} else {
  console.log(`no test file yet: ${testsPath}`);
}
