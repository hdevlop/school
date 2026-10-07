import { describe, expect, it } from 'bun:test';
import { jevTurnEligibility, selectJevReplyPreparation, selectReplyPreparation } from '../chatbot-reply-readiness.mjs';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = async () => { for (let index = 0; index < 6; index++) await Promise.resolve(); };
const clock = () => {
  let now = 0, serial = 0;
  const timers = new Map();
  return {
    get now() { return now; }, get pending() { return timers.size; },
    setTimer(callback, delay) { const id = ++serial; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimer(id) { timers.delete(id); },
    advance(time) {
      if (time < now) throw new Error('Clock cannot go backwards');
      for (;;) {
        const next = [...timers.entries()].filter(([, timer]) => timer.at <= time).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        timers.delete(next[0]); now = next[1].at; next[1].callback();
      }
      now = time;
    },
  };
};
function setup(signal, overrides = {}) {
  const routing = deferred(), template = deferred(), time = clock();
  const starts = [], chosen = [];
  let routingSignal, templateSignal;
  const selection = selectReplyPreparation({
    routing: scope => { routingSignal = scope; starts.push('routing'); return routing.promise; },
    template: scope => { templateSignal = scope; starts.push('template'); return template.promise; },
    setTimer: time.setTimer, clearTimer: time.clearTimer, signal, ...overrides,
  });
  // Observe failures immediately too, so tests can reject before awaiting.
  selection.then(value => chosen.push({ ...value, at: time.now }), () => {});
  return { selection, routing, template, time, starts, chosen,
    get routingSignal() { return routingSignal; }, get templateSignal() { return templateSignal; } };
}

describe('proposed reply readiness contract (offline reference only)', () => {
  it('starts at 50 ms routing readiness, not the 800 ms Jev deadline', async () => {
    const run = setup(); await flush();
    expect(run.starts).toEqual(['routing', 'template']);
    run.time.advance(50); run.routing.resolve('tools'); await flush();
    expect(await run.selection).toMatchObject({ kind: 'model', routing: 'tools' });
    expect(run.chosen).toHaveLength(1);
    expect(run.chosen[0].at).toBe(50);
    expect(run.templateSignal.aborted).toBe(true);
    expect(run.templateSignal.reason).toBe('routing_ready');
    expect(run.time.pending).toBe(0);
    run.time.advance(800); run.template.resolve({ accepted: true }); await flush();
    expect(run.chosen).toHaveLength(1);
  });

  it('adds no grace period to a routing cache hit', async () => {
    const run = setup(undefined, { routing: () => 'cached tools' }); await flush();
    expect(await run.selection).toMatchObject({ kind: 'model', templateOutcome: 'cancelled_on_routing' });
    expect(run.chosen[0].at).toBe(0);
    expect(run.time.pending).toBe(0);
  });

  it('chooses an earlier accepted template and drains an unabortable losing rejection', async () => {
    const run = setup(); await flush();
    run.time.advance(30); run.template.resolve({ accepted: true }); await flush();
    expect(await run.selection).toMatchObject({ kind: 'template', templateOutcome: 'accepted' });
    expect(run.chosen[0].at).toBe(30);
    expect(run.routingSignal.aborted).toBe(true);
    expect(run.routingSignal.reason).toBe('template_selected');
    run.time.advance(100); run.routing.reject(new Error('late routing failure')); await flush();
    expect(run.chosen).toHaveLength(1);
    expect(run.time.pending).toBe(0);
  });

  it.each(['declined', 'error'])('keeps routing progressing after template %s', async outcome => {
    const run = setup(); await flush();
    run.time.advance(20);
    if (outcome === 'error') run.template.reject(new Error('classifier failed')); else run.template.resolve(null);
    await flush();
    expect(run.routingSignal.aborted).toBe(false);
    run.time.advance(50); run.routing.resolve('tools'); await flush();
    expect(await run.selection).toMatchObject({ kind: 'model', templateOutcome: outcome });
    expect(run.chosen[0].at).toBe(50);
  });

  it('times out only the candidate and ignores acceptance after its deadline', async () => {
    const run = setup(); await flush();
    run.time.advance(800); await flush();
    expect(run.templateSignal.reason).toBe('timeout');
    expect(run.routingSignal.aborted).toBe(false);
    run.time.advance(850); run.template.resolve({ accepted: true }); await flush();
    expect(run.chosen).toHaveLength(0);
    run.time.advance(900); run.routing.resolve('tools'); await flush();
    expect(await run.selection).toMatchObject({ kind: 'model', templateOutcome: 'timeout' });
    expect(run.chosen[0].at).toBe(900);
  });

  it('handles a late classifier rejection after routing wins', async () => {
    const run = setup(); await flush();
    run.routing.resolve('tools'); await flush();
    run.template.reject(new Error('late classifier failure')); await flush();
    expect((await run.selection).kind).toBe('model');
    expect(run.chosen).toHaveLength(1);
  });

  it('fails on routing rejection and prevents late template selection', async () => {
    const run = setup(); await flush();
    const error = new Error('routing failed'); run.routing.reject(error); await flush();
    await expect(run.selection).rejects.toBe(error);
    expect(run.templateSignal.aborted).toBe(true);
    run.template.resolve({ accepted: true }); await flush();
    expect(run.chosen).toHaveLength(0);
    expect(run.time.pending).toBe(0);
  });

  it('starts neither job for an already-cancelled request', async () => {
    const transport = new AbortController(); const error = new Error('client disconnected'); transport.abort(error);
    const run = setup(transport.signal); await flush();
    await expect(run.selection).rejects.toBe(error);
    expect(run.starts).toHaveLength(0);
    expect(run.time.pending).toBe(0);
  });

  it('propagates client cancellation to both jobs without selecting a path', async () => {
    const transport = new AbortController(); const run = setup(transport.signal); await flush();
    const error = new Error('client disconnected'); transport.abort(error); await flush();
    await expect(run.selection).rejects.toBe(error);
    expect(run.routingSignal.reason).toBe(error);
    expect(run.templateSignal.reason).toBe(error);
    run.routing.resolve('tools'); run.template.resolve({ accepted: true }); await flush();
    expect(run.chosen).toHaveLength(0);
    expect(run.time.pending).toBe(0);
  });

  it('contains a synchronous classifier throw and selects ready routing', async () => {
    const run = setup(undefined, { template: () => { throw new Error('sync failure'); } }); await flush();
    run.routing.resolve('tools'); await flush();
    expect(await run.selection).toMatchObject({ kind: 'model', templateOutcome: 'error' });
  });

  it('rejects invalid configuration before calling either factory', () => {
    let starts = 0; const factory = () => { starts++; };
    for (const templateTimeoutMs of [0, -1, NaN, Infinity, 1.5, '800', 30001]) {
      expect(() => selectReplyPreparation({ routing: factory, template: factory, templateTimeoutMs })).toThrow();
    }
    expect(starts).toBe(0);
  });
});

describe('initial Jev eligibility contract (offline only)', () => {
  const firstTurn = () => ({ mode: 'on', regexMatched: false, language: 'ary', channel: 'web',
    isAdminUser: true, historyComplete: true, priorUserTurns: 0 });

  it('accepts only the three detected renderer languages with complete first-turn context', () => {
    for (const language of ['fr', 'ar', 'ary']) expect(jevTurnEligibility({ ...firstTurn(), language }))
      .toEqual({ eligible: true, reasons: [] });
  });

  it('skips classification for missing, invalid, truncated or ineligible context', async () => {
    const turns = [undefined, null, {},
      ...['mode', 'regexMatched', 'language', 'channel', 'isAdminUser', 'historyComplete', 'priorUserTurns'].map(field => {
        const turn = firstTurn(); delete turn[field]; return turn;
      }),
      ...['off', 'shadow', null].map(mode => ({ ...firstTurn(), mode })),
      ...['false', null].map(regexMatched => ({ ...firstTurn(), regexMatched })),
      ...['en', 'es', 'ary-latn', 'unknown'].map(language => ({ ...firstTurn(), language })),
      ...['mcp', 'api', null].map(channel => ({ ...firstTurn(), channel })),
      ...[false, 'true', 1].map(isAdminUser => ({ ...firstTurn(), isAdminUser })),
      ...[false, 'true', null].map(historyComplete => ({ ...firstTurn(), historyComplete })),
      ...[1, -1, .5, '0', null, NaN, Infinity].map(priorUserTurns => ({ ...firstTurn(), priorUserTurns })),
    ];
    for (const turn of turns) {
      let classifierCalls = 0;
      const time = clock();
      const result = await selectJevReplyPreparation({ turn, routing: () => 'cached tools',
        template: () => { classifierCalls++; return { accepted: true }; },
        setTimer: time.setTimer, clearTimer: time.clearTimer });
      expect(result.kind).toBe('model');
      expect(result.eligibility.eligible).toBe(false);
      expect(result.eligibility.reasons.length).toBeGreaterThan(0);
      expect(classifierCalls).toBe(0);
      expect(time.pending).toBe(0);
    }
  });

  it('uses detected Darija, rather than the corpus script label, and keeps zero-grace fallback', async () => {
    const routing = deferred(), candidate = deferred(), time = clock();
    let candidateSignal;
    const selection = selectJevReplyPreparation({ turn: firstTurn(), routing: () => routing.promise,
      template: signal => { candidateSignal = signal; return candidate.promise; },
      setTimer: time.setTimer, clearTimer: time.clearTimer });
    await flush(); time.advance(50); routing.resolve('tools'); await flush();
    const selected = await selection;
    expect(selected).toMatchObject({ kind: 'model', eligibility: { eligible: true } });
    expect(time.now).toBe(50);
    expect(candidateSignal.aborted).toBe(true);
    time.advance(800); candidate.resolve({ accepted: true }); await flush();
    expect(selected.kind).toBe('model');
  });

  it('requires a synchronous regex match to be handled before starting either job', () => {
    let calls = 0;
    expect(() => selectJevReplyPreparation({ turn: { ...firstTurn(), regexMatched: true },
      routing: () => { calls++; }, template: () => { calls++; } })).toThrow('synchronous regex candidate');
    expect(calls).toBe(0);
  });

  it('never starts either job for an already-cancelled ineligible request', async () => {
    const transport = new AbortController(); transport.abort(new Error('disconnected'));
    let calls = 0;
    await expect(selectJevReplyPreparation({ turn: {}, signal: transport.signal,
      routing: () => { calls++; }, template: () => { calls++; } })).rejects.toThrow('disconnected');
    expect(calls).toBe(0);
  });
});
