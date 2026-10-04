# Request-scoped embedding diagnostics — 2026-10-04

Published `najm-rag@2.4.0` and `najm-chatbot@2.2.1`, then installed them in
School with exact root/workspace pins, matching overrides and `bun.lock`.
No paid chat/embedding benchmark, database migration or deployment was run.

## Contract and integration

- `withEmbeddingDiagnostics` scopes async embedding calls using
  AsyncLocalStorage. `RAG_DIAGNOSTICS` exposes the same contract through a
  `RagDiagnosticsRunner` DI bridge. Concurrent requests and nested scopes retain
  their own collectors; work detached after a scope closes cannot append events.
- Each logical `embed`, `embedBatch` or `health` call records purpose, operation,
  cache hit/miss/bypass, start/duration, input count, provider/model, timeout
  bound and outcome. Actual HTTP batch requests and health retries appear in
  `attempts`. Single-text calls do not duplicate their internal batch as another
  logical span. Cache hits and cooldown skips have zero attempts.
- Routing, preview, knowledge search and indexing callers carry operation labels.
  Events contain no query text, vectors, endpoint, credentials or raw error text.
  Diagnostic sink throws/rejections do not change returned vectors or failures.
- Chat captures preparation and MCP tool-side embeddings in both streaming and
  `runOnce`, preserving existing authorization/request scope. Offsets are
  adjusted to chat request start. The bridge is optional; older RAG/apps without
  it leave the `embeddings` field absent instead of claiming zero calls.
- `embeddingsIncomplete` marks chat termination while capture is still running.
  Counts are then partial. Late completions cannot mutate the terminal record.
- School keeps `chatLogging.enabled: false` and its existing `onDiagnostics`
  sink. A runtime factory check using the installed packages confirmed the RAG
  bridge registration and sink configuration, with durable logging disabled.
- The benchmark adds `summary.embeddings` across **all** outcomes. It reports
  capture coverage, partial records, logical calls, real provider attempts,
  cache/operation/outcome counts and separate call/attempt p50/p95. Unknown
  capture and incomplete empty records never count as verified zero calls.
- `EmbeddingService.clearQueryCache()` is an instance-level control only. It
  does not reset cooldown, other caches, routing settings or model residency.

Do not add embedding durations to their enclosing preparation, routing, context
or tool spans, or add attempts to their logical-call duration.

## Release evidence

Najm work was scoped separately from School; School consumes registry packages.

| Package | Packing commit | SHA-256 of packed and downloaded registry tarballs |
|---|---|---|
| `najm-rag@2.4.0` | `3361863cf04b765292771f2f989252dab4be15ae` | `6b0e628f4fc6b2db742d9953ea40678cdd04380e384323d54839934a9a9a15f6` |
| `najm-chatbot@2.2.1` | `7dd599a079608292e11d6be32b30d5b111fa0679` | `ef9e63db9452ed6adbe4d1d350b243d1a9f6b7da4562947fc32786b0afb7da9d` |

Both were built/tested/packed by `scripts/publish-package.ts`, then published as
the exact commit-attributed tarballs. Registry integrity/shasum were verified
with `--verify-published`; downloaded SHA-256 values matched the packed files.
The registry SHA-512 integrity values are retained in School's lockfile.

## Verification

- RAG package: **271 passed, 0 failed**; chatbot package: **196 passed, 0 failed**.
  Builds and public API snapshot checks passed; release gates also passed.
- RAG regressions cover miss/hit, batch failure, timeout/cooldown, transport,
  bad response/config, health retry, concurrent/nested scopes, detached work,
  failing sinks and independent cache resets.
- Chat regressions cover streaming/runOnce, tool-side calls, concurrent request
  IDs, setup/embedding failures, unavailable bridge, zero settled calls and
  stable partial records after abort. Offset assertions allow clock rounding
  at the documented tenth-of-a-millisecond precision.
- School focused summary/pins/Darija checks: **22 passed, 0 failed**;
  benchmark fixture validation: **50 valid cases**.
- `bun run lint` and `bun run test`: passed. Contracts/server source typechecks
  passed. Root `bun run typecheck` stopped at the existing finance test's
  `TS2769` in `packages/server/tests/academicYears/FinanceDashboardYearScope.test.ts:262`:
  partial expected rows lack fields in the finance service's inferred row type.
  This file and the finance work were outside the diagnostics changes.
- Seed and dashboard source/test typechecks: passed. Production build: passed
  with `NAJM_NEXT_DIST_DIR=.next-embedding-check bun run build`. The isolated
  directory avoided a busy default `.next` directory. Its generated output was
  removed later the same day, once removal was approved.

## Synthetic overhead check and remaining acceptance

[Overhead artifact](embedding-overhead-20261004.json): 20 alternating batches
per mode, 2,000 cached calls per batch, using published packages and a mocked
provider. One synthetic warm-up request populated the cache; all 40,000 scoped
calls produced records. Median time per call was about **0.00065 ms unscoped**
and **0.00163 ms scoped**. This measures a small cached-call collector on this
machine under local conditions; it establishes no live chat/provider latency,
accuracy, billing result or production overhead bound.

Remaining: restart any running app to load the new package versions, re-run
the stricter live quality benchmark within its recorded budget, control all
cache/model states, validate live concurrency correlation, and measure a
controlled default-model baseline. Historical smoke reports remain dated evidence.
