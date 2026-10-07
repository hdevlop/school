# Jev operator-reviewed Darija: 100-attempt test

All **100 authorized slots** were attempted exactly once under the **$0.02** client stop. **96 valid responses and 4 transport failures** remain recorded. The classifier accepted **38 eligible cases / 31 paired families**, with **0 disagreements with frozen assistant labels** among those acceptances. The classification gate does **not** pass; Jev remains off.

| Metric | Result |
|---|---:|
| Successful classifier mean | 433.6 ms |
| Successful classifier p50 / p95 | 339.9 / 663.1 ms |
| Warm successful p95, initial request removed | 663.1 ms |
| Successful maximum | 5334.9 ms |
| Raw core/0.8/write-agreement accepted | 41 |
| Accepted after language and regex gates | 38 |
| Eligible accepted label disagreements / writes accepted as reads | 0 / 0 |
| Top-choice disagreements, before abstention | 14 |
| False write scores on reads | 6 |
| Missed write scores on 17 valid write responses | 1 |
| Known provider-reported cost | $0.003770844 |
| Retained unknown-cost reservations | $0.000600000 |
| Total client-accounted amount | $0.004370844 |

Only classifier response timing was measured. These are not complete chatbot answer times. The successful latency summary excludes failed requests; their delays/errors stay in raw samples. Shared-key increase is $0.003770844, matching the known-cost sum in aggregate. Costs of the four failed attempts remain unknown/reserved; that aggregate agreement does not establish per-request invoices.

## Continuations and transport

| Leg | Attempts | Valid | Connection reuse | Mean ms | p95 ms |
|---|---:|---:|---|---:|---:|
| 1 | 77 | 76 | default | 362.5 | 622.1 |
| 2 | 3 | 2 | default | 453.1 | 459.1 |
| 3 | 2 | 1 | default | 401.9 | 401.9 |
| 4 | 10 | 9 | off | 462.1 | 796.8 |
| 5 | 8 | 8 | off | 1076.2 | 5334.9 |

The initial leg stopped on DNS failure at q77. Two continuations stopped on socket closures at q80/q82. A recorded transport-only change used Bun's documented [connection reuse option](https://bun.com/docs/runtime/networking/fetch), setting `keepalive: false` while leaving requests, labels, classifier/parser and eligibility sources frozen. The next leg stopped on timeout at q92; the final eight responses succeeded. This does not prove connection pooling caused all failures or improved latency. Failed questions were never retried; each continuation advanced to the next unused slot with earlier unknown costs still reserved. Historical raw reports are unchanged.

## Classification and eligibility

The frozen corpus contains 50 paired families and 18 write questions. Nine questions have unknown detected language. This test still dispatched them to measure raw classifier behavior; actual School eligibility would skip them. The separate offline count-veto v2 replay leaves 35 accepted candidates, with 0 label disagreements; it is not an adopted runtime guard.

The arithmetic request q30 is a fragile case: Jev chooses separate student/teacher
counts at confidence 0.97 even though the query asks for one computed sum. Its
write score of 0.60 happens to block the read acceptance. That is a false write
score protecting against a separate semantic error, not correct intent detection.
Reducing false write scores alone could expose it; preserve this as a development
regression case before another wording experiment. The binary write question also
misses the deletion command q88 (`mse7 had lfard mn ljadwal.`), scoring 0.44;
the selected `needs_llm` choice means it was not accepted as a read.

Top-choice disagreements before confidence/write/language abstention:

- jev-operator-q14: class_list → upcoming_exams, confidence 0.26, write score 0.15.
- jev-operator-q20: write_request → needs_llm, confidence 0.52, write score 0.79.
- jev-operator-q29: needs_llm → student_and_teacher_count, confidence 0.48, write score 0.27.
- jev-operator-q30: needs_llm → student_and_teacher_count, confidence 0.97, write score 0.6.
- jev-operator-q40: needs_llm → small_talk, confidence 0.37, write score 0.27.
- jev-operator-q58: teacher_count → needs_llm, confidence 0.46, write score 0.3.
- jev-operator-q68: class_list → student_count, confidence 0.46, write score 0.14.
- jev-operator-q70: class_list → student_count, confidence 0.22, write score 0.46.
- jev-operator-q72: attendance_today → needs_llm, confidence 0.6, write score 0.11.
- jev-operator-q78: upcoming_exams → small_talk, confidence 0.26, write score 0.25.
- jev-operator-q84: write_request → needs_llm, confidence 0.39, write score 0.54.
- jev-operator-q88: write_request → needs_llm, confidence 0.74, write score 0.44.
- jev-operator-q90: write_request → needs_llm, confidence 0.55, write score 0.75.
- jev-operator-q94: needs_llm → student_and_teacher_count, confidence 0.36, write score 0.26.

The failed classification gate retains: incomplete_or_failed_run, fewer_than_150_unique_accepted_questions, fewer_than_150_independent_question_families, warm_classification_p95_over_500ms_or_unknown. Wording review is complete and native authorship was explicitly waived. Labels remain assistant-provisional. Family clustering means no native-user precision confidence bound follows. No threshold, labels or classification wording were adjusted after results.

## Verification and evidence

The [combined analysis](jev-operator-review100-analysis-20261007.json) verifies all normalized decisions again, the frozen corpus and classification/eligibility source hashes, ordered unique attempts, report-chain hashes, budget snapshots, and the exhausted 100-request cap. The [execution record](jev-operator-review100-execution-20261007.json) records the user's authorization. The [plan](jev-operator-review100-plan-20261007.json) remains the original proposal; execution and all continuations are separate evidence. All earlier raw reports and failed attempts remain preserved. Runtime Jev, package pins and School data were unchanged. No extra requests are authorized by the remaining dollars.

The transport option passes 32 focused probe/continuation tests. The initial full
suite had 402 passes and one child-process timeout during a machine stall; its
isolated rerun passed, followed by a full **403-pass / 0-fail** run with 2,635
assertions and passing workspace boundaries (1,282 files / 289 client entries).
Lint passes. No production source changed, so no application build was required.
