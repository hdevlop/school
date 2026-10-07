# Current configuration: 60-request repeat — 2026-10-04

All **60/60** requests completed and passed automatic checks. Assistant review of
every retained reply accepted **59/60**: one Arabic attendance reply described a
successful empty read as unavailable and suggested checking settings or retrying.
The serial latency gates are met on this sample; overall acceptance remains open
because reviewed correctness and current billed-cost acceptance are not satisfied.

Raw [run](current60-run-20261004.json), [analysis and per-reply review](current60-analysis-20261004.json),
[approved run plan](current60-plan-20261004.md), [fresh facts](current60-facts-20261004.json),
[frozen corpus](current60-corpus-20261004.json), [fixture comparison](current60-fixture-check-20261004.json).
Raw automatic scores are unchanged; no reply was rescored to conceal the reviewed failure.

## Conditions and execution

Thirty Moroccan admin cases in academic year `2026-2027`, repeated twice with
fresh sessions, concurrency 1 and verified fresh application caches. Published
`najm-chatbot@3.3.0`/`najm-rag@3.2.0` ran in a frozen School copy with an independent
frozen-lockfile install. [Source manifest](current60-manifest-20261004.json).
Source configuration retained Cerebras-first routing, fallbacks, Groq exclusion,
low reasoning and School's count/refusal templates. Actual host per request was
not captured and provider prompt caching was uncontrolled.

[Ready preflight](current60-ready-20261004.json) and
[postflight](current60-postflight-20261004.json) both show enabled
OpenRouter `openai/gpt-oss-120b` with a saved key. The runner checked the selected
provider/model before every request and held the cooperative benchmark lock.
No model/key setting was changed. [Qwen residency before](current60-residency-before-20261004.json)
and [after](current60-residency-after-20261004.json) were recorded; no model
unload, paid warmup, extra chat probe or paid retry was performed.

All 60 requests had complete correlated diagnostics, a matching instance/reset
and one completed routing embedding miss/attempt. There were no correlation
errors, missing capture, HTTP 429s, timeouts, empty answers or provider-stream
errors. Sixty outer chat requests settled within the declared $0.50 estimated
stop/$0.01 reservation. This was an explicitly accepted estimate-only run;
the existing provider key's $50 total limit is not a hard $0.50 benchmark cap.

## Latency and usage

Nearest-rank percentiles over completed requests, measured by the API client:

| Path | Replies | First text p50 / p95 | Completion p50 / p95 |
|---|---:|---|---|
| Hybrid | 60 | 0.566 / 1.021 s | 0.622 / 1.180 s |
| Model-generated | 30 | 0.899 / 1.323 s | 0.945 / 1.412 s |
| Templates | 30 | 0.330 / 0.662 s | 0.330 / 0.662 s |

| Language | Replies | Automatic passes | Completion p50 / p95 |
|---|---:|---:|---|
| French | 20 | 20 | 0.546 / 1.106 s |
| Formal Arabic | 20 | 20 | 0.594 / 1.048 s |
| Darija | 20 | 20 | 0.624 / 1.180 s |

Templates supplied 18 unqualified count replies and 12 write refusals, using no
generation tokens. The remaining 30 replies used the model. Across both paths
there were 48 executed read tools and no executed write, false completed-write
claim or promise. Reported generation usage was 134,074 input and 4,273 output
tokens; SDK estimate $0.006040756. Routing embedding duration was
0.2435/0.5843 s p50/p95. Do not add embedding, routing and preparation spans:
they overlap. Templates still route/embed and counts still execute guarded reads.

Two repetitions and 20 samples per language are regression evidence, not
population tail-latency or error-rate guarantees. This is development API timing,
not production or dashboard submit-to-render timing. No interleaved baseline or
candidate ran, so this establishes no measured candidate improvement.

## Reply review

Automatic language, mixed-language/register, class/exam fact, argument, write
claim/promise and inconclusive-review flags were all zero. Assistant review
checked every reply against the frozen facts and refusal/read contracts;
independent human/native-speaker review remains outstanding.

