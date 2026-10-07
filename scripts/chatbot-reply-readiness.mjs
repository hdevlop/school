/**
 * Executable reference for plan 9.3, not wired to the School/Najm runtime.
 * Factories only prepare candidates; the caller executes the selected path once
 * through its authenticated executor, after checking the transport signal.
 */
/** Server-supplied eligibility only; this does not authenticate the caller or enable Jev. */
export function jevTurnEligibility(turn = {}) {
  const reasons = [];
  if (turn?.mode !== 'on') reasons.push('mode_not_on');
  if (turn?.regexMatched !== false) reasons.push('regex_matched_or_unknown');
  if (!['fr', 'ar', 'ary'].includes(turn?.language)) reasons.push('unsupported_or_unknown_language');
  if (turn?.channel !== 'web') reasons.push('not_web_channel');
  if (turn?.isAdminUser !== true) reasons.push('not_verified_administrator');
  if (turn?.historyComplete !== true) reasons.push('history_incomplete_or_unknown');
  if (turn?.priorUserTurns !== 0) reasons.push('not_verified_first_turn');
  return { eligible: reasons.length === 0, reasons };
}

/** Offline contract: an ineligible turn never invokes the classifier factory. */
export function selectJevReplyPreparation({ turn, ...options }) {
  if (turn?.regexMatched === true) throw new Error('Return the synchronous regex candidate before starting readiness preparation');
  const eligibility = jevTurnEligibility(turn);
  return selectReplyPreparation({ ...options, template: eligibility.eligible ? options.template : () => null })
    .then(selection => ({ ...selection, eligibility }));
}

export function selectReplyPreparation({ routing, template, signal, templateTimeoutMs = 800,
  setTimer = setTimeout, clearTimer = clearTimeout }) {
  if (typeof routing !== 'function' || typeof template !== 'function'
    || !Number.isSafeInteger(templateTimeoutMs) || templateTimeoutMs < 1 || templateTimeoutMs > 30000) {
    throw new Error('Supply preparation factories and a template deadline of 1..30000 ms');
  }
  const routingController = new AbortController();
  const templateController = new AbortController();
  return new Promise((resolve, reject) => {
    let selected = false;
    let templateFinished = false;
    let templateOutcome = 'pending';
    const cleanup = () => {
      if (timer !== undefined) clearTimer(timer);
      signal?.removeEventListener('abort', cancel);
    };
    const fail = error => {
      if (selected) return;
      selected = true;
      cleanup();
      routingController.abort(error);
      templateController.abort(error);
      reject(error);
    };
    const cancel = () => fail(signal.reason ?? new DOMException('Request cancelled', 'AbortError'));
    const decline = reason => {
      if (selected || templateFinished) return;
      templateFinished = true;
      templateOutcome = reason;
      if (timer !== undefined) clearTimer(timer);
      templateController.abort(reason);
      // Routing keeps running. Decline/timeout never adds another delay to it.
    };
    const timer = signal?.aborted ? undefined : setTimer(() => decline('timeout'), templateTimeoutMs);
    if (signal?.aborted) { cancel(); return; }
    signal?.addEventListener('abort', cancel, { once: true });

    // Attach both fulfillment/rejection handlers before work can settle. Losing
    // jobs may ignore abort, but can never change the sealed selection or reject
    // without a handler. Integrations still need terminal attempt accounting.
    Promise.resolve().then(() => {
      if (!selected) return routing(routingController.signal);
    }).then(value => {
      if (selected) return;
      selected = true;
      cleanup();
      if (!templateFinished) templateOutcome = 'cancelled_on_routing';
      templateController.abort('routing_ready');
      resolve({ kind: 'model', routing: value, templateOutcome });
    }, fail);
    Promise.resolve().then(() => {
      if (!selected && !templateFinished) return template(templateController.signal);
    }).then(value => {
      if (selected || templateFinished) return;
      if (value == null) { decline('declined'); return; }
      selected = true;
      cleanup();
      routingController.abort('template_selected');
      resolve({ kind: 'template', template: value, templateOutcome: 'accepted' });
    }, () => decline('error'));
  });
}
