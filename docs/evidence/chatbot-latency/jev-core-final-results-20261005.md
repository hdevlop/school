# Jev core exploration — final scheduled results, 2026-10-05

**Accuracy gate failed: Jev remains off.** All 312 scheduled attempts have now
been dispatched. There are 310 valid decisions and two earlier unknown-cost
HTTP 429 failures. The later 251 attempts succeeded at a minimum two-second
spacing, but the completed results contain one wrong accepted Darija question.

## False acceptance

`core3-ary-21` asks:

> وريني سميات الأساتذة ديال المدرسة، ماشي شحال عددهم.

The request asks for the teachers' names, explicitly excluding their count.
Its frozen label is `needs_llm`. Jev chose `teacher_count` on all three
repetitions, with confidence **0.79, 0.77 and 0.80**. The third passed the frozen
inclusive 0.8 confidence threshold and write-agreement guard (write probability
0.14). It would have selected the count template in the proposed integration;
no School answer was rendered and no tool was called in this classification-only run.

Excluding exam answers did not resolve this list/count boundary. The failure
stays in the results; no threshold, label or wording was changed after seeing
it. This synthetic test set is now spent for tuning. Future dev work needs
teacher-name/list requests, negation and equivalent requests in all supported
languages, followed by fresh independent held-out acceptance.

## Combined result

| Measure | Observed |
|---|---:|
| Scheduled attempts / valid decisions | 312 / 310 |
| Unique queries / correlated families | 104 / 26 |
| Eligible accepted questions after actual language and regex gates | 50 |
| Accepted decision samples across repetitions | 146 |
| Accepted wrong questions / samples | 1 / 1 |
| Writes accepted as reads | 0 |
| Accepted families | 16 |
| Warm successful classification mean | 319.820 ms |
| Warm successful classification p50 / p95 | 309.461 / 422.274 ms |
| Warm successful sample count | 306 |
| Known reported cost, all legs | $0.012219438 |
| Retained unknown-cost reservations | $0.004 |
| Known estimates plus reservations | $0.016219438 of $0.02 |
| New attempts / known reported cost in this follow-up | 251 / $0.009893982 |

Warm metrics exclude the first attempted request from each of four processes.
Those requests remain raw. Pacing is excluded from each API duration. These
measure successful Decisions API classification, not complete School replies,
browser rendering, template execution or the runtime readiness race.

| Fixture language | Valid decisions | Eligible accepted questions | Accepted wrong questions | Candidate coverage |
|---|---:|---:|---:|---:|
| French | 77 | 13 | 0 | 100% |
| Arabic | 78 | 13 | 0 | 86.7% |
| Darija, Arabic script | 77 | 15 | 1 | 90.9% |
| Arabizi | 78 | 9 | 0 | 64.3% |

Coverage is among valid supported-intent opportunities that pass the actual
School language and regex gates. It does not measure all production traffic.
Nine fixture questions fail language detection; details are in the analysis.
Repeated samples and translations are correlated, so 146 accepted samples do
not represent 146 independent accepted questions. Native authorship/review:
**zero**. The zero-error, at-least-150-independent-question gate is not met.

## Dispatch, costs and evidence

The [first two legs](jev-core-results-20261005.md) stopped at 61 attempts.
Following the user's later `continue`, the
[12-attempt recovery check](jev-core-health-20261005.json) succeeded, then the
[remaining 239 attempts](jev-core-finish-20261005.json) completed without a new
429 or unknown cost. Neither earlier failed case/repetition pair was retried. The original
312-attempt/$0.02 allowance remained the cumulative ceiling; both earlier
$0.002 reservations stayed deducted from it. See the
[health plan](jev-core-health-plan-20261005.json),
[finish plan](jev-core-finish-plan-20261005.json) and
[verified finish preflight](jev-core-finish-preflight-20261005.json).

Provider pricing was checked before the continuation: $0.042 per million input
tokens and free output, one TypeSafe endpoint.
[Snapshot](jev-core-health-prices-20261005.json),
[official endpoint](https://openrouter.ai/api/v1/models/typesafe/jev-1.13/endpoints).
The healthy paced window does not establish sustained production availability;
TypeSafe says its capacity limits can change dynamically.
[Provider limits](https://docs.typesafe.ai/models).

Known cost sums valid `usage.cost` across all attempts. Unknown earlier cost is
not zero; the $0.004 reservations remain estimates, not invoice settlement or
a hard billing cap. Selected-key ledger observations are saved separately from
request cost and may lag or include other traffic. Immediate post-run ledger
reads remain raw rather than being used to change reported prices.

The [selected-key snapshot before recovery](jev-core-health-key-before-20261005.json)
was $0.908326190 at 21:42:23 UTC. The
[later settled observation](jev-core-final-key-settled-20261005.json) was
$0.918220172 at 21:56:12 UTC: an increase of **$0.009893982**, matching this
follow-up's known reported cost. The earlier
[post-run observation](jev-core-final-key-after-20261005.json) was $0.916046252
and lagged by $0.002173920. This shared-key match is not an isolated invoice or
proof that either old unknown-cost failure was free; their reservations stay.

[Combined analysis](jev-core-final-analysis-20261005.json) verifies every valid
decision by unchanged parser replay, the contiguous schedule, all report hashes,
the frozen v3 request shape and measured source hashes. Original Stage A, B0
and the earlier raw core reports remain intact.
[Verification](jev-core-final-verification-20261005.json).

The runner also retains bounded `X-RateLimit-Limit/Remaining/Reset` headers and
the documented error metadata fields when provided, alongside `Retry-After`.
This does not add retry behavior.
[OpenRouter limits](https://openrouter.ai/docs/api_reference/limits).

`bun run test:boundaries`: **287 passed, 0 failed, 1,109 assertions**; workspace
boundaries passed. `bun run lint`: passed. No production build was rerun for
these script/test/documentation changes.

## Next gate

Keep Jev disabled. Review the count/list failure on dev data and collect fresh,
independently labelled native questions using the
[collection protocol](../../tests/jev-native-validation.md). The current
synthetic-only validator is not a human intake mode. Native input and review
still need an actual human source; the checklist does not supply one.

The published async hook, readiness selection, role/history eligibility,
authorization, data handling and complete-reply benchmarks remain later B1–B4
requirements. No package upgrade, runtime enablement or deployment occurred.
