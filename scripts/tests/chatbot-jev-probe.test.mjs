import { describe, expect, it } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { INTENT_NAMES, JEV_MODEL } from '../chatbot-jev.mjs';
import { OPERATOR_REVIEW_WORKFLOW, operatorReviewCasesSha256 } from '../chatbot-jev-accuracy.mjs';

const response = (cost = 0.001) => ({
  model: JEV_MODEL, usage: { input_tokens: 100, cost },
  answers: {
    intent: { type: 'choice', choice: 'small_talk', confidence: 1,
      probabilities: Object.fromEntries(INTENT_NAMES.map(name => [name, name === 'small_talk' ? 1 : 0])) },
    is_write: { type: 'noul', noul: 0 },
  },
});

// Run the real CLI with every fetch replaced before import. No provider/app call
// is possible; an unexpected URL throws instead of delegating to native fetch.
async function runProbe({ outcomes = [{ body: response() }], controls = {}, validate = false, keyFailure = false,
  queries = ['Bonjour 0', 'Bonjour 1', 'Bonjour 2'], standalone = false, existingOutput = false,
  priorRuns = [], extraArguments = [], corpusExtras = {}, caseExtras = {}, keyMetadata = { limit_remaining: 1 } } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'school-jev-budget-'));
  const base = join(directory, 'base.json');
  const corpus = join(directory, 'cases.json');
  const output = join(directory, 'report.json');
  const auditPath = join(directory, 'audit.json');
  const preload = join(directory, 'mock-fetch.mjs');
  await Bun.write(base, JSON.stringify({ cases: [] }));
  await Bun.write(corpus, JSON.stringify({ ...(standalone ? {} : { baseCorpus: base }), ...corpusExtras, cases: queries.map((query, index) => ({
    id: `case-${index}`, language: 'fr', query, split: 'test', intent: 'small_talk', isWrite: false,
    ...caseExtras,
  })) }));
  if (existingOutput) await Bun.write(output, JSON.stringify({ preserved: true }));
  await Bun.write(preload, `import { writeFileSync } from 'node:fs';
const audit = { decisions: 0, keyReads: 0, unexpected: 0 };
if (process.argv.includes('--connection-reuse=off')) audit.requestKeepalive = [];
if (process.argv.includes('--write-wording-version=4')) audit.requestShapes = [];
if (process.argv.includes('--interval-ms=80')) audit.starts = [];
const outcomes = JSON.parse(process.env.JEV_MOCK_OUTCOMES);
process.on('exit', () => writeFileSync(${JSON.stringify(auditPath)}, JSON.stringify(audit)));
globalThis.fetch = async (url, init) => {
  audit.requestKeepalive?.push(init?.keepalive ?? null);
  if (url === 'https://openrouter.ai/api/v1/key') {
    audit.keyReads++;
    if (${JSON.stringify(keyFailure)} && audit.keyReads === 2) throw new Error('mock ledger unavailable');
    return Response.json({ data: { usage: audit.decisions * 0.001, ...${JSON.stringify(keyMetadata)} } });
  }
  if (url !== 'https://openrouter.ai/api/alpha/decisions' || init?.method !== 'POST') {
    audit.unexpected++;
    throw new Error('Unexpected fetch blocked');
  }
  audit.starts?.push(performance.now());
  audit.requestShapes?.push(JSON.parse(init.body));
  const result = outcomes[audit.decisions++] ?? outcomes.at(-1);
  if (result.throw) throw new DOMException(result.throw, 'TimeoutError');
  const headers = { ...result.headers, ...(result.retryAfter ? { 'retry-after': result.retryAfter } : {}) };
  if (result.text !== undefined) return new Response(result.text, { status: result.status ?? 200, headers });
  return Response.json(result.body, { status: result.status ?? 200, headers });
};
`);
  const flags = { repetitions: 1, 'budget-usd': 0.05, 'max-requests': 3, 'request-reserve-usd': 0.01, ...controls };
  try {
    const launch = async (target, legOutcomes, argumentsForLeg) => {
      const child = Bun.spawn([Bun.which('bun'), `--preload=${preload}`, resolve('scripts/chatbot-jev-probe.mjs'),
        `--cases=${corpus}`, `--output=${target}`,
        ...Object.entries(flags).filter(([, value]) => value !== undefined).map(([name, value]) => `--${name}=${value}`),
        ...argumentsForLeg], {
        env: { ...process.env, OPENROUTER_API_KEY: argumentsForLeg.includes('--validate')
          || argumentsForLeg.includes('--preflight') ? '' : 'offline-mock-key',
          JEV_MOCK_OUTCOMES: JSON.stringify(legOutcomes) }, stdout: 'pipe', stderr: 'pipe',
      });
      const [exitCode, stdout, stderr] = await Promise.all([child.exited,
        new Response(child.stdout).text(), new Response(child.stderr).text()]);
      return { exitCode, stdout, stderr };
    };
    const resumeArguments = [];
    const priorReports = [];
    for (let index = 0; index < priorRuns.length; index++) {
      const target = join(directory, `prior-${index}.json`);
      await launch(target, priorRuns[index], [...resumeArguments, '--retain-unknown-costs']);
      priorReports.push(await Bun.file(target).json());
      resumeArguments.push(`--resume-report=${target}`);
    }
    const { exitCode, stdout, stderr } = await launch(output, outcomes, [...resumeArguments, ...extraArguments,
      ...(validate ? ['--validate'] : [])]);
    return { exitCode, stdout, stderr, audit: await Bun.file(auditPath).json(),
      priorReports,
      report: await Bun.file(output).exists() ? await Bun.file(output).json() : null };
  } finally {
    if (dirname(directory) !== resolve(tmpdir()) || !basename(directory).startsWith('school-jev-budget-')) {
      throw new Error('Refusing cleanup outside the task temporary directory');
    }
    await rm(directory, { recursive: true, force: true });
  }
}

