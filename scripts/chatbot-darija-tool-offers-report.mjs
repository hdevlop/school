/** Offline diagnosis of offered tools versus frozen requirements. No provider calls. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

export function classifyToolOffer(scored, offered) {
  const groups = scored.expectation.requiredToolGroups;
  const missing = Array.isArray(offered) ? groups.filter(group => !group.some(name => offered.includes(name))) : null;
  const category = scored.toolPlanChecksPassed ? 'passed_tool_checks'
    : !groups.length ? 'unexpected_call_or_execution_failure'
      : missing === null ? 'offer_unobserved'
        : missing.length ? 'required_tools_missing_from_offer' : 'required_tools_offered_but_plan_failed';
  return { category, missingRequiredGroups: missing, offeredToolNames: offered ?? null };
}

if (import.meta.main) {
  const [scorePath, runPaths, usagePaths, outPath] = process.argv.slice(2);
  if (!outPath || existsSync(outPath)) throw Error('Supply scored results, raw runs, captured calls and a new output');
  const source = [scorePath, ...runPaths.split(','), ...usagePaths.split(',')].map(path => ({ path, bytes: readFileSync(path) }));
  const scored = JSON.parse(source[0].bytes);
  const raw = runPaths.split(',').flatMap(path => JSON.parse(readFileSync(path)).rows);
  const calls = usagePaths.split(',').flatMap(path => readFileSync(path, 'utf8').trim().split(/\r?\n/u).filter(Boolean).map(line => JSON.parse(line)));
  const rows = scored.rows.map(row => {
    const chat = raw.find(value => value.caseId === row.caseId && value.experimentArm === row.arm);
    if (!chat) throw Error('Missing raw chat');
    const matched = calls.filter(call => Date.parse(call.startedAt) >= Date.parse(chat.startedAt)
      && Date.parse(call.startedAt) <= Date.parse(chat.completedAt)).sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
    const offered = matched[0]?.requestToolNames ?? null;
    return { caseId: row.caseId, arm: row.arm, query: row.query, language: row.language,
      toolPlanChecksPassed: row.toolPlanChecksPassed, executionIssues: row.issues,
      ...classifyToolOffer(row, offered), modelCalls: matched.length,
      perCallToolNames: matched.map(call => ({ generationId: call.generationId, model: call.model,
        provider: call.provider, names: call.requestToolNames ?? null })) };
  });
  const categories = [...new Set(rows.map(row => row.category))];
  const report = { status: scored.status, newPaidRequests: 0, qualification: false,
    source: source.map(({ path, bytes }) => ({ path, sha256: createHash('sha256').update(bytes).digest('hex') })),
    analyzerSha256: createHash('sha256').update(readFileSync('scripts/chatbot-darija-tool-offers-report.mjs')).digest('hex'),
    categories: Object.fromEntries(categories.map(category => [category, rows.filter(row => row.category === category).length])),
    rows, limitations: ['Initial provider request names are the actual model-visible tool set, not a score of embedding retrieval alone.',
      'Tool availability can reflect routing, dependencies and actor policy. Missing tools and model mistakes can coexist.',
      'Passing tool checks does not establish final answer correctness. Null offers mean unobserved, not an empty shortlist.'] };
  writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ output: outPath, status: report.status, categories: report.categories }));
}
