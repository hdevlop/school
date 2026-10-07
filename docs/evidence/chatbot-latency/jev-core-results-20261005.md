# Jev core exploration — 2026-10-05

**Incomplete: both legs stopped on upstream HTTP 429. Jev remains off.** The
core policy declined `upcoming_exams`; the nine-choice request, wording v3,
threshold 0.8 and write-agreement guard stayed fixed. This is a new exploratory
candidate, not a retroactive pass of the failed B0 study.

## What was prepared and attempted

[Corpus](../../../datasets/chatbot-latency/jev-core-exploration.json): 104 new
assistant-authored synthetic queries in French, Arabic, Darija and Arabizi,
grouped into 26 question families. The four language variants within a family
are correlated. Native-authored/reviewed cases: **zero**. Freshness checks reject
old IDs, old text and duplicates even with changed punctuation/casing/diacritics.
There were three planned repetitions; neither a full first pass nor the later
repetitions completed. No Arabizi query was reached.

[Original allowance](jev-core-plan-20261005.json): at most 312 decision attempts,
$0.02 client spending stop, $0.002 reservation per attempt, no client retries.
The first leg stopped at attempt 20. Its $0.002 unknown-cost reservation remained
accounted for; the [continuation](jev-core-continuation-plan-20261005.json) skipped
those 20 attempts, allowed at most 292 new requests under a reduced $0.017 budget,
and paced starts at least one second apart. It stopped after 41 more attempts.
Neither failed attempt was retried. No further paid work was started.

Both failures said `Rate limit exceeded. Please retry shortly.` The second
response had no `Retry-After` header. TypeSafe documents dynamically adjusting
limits; its published maxima do not establish this OpenRouter route's available
capacity. [TypeSafe limits](https://docs.typesafe.ai/models),
[OpenRouter limits](https://openrouter.ai/docs/api_reference/limits).

## Results and limits

Raw [first leg](jev-core-exploration-20261005.json),
[paced continuation](jev-core-continuation-20261005.json),
[combined analysis](jev-core-analysis-20261005.json).

| Measure | Observed |
|---|---:|
| Attempts / valid decisions / errors | 61 / 59 / 2 |
| Eligible core acceptances after actual language and regex gates | 33 distinct questions |
| Wrong accepted decisions / writes accepted as reads | 0 / 0 |
| Accepted question families | 15 |
| Warm successful classification mean | 354.629 ms |
| Warm successful classification p50 / p95 | 352.859 / 431.866 ms |
| Accepted classification mean | 355.101 ms |
| Known reported cost | $0.002325456 |
| Retained unknown-cost reservations | $0.004 |
| Known cost plus reservations | $0.006325456 of the $0.02 allowance |

Latencies measure the Decisions API, not School replies. Combined warm metrics
exclude the first request of each process; both remain in the raw records.
Pacing delays are excluded from per-request latency. Failed-attempt durations
remain raw and are not counted as successful classification latency. No answer
was rendered, no School tool/database was used and no readiness race was measured.

The delayed selected-key increase from $0.906000734 to $0.908326190 is
$0.002325456, matching the known reported sum. This is a shared-key observation,
not an isolated invoice or proof that the two unknown attempts were free. The
reservations remain retained. [Ledger before continuation](jev-core-ledger-precontinue-20261005.json),
[ledger after](jev-core-ledger-after-20261005.json),
[public price snapshot](jev-core-prices-20261005.json).

Zero errors among 33 accepted questions from 15 families does not establish 98%
precision. The study is incomplete, below the 150-case target and lacks native
review. The original B0 accuracy failure remains recorded. Availability also
needs verification before an end-to-end experiment; no new request allowance is
implied by the unused part of this run.

## Implementation and verification

- `--acceptance-policy=core` is explicit; the legacy default remains `full`.
  Excluded exam choices fall back without relabeling their ground truth or changing
  the model's criteria. Core summaries score the supported intent scope; cost
  accounting includes every dispatched attempt.
- Standalone fresh corpora are supported. Existing output files cannot be
  overwritten by a new paid run. Unknown policies and empty splits reject before
  provider calls.
- Pacing, declared ordinal continuation, unknown-cost stops and explicit request
  caps are tested through the actual CLI with mocked fetch.
- Every saved valid decision replayed unchanged. Source/corpus hashes matched
  the continuation freeze and the original Stage A/B0 raw reports were preserved.
- Full repository tests: **1,457 passed**, 6,793 assertions; lint and workspace
  boundaries passed. These changes affect scripts/datasets, so no new production
  build was needed. [Verification](jev-core-verification-20261005.json).

The next accuracy study needs fresh independent/native questions and stable
provider access. The runtime async hook and terminal diagnostics still require
a supported published Najm upgrade after accuracy acceptance; no runtime
enablement, package change or deployment was performed.
