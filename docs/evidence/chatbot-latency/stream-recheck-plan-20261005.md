# French wording and concurrency-4 stream recheck — 2026-10-05

User instruction: `continue` after the failed concurrency-4 result and the
proposal to investigate model delay and live-recheck the local French hint.
Old allowances are consumed. No deployment, new model or provider-setting change.

## New allowances and gates

1. Focused French missing-student case: **six outer chats**, serial, new sessions,
   warm resident embeddings, verified fresh application caches before each chat.
   **$0.10 declared-estimate stop**, **$0.01 per-request reservation**.
   Review all six against the frozen query, successful-empty lookup, no write
   promises and French-only labels (stored names exempt). No retries or paid probes.
2. Only if the focused review/correlation/usage checks pass: **60 outer chats**,
   30 refreshed-fact Moroccan cases twice, concurrency **4**, new sessions.
   **$0.25 declared-estimate stop**, **$0.01 per-in-flight reservation**.
   Clear application caches once before the whole batch, never during overlap;
   CLI cache mode remains `uncontrolled`. Report observed hits/misses and stable
   app instance/reset IDs. No additional warmups, retries or model comparison.

Maximum 66 chats and $0.35 in client estimates across both. The existing $50
total provider-key limit is verified before work; these small client allowances
are not hard provider billing caps. Count failed-attempt usage, capture delayed
stable selected-key ledgers between stages, and keep all raw failures.

Keep GPT-OSS/Cerebras-first/fallbacks allowed/Groq excluded/low reasoning,
tool caps, guarded templates, guards and published pins unchanged. Frozen source
now includes the previously locally verified French note/identifier hint and
benchmark-only arrival milestones. Preserve the previous failed report unchanged.

The focused six expensive model replies are diagnostic evidence, not a complete
hybrid-workload cost acceptance test. Before level 4, require every focused reply
to pass correctness/correlation, complete usage capture and this stage's spend
stop; report latency separately without waiving the later full-corpus gates.
For the full corpus retain first-text p95 ≤8 s, completion p95 ≤15 s, fixture and
language checks, zero writes/leaks/promises, complete correlation, and estimated
API cost ≤$0.25 per 1,000 correct replies including failed-attempt spend.

## Investigation and conditions

[Manifest](stream-recheck-manifest-20261005.json): new immutable source snapshot
with an independent frozen-lock install, opt-in dev/admin controls, task-owned
app on port 3102. Check no existing School app occupies that port. Refresh facts
through internal MCP/REST only and re-read effective saved settings/health.
No School data fixtures are created. Local stream/load/chat/security/year tests
353/353 and lint pass; the prior French-hint source/test typechecks and production
build remain valid because the new instrumentation changes only runner scripts.

Stream milestones retain only event type, client arrival time and step index,
plus last-text time and explicit truncation count. They distinguish first tool
arrival, tool result, subsequent step and final text. They include buffering and
transport; they do not measure provider generation, queueing or retries.
Templates have no model-step markers. Milestone storage is bounded at 128 events.

Published `najm-chatbot@3.3.0` exposes no generation IDs/provider metadata in its
diagnostics or UI metadata, nor an app-config model/fetch instrumentation hook.
Its matching Desktop source remains read-only. OpenRouter's official
[generation metadata endpoint](https://openrouter.ai/docs/api/api-reference/generations/get-generation)
requires the generation ID; no guessed ID or broad credential-bearing response
capture is used. Host/queue attribution remains unavailable unless a supported
published diagnostics capability is added later. Do not claim causality from
this repeated closed workload or change production concurrency based on it.

Fresh [catalog](stream-recheck-endpoint-prices-20261005.json) and
[declared maxima](stream-recheck-declared-prices-20261005.json) retain $0.35 input/
$0.95 output per million tokens. These are budgeting assumptions, not host proof.
Do not pool focused/level-4/prior-run percentiles. No paid role/failure/production
stage is authorized within this allowance. Stop the task app after evidence capture.

## Executed commands

From the frozen snapshot after readiness/preflight, each command ran once:

```powershell
bun --env-file=apps/dashboard/.env.local scripts/chatbot-benchmark.mjs --base-url=http://localhost:3102 --cases=C:/Users/pc/Desktop/school/docs/evidence/chatbot-latency/wording6-corpus-20261005.json --repeat=6 --max-requests=6 --max-estimated-usd=0.10 --request-reserve-usd=0.01 --pricing-mode=declared --pricing-file=C:/Users/pc/Desktop/school/docs/evidence/chatbot-latency/stream-recheck-declared-prices-20261005.json --capture-provider-usage --concurrency=1 --cache-mode=fresh --keep-text --output=C:/Users/pc/Desktop/school/docs/evidence/chatbot-latency/wording6-run-20261005.json
bun --env-file=apps/dashboard/.env.local scripts/chatbot-benchmark.mjs --base-url=http://localhost:3102 --cases=C:/Users/pc/Desktop/school/docs/evidence/chatbot-latency/stream-recheck-corpus-20261005.json --repeat=2 --max-requests=60 --max-estimated-usd=0.25 --request-reserve-usd=0.01 --pricing-mode=declared --pricing-file=C:/Users/pc/Desktop/school/docs/evidence/chatbot-latency/stream-recheck-declared-prices-20261005.json --capture-provider-usage --concurrency=4 --cache-mode=uncontrolled --keep-text --output=C:/Users/pc/Desktop/school/docs/evidence/chatbot-latency/stream4-run-20261005.json
```

[Results](stream-recheck-results-20261005.md): six focused passes; full level-4
timing passes, raw automatic 59/60 from a confirmed scorer false positive,
assistant review 60/60. Both request allowances consumed. Actual observed
combined key increase $0.013641560; task app stopped, snapshot retained.
