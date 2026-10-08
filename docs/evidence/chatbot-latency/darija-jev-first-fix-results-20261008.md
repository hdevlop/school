# Jev-first with the improved router — 2026-10-08

**Jev-first + improved router + CoreWeave 20B passes 80/100 tool-plan checks,
versus 74/100 for the improved router + 20B alone.** Jev supplies 31 replies;
all 31 match the frozen intent, pass tool-plan checks and reproduce the correct
scoped fixture renderer output. This is the strongest observed configuration in
this Darija study. The 20 remaining failures are ordinary fallback plans; general
answer accuracy and production enablement remain unqualified.

## What was tested

The same 100 owner-reviewed Darija questions, 50 Arabic-script/Arabizi pairs,
ran through the existing candidate-first Jev policy. School's latest routing
vocabulary, lookup dependencies and system prompt were retained. The only LLM
fallback was GPT-OSS 20B pinned to CoreWeave, with no provider fallback.

Supported guarded Jev plans cover greetings, whole-school student/teacher counts,
the unfiltered class list, today's school-wide student attendance, and write
refusals. Upcoming exams are **excluded from the current core Jev policy**;
filtered questions, arithmetic, unidentified people and follow-ups remain on the
ordinary route. Jev selects an intent; the server constructs authorized tool
calls and renders their returned facts. No GPT generation is needed for a selected
Jev reply. Existing synchronous templates still run before classification.

No French question was dispatched and no completed benchmark question was
retried. Timing is observational: no average-time acceptance gate or two-second
chat cutoff. The existing 800 ms candidate deadline and five-second bounded
observer were retained, so this tests the existing scheduling policy, not an
unlimited Jev wait.

## Results and comparison

| Configuration | Tool plans / 100 | Arabic script / 50 | Arabizi / 50 |
|---|---:|---:|---:|
| Old router + 20B, repeat | 58 | 38 | 20 |
| Old router + Jev-first/20B | 66 | 41 | 25 |
| Old router + 120B, equivalent-count audit | 71 | 41 | 30 |
| Improved router + 20B, Jev off | 74 | 38 | 36 |
| **Improved router + Jev-first/20B** | **80** | **42** | **38** |

Frozen checks and the narrow staff/count-equivalence audit both give 80 for the
new run. Against the saved improved-router/20B run, 11 cases gain passes and five
regress, a net gain of six. Thirty-six of 50 families pass in both scripts.
Different processes, cache state and ordinary model outputs prevent treating
the six-point difference as a controlled causal estimate of Jev's benefit.
Several gains and regressions occurred in ordinary fallback replies. The saved
120B comparison additionally has different routing/prompt/provider conditions.

All 100 streams completed. Jev supplied 31 replies, and 18 writes were handled
by the existing synchronous refusal templates without classification. Thus 49
questions avoided GPT generation. There were 93 actual generation calls,
versus 155 in the saved Jev-off pass; all observed models/providers match the
declared CoreWeave/20B policy. Two fallback chats had diagnostic tool failures;
no mutating data tool was called.

## Jev selection and answer checks

There were 82 classifier attempts: 81 returned parsed decisions, and one was
cancelled without a decision. Of the 81 completed decisions, 71 agree with the
assistant-authored labels and ten do not. **None of the incorrect choices was
selected.** Thirty-one guarded candidates supplied replies; the other attempts
used the ordinary path. Raw classification accuracy and selected-reply precision
are distinct measurements.

For example, q30 asks to add student and teacher totals. Jev chose the two-count
intent with confidence 0.98, but the semantic guard vetoed it because the current
template does not perform that requested arithmetic. q12 chose the correct
two-count intent with confidence 1.0 but was also vetoed by the closed wording
guard. That valid wording is a useful coverage target; accepting every confident
classification would also admit unsupported operations.

The offline answer audit reconstructs each selected plan from its actual choice
and detected reply language, using the saved scoped MCP fixture results. **31/31
captured replies exactly match their expected renderer output**, and all selected
choices also pass the current query guard. This checks fixture facts and their
deterministic presentation; it is not independent human approval of Darija style
or qualification of every fallback answer.

Unpaid populated renderer samples additionally verify:

- 500 students and 50 teachers remain distinct in individual and paired counts.
- A class without sections is retained alongside a class with sections A/B.
- Present, absent and late student records retain the correct names, dates and
  statuses; phone numbers and notes are not rendered.

All five supported read samples pass. All **130 injected supported-read choices
on the 26 unsupported questions are vetoed** by the semantic guard. These are
forced-choice guard checks, not extra Jev classifications. No data tools or model
requests were dispatched by this audit. Populated sample rendering does not
qualify live gender, subject or date-window filtering.

