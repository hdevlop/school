/** Offline only: collect/review/export declared human records; no fetch or app access. */
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NATIVE_PREVIOUS_CORPORA, buildNativeReviewWorksheet, exportNativeHeldout, importNativeReviews, inspectNativeIntake } from './chatbot-jev-native.mjs';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Offline native intake: --cases=<json> [--check | --worksheet=<new-json> | --export=<new-json> | --import-review=<worksheet> --output=<new-intake>]. Default: empty collection template.');
  process.exit(0);
}
if (args.some(arg => !['--check'].includes(arg) && !['--cases=', '--worksheet=', '--export=', '--import-review=', '--output='].some(prefix => arg.startsWith(prefix)))
  || ['cases', 'worksheet', 'export', 'import-review', 'output'].some(name => args.filter(arg => arg.startsWith(`--${name}=`)).length > 1)
  || args.filter(arg => arg === '--check' || ['--worksheet=', '--export=', '--import-review='].some(prefix => arg.startsWith(prefix))).length > 1
  || args.some(arg => arg.startsWith('--import-review=')) !== args.some(arg => arg.startsWith('--output='))) {
  throw new Error('Use one mode; --import-review=<worksheet> requires --output=<new-intake>');
}
const value = (name, fallback) => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const inputPath = resolve(value('cases', 'datasets/chatbot-latency/jev-native-intake.example.json'));
const inputText = await Bun.file(inputPath).text();
const corpus = JSON.parse(inputText);
const previousCases = [];
const previousCorpusSha256 = {};
for (const path of NATIVE_PREVIOUS_CORPORA) {
  const text = await Bun.file(resolve(path)).text();
  previousCases.push(...JSON.parse(text).cases);
  previousCorpusSha256[path] = createHash('sha256').update(text).digest('hex');
}
const collection = inspectNativeIntake(corpus, previousCases);
const exportPath = value('export');
const worksheetPath = value('worksheet');
const importPath = value('import-review');
if (importPath !== undefined) {
  if (!importPath.trim() || !value('output').trim()) throw new Error('Provide nonempty worksheet and output paths');
  const worksheetText = await Bun.file(resolve(importPath)).text();
  const imported = importNativeReviews(corpus, JSON.parse(worksheetText), previousCases);
  const path = resolve(value('output'));
  imported.reviewImport = { importedAtUtc: new Date().toISOString(),
    originalIntakeSha256: createHash('sha256').update(inputText).digest('hex'),
    worksheetSha256: createHash('sha256').update(worksheetText).digest('hex') };
  await writeFile(path, `${JSON.stringify(imported, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ offline: true, output: path, collection: inspectNativeIntake(imported, previousCases) }, null, 2));
} else if (exportPath !== undefined || worksheetPath !== undefined) {
  if (!(exportPath ?? worksheetPath)?.trim()) throw new Error('Provide a nonempty output path');
  const output = exportPath !== undefined ? exportNativeHeldout(corpus, previousCases, {
    intakeSha256: createHash('sha256').update(inputText).digest('hex'), previousCorpusSha256,
  }) : buildNativeReviewWorksheet(corpus);
  // Exclusive creation preserves input, earlier exports and review history.
  const path = resolve(exportPath ?? worksheetPath);
  await writeFile(path, `${JSON.stringify(output, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ offline: true, output: path, exportedCases: output.cases.length,
    purpose: output.purpose, collection }, null, 2));
} else {
  console.log(JSON.stringify({ offline: true, input: inputPath, collection }, null, 2));
  if (!collection.readyForExport) process.exitCode = 1;
}
