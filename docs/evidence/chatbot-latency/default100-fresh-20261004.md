# Default model: 100-request fresh-cache benchmark, 2026-10-04

Exactly **100 paid chat requests completed**, with **99/100 automatic fixture
checks passing**. The run failed the proposed latency and read-only reply gates.
The saved `openrouter / openai/gpt-oss-120b` model remains unchanged. No additional
paid probes, warmups or follow-up requests were sent.

Evidence: [raw results](default100-fresh-20261004.json),
[derived analysis](default100-analysis-20261004.json),
[pre-recorded operating limits](default100-plan-20261004.md), and
[read-only preflight](default100-preflight-20261004.json).

## Gates and results

| Measure | Observed | Proposed gate | Result |
|---|---|---|---|
| First text, p50 / p95 | 6.053 / 11.413 s | <=3 / <=8 s | Fail |
| Completion, p50 / p95 | 8.235 / 27.273 s | <=5 / <=15 s | Fail |
| Completed non-empty answers | 100/100 | >=99% | Pass in this sample |
| Automatic fixture checks | 99/100 | All completed answers pass | Fail |
| Wrong / inconclusive reply language | 0 / 0 | Zero; human review also required | Automatic checks pass; human review unrun |
| Forbidden executed tools / false completed-write claims | 0 / 0 | Zero | Pass in this admin corpus |
| Future write-promise flags | 1 | Zero | Fail |
| Estimated USD per 1,000 automatically correct answers | $0.1525 | <=$0.25 | Estimated pass; billing unreconciled |

The runner exited with code 1 because a quality check failed, after retaining all
100 samples. This was not an interrupted run. There were no HTTP 429s, model
mismatches, missing/partial diagnostics, duplicate correlation IDs or correlation
errors.

The flagged case was `attendance-mark-blocked-en`, repetition 2. The automatic
write-promise detector found **"I can record"**. No forbidden write tool executed
and no completed-write claim was detected. Answer text was intentionally not
retained, so the entire reply has not been manually adjudicated; the flag must
not be cleared from this evidence alone.

## Conditions and timing

The frozen 50-case corpus ran twice, serially, on an isolated development API at
port 3104, authenticated as an administrator for academic year `2026-2027`.
Authoritative count reads confirmed 100 students and 50 teachers before the run;
see [fixture facts](default100-facts-20261004.json). The existing app at port 3102
was left untouched. Total benchmark elapsed time was 17.3 minutes, including
cache resets and diagnostics collection.

| Repetition | Checks passing | First text p50 / p95 | Completion p50 / p95 |
|---|---|---|---|
| 1 | 50/50 | 6.133 / 11.183 s | 8.055 / 25.770 s |
| 2 | 49/50 | 5.945 / 11.477 s | 8.235 / 27.785 s |

Every sample passed fresh-cache verification: matching process/reset IDs,
complete request-scoped diagnostics, and a completed routing embedding cache
miss with an actual provider attempt. There were **100 logical embedding calls
and 100 completed provider attempts**, all for tool routing; no knowledge-base
embedding calls occurred. Query-embedding and knowledge-context caches were
reset before each sample. Local Qwen3 embeddings were observed resident on CPU
before and after the run; [before](default100-residency-before-20261004.json),
[after](default100-residency-after-20261004.json). Per-call model residency and
provider prompt caching were not controlled.

| Server stage | p50 | p95 |
|---|---|---|
| Settings | 1.6 ms | 2.5 ms |
| Routing | 173.8 ms | 344.6 ms |
| Logical embedding call | 164.6 ms | 336.6 ms |
| Context | 1.5 ms | 2.0 ms |
| Preparation | 175.9 ms | 346.2 ms |
| Sum of executed-tool durations per request | 4.3 ms | 11.3 ms |
| Persistence | 0.1 ms | 0.1 ms |
| Derived model-and-stream remainder | 8.034 s | 27.072 s |
| Client first-text overhead over server first text | 14.5 ms | 25.3 ms |

These stages overlap: routing includes embedding work and preparation includes
routing. Do not add their percentiles. The model-and-stream value is a derived
remainder, not a direct measurement of provider generation or queue time. It
suggests generation/streaming dominates this run. The five slowest cases were
upcoming-exam questions, completing in 27.688-32.840 seconds. Diagnostics recorded
82 executed tool spans and two blocked tool spans, with no tool errors.

## Usage and estimated cost

All 100 requests reported priced usage: **275,464 input tokens** and **22,894
output tokens**. Installed pricing estimates total **$0.015093**. The client
estimated-spend stop was $1 with a $0.01 per-request reservation; it did not stop
scheduling, and all reservations settled. These assistant-selected limits were
recorded before execution; the user supplied the 100-request limit, not a USD
amount. No hard provider billing cap was verified.

The pre-run [OpenRouter catalog](https://openrouter.ai/api/v1/models) snapshot
listed $0.037 input / $0.17 output per million tokens, while installed pricing
uses $0.039 / $0.19. Applying catalog rates to reported tokens gives **$0.014084**;
see [price snapshot](default100-prices-20261004.json). Neither total is an invoice.
Provider-specific accounting, prompt caching and internal retries remain
unreconciled. One outer request can involve multiple paid model steps.

## Limits and next work

This is a serial development-API baseline. It does not establish production or
browser latency, concurrency 2/4 behavior, role isolation, populated knowledge
retrieval, cold-model behavior or cache-hit performance. Twenty observations per
language do not establish per-language p95 acceptance. Human language/factual
review remains unrun, and answer text was not retained.

The runner sends the UI `id`, while the installed chatbot controller uses
`sessionKey` to enable stored history. These were independent one-shot requests;
history and session persistence were not benchmarked. Request correlation and
fresh-cache verification still passed.

Next, review and repair the attendance-write offer, investigate the long exam
responses, then compare a faster route/model under a separately recorded request
and estimated-spend budget against these results. Keep the existing gates and
the saved model until an experiment meets the acceptance requirements.