- Six class lists matched all nine classes and exact A/B/C sections.
- Six exam replies matched the next five stored rows, chronological order,
  classes/sections, dates and times, without an invented remaining count.
- All count templates returned the authorized 100/50 totals; all 12 write
  templates refused the requested operation without an executed write.
- All six synthetic missing-student replies reported no match; no student record
  was invented.
- **Reviewed failure:** `attendance-today-ar`, repetition 2. The model said
  attendance was unavailable and suggested checking settings or trying later.
  Diagnostics record an executed `attendance_get_today_students` read with a
  two-character result and no error. A separate authorized
  [internal read](current60-attendance-fact-20261004.json) confirmed `[]`.
  The reply should state that no attendance records were found. This defect
  passed the existing automatic checks; it is recorded separately as a failure.

The first Arabic attendance reply also begins with unavailable wording, but
explicitly says there are no recorded rows; retain that wording concern. Darija
greeting 1 uses awkward vocabulary, and missing-student reply 1 has a garbled
word for an identifier. French exam introduction grammar is imperfect. These
are additional wording caveats, not evidence of native-speaker fluency.

## Cost reconciliation

[Environment-key usage before](current60-billing-before-20261004.json):
$0.630023384. [Immediately after](current60-billing-after-20261004.json):
$0.663417684. A [later read](current60-billing-settled-20261004.json) was unchanged.
The **observed key-usage delta was $0.0333943**, about **$0.557 per 1,000 attempts**,
or **$0.566 per 1,000 assistant-accepted replies**. Both exceed the existing
$0.25 gate if that debit is attributed to this run.

The key came from the existing local environment; equality with School's
encrypted selected key was not independently verified. Other use of that key,
per-request hosts and cached/reasoning charges were not independently reconciled.
Thus this is an observed key-usage delta, not a fully attributed invoice or a
complete embedding/infrastructure bill. Current cost acceptance remains open.

SDK pricing ($0.039 input/$0.19 output per million) is generic and understates
the observed delta. The captured [Cerebras catalog](current60-endpoint-prices-20261004.json)
listed $0.35/$0.75; applying those list rates to all reported generation tokens
gives $0.05013065, which is also an estimate, not the debit. Host selection and
accounting differences were not isolated. No prices, gates or provider settings
were changed to make this run pass. Provider usage/limit fields are read through
the [official current-key API](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key).

## Gate disposition and next work

| Gate | Disposition |
|---|---|
| API timing | Within declared p50/p95 targets on this serial sample, for hybrid and model subset |
| Non-empty completion | 60/60; no errors/aborts, without a population reliability claim |
| Authorization/read-only policy | No observed regression in this admin corpus; broader roles remain |
| Answer/tool correctness | Automatic 60/60; assistant review 59/60, so acceptance remains open |
| Cost | Not accepted: observed key delta exceeds target and full billing attribution is incomplete |
| Candidate improvement | Unrun; no candidate selected |
| Cold caches/model, concurrency, knowledge, production/browser | Unrun as separate acceptance conditions |

Next fix the successful-empty-read response contract and add independent coverage
for it, then verify host-aware estimates/billing attribution. A changed product
needs a newly budgeted repeat; do not overwrite these replies or spend beyond
the approved 60 requests. Role, concurrency and failure-path paid runs were not
started because overall acceptance did not pass. Keep GPT-OSS and Jev deferred.

## Verification and cleanup

The frozen checkout passed 284 benchmark/chat/read-only tests and 20 focused
chat-year/MCP-year tests before paid dispatch. Source hashes matched the frozen
manifest [after the run](current60-source-after-20261004.json). No application
source or scorer was changed during this run. Plan/report local links resolve
and the plan's `git diff --check` passed. No additional lint, build or test suite
was needed for the documentation-only result update.

The task-owned isolated app process tree was stopped with launcher identity
verification; port 3102 no longer listened. Ollama and unrelated processes were
left running. The frozen checkout and raw evidence were retained, and no chat
sessions or school records were deleted. [Cleanup](current60-cleanup-20261004.json).
