import { describe, expect, it } from 'bun:test';
import { CONTINUATION_SOURCES, cumulativeAccounting, prepareContinuation } from '../chatbot-jev-resume.mjs';

const sourceSha256 = Object.fromEntries([...CONTINUATION_SOURCES, 'scripts/chatbot-jev-probe.mjs'].map(path => [path, 'a'.repeat(64)]));
const expected = { model: 'typesafe/jev-1.13', endpoint: 'decisions', corpusSha256: 'corpus',
  requestShape: { questions: { intent: { choices: ['same'] } } }, intentWordingVersion: 3,
  split: 'test', gateThreshold: 0.8, acceptancePolicy: 'core', repetitions: 2, sourceSha256 };
const runCases = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const sample = (id, repetition, reportedCostUsd) => ({ id, repetition, reportedCostUsd });
const leg = (samples, skippedRequests = 0) => ({
  path: `report-${skippedRequests}.json`, sha256: String(skippedRequests + 1).repeat(64),
  report: { ...structuredClone(expected), samples, skippedRequests, totalPlannedRequests: 6,
    plannedRequests: 6 - skippedRequests, requestReserveUsd: 0.002, budgetUsd: 0.02, maxRequests: 6,
    estimatedBudget: { inFlight: 0, requestsSettled: samples.length, requestReserveUsd: 0.002,
      requestsWithUnknownCost: samples.filter(row => row.reportedCostUsd === null).length,
      observedEstimatedUsd: samples.reduce((total, row) => total + Math.ceil((row.reportedCostUsd ?? 0) * 1e9), 0) / 1e9,
      reservedUsd: samples.filter(row => row.reportedCostUsd === null).length * 0.002 },
  },
});
const prepare = (previous, overrides = {}) => prepareContinuation({ previous, expected, runCases,
  repetitions: 2, budgetUsd: 0.02, maxRequests: 6, requestReserveUsd: 0.002, ...overrides });

