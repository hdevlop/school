# Jev probe spending-stop fix — 2026-10-05

Finding 2 is resolved in the classification-only CLI. Every live run now requires
an explicit `--max-requests=1..5000` and positive `--request-reserve-usd` no greater
than `--budget-usd`. The monetary budget retains its $0.05 default and $0.25 maximum.
`--validate` remains offline and needs neither allowances nor a key.

The probe reuses `createEstimatedBudget`: reserve before dispatch, settle known
provider-reported `usage.cost`, and retain the reservation and stop on missing or
invalid cost. Timeout, invalid JSON and HTTP failures without cost all stop the
next request. Valid reported cost is preserved even when decision validation or
HTTP status fails. Such errors remain errors and are included in cost accounting.
The request cap counts every dispatched decision attempt across repetitions,
including failures and reported zero-cost responses. Key ledger reads are separate.

Reports include per-attempt `reportedCostUsd` (null for unknown), known/unknown
cost counts, `costComplete`, reservation state and a stop reason. The existing
`summary.reportedCostUsd` now explicitly means the sum of known reported costs,
including failed decisions, rather than a complete bill. Stops and sample errors
return exit code 1 after saving the report. A failed postflight key read is retained
as an observation error and does not discard the report.

## Offline verification

The [CLI regression suite](../../../scripts/tests/chatbot-jev-probe.test.mjs)
replaces every fetch before importing the real probe. Unexpected URLs throw;
no provider, app or database call is possible.

| Scenario | Verified behavior |
|---|---|
| Original three-request missing-cost mock, $0.000001 budget/reserve | One attempt; stop `unknown_request_cost`; reservation retained; cost incomplete |
| Invalid/missing cost, invalid JSON, HTTP failure, timeout | Stop after one unknown-cost attempt |
| $0.01 budget, $0.006 reserve and first reported cost | Second request blocked before dispatch |
| Three $0.003 costs with $0.009 budget | Exact fit; all three complete; reservations released |
| Five repetitions, two-request cap, reported zero costs | Exactly two attempts; stop `max_requests_reached` |
| Malformed decision / HTTP failure with valid cost | Cost retained, failures recorded, no claim of successful classification |
| First cost exceeds budget | Actual reported overrun retained; no second dispatch |
| Invalid allowances | Reject before any fetch |
| Failed postflight ledger read | Report retained with ledger error |

`bun test scripts/tests/chatbot-jev-probe.test.mjs scripts/tests/chatbot-jev.test.mjs
scripts/tests/chatbot-budget.test.mjs` passed **35 tests / 353 assertions**.
`bun run lint` passed. Offline corpus validation passed for the then-current
**361 cases**; the corpus is being expanded separately. **Zero paid calls** were
made by this fix. [Verification record](jev-budget-verification-20261005.json).

The original [mock evidence](jev-review-budget-20261005.json) and paid probe remain
unchanged. These reservations are client estimates, not a provider billing cap;
an individual attempt can cost more than its reservation. The readiness race,
language eligibility and runtime integration remain open, with Jev off.
