# Jev: 96-question development probe

Completed the [frozen development plan](jev-draft-probe96-plan-20261006.json)
after the user's continuation confirmed the concrete 96-request/$0.02 stage.
All 96 scheduled requests produced valid decisions and valid cost metadata,
with no retry, HTTP/API error, unknown cost or retained reservation. Jev stays
off; no School tool or chat model ran. This is classification of assistant-authored
questions, not native acceptance or an end-to-end speed test.

| Metric | Result |
|---|---:|
| Classifier mean, all requests | 288.8 ms |
| Classifier warm mean, excluding first request | 287.9 ms |
| Classifier warm p50 / p95 | 273.2 / 409.7 ms |
| Classifier max | 555.3 ms |
| Requests / linked synthetic families | 96 / 24 |
| Language-eligible misses | 95 |
| Accepted at frozen 0.8/core with write agreement | 57 |
| Accepted choices disagreeing with provisional labels | 0 |
| Raw top-choice disagreement | 5 / 96 |
| Binary write-score disagreement | 9 / 96 |
| Provider-reported request cost | $0.003764334 |
| Later observed shared-key increase | $0.003764334 |

Classifier timings include client/OpenRouter network and connection overhead;
two-second pacing is outside each recorded request duration. No template was
executed or answer rendered. API response decisions do not establish rendered
reply time, permission behavior or production accuracy.

## Frozen-rule coverage

| Declared style | Questions | Eligible misses | Accepted choices | Coverage of eligible supported labels |
|---|---:|---:|---:|---:|
| French | 24 | 24 | 18 | 18 / 18 |
| Arabic | 24 | 24 | 18 | 18 / 19 |
| Darija, Arabic script | 24 | 24 | 15 | 15 / 19 |
| Arabizi | 24 | 23 | 6 | 6 / 18 |
| Total | 96 | 95 | 57 | 57 / 74 |

All accepted choices match their provisional assistant labels. The accepted
questions span only 19 linked families, not independent observations; no
statistical error bound or native precision claim follows. A correct Arabizi
write decision is excluded because School detects its single-signal wording as
unknown. There are no baseline regex hits in this selected subset.

Five top choices differ from the frozen labels: the context-free French totals
query becomes combined count at 0.61; an Arabizi class list becomes student count
at 0.37; two class-with-sections requests become `needs_llm`; and Arabizi attendance
becomes student count at 0.29. None passes guarded 0.8/core acceptance. The
class-with-sections labels remain plausible against School's existing renderer;
independent human adjudication has not occurred. All eight write commands receive
the correct binary write label; the nine binary disagreements are false write
scores on reads, concentrated in Darija/Arabizi. Two correctly chosen,
high-confidence Arabizi combined counts lose acceptance solely to write agreement.
The guard remains required despite those coverage losses.

The [final offline analysis](jev-draft-probe96-final-analysis-20261006.json)
lists every top-choice and write-score disagreement without changing the labels.
The runner's automatic dev threshold suggestion of 0.7 is retained in the raw
report but not adopted; all findings above use the predeclared 0.8 rule.

## Count-veto tradeoff

On this batch, the offline prototype veto changes accepted choices from 57 to
47 and accepted linked families from 19 to 17. It prevents no error and declines
10 correct choices in four linked families, mostly requests explicitly excluding
names/lists. The earlier saved core study still contains its prevented teacher-name
error; the new clean subset does not erase that failure. Keep the prototype
outside the app and evaluate its safety/coverage tradeoff on future independent
data. Do not remove write agreement or lower thresholds from these dev results.

## Accounting and preserved evidence

The client stop is $0.02 with a $0.00015 reservation, 96-request ceiling and
two-second spacing. It is an estimated stop, not a provider billing cap. All
requests reported cost; known total is $0.003764334 and unknown reservations are
zero. Before dispatch, the [key precheck](jev-draft-probe96-key-precheck-20261006.json)
verified a $50 provider key limit and $49.054471478 remaining. The precheck sent
no question and does not impose an isolated $0.02 provider ceiling.

The [raw report](jev-draft-probe96-run-20261006.json) captures key usage increasing
from $0.945528522 to $0.947568714 immediately after the run, a $0.002040192
window. A [later metadata-only read](jev-draft-probe96-key-later-20261006.json)
observes $0.949292856, giving $0.003764334 relative to the original before value,
consistent with the summed request costs. The original immediate reading is
preserved. These aggregate key windows may include other traffic and are not
isolated per-generation invoices.

The stage made 96 classifier requests and four key-ledger reads (one precheck,
two in the probe, one later read), with no School calls. The earlier rejected
temporary-script key command did not execute. The existing runner now offers
`--key-precheck`, which records only allowlisted metadata and requires a finite,
sufficient key allowance without dispatching classifications. Its new mode was
tested with every fetch mocked before live execution. The
[execution record](jev-draft-probe96-execution-20261006.json) binds the corpus,
precheck and runner change; classifier wording, parser, acceptance rule and
language/template sources stayed frozen. Raw reports, corpus text and labels
remain unchanged after results. The 96-request allowance is consumed; no further
paid stage is authorized by the unused monetary remainder.

This subset has only two write families per style, one repetition and zero
actual native authors/reviewers. B0 native acceptance and the supported published
async hook remain prerequisites for runtime integration. Jev stays off.

[Verification](jev-draft-probe96-verification-20261006.json): 360 script tests
(2,479 assertions), workspace boundaries and lint pass. The pre-dispatch budget/
probe/continuation suite passed 39 tests (329 assertions). Artifact/source hashes
verify unchanged raw decisions and frozen corpus/labels. No production app source
was changed for this stage; no new app build or deployment was needed.
