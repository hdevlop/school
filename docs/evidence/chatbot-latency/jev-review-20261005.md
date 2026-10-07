# Jev review — 2026-10-05

Recommendation: continue the default-off classifier experiment, after resolving
the findings below. The intended split is sound: Jev chooses a closed intent,
School renders fixed replies, and Najm remains the only guarded tool executor.
This review covers Stage A helpers/probe and the proposed section-9 integration;
Stage B is not implemented and no end-to-end Jev speed/answer result exists.

Eight existing Jev tests passed (20 assertions), and offline corpus validation
passed for 136 cases. Those tests do not cover the defects reproduced here.
**Zero paid calls, app changes or framework edits** in this review. The mocked
CLI intercepts every fetch and forbids all other network calls.

## Findings, in priority order

### 1. P1 — Invalid decisions can pass the acceptance guard

**Resolved in the follow-up below.** The reproduction describes the pre-fix code.

[`parseDecision`](../../../scripts/chatbot-jev.mjs#L76) only checks `typeof`
for confidence and the Noul value; `accepts` relies on comparisons without
checking finite/ranged values. Offline reproduction: confidence **1.5**, write
probability **-0.1**, probability-map value **2** and usage cost **-1** all parse;
the read intent is accepted at threshold 0.8 with the write guard enabled.

The actual 408-call record is not shown to contain these malformed values. This
is a boundary-validation bug, not proof of an observed misclassification or an
authorization leak; current Jev code runs only the probe. It must be fixed before
those parser/acceptance helpers move into template routing.

Require finite values in [0,1] for confidence/Noul/probabilities, a closed and
consistent probability map, valid selected choice/model, nonnegative finite
cost and integer nonnegative token counts when provided. Validate the configured
threshold too. Unknown/invalid metadata must reject the decision or its budget
settlement. Test negative, >1, missing and nonfinite values, inconsistent maps,
and exact boundary values. TypeSafe documents confidence as a distribution
statistic in [0,1], not calibrated correctness accuracy:
[confidence documentation](https://docs.typesafe.ai/confidence).

### 2. P1 — The paid probe counts unknown cost as zero

**Resolved in the finding 2 follow-up below.** This reproduction describes the
pre-fix code. The [probe](../../../scripts/chatbot-jev-probe.mjs) used
`spentUsd += result.decision?.costUsd ?? 0`. Missing cost, timeout/error or a
malformed response can therefore consume paid attempts without advancing the
stop. Negative cost accepted by the parser can reduce the accumulated spend.
There is also no separate explicit maximum outer-request allowance.

[Offline mocked CLI evidence](jev-review-budget-20261005.json): with a
$0.000001 budget and three responses missing cost, the runner dispatches all
three, reports $0 spent, no errors and no stop reason. No network was used.

Reserve before dispatch, require an explicit maximum request count, and stop on
unknown cost rather than declaring zero. Reuse the existing benchmark budget
pattern; keep estimates, provider-reported costs and ledger observations separate.
Add CLI tests for missing/invalid usage, failed/timeout attempts and reservations.
The published [Decisions response schema](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request)
includes usage; a malformed response should not silently evade accounting.

### 3. P1 — Parallel routing alone does not meet the fallback latency gate

**The design is corrected in the follow-up below; runtime work is pending.**
The original section 9.3 started routing A and template/Jev B in parallel, then
described fallback when B returned null/errors/timed out. B1 gave B an 800 ms
timeout, while B4 permitted only 100 ms fallback p95 regression. It did not specify
what happens when A is ready first.

Following the stated wait-for-B fallback branch, A ready at **50 ms** and B
timing out at **800 ms** delays model start by **750 ms**. Running both jobs
in parallel does not remove that wait. This is a defect/ambiguity in the proposed
scheduling contract, not an implemented runtime regression.

Specify a single selection deadline/race: when routing is ready, either start
normal generation immediately or permit at most the declared short grace period.
Late Jev results must never replace a path that has started, execute duplicate
reads or trigger a second answer. Measure the accepted-coverage loss from that
short grace; do not promise both full classifier coverage and unchanged fallbacks.
Tests need fast-routing/slow-Jev, routing cache hits, late acceptance, timeout,
client cancellation, and exactly one tool/model path.

### 4. P2 — The current language gate skips useful French paraphrases

**The School language profile and probe candidate accounting are fixed in the
follow-up below.** Stage A used fixture language labels for baseline/scoping;
the original B2 proposal called Jev only after the synchronous detector returned
fr/ar/ary. That detector returned null for test queries such as:

- `Tu peux me dire le nombre total d'élèves ?`
- `On a combien d'élèves en tout ?`
- `Qui est absent aujourd'hui ?`
- `C'est quand le prochain examen ?`

[Offline replay](jev-review-offline-20261005.json) verified the current corpus
hash matches the original probe. At 0.8 with the write-agreement guard, the
204 test samples yield 125 accepted samples across **42 unique cases**, not the
44 stated in the report. Applying the proposed actual language gate leaves
66 accepted samples/22 unique cases; regex-first reduces Jev's new contribution
to **63 samples/21 unique cases**. Eight otherwise accepted French/Darija cases
are skipped by detection; English/Spanish exclusions are intentional.

The original 92.6% classification coverage is valid for its synthetic labels;
it is not the effective coverage of the proposed production pipeline. Expand
and verify language detection without forcing a fixture's known language into
the runtime evaluation. B0's 150 unique accepted cases must be counted after
actual eligibility, regex-first, threshold and write gates, in the supported
languages. Preserve the original raw report; correct its unique-case recount
separately. Even the all-language 42-case result does not establish a 98% floor.

### 5. P2 — Abandoned routing needs a terminal diagnostics/cancellation contract

B1 says to ignore routing after a template wins and avoid unhandled rejections.
That is insufficient for the existing request-scoped capture contract. The
published recorder marks active RAG scopes incomplete when the chat settles;
the RAG capture drops callbacks once its scope is closed. Depending on scope
placement, an early template could leave incomplete records or hide actual
embedding attempts. Waiting for A to finish instead can erase the early-return win.

Specify cancellation or explicitly unused/partial terminal outcomes, account for
attempts already started, and prevent later work from mutating a settled record.
Test early template completion against slow/hanging/rejecting routing and verify
the correct request ID, one terminal record and honest attempt counts. Client
cancellation must propagate from transport to the hook, not just a timeout timer.
`priorUserTurns` must be authoritative/conservative when history is truncated or
disabled; an unknown history must not be treated as a verified first turn.

## Integration and measurement limits

- Published `najm-chatbot@3.3.0` exposes only a synchronous template hook,
  after routing/context, and no prior-turn/signal/label fields. B1 needs a
  supported published upgrade. The repo's Desktop Najm checkout is read-only:
  perform upstream work in its authorized writable project and consume its
  published release; do not edit/link/copy the Desktop source into School.
- Resolving a classified read against the full MCP registry can be correct,
  provided the existing read-only/confirmation checks, authenticated builder,
  selected-year scope and controller guards remain. Jev cannot supply arbitrary
  tool names/arguments or authorize writes; failed reads must stay failures.
- Keep the classifier off on exact regex hits and in mode off. Scope initial
  rollout explicitly to roles/channels; the prompt says administrator but the
  proposed gate currently names only language and first turn. Do not assume
  ordinary-role acceptance from the synthetic admin classification probe.
- The 0.3–0.5 s accepted-answer projection is not measured end-to-end performance:
  it omits serving/read timing and the race/timeout selection effects. Compare
  off/on on the same upgraded runtime with realistic eligible traffic, include
  every classification/fallback cost, and report model/template/fallback paths.
- Keep the existing conservative threshold and native/held-out corpus work;
  confidence 0.8 does not establish 98% precision. The existing probe already
  correctly acknowledges non-independent repetitions and that limitation.
- The provider-comparison report reconciles the shared Jev/Cerebras/Crusoe key
  window in aggregate. Use that reconciliation, not the old $0.0043 gap as an
  unexplained Jev invoice. Keep the original observations unchanged.

## Recommended next work

Decision parsing and probe budget controls are resolved in the follow-ups below.
Next replay the full proposed eligibility pipeline and specify the readiness race
and cancelled/unused diagnostics contract before upstream B1 implementation.
Grow independent native/held-out coverage against those actual gates. Only after
the supported release and local checks should a newly budgeted isolated off/on
experiment assess end-to-end benefits. No enablement is recommended from Stage A.

Supporting artifacts: [offline parser/language/scheduling evidence](jev-review-offline-20261005.json),
[mocked budget evidence](jev-review-budget-20261005.json). Implementation, original
paid samples and runtime settings remain unchanged by this review.

## Finding 1 follow-up — response validation fixed

The Stage A helper now requires finite confidence, Noul and probability values
in [0,1], all nine known probability keys, a sum consistent with the retained
two-decimal rounding, and a selected choice with maximal probability. It accepts
only the pinned Jev release family. Usage must include a nonnegative finite cost
and a nonnegative safe integer input-token count; output tokens, when present,
must also be a nonnegative safe integer. The acceptance guard independently
rejects malformed normalized scores, unknown choices and invalid thresholds.
Threshold equality and the existing 0.5 write-agreement boundary are preserved.

Verification: `bun test scripts/tests/chatbot-jev.test.mjs` passed **15 tests / 154
assertions**; `bun scripts/chatbot-jev-probe.mjs --validate` passed for **136 cases**;
`bun run lint` passed. The original malformed-payload reproduction now rejects.
[Offline replay](jev-validation-replay-20261005.json) reconstructed API-shaped
bodies from **408 saved normalized decisions** and preserved every normalized
field and raw/guarded acceptance at thresholds 0.5, 0.8 and 0.99. Original wire
bodies were not retained, so this is a normalized-record replay, not a new paid
acceptance test. The raw report is unchanged; **zero new paid requests** were made.

After this validation follow-up, finding 2 remained open: missing cost made parsing
fail, but the probe still
accounts for failed/unknown-cost attempts as zero and continues. Its budget stop
and request allowance need a separate fix. Scheduling, language eligibility and
runtime integration also remain open. Jev stays off; no app or framework code
was changed by this follow-up.

## Finding 2 follow-up — spending stop fixed

The probe now requires explicit request-count and per-request reserve allowances,
reserves before dispatch, and stops on unknown cost while retaining its reservation.
The original missing-cost mock stops after one attempt rather than sending three.
Known reported cost survives malformed decisions and HTTP failures. Reports expose
unknown attempts and incomplete cost coverage; stopped/error runs save evidence
and exit nonzero. Reservations remain client estimates, not a hard billing cap.

[Fix and offline verification](jev-budget-fix-20261005.md): 35 focused tests / 353
assertions, lint and offline corpus validation passed; zero paid calls were made.
Original mock and paid observations remain unchanged. Findings 3–5 (scheduling,
language eligibility and terminal diagnostics) and runtime integration remain
open. Jev stays off; no app or framework code was changed by this follow-up.

## Findings 3 and 4 follow-up — readiness contract and School language profile

[Fix and verification](jev-language-readiness-fix-20261005.md): the target design
now selects ready routing immediately, rather than waiting for the classifier's
800 ms deadline. An executable offline reference covers the 50/800 ms example,
cache hits, declines, failures, timeouts, cancellation and losing promise outcomes.
It is not wired into the published runtime. The terminal diagnostics contract is
specified, with implementation and runtime validation still outstanding.

School's production config and domain context now share one profile extending the
published Moroccan detector with clear French openings and multi-signal Arabizi.
The probe counts language/regex eligibility using the actual query. Hash-matched
offline replay of 1,491 saved decisions raises potential new accepted cases from
21 to 29 in Stage A and 100 to 127 in B0, without changing any classifier result.
The B0 accepted error remains; the accuracy gate still fails. There are still 11
unrecognized Arabizi test queries in B0. Keep the mode off and preserve the
original paid reports. No new paid calls or framework edits were made.
