# Focused post-fix empty attendance check — 2026-10-05

The user's `continue` follows implementation and local verification of the
empty-attendance prompt/scoring fix, with live verification still pending.
Proceed with this bounded follow-up under the previously disclosed estimated
stop approach. This is a new run; the earlier 60-request allowance is exhausted.

## Scope and operating controls

- Six maximum outer chats: the original French, Arabic and Darija
  `attendance-today` cases, twice each, serial, new sessions.
- New **$0.10 estimated stop**, **$0.01 reserved per request**, no extra paid
  probes, warmups, comparisons or retries. Internal model calls may exceed six.
- Existing environment key: $50 total cap, $49.319845966 remaining at precheck.
  This is **not a hard $0.10 billing cap**. SDK prices are not host-aware;
  selected encrypted School key identity and per-generation hosts are unverified.
  Keep those limitations with any observed usage delta. No key/settings mutation.
- GPT-OSS-120b retained, Cerebras first, fallbacks allowed, Groq excluded,
  low reasoning. Current endpoint catalog still lists Cerebras at $0.35 input
  and $0.75 output per million tokens.
- Frozen School snapshot with its own published dependency installation,
  dedicated dev process on 3102, opt-in benchmark cache controls. Ollama stays up.
- Recheck internal attendance results and live MCP schema before chats. Require
  successful arrays with zero rows; do not create or alter attendance fixtures.
  If data is populated, stop this empty-read check and report the mismatch.
- Verify fresh application caches and request/embedding correlation for every
  chat; stop scheduling on cache failure, model change or unknown estimated cost.

## Review

Capture only array counts from tool results. Retain all six answer texts for
assistant review of empty-record wording, language, date/year, unsupported
attendance claims, unavailability/settings/retry advice and executed writes.
Keep failures unchanged. Automatic passes are wording heuristics, not fluency
certification. Do not pool this focused sample with historical corpus timings.

This run can establish a narrow regression check; it cannot establish full
acceptance, production p95, roles, concurrency or the unchanged $0.25/1,000
correct-answer cost gate. Further paid runs need separate recorded limits.

## Evidence

- [Frozen source manifest](empty-read-manifest-20261005.json)
- [Three-case corpus](empty-read-corpus-20261005.json)
- [Read-only key check](empty-read-key-precheck-20261005.json)
- [Current endpoint catalog](empty-read-endpoint-prices-20261005.json)
- [Observed embedding residency](empty-read-embedding-residency-20261005.json)

## Command

Run from the frozen snapshot after preflight and attendance facts succeed:

```powershell
bun --env-file=apps/dashboard/.env.local scripts/chatbot-benchmark.mjs --base-url=http://localhost:3102 --cases=C:/Users/pc/Desktop/school/docs/evidence/chatbot-latency/empty-read-corpus-20261005.json --repeat=2 --max-requests=6 --max-estimated-usd=0.10 --request-reserve-usd=0.01 --concurrency=1 --cache-mode=fresh --keep-text --output=C:/Users/pc/Desktop/school/docs/evidence/chatbot-latency/empty-read-run-20261005.json
```

Executed once: [focused results](empty-read-results-20261005.md). The six-request
allowance is consumed. No remaining paid requests are authorized by this run.
