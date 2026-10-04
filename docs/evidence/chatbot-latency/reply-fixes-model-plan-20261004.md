# Faster model comparison after reply fixes — 2026-10-04

Run only after completing and reviewing the fixed-prompt current-model run.
The user's third requested step is a faster-model comparison using the same
questions and checks. The existing plan's candidate is
`nvidia/nemotron-3.5-lightning:nitro`; retain `openai/gpt-oss-120b` as the saved
model and restore it after the experiment. This experiment does not adopt a
replacement.

Freeze the same 50-case corpus, fixed prompt, pins, year `2026-2027` and admin
role. Run one interleaved baseline/candidate pair per case: exactly 100 outer
paid requests, concurrency 1, fresh query/knowledge cache resets per request,
matching model and request diagnostics required. No paid warmups or retries.
Record $1 client estimated-spend stop and $0.01 reservation per request; these
are assistant-selected operating limits, not a provider billing cap. Stop on
unknown cost or failed fresh-cache verification. Retain replies for review.

The isolated dev API at port 3104 isolates process caches and diagnostics;
its database and AI settings are shared with the existing dashboard. Model
updates apply to shared settings during the serial experiment and are restored
by the runner's `finally` block. Verify the saved model after completion.

Availability, tool support and catalog/endpoint prices were captured before
execution in `reply-fixes-model-prices-20261004.json`, directly from OpenRouter's
model and endpoint APIs. Model-level rates: GPT-OSS $0.037/$0.17 and Nemotron
$0.0595/$0.17 per million input/output tokens. Nitro routes by throughput and
can select priority endpoints with different prices; these catalog rates and
the runner's installed estimates are not invoices. Primary routing reference:
[OpenRouter Nitro](https://openrouter.ai/docs/guides/routing/model-variants/nitro).

Preserve all original automatic checks and section 6.4 gates; also review
attendance-write wording and exam totals/schedules against the recorded facts.
This is one admin repetition per variant, not broader role, conversation,
production or per-language p95 acceptance. Provider prompt caching and actual
host selection are uncontrolled. A faster answer alone does not qualify a
replacement.

## Price-stop recovery, recorded before resuming

The first attempt sent one candidate greeting, then stopped on missing installed
pricing and restored GPT-OSS. Preserve it as `reply-fixes-model-price-stop-20261004.json`.
Revised total comparison request ceiling: **101**, that one attempt plus a fresh
100-request paired run. Separate resumed estimate stop: $1, reservation $0.01.
The stopped call's conservative token subtotal is $0.00059856, separate from
the resumed budget. No other paid retry or probe is planned.

The runner now supports an explicit `--pricing-file`, validated before network
calls. Fallback estimates require full coherent token counts and matching
stream/server model IDs. Raw SDK `pricingFound: false` stays unchanged;
declared estimates are reported separately. Unknown usage or wrong diagnostics
still stop the budget. Mock CLI tests verify this and model restoration.

`reply-fixes-declared-prices-20261004.json` freezes candidate rates $0.14 input /
$0.40 output per million tokens: twice the highest captured endpoint rates
($0.07/$0.20) for budgeting headroom. This is not an invoice or guaranteed
upper bound; actual host/tier/cache/retry billing remains unknown. Catalog-rate
cost comparisons remain separate from conservative declared estimates.

```powershell
bun --env-file=apps/dashboard/.env.local scripts/chatbot-benchmark.mjs --base-url=http://localhost:3104 --repeat=1 --max-requests=100 --concurrency=1 --cache-mode=fresh --max-estimated-usd=1 --request-reserve-usd=0.01 --pricing-file=docs/evidence/chatbot-latency/reply-fixes-declared-prices-20261004.json --keep-text --compare-model=nvidia/nemotron-3.5-lightning:nitro --output=docs/evidence/chatbot-latency/reply-fixes-model100-20261004.json
```
