# Attendance/exam fixes and faster-model comparison — 2026-10-04

Attendance writes are explicitly unavailable in chat. General exam replies now
show the next five exams with dates/times and class/section, preserving requests
for all exams or specific details. The saved model remains **OpenRouter /
`openai/gpt-oss-120b`**. Nemotron Lightning was evaluated and **rejected as a
replacement** on quality and estimated cost. No deployment or domain-data write
was performed.

## Current-model fixes first

Only `packages/server/src/config/chatbotSystemPrompt.ts` changes chatbot behavior.
Attendance requests get an explicit refusal and dashboard direction, without
student lookups, ID/confirmation requests or future offers to record attendance.

The first 100-request experiment preserved the original corpus/checks and model.
Direct review caught two invented exam counts that automatic checks missed, so
that intermediate prompt was rejected. The final prompt does not calculate
totals/remaining counts from a list. The rejected run remains intact:
[review](reply-fixes100-review-20261004.md),
[raw evidence](reply-fixes100-fresh-20261004.json).

The corrected exam prompt then ran the five original exam questions twice:

| Exam measure (10 samples) | Original baseline | Corrected prompt |
|---|---:|---:|
| Median completion | 27.273 s | 15.128 s |
| Maximum completion | 32.840 s | 29.816 s |
| Median first text | 9.383 s | 11.294 s |
| Median visible answer length | 1,277 characters | 488 characters |
| Reported completion tokens | 6,234 | 6,068 |

Median completion improved **44.5%** and visible text shrank **61.8%**. Waiting for
first text did not improve; model/provider delays remain. Reported completion
tokens include more than visible text and did not fall proportionally.
Sequential runs with uncontrolled provider scheduling/cache do not prove that
all timing changes were caused by the prompt.

All ten corrected replies showed exactly five real exams in the right order
with matching schedule facts and no invented counts on direct agent review.
Original automatic checks passed **9/10**; one Arabic answer was inconclusive
because stored English exam titles dominated the mixed-script heuristic.
Four replies omitted the requested offer to show more, despite labelling the
list as the closest/next five. These flags remain recorded. In the subsequent
paired run, all five GPT-OSS exam answers again had correct schedule rows and
no invented counts: **15/15 reviewed exam answers with the final prompt**.

All nine GPT-OSS attendance-write samples across the 100-request experiment
and paired comparison explicitly refused writes with the same attendance
instruction; no future write promise or completed-write claim was found.
The original corpus has attendance writes only in English, Arabic and Darija;
French/Spanish write cases concern grades. Wider attendance/language variants
and native-speaker Darija review remain untested.

Evidence: [exam recheck](reply-fixes-exam10-review-20261004.md),
[exam raw run](reply-fixes-exam10-20261004.json),
[exam facts](reply-fixes-facts-20261004.json).

## Same-question faster-model comparison

One serial, interleaved pair per original question: **50 GPT-OSS + 50 Nemotron**
requests using the final prompt, same corpus/checks/pins, admin, `2026-2027`,
fresh application caches. Which model goes first alternates between pairs.
All 100 completed; fresh-cache and request/model correlation passed 100/100,
with no HTTP 429 or model mismatches.

| Measure | GPT-OSS 120B | Nemotron 3.5 Lightning Nitro |
|---|---:|---:|
| Original automatic checks | 47/50 | 45/50 |
| Completion p50 / p95 | 6.367 / 18.802 s | 2.105 / 5.000 s |
| First text p50 / p95 | 4.458 / 15.939 s | 2.014 / 4.429 s |
| Exam completion median (5 samples) | 11.589 s | 3.994 s |
| Automatically wrong / inconclusive language | 0 / 3 | 2 / 3 |
| Executed forbidden writes / false write claims / promises | 0 / 0 / 0 | 0 / 0 / 0 |
| Reported input / completion tokens | 158,454 / 10,656 | 237,052 / 28,303 |

Nemotron is substantially faster in this sample, but it loses correctness:

- `attendance-today-en` and `missing-student-en` answered in French. Direct
  review confirms the detector's two wrong-language findings.
- `missing-student-ar` appended English instructions to the Arabic answer;
  the heuristic marked it inconclusive, but it is a real mixed-language defect.
