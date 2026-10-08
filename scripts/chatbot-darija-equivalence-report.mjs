/** Post-run equivalent count-tool audit. Original frozen scores remain unchanged. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { scoreSelection } from './chatbot-darija-selection-report.mjs';
import { classifyToolOffer } from './chatbot-darija-tool-offers-report.mjs';
export function countEquivalentExpectation(item) {
  const groups = item.expectation.requiredToolGroups;
  const eligible = item.expectation.actor === 'history-admin' && item.expectation.kind === 'read'
    && groups.length > 0 && groups.every(group => group.length > 0
      && group.every(name => ['students_get_student_count', 'teachers_get_teacher_count'].includes(name)));
  return eligible ? { ...item, expectation: { ...item.expectation,
    requiredToolGroups: groups.map(group => [...group, 'academic-dashboard_get_kpis']) } } : item;
}
if (import.meta.main) {
  const [runPaths, usagePath, registryPath, fixturePath, outPath] = process.argv.slice(2);
  if (!outPath || existsSync(outPath)) throw Error('Supply runs, captured calls, registry, fixture and a new output');
  const corpusPath = 'datasets/chatbot-latency/darija-tool-selection-20261008.json';
  const servicePath = 'packages/server/src/modules/dashboard/academic/AcademicDashboardService.ts';
  const controllerPath = 'packages/server/src/modules/dashboard/academic/AcademicDashboardController.ts';
  const source = [...runPaths.split(','), usagePath, registryPath, fixturePath, corpusPath, servicePath, controllerPath];
  const all = runPaths.split(',').flatMap(path => JSON.parse(readFileSync(path)).rows.map(row => ({ ...row,
    runGroup: path.includes('jev-first-fix') ? 'jev-first-fix' : path.includes('router-fix') ? '20b-fix' : path.includes('router20-repeat') ? '20b-repeat' : path.includes('router120-check') ? '120b-check' : 'original-three-path' })));
  if (new Set(all.map(row => row.caseId + '/' + row.experimentArm + '/' + row.startedAt)).size !== all.length) throw Error('Duplicate inputs');
  const corpus = JSON.parse(readFileSync(corpusPath));
  const registry = JSON.parse(readFileSync(registryPath, 'utf8').replace(/^\uFEFF/u, '')).result.tools;
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8').replace(/^\uFEFF/u, ''));
  const values = Object.fromEntries(Object.entries(fixture).map(([key, content]) => [key, JSON.parse(content.find(item => item.type === 'text').text)]));
  const ids = new Set([...values.classes_get_classes, ...values.sections_get_sections].map(value => value.id));
  const calls = readFileSync(usagePath, 'utf8').trim().split(/\r?\n/u).filter(Boolean).map(line => JSON.parse(line));
  const rows = all.map(row => {
    const item = corpus.cases.find(value => value.id === row.caseId), equivalent = countEquivalentExpectation(item);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca' }).format(new Date(row.startedAt));
    const frozen = scoreSelection(row, item, registry, ids, today), scored = scoreSelection(row, equivalent, registry, ids, today);
    const matched = calls.filter(call => Date.parse(call.startedAt) >= Date.parse(row.startedAt)
      && Date.parse(call.startedAt) <= Date.parse(row.completedAt)).sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
    return { caseId: row.caseId, query: item.query, language: item.language, arm: row.experimentArm, startedAt: row.startedAt,
      group: row.runGroup + '/' + row.experimentArm,
      frozenPassed: frozen.toolPlanChecksPassed, equivalentPassed: scored.toolPlanChecksPassed, issues: scored.issues,
      equivalenceChangedOutcome: !frozen.toolPlanChecksPassed && scored.toolPlanChecksPassed,
      ...(matched.length || row.experimentArm === '120b-baseline' ? classifyToolOffer({ ...scored, expectation: equivalent.expectation }, matched[0]?.requestToolNames ?? null) : {}) };
  });
  const arms = [...new Set(rows.map(row => row.group))].map(group => {
    const list = rows.filter(row => row.group === group);
    return { group, arm: list[0].arm, attempts: list.length, frozenPassed: list.filter(row => row.frozenPassed).length,
      equivalentPassed: list.filter(row => row.equivalentPassed).length,
      outcomesChanged: list.filter(row => row.equivalenceChangedOutcome).map(row => row.caseId),
      scripts: Object.fromEntries(['ary', 'ary-latn'].map(language => [language, { attempts: list.filter(row => row.language === language).length,
        passed: list.filter(row => row.language === language && row.equivalentPassed).length }])) };
  });
  const current = rows.filter(row => row.arm === '120b-baseline');
  const categories = Object.fromEntries([...new Set(current.map(row => row.category))].map(category => [category, current.filter(row => row.category === category).length]));
  const report = { status: 'offline-equivalent-tool-audit', newPaidRequests: 0, productionAcceptance: false,
    source: source.map(path => ({ path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') })),
    scoringPolicy: 'Post-run secondary audit, applied to all supplied runs: academic dashboard KPIs are an equivalent staff-only source for unfiltered school-wide counts. Frozen scores are retained; errors, arguments and other expectations are unchanged.',
    arms, current120bCategories: categories, rows,
    limitations: ['This equivalence was identified after dispatch; it is not a new frozen acceptance gate.',
      'Dashboard reads also fetch grades/attendance and may be less efficient than dedicated counts.',
      'Final wording/answer correctness and ownership for non-staff actors remain unqualified.'] };
  writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ output: outPath, arms, current120bCategories: categories }));
}
