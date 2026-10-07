# Benchmark cost accounting — 2026-10-05

The previous runner used declared prices only for models missing SDK pricing.
Known GPT-OSS SDK rates therefore understated the Cerebras-first workload and
controlled the estimated stop despite a current price file. Ledger reads used
the environment key without proving equality to School's saved selected key.

## Changes

- `--pricing-mode=declared` explicitly prices known SDK usage from a frozen
  file and settles the operating estimate from that result. Default `fallback`
  behavior remains. Raw SDK metadata and `summary.usage` are unchanged;
  separate declared-cost rows/summaries identify the selected mode.
- Declared mode requires a price file and both estimated budget options. Coherent
  nonnegative token counts and matching stream/correlated server provider/model
  are mandatory; unknown or mismatched evidence stops scheduling instead of
  falling back to stale SDK rates. Failed-attempt usage is retained.
- The existing dev/admin-only benchmark controller now has a REST-only
  `GET /api/chat-benchmark/provider-usage`. It refuses production and disabled
  controls, reads the selected provider key through the shared `AiSettingsService`,
  then calls only the fixed OpenRouter key endpoint with redirects refused and
  a 10-second timeout. The response allowlist contains ledger numbers,
  provider/model and equality with the process environment key. It returns no
  credentials, key fingerprints, labels or raw provider bodies. Provider errors
  are sanitized. No database query, settings mutation or MCP tool was added.
- `--capture-provider-usage` records selected-key ledger reads before and after
  scheduling while retaining the cooperative runner lock. Failed initial reads
  block chats; failed final reads remain explicit unknown billing. Preflight
  captures one read with zero chats. Account-window usage is not isolated
  per-request billing or per-generation host attribution.
- Reports retain a separate budget-source hash. The current full repeat uses
  independent maximum input/output catalog rates across eligible hosts, excluding
  Groq: $0.35/$0.95 per million. These are dated conservative assumptions, not
  actual selected hosts, guaranteed billing bounds or an acceptance-cost pass.

## Verification

306 benchmark/chat/read-only tests passed, zero failures, 903 assertions; the
frozen published-dependency checkout passed the same suite. Coverage includes
known-price repricing, preserved metadata, declared-rate reservation stops,
missing usage, provider/model mismatches, selected-key ledger capture, route auth,
disabled/production controls, response allowlisting and sanitized failures.

Server source/test typechecks and root lint passed. Production build passed with
isolated `NAJM_NEXT_DIST_DIR=.next-chat-accounting-check`. Published Najm sources
were read only; pins remain unchanged.

Live preparation verified the selected School key equals the environment key,
with a $50 total limit and $49.311610116 remaining. This improves current-run
attribution; historical raw results and their key-attribution caveats remain.
See the [full-repeat plan](postfix60-plan-20261005.md) and
[readiness record](postfix60-readiness-20261005.json).
