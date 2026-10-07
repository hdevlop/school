# Jev 304-question development benchmark — 7 October 2026

The authorized bounded run completed **304 requests with 304 valid responses and zero transport errors**, at **436.8 ms average / 602.5 ms p95**, for **$0.011942532** in provider-reported cost. No retry or unknown-cost reservation was needed. This is an unreviewed assistant-development study, not rollout acceptance. Jev remains off in School.

## Execution and provenance

The owner's “continue” followed the concrete next-stage proposal. The [execution record](jev-stress304-guard4-execution-20261007.json) records its interpretation as authorization for one development pass of at most 304 requests with a $0.05 client spending stop. It does not assign wording approval, human labels or runtime adoption. The original proposal remains preserved rather than retroactively marked approved.

The new explicit `--unreviewed-development` mode permits only a pending assistant-origin draft with the existing authorship waiver. It records development mode, keeps the review pending and forces qualification false. Ordinary pending runs remain blocked, and native/human-origin intake cannot use this flag. Continuations freeze the mode and all guard/classification sources. The [304-case corpus](../../../datasets/chatbot-latency/jev-fresh-stress304-20261007.json) and its question/label bytes stayed unchanged.

Controls: one repetition, guard4, request wording v3, core policy, 0.8 confidence, connection reuse disabled, two seconds between request starts, ten-second request timeout, no retries and $0.00015 reserved before each dispatch. Key metadata confirmed enough remaining allowance. Source hashes were frozen before dispatch; no tests/builds ran during the timed requests. No School tool calls or real records were involved. All 304 classification slots are now consumed; unused dollars grant no further classification calls.

[Raw report](jev-stress304-guard4-run-20261007.json), [analysis](jev-stress304-guard4-analysis-20261007.json), [later aggregate reconciliation](jev-stress304-guard4-settlement-20261007.json).

## Measured classification time and cost

| Measurement | Result |
| --- | --- |
| Valid / attempted | 304 / 304 |
| Errors / retries | 0 / 0 |
| Average | 436.8 ms |
| Median | 404.3 ms |
| p95, including first request | 602.5 ms |
| Warm p95, excluding first request | 602.5 ms |
| Maximum | 1,907.7 ms |
| Known reported cost | $0.011942532 |
| Unknown cost / retained reserve | 0 requests / $0 |

The later shared-key increase matches $0.011942532 in aggregate. The immediate key reading lagged the known sum; both readings remain recorded. This reconciles the stage total, not per-request invoices. The $0.05 control is a client spending stop, not a provider billing guarantee.

The earlier same-corpus100 recheck measured 511.4 ms average / 729.7 ms p95 with one error. This run is numerically faster and has no observed transport errors, but uses a different corpus at another time. It is not a paired transport/model comparison and does not prove a causal fix. The 500 ms warm-p95 target is still missed. These are classifier response times, not full chatbot reply times.

## Decisions and guard projections

Raw top-choice agreement with the provisional labels is **268/304 (88.16%)**. At the 0.8 threshold with binary write-score agreement, 154 raw choices are accepted and two are wrong: an Arabizi arithmetic sum selected as separate student/teacher totals, and an Arabizi ratio selected as a student count. No write is accepted as a read in this raw thresholded result. Both arithmetic read errors are blocked by v3 and v4.

After language and baseline selection, 228 questions would be eligible under an assumed administrator first-turn context. The confidence/write checks accept 113 of their choices, including the two wrong arithmetic choices.

| Eligible-choice projection | Accepted | Accepted label disagreements | Correct raw choices additionally declined |
| --- | --- | --- | --- |
| Semantic guard v3 | 107 | 0 | 4 |
| Semantic guard v4 | 88 | 0 | 23 |

Guard4 therefore declines **19 more correct choices than v3** on this corpus. The preceding coverage repair retained all accepted choices in the older saved studies; it did not guarantee recognition of every new paraphrase. Reasons in this run include unfamiliar ordinary words, indirect subject wording, and conservative treatment of negated arithmetic. No post-run source tuning was folded into these measurements.

The 88 guarded choices comprise **45 read/small-talk candidates and 43 refusal candidates**, spread across 30 linked semantic groups. There are also **59 correct baseline write refusals** in the offline projection. Combined selection coverage is 147/304, including 102 write refusals. These are hypothetical selected paths, not actual readiness wins, executed templates or model calls saved; the probe classified all 304 cases for comparison.

Binary write scores miss seven of the 120 write requests and falsely flag 16 non-writes. The threshold/choice/semantic combination does not turn those missed writes into an accepted read. Seventeen questions have unknown detected language and retain fallback. Operator wording review is still pending; these labels and dialect texts remain assistant-provisional.

## Per-language results

Each style has 76 valid responses. Accepted counts below are guard4 projections after language/baseline selection and include read/small-talk and refusal candidates.

| Declared style | Average | p95 | Guard4 accepted | Unknown language |
| --- | --- | --- | --- | --- |
| French | 442.2 ms | 611.8 ms | 29 | 7 |
| Standard Arabic | 458.4 ms | 639.3 ms | 30 | 0 |
| Arabic-script Darija | 418.0 ms | 556.0 ms | 21 | 0 |
| Arabizi | 428.5 ms | 558.9 ms | 8 | 10 |

Some Arabic-script Darija is detected as standard Arabic; the raw audit retains that register distinction. Translation pairs and read paraphrases stay linked rather than being counted as independent observations. No native precision confidence bound is claimed.

## What we can do next

The paid development benchmark is complete. Use these saved decisions to investigate the **19 extra guard4 fallbacks and 17 language abstentions offline**, keeping the measured source/result snapshot intact and labeling any tuned replay as development. No additional paid requests are needed to inspect those failures.

Runtime adoption still needs the [published async preparation contract](../../architecture/jev-async-reply-contract.md), an exact compatible package pin and a paired full-chat off/shadow/on comparison. The latest published `najm-chatbot` checked was 3.3.0, with only the synchronous hook. Classification p95 is above target, and only 88 guarded choices / 30 linked groups are accepted; the separate 150-case/150-family qualification gate is unmet. Wording feedback remains available, but it is not a prerequisite for already-authorized development measurement and cannot convert tuned synthetic results into untouched held-out evidence.

Verification: 499 script tests passed, 2,867 assertions across 40 files; lint passed. Two subprocess-heavy tests initially hit the default five-second timeout during concurrent verification; their test-only limits were set to 15 seconds and the entire suite passed on rerun. The API request timeout remains ten seconds. The analysis reparsed every valid decision, checked contiguous unique IDs and source hashes, and reconciled the budget snapshot with costs. No production module, package pin or Desktop source changed.