describe('Jev probe budget CLI', () => {
  it('runs explicitly requested unreviewed assistant development without completing review or passing qualification', async () => {
    const corpusExtras = { purpose: 'fresh-exploratory', acceptancePolicy: 'core',
      previousCorpora: ['datasets/chatbot-latency/jev-intents.json'], reviewWorkflow: OPERATOR_REVIEW_WORKFLOW,
      nativeAuthorshipWaived: true, waiverStatement: 'Synthetic unit waiver',
      operatorLanguageReview: { status: 'pending', statement: null, casesSha256: null } };
    const options = { queries: ['Tu peux afficher le calendrier scolaire fictif ZzDeveloppement ?'],
      caseExtras: { source: 'assistant', familyId: 'development-fixture' }, corpusExtras,
      controls: { 'acceptance-policy': 'core' } };
    const normal = await runProbe(options);
    expect(normal.audit.decisions).toBe(0);
    const development = await runProbe({ ...options, extraArguments: ['--unreviewed-development', '--query-guard-version=4'] });
    expect(development.exitCode).toBe(0);
    expect(development.audit.decisions).toBe(1);
    expect(development.report.unreviewedDevelopment).toBe(true);
    expect(development.report.freshness.operatorWorkflow.languageReviewComplete).toBe(false);
    expect(development.report.summary.exploration.classificationGatePassed).toBe(false);
    expect(development.report.summary.exploration.mode).toBe('unreviewed-assistant-development');
    expect(development.report.summary.exploration.reasons).toContain('unreviewed_development_run_not_qualification');
    expect(development.report.summary.evaluationUse).toBe('unreviewed-assistant-development');
    const invalid = await runProbe({ extraArguments: ['--unreviewed-development'] });
    expect(invalid.exitCode).toBe(1);
    expect(invalid.audit).toMatchObject({ decisions: 0, keyReads: 0 });
  });
  it.each([3, 4])('records guard %s projection and freezes its sources independently of raw classifications', async version => {
    const result = await runProbe({ extraArguments: [`--query-guard-version=${version}`] });
    expect(result.exitCode).toBe(0);
    expect(result.report.queryGuardVersion).toBe(version);
    expect(result.report.sourceSha256['scripts/chatbot-jev-query-guard-v3.mjs']).toMatch(/^[a-f0-9]{64}$/);
    expect(result.report.sourceSha256['packages/server/src/modules/chat/schoolReplyWrite.ts']).toMatch(/^[a-f0-9]{64}$/);
    if (version === 4) expect(result.report.sourceSha256['scripts/chatbot-jev-query-guard-v4.mjs']).toMatch(/^[a-f0-9]{64}$/);
    expect(result.report.summary.semanticQueryGuard.version).toBe(version);
    expect(result.report.samples[0].decision.choice).toBe('small_talk');
    const invalid = await runProbe({ extraArguments: ['--query-guard-version=9'] });
    expect(invalid.exitCode).toBe(1);
    expect(invalid.audit).toMatchObject({ decisions: 0, keyReads: 0 });
  });
  it('disables connection reuse only when explicitly selected and records the transport mode', async () => {
    const result = await runProbe({ extraArguments: ['--connection-reuse=off'] });
    expect(result.exitCode).toBe(0);
    expect(result.audit.decisions).toBe(3);
    expect(result.audit.requestKeepalive.length).toBe(5);
    expect(result.audit.requestKeepalive.every(value => value === false)).toBe(true);
    expect(result.report.connectionReuse).toBe('off');
    expect(result.report.requestShape.state).toBe('<query>');
    const invalid = await runProbe({ extraArguments: ['--connection-reuse=unknown'] });
    expect(invalid.exitCode).toBe(1);
    expect(invalid.audit).toMatchObject({ decisions: 0, keyReads: 0 });
  });
  it('validates pending operator drafts offline and dispatches only after exact wording approval', async () => {
    // Synthetic review statements here are unit fixtures, not actual user approval.
    const query = 'Unique operator wording mock fixture';
    const caseExtras = { source: 'assistant', familyId: 'operator-test-f1' };
    const corpusExtras = { purpose: 'fresh-exploratory', acceptancePolicy: 'core',
      previousCorpora: ['datasets/chatbot-latency/jev-intents.json'], reviewWorkflow: OPERATOR_REVIEW_WORKFLOW,
      nativeAuthorshipWaived: true, waiverStatement: 'Synthetic unit waiver',
      operatorLanguageReview: { status: 'pending', statement: null, casesSha256: null } };
    const options = { queries: [query], caseExtras, corpusExtras, controls: { 'acceptance-policy': 'core' } };
    const offline = await runProbe({ ...options, validate: true });
    expect(offline.exitCode).toBe(0);
    expect(JSON.parse(offline.stdout).freshness.operatorWorkflow.languageReviewComplete).toBe(false);
    expect(offline.audit).toMatchObject({ decisions: 0, keyReads: 0 });
    const pending = await runProbe(options);
    expect(pending.exitCode).toBe(1);
    expect(pending.stderr).toContain('Confirm the drafted Darija wording');
    expect(pending.audit).toMatchObject({ decisions: 0, keyReads: 0 });
    const approvedCases = [{ id: 'case-0', language: 'fr', query, split: 'test', intent: 'small_talk', isWrite: false, ...caseExtras }];
    const approved = await runProbe({ ...options, corpusExtras: { ...corpusExtras,
      operatorLanguageReview: { status: 'approved', statement: 'Synthetic unit approval',
        casesSha256: operatorReviewCasesSha256(approvedCases) } } });
    expect(approved.exitCode).toBe(0);
    expect(approved.audit.decisions).toBe(1);
    expect(approved.report.summary.exploration.mode).toBe('operator-reviewed-synthetic');
    expect(approved.report.summary.exploration.reasons).not.toContain('native_authorship_and_review_outstanding');
    expect(approved.report.summary.exploration.productionAcceptance).toBe(false);
    const changed = await runProbe({ ...options, corpusExtras: { ...corpusExtras,
      operatorLanguageReview: { status: 'approved', statement: 'Synthetic unit approval', casesSha256: 'a'.repeat(64) } } });
    expect(changed.exitCode).toBe(1);
    expect(changed.audit).toMatchObject({ decisions: 0, keyReads: 0 });
  });
  it('keeps v3 as default and permits v4 only as an explicit assistant dev candidate', async () => {
    const baseline = await runProbe({ validate: true });
    expect(JSON.parse(baseline.stdout).writeWordingVersion).toBe(3);
    const candidate = await runProbe({ extraArguments: ['--write-wording-version=4'], caseExtras: { source: 'assistant', split: 'dev' } });
    expect(candidate.exitCode).toBe(0);
    expect(candidate.report).toMatchObject({ intentWordingVersion: 3, writeWordingVersion: 4 });
    expect(candidate.audit.requestShapes[0].questions.is_write.criteria.false).toContain('not by themselves request a mutation');
    expect(candidate.report.sourceSha256['scripts/chatbot-jev-wording-v4.mjs']).toMatch(/^[a-f0-9]{64}$/);
    for (const [extraArguments, caseExtras] of [
      [['--write-wording-version=4'], { source: 'assistant', split: 'test' }],
      [['--write-wording-version=4'], { split: 'dev' }],
      [['--write-wording-version=5'], { source: 'assistant', split: 'dev' }],
    ]) {
      const result = await runProbe({ extraArguments, caseExtras });
      expect(result.exitCode).toBe(1);
      expect(result.audit.decisions).toBe(0);
      expect(result.audit.keyReads).toBe(0);
    }
  });
  it('prechecks finite key limits without dispatching classification and fails closed when unverified', async () => {
    for (const [keyMetadata, ready] of [
      [{ limit: 50, limit_remaining: 49 }, true],
      [{ limit: 50, limit_remaining: 0.05 }, true],
      [{ limit: 50, limit_remaining: 0.049 }, false],
      [{ limit: null, limit_remaining: 49 }, false],
      [{ limit: 50, limit_remaining: null }, false],
    ]) {
      const result = await runProbe({ extraArguments: ['--key-precheck'], keyMetadata });
      expect(result.exitCode).toBe(ready ? 0 : 1);
      expect(result.report).toMatchObject({ mode: 'key-precheck', classifierRequests: 0, readyForBudget: ready });
      expect(result.audit).toEqual({ decisions: 0, keyReads: 1, unexpected: 0 });
    }
  });
  it('refuses intake/worksheets, unknown purposes and unverified native exports before any fetch', async () => {
    for (const purpose of ['native-intake', 'native-review-worksheet', 'native-heldout', 'unchecked-human-data']) {
      const result = await runProbe({ standalone: true, corpusExtras: { purpose, acceptancePolicy: 'core' },
        controls: { 'acceptance-policy': 'core' } });
      expect(result.exitCode).toBe(1);
      expect(result.audit).toEqual({ decisions: 0, keyReads: 0, unexpected: 0 });
      expect(result.report).toBeNull();
    }
    for (const caseExtras of [{ source: 'real_user' }, { source: 'native_author' }, { reviewBlind: true }, { reviewerId: 'r1' }]) {
      const result = await runProbe({ standalone: true, caseExtras });
      expect(result.exitCode).toBe(1);
      expect(result.audit).toEqual({ decisions: 0, keyReads: 0, unexpected: 0 });
      expect(result.report).toBeNull();
    }
  }, 15000);

  it('paces dispatch without adding the pause to measured API latency', async () => {
    const result = await runProbe({ controls: { 'interval-ms': 80 } });
    expect(result.exitCode).toBe(0);
    expect(result.report.intervalMs).toBe(80);
    expect(result.audit.starts).toHaveLength(3);
    expect(result.audit.starts[1] - result.audit.starts[0]).toBeGreaterThanOrEqual(65);
    expect(result.audit.starts[2] - result.audit.starts[1]).toBeGreaterThanOrEqual(65);
  });

  it('rejects unchecked ordinal skipping before sending requests', async () => {
    const result = await runProbe({ controls: { repetitions: 2, 'skip-requests': 2, 'max-requests': 4 } });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Use --resume-report');
    expect(result.audit).toEqual({ decisions: 0, keyReads: 0, unexpected: 0 });
  });

  it('preflights continuation offline and preserves unresolved costs until explicitly retained', async () => {
    const priorRuns = [[{ status: 429, body: { error: 'throttled' } }]];
    const blocked = await runProbe({ priorRuns, extraArguments: ['--preflight'] });
    expect(blocked.exitCode).toBe(1);
    expect(JSON.parse(blocked.stdout)).toMatchObject({ offline: true, continuation: {
      priorAttempts: 1, retainedUnknownReservationUsd: 0.01, priorUnknownAttempts: 1,
      nextAttempt: { id: 'case-1', repetition: 1 }, remainingRequestAllowance: 2,
      remainingEstimatedBudgetUsd: 0.04, readyToDispatch: false,
      blockReasons: ['retain_unknown_costs_not_acknowledged'],
    } });
    expect(blocked.audit).toEqual({ decisions: 0, keyReads: 0, unexpected: 0 });
    const liveBlocked = await runProbe({ priorRuns });
    expect(liveBlocked.exitCode).toBe(1);
    expect(liveBlocked.audit).toEqual({ decisions: 0, keyReads: 0, unexpected: 0 });
    const resumed = await runProbe({ priorRuns, extraArguments: ['--retain-unknown-costs'] });
    expect(resumed.exitCode).toBe(0);
    expect(resumed.audit.decisions).toBe(2);
    expect(resumed.report.samples.map(row => [row.id, row.repetition])).toEqual([['case-1', 1], ['case-2', 1]]);
    expect(resumed.report.cumulativeAccounting).toMatchObject({ attempts: 3, reportedCostUsd: 0.002,
      retainedUnknownReservationUsd: 0.01, unknownAttempts: 1, costComplete: false });
    expect(resumed.priorReports[0].samples[0].reportedCostUsd).toBeNull();
  }, 15000);

  it('uses cumulative request caps across multiple legs and repetitions', async () => {
    const result = await runProbe({ priorRuns: [[{ status: 429, body: { usage: { cost: 0 } } }],
      [{ status: 429, body: { usage: { cost: 0 } } }]],
      outcomes: [{ body: response(0) }], controls: { repetitions: 2 } });
    expect(result.exitCode).toBe(1);
    expect(result.audit.decisions).toBe(1);
    expect(result.report).toMatchObject({ skippedRequests: 2, stoppedReason: 'max_requests_reached',
      cumulativeAccounting: { attempts: 3 } });
    expect(result.report.samples.map(row => row.id)).toEqual(['case-2']);
  });

  it('reduces the next leg budget by earlier spend and stops before a reservation cannot fit', async () => {
    const result = await runProbe({ priorRuns: [[{ status: 429, body: { usage: { cost: 0.036 } } }]],
      outcomes: [{ body: response(0.009) }] });
    expect(result.exitCode).toBe(1);
    expect(result.audit.decisions).toBe(1);
    expect(result.report).toMatchObject({ stoppedReason: 'insufficient_remaining_estimated_budget',
      continuation: { remainingEstimatedBudgetUsd: 0.014 }, cumulativeAccounting: { attempts: 2 } });
    expect(result.report.cumulativeAccounting.reportedCostUsd).toBeCloseTo(0.045, 12);
  });

  it('honors the explicit core policy on a standalone corpus without changing model choices', async () => {
    const body = response();
    body.answers.intent.choice = 'upcoming_exams';
    body.answers.intent.probabilities.small_talk = 0;
    body.answers.intent.probabilities.upcoming_exams = 1;
    const result = await runProbe({ standalone: true, outcomes: [{ body }], controls: { 'acceptance-policy': 'core' } });
    expect(result.exitCode).toBe(0);
    expect(result.report.acceptancePolicy).toBe('core');
    expect(Object.keys(result.report.requestShape.questions.intent.criteria)).toEqual(INTENT_NAMES);
    expect(result.report.summary.gate.test.all).toMatchObject({ accepted: 0, acceptancePolicy: 'core' });
  });

  it('rejects unknown policy or an empty selected split before provider calls', async () => {
    for (const controls of [{ 'acceptance-policy': 'missing' }, { split: 'dev' }]) {
      const result = await runProbe({ controls });
      expect(result.exitCode).toBe(1);
      expect(result.audit).toEqual({ decisions: 0, keyReads: 0, unexpected: 0 });
    }
  });

  it('preserves an existing report and refuses dispatch instead of overwriting history', async () => {
    const result = await runProbe({ existingOutput: true });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Output already exists');
    expect(result.report).toEqual({ preserved: true });
    expect(result.audit).toEqual({ decisions: 0, keyReads: 0, unexpected: 0 });
  });

  it('counts candidates using actual School detection and regex rather than fixture labels', async () => {
    const result = await runProbe({ queries: ["Tu peux me dire le nombre d'élèves ?", 'Who is absent today?', 'Combien d’élèves ?'] });
    expect(result.exitCode).toBe(0);
    expect(result.report.summary.gate.testAfterLanguageGate).toMatchObject({ samples: 2 });
    expect(result.report.summary.gate.testAfterLanguageAndRegexGate).toMatchObject({ samples: 1 });
    expect(result.report.summary.gate.languageSkippedCases).toEqual(['case-1']);
    expect(result.audit).toEqual({ decisions: 3, keyReads: 2, unexpected: 0 });
  });

  it('keeps validation offline without live allowances or a key', async () => {
    const result = await runProbe({ validate: true, controls: { 'max-requests': undefined, 'request-reserve-usd': undefined } });
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ valid: true, cases: 3 });
    expect(result.audit).toEqual({ decisions: 0, keyReads: 0, unexpected: 0 });
    expect(result.report).toBeNull();
  });

  it('rejects missing or invalid allowances before any fetch', async () => {
    const invalid = [
      ...[undefined, 0, -1, 1.5, NaN, Infinity, 5001].map(value => ({ 'max-requests': value })),
      ...[undefined, 0, -1, NaN, Infinity, 0.06].map(value => ({ 'request-reserve-usd': value })),
      ...[0, -1, NaN, Infinity, 0.26].map(value => ({ 'budget-usd': value })),
    ];
    for (const controls of invalid) {
      const result = await runProbe({ controls });
      expect(result.exitCode).toBe(1);
      expect(result.audit).toEqual({ decisions: 0, keyReads: 0, unexpected: 0 });
      expect(result.report).toBeNull();
    }
  }, 15000);

  it('stops the original three-request missing-cost reproduction after one attempt', async () => {
    const body = response();
    delete body.usage.cost;
    const result = await runProbe({ outcomes: [{ body }], controls: { 'budget-usd': 0.000001, 'request-reserve-usd': 0.000001 } });
    expect(result.exitCode).toBe(1);
    expect(result.audit).toEqual({ decisions: 1, keyReads: 2, unexpected: 0 });
    expect(result.report.samples).toHaveLength(1);
    expect(result.report.samples[0]).toMatchObject({ reportedCostUsd: null, error: 'Malformed Jev decision' });
    expect(result.report).toMatchObject({ stoppedReason: 'unknown_request_cost',
      estimatedBudget: { reservedUsd: 0.000001, requestsSettled: 1, requestsWithUnknownCost: 1, inFlight: 0 },
      summary: { reportedCostUsd: 0, requestsWithKnownCost: 0, requestsWithUnknownCost: 1, costComplete: false } });
  });

  it('retains reservations and stops on invalid cost, JSON, HTTP failure or timeout', async () => {
    for (const outcome of [
      ...[null, -1, '0.001'].map(cost => ({ body: response(cost) })),
      { text: JSON.stringify(response()).replace('"cost":0.001', '"cost":1e400') },
      { text: '{broken json' }, { status: 429, body: { error: 'rate limited' } },
      { throw: 'mock deadline exceeded' },
    ]) {
      const result = await runProbe({ outcomes: [outcome] });
      expect(result.exitCode).toBe(1);
      expect(result.audit.decisions).toBe(1);
      expect(result.report.stoppedReason).toBe('unknown_request_cost');
      expect(result.report.estimatedBudget).toMatchObject({ reservedUsd: 0.01, requestsWithUnknownCost: 1, inFlight: 0 });
      expect(result.report.summary.costComplete).toBe(false);
      expect(result.report.summary.errors).toHaveLength(1);
    }
  }, 10000);

  it('reserves before dispatch and blocks a second request that cannot fit', async () => {
    const result = await runProbe({ outcomes: [{ body: response(0.006) }],
      controls: { 'budget-usd': 0.01, 'request-reserve-usd': 0.006 } });
    expect(result.exitCode).toBe(1);
    expect(result.audit.decisions).toBe(1);
    expect(result.report.stoppedReason).toBe('insufficient_remaining_estimated_budget');
    expect(result.report.summary).toMatchObject({ reportedCostUsd: 0.006, requestsWithKnownCost: 1, costComplete: true });
    expect(result.report.estimatedBudget).toMatchObject({ reservedUsd: 0, inFlight: 0, requestsSettled: 1 });
  });

  it('allows exact fits and releases unused reservations after known cost', async () => {
    const result = await runProbe({ outcomes: [{ body: response(0.003) }],
      controls: { 'budget-usd': 0.009, 'request-reserve-usd': 0.003 } });
    expect(result.exitCode).toBe(0);
    expect(result.audit.decisions).toBe(3);
    expect(result.report.summary).toMatchObject({ requestsWithKnownCost: 3, requestsWithUnknownCost: 0, costComplete: true });
    expect(result.report.summary.reportedCostUsd).toBeCloseTo(0.009, 12);
    expect(result.report.estimatedBudget).toMatchObject({ observedEstimatedUsd: 0.009, reservedUsd: 0, inFlight: 0 });
    expect(result.report.stoppedReason).toBeNull();
  });

  it('caps requests across repetitions even when reported costs are zero', async () => {
    const result = await runProbe({ outcomes: [{ body: response(0) }], controls: { repetitions: 5, 'max-requests': 2 } });
    expect(result.exitCode).toBe(1);
    expect(result.audit.decisions).toBe(2);
    expect(result.report).toMatchObject({ maxRequests: 2, plannedRequests: 15, stoppedReason: 'max_requests_reached',
      summary: { reportedCostUsd: 0, requestsWithKnownCost: 2, requestsWithUnknownCost: 0, costComplete: true } });
  });

  it('preserves known cost on malformed decisions and HTTP failures', async () => {
    const malformed = response();
    malformed.answers.intent.confidence = 1.5;
    const result = await runProbe({ outcomes: [{ body: malformed }, { status: 503, body: { usage: { cost: 0.002 } } },
      { body: response(0.003) }] });
    expect(result.exitCode).toBe(1);
    expect(result.audit.decisions).toBe(3);
    expect(result.report.samples.map(sample => sample.reportedCostUsd)).toEqual([0.001, 0.002, 0.003]);
    expect(result.report.summary).toMatchObject({ reportedCostUsd: 0.006, requestsWithKnownCost: 3,
      requestsWithUnknownCost: 0, costComplete: true });
    expect(result.report.summary.errors).toHaveLength(2);
    expect(result.report.estimatedBudget.reservedUsd).toBe(0);
  });

  it('stops on a known-cost 429, retaining cost and retry headers without retry', async () => {
    const result = await runProbe({ outcomes: [{ status: 429, retryAfter: '7',
      headers: { 'x-ratelimit-limit': '60', 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '12345',
        'set-cookie': 'irrelevant=private' },
      body: { usage: { cost: 0.002 }, error: { metadata: { error_type: 'rate_limit_exceeded',
        provider_code: 429, limit_source: 'provider', reason: 'capacity', ignored: 'not retained' } } } }] });
    expect(result.exitCode).toBe(1);
    expect(result.audit.decisions).toBe(1);
    expect(result.report).toMatchObject({ stoppedReason: 'provider_rate_limited',
      summary: { reportedCostUsd: 0.002, requestsWithKnownCost: 1, costComplete: true } });
    expect(result.report.samples[0]).toMatchObject({ httpStatus: 429, retryAfter: '7' });
    expect(result.report.samples[0].rateLimitHeaders).toEqual({
      'x-ratelimit-limit': '60', 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '12345',
    });
    expect(result.report.samples[0].providerError).toEqual({ error_type: 'rate_limit_exceeded',
      provider_code: 429, limit_source: 'provider', reason: 'capacity' });
  });

  it('records budget overruns and refuses another dispatch', async () => {
    const result = await runProbe({ outcomes: [{ body: response(0.02) }],
      controls: { 'budget-usd': 0.01, 'request-reserve-usd': 0.01 } });
    expect(result.exitCode).toBe(1);
    expect(result.audit.decisions).toBe(1);
    expect(result.report.stoppedReason).toBe('observed_estimate_exceeds_budget');
    expect(result.report.summary.reportedCostUsd).toBe(0.02);
    expect(result.report.estimatedBudget.observedEstimatedUsd).toBe(0.02);
  });

  it('retains the report if the postflight ledger read fails', async () => {
    const result = await runProbe({ keyFailure: true });
    expect(result.exitCode).toBe(0);
    expect(result.report.keyUsageAfter).toEqual({ error: 'mock ledger unavailable' });
    expect(result.report.summary).toMatchObject({ requestsWithKnownCost: 3, costComplete: true });
    expect(result.audit.unexpected).toBe(0);
  });
});