## Remaining failures

The actual initial model requests have the required tools for all failed reads:
18 questions fail despite the needed tools being offered, and two unidentified
parent-payment questions perform unexpected data reads. No failed read is
diagnosed as lacking its required offered tools.

Examples from the fallback path:

- q12/q29 emit teacher-count tool names with `<|channel|>commentary` suffixes.
  Later valid calls do not erase the malformed calls from the score.
- q32 mistakes maths teachers for sports teachers and makes no read.
- q36 refuses last-month attendance despite having the full attendance read.
- q38 changes "more than thirty" to "more than ten" and reads only one section.
- q80 answers that there are no exams **today**, although the question asks about
  the coming days.
- q91/q92 do not perform the student-list read needed for a girls count.
- q93/q94 read school payment/student totals instead of resolving which parent
  was meant. q97/q98 ask for or claim missing class information despite available
  class discovery tools.

The frozen class-list check still requires the full class tool: a sections-only
read can omit classes with no sections. Regressions against Jev off are q12,
q32, q36, q94 and q97; all are ordinary fallbacks. The report does not hide them
or convert completed streams into answer success.

## Timing, charges and retained interruption

Mean complete response across all 100 streams is **1.23 seconds**, compared with
1.45 seconds in the saved Jev-off run. This is an observation, not the acceptance
criterion. No millisecond gate was applied.

Known combined response-reported charges are **$0.010504994**, including
$0.003182844 for 81 completed Jev decisions. One cancelled classifier attempt has
unknown cost and keeps its $0.00015 accounting reservation. The exact combined
invoice and exact percentage savings therefore remain unknown; missing cost is
never treated as zero. All 93 captured generation calls are accounted for.

The first segment completed q01–q13 and stopped after q13's unknown cancelled
classifier cost. q13 completed through ordinary fallback and was not replayed.
Its ledger, null cost and reservation are preserved. A fresh marked process
continued only q14–q100 under a reduced allowance: 87 chats/classifier slots and
$0.098197624 remaining from the original $0.10 estimated stop. The two processes
have different cache states. There was no additional billing investigation.

## Recommendation and next actions

**Focus on guarded Jev-first for supported school requests, keeping the existing
router for the rest.** This configuration has the best observed tool-plan score,
and every selected Jev reply passed the recorded intent/tool/fixture-answer checks.
It also avoids GPT generation on 31 requests in addition to the 18 existing
synchronous refusals. That is a useful direction for the $10/month budget.

The next improvements should concentrate on Jev coverage and reliable server
plans: review the precise valid paraphrases vetoed by the guard, then validate
any new bounded aliases against the existing adversarial corpus. Upcoming exams
need explicit acceptance and populated date/order validation before joining the
core Jev policy. Girls counts, last-month attendance, subject teachers and class
filters need parameter-aware plans or a validated fallback; a broad intent label
alone cannot safely supply their filters and IDs. Payment requests need identity
clarification. Diagnose malformed fallback tool names separately.

Keep confidence and semantic checks while expanding supported plans. This test
is admin, first-turn and fixture-only: student/parent/teacher ownership,
follow-ups, populated live filtering and concurrent use are still outside its
qualification. Normal Jev mode remains off and the model setting remains 120B.
No general deployment is implied by the benchmark. No new owner-written corpus
is required for the recorded next checks.

## Verification and cleanup

378 chat/analyzer tests pass. The offline audit passes 31 selected reply checks,
five populated samples and 130 forced-choice vetoes. Server test typecheck, lint
and workspace boundaries pass. This task changes benchmark scripts and the
offline audit only; it reuses the published Najm 3.6.0 and School runtime fixes,
so no new package release or production runtime change is needed.

Both fixture processes restored Jev off and model 120B. Final fixture settings
are AI disabled/key removed, and the owned port-3103 process is stopped. The
primary port-3102 app and concurrent dashboard/dependency edits are untouched.

Evidence: [initial frozen plan](darija-jev-first-fix-plan-20261008.json),
[first segment](darija-jev-first-fix-run-20261008.json),
[reduced continuation](darija-jev-first-fix-continuation-plan-20261008.json),
[remaining segment](darija-jev-first-fix-continuation-run-20261008.json),
[tool scores](darija-jev-first-fix-results-20261008.json),
[classifier/provider observations](darija-jev-first-fix-costs-20261008.json),
[actual model offers](darija-jev-first-fix-offers-20261008.json),
[case comparison](darija-jev-first-fix-comparison-20261008.json),
[answer and populated audit](darija-jev-first-fix-answer-audit-20261008.json),
[cleanup](darija-jev-first-fix-cleanup-20261008.json).