describe('verified Jev continuation', () => {
  it('freezes explicit unreviewed development mode without assigning wording approval', () => {
    const first = leg([sample('a', 1, 0.001)]);
    first.report.unreviewedDevelopment = true;
    expect(() => prepare([first])).toThrow('development review mode changed');
    expect(prepare([first], { expected: { ...expected, unreviewedDevelopment: true } }).readyToDispatch).toBe(true);
  });
  it.each([3, 4])('refuses changed semantic-veto and write-refusal sources and query guard mode %s', version => {
    const guardSources = ['scripts/chatbot-jev-query-guard-v3.mjs', 'scripts/chatbot-jev-count-guard-v2.mjs', 'scripts/chatbot-jev-count-guard.mjs',
      ...(version === 4 ? ['scripts/chatbot-jev-query-guard-v4.mjs'] : [])];
    const guardedExpected = { ...expected, queryGuardVersion: version, sourceSha256: { ...sourceSha256,
      ...Object.fromEntries(guardSources.map(path => [path, 'a'.repeat(64)])) } };
    const first = leg([sample('a', 1, 0.001)]);
    first.report = { ...first.report, queryGuardVersion: version, sourceSha256: structuredClone(guardedExpected.sourceSha256) };
    expect(prepare([first], { expected: guardedExpected }).readyToDispatch).toBe(true);
    for (const source of [...guardSources, 'packages/server/src/modules/chat/replies/schoolReplyWrite.ts']) {
      const changed = structuredClone(first);
      changed.report.sourceSha256[source] = 'b'.repeat(64);
      expect(() => prepare([changed], { expected: guardedExpected })).toThrow('frozen source changed');
    }
    expect(() => prepare([first], { expected })).toThrow('query guard version changed');
  });
  it('retains multiple unknown failures, advances once and derives cumulative residuals', () => {
    const first = leg([sample('a', 1, 0.001), sample('b', 1, null)]);
    const second = leg([sample('c', 1, 0.002), sample('a', 2, null)], 2);
    const original = structuredClone([first, second]);
    expect(prepare([first, second])).toMatchObject({ priorAttempts: 4, priorReportedCostUsd: 0.003,
      priorObservedEstimatedUsd: 0.003, priorUnknownAttempts: 2, retainedUnknownReservationUsd: 0.004,
      remainingEstimatedBudgetUsd: 0.013, remainingRequestAllowance: 2, remainingPlannedRequests: 2,
      nextAttempt: { id: 'b', repetition: 2 }, readyToDispatch: false,
      blockReasons: ['retain_unknown_costs_not_acknowledged'] });
    const continuation = prepare([first, second], { retainUnknownCosts: true });
    expect(continuation.readyToDispatch).toBe(true);
    expect(cumulativeAccounting(continuation, [sample('b', 2, 0.001)], {
      observedEstimatedUsd: 0.001, reservedUsd: 0, requestsWithUnknownCost: 0,
    })).toMatchObject({ attempts: 5, reportedCostUsd: 0.004, observedEstimatedUsd: 0.004,
      retainedUnknownReservationUsd: 0.004, unknownAttempts: 2, costComplete: false });
    expect([first, second]).toEqual(original);
  });

  it('rejects omitted/duplicate/reordered attempts and partial budget snapshots', () => {
    const first = leg([sample('a', 1, 0.001), sample('b', 1, 0.001)]);
    const mutations = [
      report => { report.skippedRequests = 1; },
      report => { report.samples[0].id = 'b'; },
      report => { report.samples[1].repetition = 2; },
      report => { report.estimatedBudget.inFlight = 1; },
      report => { report.estimatedBudget.requestsSettled = 1; },
      report => { report.estimatedBudget.observedEstimatedUsd = 0; },
      report => { report.estimatedBudget.reservedUsd = 0.01; },
      report => { report.samples[0].reportedCostUsd = -1; },
      report => { delete report.samples[0].reportedCostUsd; },
    ];
    for (const mutate of mutations) {
      const invalid = structuredClone(first);
      mutate(invalid.report);
      expect(() => prepare([invalid])).toThrow('Invalid Jev continuation');
    }
    expect(() => prepare([first, first])).toThrow('contiguous schedule');
    const second = leg([sample('c', 1, 0.001)], 2);
    expect(() => prepare([second])).toThrow('contiguous schedule');
  });

  it('freezes corpus, policy, request shape, repetitions and classification sources', () => {
    const first = leg([sample('a', 1, 0)]);
    for (const key of ['model', 'endpoint', 'corpusSha256', 'requestShape', 'intentWordingVersion',
      'split', 'gateThreshold', 'acceptancePolicy', 'repetitions']) {
      const invalid = structuredClone(first);
      invalid.report[key] = 'changed';
      expect(() => prepare([invalid])).toThrow(`${key} changed`);
    }
    for (const source of CONTINUATION_SOURCES) {
      const invalid = structuredClone(first);
      invalid.report.sourceSha256[source] = 'b'.repeat(64);
      expect(() => prepare([invalid])).toThrow(`frozen source changed: ${source}`);
    }
    const transport = structuredClone(first);
    transport.report.sourceSha256['scripts/chatbot-jev-probe.mjs'] = 'b'.repeat(64);
    expect(prepare([transport]).transportChanges).toEqual([transport.path]);
  });

  it('checks hashes linking a new continuation to all earlier reports', () => {
    const first = leg([sample('a', 1, 0)]);
    const second = leg([sample('b', 1, 0)], 1);
    second.report.continuation = { priorReports: [{ sha256: first.sha256 }] };
    expect(prepare([first, second]).priorAttempts).toBe(2);
    second.report.continuation.priorReports[0].sha256 = 'b'.repeat(64);
    expect(() => prepare([first, second])).toThrow('earlier report chain');
  });

  it('also freezes the native validation source for a native study', () => {
    const nativeExpected = { ...structuredClone(expected), nativeCollection: { readyForExport: true } };
    nativeExpected.sourceSha256['scripts/chatbot-jev-native.mjs'] = 'a'.repeat(64);
    const first = leg([sample('a', 1, 0)]);
    first.report.sourceSha256['scripts/chatbot-jev-native.mjs'] = 'b'.repeat(64);
    expect(() => prepare([first], { expected: nativeExpected })).toThrow('frozen source changed: scripts/chatbot-jev-native.mjs');
  });

  it('refuses allowance expansion and blocks exhausted cumulative requests or budget', () => {
    const first = leg([sample('a', 1, 0.019)]);
    expect(prepare([first])).toMatchObject({ readyToDispatch: false,
      blockReasons: ['insufficient_remaining_estimated_budget'] });
    expect(prepare([first], { maxRequests: 1 }).blockReasons).toContain('max_requests_reached');
    expect(() => prepare([first], { budgetUsd: 0.021 })).toThrow('original run');
    expect(() => prepare([first], { maxRequests: 7 })).toThrow('original run');
    expect(() => prepare([first], { requestReserveUsd: 0.001 })).toThrow('reservation changed');
    const complete = leg([sample('a', 1, 0), sample('b', 1, 0), sample('c', 1, 0),
      sample('a', 2, 0), sample('b', 2, 0), sample('c', 2, 0)]);
    expect(prepare([complete])).toMatchObject({ nextAttempt: null, readyToDispatch: false });
    expect(prepare([complete]).blockReasons).toContain('schedule_complete');
  });

  it('accepts the initial legacy report without newly introduced pacing fields', () => {
    const first = leg([sample('a', 1, 0.0000000004)]);
    delete first.report.skippedRequests;
    delete first.report.totalPlannedRequests;
    expect(prepare([first])).toMatchObject({ priorObservedEstimatedUsd: 0.000000001,
      remainingEstimatedBudgetUsd: 0.019999999, readyToDispatch: true });
  });
});
