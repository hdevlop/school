# Concurrent benchmark runner — 2026-10-04

School's streaming benchmark now supports `--concurrency=1`, `2` or `4`.
This change used only synthetic loopback responses; no live School chat,
provider call, model setting, database record or deployment was changed.

## Behavior

- Bounded workers keep their slot through streaming and diagnostic retrieval.
  Each case/repetition retains a unique fresh session and request ID. Completion
  order can differ; persisted samples retain their planned `scheduleIndex` order.
- Planned requests and `--max-requests` checks remain unchanged. Insufficient
  budgets are rejected before network calls. Model comparisons and transport
  probes require concurrency 1, checked before login or shared settings changes.
- Chat diagnostics and all captured embedding span IDs must match the request.
  Mismatched records are discarded before scoring or aggregation and fail the
  run. Concurrent runs require a verified server record per request. Missing
  embedding capture remains unknown in the existing embedding summary.
- HTTP errors now retain the common sample/report fields and attempt diagnostic
  retrieval. HTTP 429 and all failures remain visible in counts. If a worker
  throws unexpectedly, new scheduling stops and in-flight workers drain before
  the runner writes its interrupted report or restores shared model settings.
- `summary.load` reports verified/missing records, correlation failures, duplicate
  IDs, HTTP 429 and client worker-queue p50/p95. Client queue time is separate
  from request latency and does not measure server/provider queueing.
  `loadElapsedMs` covers the workload and diagnostic retrieval.

## Verification

`bun test scripts/tests/chatbot-load.test.mjs scripts/tests/chatbot-embedding-diagnostics.test.mjs scripts/tests/chatbot-stream.test.mjs scripts/tests/chatbot-scoring.test.mjs`:
**34 passed, 0 failed**.

The real CLI was tested against an ephemeral mock HTTP server:

- 12 requests at concurrency 2 and 12 at concurrency 4, with observed overlap
  equal to the selected cap, out-of-order finishes, unique IDs, exact budgets,
  stable report order and matched chat/embedding diagnostics.
- Parallel comparisons/probes, invalid concurrency and insufficient budgets:
  all rejected before any network request.
- Serial comparison interleaving and restoration of the saved model preserved.
- HTTP 429, wrong chat ID and wrong embedding ID correctly fail the run;
  rejected records contribute no server/embedding measurements.
- Worker failure stops further scheduling and drains already-started work.

Fixture validation: **50 valid cases**. `bun run lint`: passed.
`bun run test:boundaries`: **146 passed, 0 failed**, with workspace boundaries
passing across 1,260 files and 287 client entries. `git diff --check`: passed.
No production build was needed for this script-only change.

## Remaining acceptance

Run each live concurrency level separately with recorded request/monetary budgets,
frozen fixtures/configuration and observed cache/model conditions. This is a
closed workload, not a fixed arrival-rate generator. Mock timings establish no
live throughput, latency, provider cost or production isolation result. Other
cache controls, monetary cutoff and broader role/conversation coverage remain
pending in the main latency plan.
