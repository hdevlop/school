# Binary write wording v4 versus v3: 96 development questions

V4 completed its new 96-request/$0.02 stage with 96 valid decisions/costs and
no API errors, retries, unknown cost or retained reservations. It passes all
[predeclared development checks](jev-v4-probe96-plan-20261006.json), but remains
an opt-in development candidate. Probe default stays v3 and School Jev stays off.

| Metric | Saved v3 | New v4 |
|---|---:|---:|
| Requests / valid decisions | 96 / 96 | 96 / 96 |
| False write scores on reads | 9 | 4 |
| False-negative write scores on 8 writes | 0 | 0 |
| Eligible accepted choices, frozen 0.8/core/write agreement | 57 | 58 |
| Eligible accepted choices disagreeing with provisional labels | 0 | 0 |
| Arabizi eligible supported coverage | 6 / 18 | 7 / 18 |
| Raw top-choice disagreements | 5 | 5 |
| Classifier mean, all requests | 288.8 ms | 320.4 ms |
| Classifier warm p95 | 409.7 ms | 375.0 ms |
| Classifier maximum | 555.3 ms | 1,310.1 ms |
| Provider-reported cost | $0.003764334 | $0.005115054 |

The binary wording fixes eight earlier false write scores and introduces three
new ones, leaving four total; all four are Arabizi read requests. All eight actual
write commands still receive write scores at least 0.5. Two high-confidence
Arabizi combined-count choices gain acceptance as their false write scores clear.
One teacher-count choice loses acceptance when confidence falls from 0.85 to 0.74,
despite a correct choice and improved write score. Net gain is one accepted case.
No threshold or frozen label was changed after results, and the dev suggestion
of 0.7 remains unadopted.

French/Arabic/Arabic-script Darija acceptance stays 18/18/15 respectively; Arabizi
rises from six to seven. Both runs have the same five top-choice disagreements:
context-free French totals, three class-list variants and Arabizi attendance.
They remain unaccepted. Four false write scores persist for Arabizi class names,
attendance and a qualified count. The served response model in both runs is
`typesafe/jev-1.13-20260917`.

V4 costs 35.88% more for these requests, consistent with adding 335 input tokens
per question. Mean classifier duration is 10.95% higher, while warm p95 is lower;
the new maximum is 1.31 s. These are sequential historical passes, not randomized
or interleaved measurements, so network/model variation prevents a causal latency
claim. Only classification ran: no School tool, reply renderer, model-path answer
or readiness race was exercised.

## Separate count-veto comparison

The v2 veto preserves all 57 v3 eligible accepted choices. Applied offline to v4,
it declines one of the 58 correct choices, leaving 57: the newly accepted
`mda26-student_and_teacher_count-12-ary-latn` uses singular `mjmo3` with both
entities and an exclusion of names. The exception grammar requires an explicit
dual or repeated count cue for combined counts and conservatively declines it.
Do not relax that rule after this result. Human adjudication/future development
must address the ambiguity independently. The v1 veto leaves 47/48 accepted
choices for v3/v4. Neither veto prevents an error in this already clean subset;
the older core teacher-name error remains preserved separately.

## Accounting and evidence

The user explicitly requested this comparison. Its own budget, question hash,
request shape, wording version, fixed scoring criteria and source hashes were
frozen before dispatch. The [key precheck](jev-v4-probe96-key-precheck-20261006.json)
verified the existing $50 key limit and $49.050707144 remaining; this is not an
isolated hard $0.02 billing cap. Pacing stayed at two seconds, timeout ten seconds,
one repetition and no retry.

The [raw v4 report](jev-v4-probe96-run-20261006.json) records $0.005115054 request
cost and an immediate shared-key increase of $0.003410862. A
[later metadata-only read](jev-v4-probe96-key-later-20261006.json) observes key usage
$0.954407910 from the run's $0.949292856 before value: a $0.005115054 increase,
consistent with summed request costs. The immediate lower reading is retained.
Shared-key windows are not isolated invoices and may include other traffic.
This stage made 96 classifier requests and four key-ledger reads, with no School
calls. Its 96-request allowance is consumed; unused dollars grant no extra calls.

The [paired analysis](jev-v4-probe96-comparison-20261006.json) preserves every
question's two decisions, write-score transitions, confidence loss, counts and
guard comparisons. Source/hash checks require identical corpus, intent builder,
parser, language and templates, plus the measured v4 wording; older runner
metadata differences are explicit. A partial run cannot pass the declared checks.
The v3 report and all corpus text/labels remain unchanged.

V4 is a useful candidate for further development because it reduces false write
scores with no newly accepted label errors in this batch. Gains remain small,
Arabizi coverage low, and v2 removes the net coverage gain. Twenty-four linked
families from one assistant author, provisional labels, one pass and only two
write scenarios per style do not establish native or independent precision.
Fresh native-authored questions and human labels still precede acceptance;
runtime integration/default changes do not follow this experiment.

[Verification](jev-v4-probe96-verification-20261006.json): 395 script tests
(2,570 assertions), workspace boundaries and lint pass. The pre-dispatch analyzer/
probe/wording suite passed 28 tests (264 assertions). Both reports, the corpus,
candidate wording and paired analysis have preservation hashes. No production
app code was changed, so this stage required no new app build or deployment.
