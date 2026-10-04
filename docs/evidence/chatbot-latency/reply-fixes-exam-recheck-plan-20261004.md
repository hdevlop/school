# Corrected exam prompt recheck — 2026-10-04

The first 100-request fixed-prompt run completed but is not accepted: automatic
checks passed 97/100, three Spanish replies had inconclusive language heuristics,
and direct exam review found two invented counts (13 total instead of 12; nine
remaining after showing five instead of seven). One Spanish reply showed ten
exams despite the five-item instruction. Preserve all original evidence.

Attendance refusals were explicit in all six attendance-write samples, with no
write promises or completed-write claims. Their prompt instruction is unchanged.
The corrected exam instruction removes the new requirement to count records:
no total/remaining counts unless a tool explicitly returns one. Still show the
next five and offer more without guessing a number.

Recheck the five original exam questions twice, unchanged queries/checks in
`reply-fixes-exam-cases-20261004.json`, saved GPT-OSS model, same year/role,
concurrency 1, fresh caches, retained replies. Record a maximum of ten additional
paid outer requests, $0.10 estimated-spend stop, $0.01 reservation per request,
no paid warmups/probes/retries. Current price snapshot remains the same day's
`reply-fixes-prices-20261004.json`. These are estimates, not a billing cap.
Review each schedule row, list length and any count directly against the twelve
recorded exams. Run the model comparison only after this review passes.

```powershell
bun --env-file=apps/dashboard/.env.local scripts/chatbot-benchmark.mjs --base-url=http://localhost:3104 --cases=docs/evidence/chatbot-latency/reply-fixes-exam-cases-20261004.json --repeat=2 --max-requests=10 --concurrency=1 --cache-mode=fresh --max-estimated-usd=0.10 --request-reserve-usd=0.01 --keep-text --output=docs/evidence/chatbot-latency/reply-fixes-exam10-20261004.json
```