- `upcoming-exams-ar` invented **eight** remaining exams after listing five;
  the authoritative total is twelve, so seven remain. The original checks passed
  that answer because they check the read tool, not individual exam facts.
- Direct class-answer review found an English fragment in `classes-fr` and
  Chinese characters in `classes-ar`; majority-language heuristics missed these.
- Nemotron mostly used Modern Standard Arabic for Darija questions; one exam
  subject label became “Mathématics”. Native-speaker/register review remains.
- One `grades_get_student_report` call errored before the Arabic missing-student
  case recovered through searches. Tool failure remains counted.

The two Spanish inconclusive candidate answers are Spanish on direct review.
GPT-OSS's three inconclusive replies were an Arabic exam with English stored
titles, a short Spanish teacher count, and a Darija class list with long French
names. The Darija class list also rendered section names with numeric prefixes
(`2A`, `3A`, etc.) rather than the authoritative `A/B/C`; that presentation needs
further review. Broader correctness acceptance is **not** established for either
model. Raw automatic failures were not reclassified or removed.

Evidence: [paired raw run](reply-fixes-model100-20261004.json),
[derived analysis](reply-fixes-model-analysis-20261004.json),
[class/attendance facts](reply-fixes-corpus-facts-20261004.json),
[operating limits](reply-fixes-model-plan-20261004.md).

## Cost and operating conditions

Exactly **211 paid outer requests**: the first current-model run 100, corrected
exam recheck 10, one price-stopped candidate greeting, and paired comparison 100.
Failed startup/preflight attempts sent zero paid requests. No paid warmups or
additional probes. All limits were recorded before their respective runs.

Nemotron is absent from installed pricing. The first comparison correctly stopped
on unknown cost and restored GPT-OSS. To complete the experiment, the runner now
supports an explicit frozen `--pricing-file`, requires coherent usage and matching
stream/server model IDs, and reports `declaredCost` separately without changing
raw `pricingFound: false`. Tests cover budget settlement, missing usage, model
mismatches, raw-metadata preservation and restoration. Default unknown-cost
behavior remains unchanged.

Paired cost estimates:

- GPT-OSS installed estimate: **$0.008204**.
- Nemotron conservative declared estimate: **$0.044508**, using twice the highest
  captured endpoint rates for budgeting headroom; this is not a charge.
- Same-day model-catalog token subtotals: GPT-OSS **$0.007674**, Nemotron
  **$0.018916**. Per 1,000 automatically passing answers: **$0.163 / $0.420**.
  Nemotron misses the proposed $0.25 gate even on this catalog-rate estimate.
- Combined installed/declared estimates across all 211 calls: **$0.073301**.
  This mixes conservative and installed estimates; it is not an invoice.

Actual host/tier, cache, retries and billing are unreconciled. The separate price
file has explicit provenance; [price snapshot](reply-fixes-model-prices-20261004.json)
and [declared rates](reply-fixes-declared-prices-20261004.json) are retained.
[OpenRouter documents](https://openrouter.ai/docs/guides/routing/model-variants/nitro)
that Nitro prioritizes throughput and can select differently priced priority
endpoints. Neither model-level catalog rates nor local estimates guarantee bills.

The process at port 3104 used a separate dev output directory. Its database and
AI settings were shared; serial comparison updates were temporary. The runner
restored GPT-OSS, confirmed by [read-only postflight](reply-fixes-restored-preflight-20261004.json).
The benchmark process was stopped after verification. Local Qwen3 embeddings were
resident on CPU; provider prompt caching and per-request residency were not
controlled. Only supported query/knowledge caches were reset. No production or
browser latency, role isolation, stored-history or populated-knowledge claims.

## Verification and remaining work

Relevant final test suite: **73 passed, zero failed**, including read-only tools,
budget/cache controls, actual mock CLI comparisons, stream parsing and scoring.
Earlier focused claim/chat suite: **104 passed**. `bun run lint`, final production
`bun run build` with isolated output, and `git diff --check` passed.

The targeted attendance/exam fixes are retained. All-automatic-checks and wider
correctness gates still fail; GPT-OSS also misses proposed latency gates. Nemotron
meets overall latency gates in this sample but fails quality and estimated-cost
requirements, so it is not adopted. Next work is stronger authoritative fact and
mixed-language checks, wider role/conversation/native-language review, then a
different model/provider experiment. Production verification remains separate.
