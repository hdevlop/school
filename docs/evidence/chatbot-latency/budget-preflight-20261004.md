# Budget controls and read-only preflight — 2026-10-04

Implemented School benchmark controls without paid chat calls. The local dev
server was started on port 3102 because no app was listening. It remains running.

## Preflight

`bun --env-file=apps/dashboard/.env.local scripts/chatbot-benchmark.mjs --preflight --output=docs/evidence/chatbot-latency/preflight-20261004.json`:
**passed**, with **zero chat requests and zero model updates**.

[Raw redacted report](preflight-20261004.json) records health/login/settings
status, corpus/config source hashes, pinned packages and dirty revision. Database
and cache health returned `ok`. The saved model is `openai/gpt-oss-120b` through
OpenRouter, enabled with a saved key. No key, password, token or message text is
stored. The first attempt failed to connect before the dev server was started;
the saved artifact is the successful retry.

`readyForChat` establishes saved-settings readiness only. Provider connectivity,
current pricing, embedding residency and tool/schema correctness were not tested.
Application and provider cache conditions remain explicitly uncontrolled. Config
hashes describe checkout source, not a verified effective runtime configuration.

## Estimate stop

Optional `--max-estimated-usd` and `--request-reserve-usd` must be positive and
supplied together. Reservations prevent concurrent workers from all spending
the same remaining estimate. Priced stream metadata settles reservations;
unknown request cost retains its reservation and stops scheduling. Insufficient
remaining budget or observed estimates above the ceiling stop new work and drain
already-started streams. Interrupted reports retain samples and model comparisons
still restore the saved model. Usage summaries count unknown costs and include
known failed-attempt costs instead of implying complete pricing coverage.

This is a client estimate stop, **not a hard provider billing limit**. Declared
reservations are not proven per-request bounds; ongoing requests, retries and
provider charges can exceed them. A hard ceiling needs a verified isolated
provider limit. No monetary amount or live paid run was inferred from the plan.

## Verification

Focused budget/load tests: **15 passed, 0 failed**. Coverage includes atomic
concurrent reservations, exact-fit/refunded estimates, unknown/invalid costs,
observed overspend, failed-attempt usage, no-network invalid options, zero-chat
preflight, drained CLI requests, interrupted reports and comparison restoration.
`bun run lint`: passed. `bun run test:boundaries`: **155 passed, 0 failed**;
boundaries passed across 1,260 files and 287 client entries. Fixture validation:
**50 valid cases**. `git diff --check`: passed. This script-only change required
no new production build.

## Remaining work

The request and USD limits for paid execution have been requested from the user.
Current prices/date and provider limits must be recorded before a budgeted run.
Controlled app-cache/model-state tests, authoritative fixture expansion and live
concurrency acceptance remain separate gaps in the latency plan.
