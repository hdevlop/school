# Isolated application-cache controls — 2026-10-04

Implemented in School against published `najm-rag@3.1.0` and
`najm-chatbot@3.1.0`. Matching Desktop sources were consulted read-only; no
Najm source or School pins were changed. No paid chat requests were sent.

## Controls and verification

- REST-only status/reset routes require sign-in plus principal/admin role.
  Cache reset also requires `CHATBOT_BENCHMARK_CONTROLS=true` and a
  non-production process. It is disabled by default and always refused in
  production. The current local dev app was started with controls disabled.
- Reset calls only the published `EmbeddingService.clearQueryCache()` and
  `KnowledgeContextProvider.clearCache()` methods on the injected app instances.
  No private cache access, monkey-patching, persistent data changes or model
  unloads are involved. A process UUID/reset counter accompanies the response.
- When controls are enabled, School adds the same instance/current reset count
  to terminal diagnostics without mutating the package's original record.
- The runner's serial `--cache-mode=fresh` checks enabled controls before any
  chat, then resets before every independent sample. It verifies the response's
  advancing counter, matching diagnostic instance/counter, complete embedding
  capture and a completed routing miss with a successful provider attempt.
  Wrong instances, intervening resets, hits, cooldown, bypass, no call, failed
  attempts and partial traces cannot be called fresh. Preflight does not reset.
- `sample.cacheCondition` and `summary.cacheConditions` keep condition failures
  visible and stop further scheduling when freshness verification fails.
  Default/concurrent runs remain uncontrolled; fresh mode rejects
  concurrency above one and transport-probe mode before network calls.

## Evidence

Focused control/policy/CLI checks passed. Mock CLI checks reset every sample,
preserve reset IDs, reject disabled controls before chatting, reject observed
hits and perform a zero-reset/zero-chat fresh preflight.

[Live guard observations](cache-guards-20261004.json): anonymous status/reset
returned **401**; admin status returned **200** with controls disabled; admin
reset returned **404**. **Zero resets and zero chat requests** occurred.

Backend source/test typechecks and lint passed. Script/boundary checks:
**162 passed, 0 failed**, 1,267 files and 287 client entries checked. Production
build passed using isolated `NAJM_NEXT_DIST_DIR=.next-chat-cache-check`.
The isolated output remains ignored by Git. The four backend control regressions,
including exact administrator role metadata, passed; `git diff --check` passed.
Existing chat regressions: **20 passed, 0 failed**; security regressions:
**46 passed, 0 failed**. Fixture validation: **50 valid cases**.

## Limits

These are query-embedding/knowledge-context controls, not all application caches.
Failure cooldown, settings/file caches, sessions, provider prompt caching and
model residency remain intact. Knowledge can reuse a routing vector within the
same request. Populated knowledge, same-instance isolation during real paid
concurrency and cold/warm model conditions still require controlled acceptance.
Terminal IDs detect process/reset mismatches; a shared multi-process deployment
is not an isolated benchmark target. Request and monetary budgets remain unset.
