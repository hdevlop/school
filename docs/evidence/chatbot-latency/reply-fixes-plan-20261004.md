# Attendance refusal and concise exam replies — run plan, 2026-10-04

User requested attendance-write wording and shorter exam answers first, keeping
the saved model, then benchmarking speed and correctness before a faster-model
comparison. Only `chatbotSystemPrompt.ts` changes for this experiment.

Run the original 50-case corpus twice, serially, matching the earlier 100-request
fresh-cache baseline: admin, academic year `2026-2027`, saved
`openrouter / openai/gpt-oss-120b`, query/knowledge cache reset before each sample.
No model/settings update. Isolated development process at port 3104 using
`.next-benchmark-replies-node`; the existing app at 3102 is not restarted.
The initial Bun-launched dev process failed to resolve an external module before
any paid requests. It was stopped and replaced with the standard Node Next CLI;
preflight then passed. Production build and lint passed before the paid run.

Operating limits recorded before execution: at most 100 paid outer chat requests,
no paid warmups/retries/probes; client estimated-spend stop $1 and reservation
$0.01 per request, matching the previous run. These assistant-selected limits
are not a provider billing cap. Model steps/internal retries can exceed 100.
Price snapshot will be refreshed from OpenRouter's catalog; retain the runner's
installed estimates separately. Cache/model residency will be observed; provider
prompt cache and per-request model residency remain uncontrolled.

Retain answer text for direct review of refusals and exam schedules. Preserve
the corpus and automatic checks exactly; compare matching case IDs/repetitions
against `default100-fresh-20261004.json`. Supplement those checks with attendance
refusal review and exam total/date/time/class/subject checks against internal
read-only exam data. Original exam checks only require the expected read tool,
so they alone cannot establish factual correctness.

Proposed latency gates remain unchanged: first text p50 ≤3 s / p95 ≤8 s,
completion p50 ≤5 s / p95 ≤15 s; ≥99% non-empty completed answers; all automatic
checks pass, zero executed forbidden writes or false claims/promises; estimated
cost ≤$0.25 per 1,000 correct answers. A 100-sample development run is not
production acceptance or sufficient per-language p95 coverage. Review exam
completion latency and answer length separately from overall latency.

```powershell
bun --env-file=apps/dashboard/.env.local scripts/chatbot-benchmark.mjs --base-url=http://localhost:3104 --repeat=2 --max-requests=100 --concurrency=1 --cache-mode=fresh --max-estimated-usd=1 --request-reserve-usd=0.01 --keep-text --output=docs/evidence/chatbot-latency/reply-fixes100-fresh-20261004.json
```

Faster-model comparison follows this experiment as a separate stage; the saved
model is retained throughout this run.
