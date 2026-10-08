# GPT-OSS 120B tool-selection check

**The requested test is complete: 100 Darija/Arabizi chats, existing router, Jev
off. Tool availability is a major problem, but it is not the only problem.**
Accepting a valid equivalent count tool consistently across all saved runs gives
120B **71/100 tool checks**, versus fresh router/20B **58/100** and saved Jev-first
with 20B fallback **66/100**. This remains tool-plan assessment, not full answer
accuracy or production qualification.

## Results and scoring correction

| Configuration | Original frozen checks / 100 | Equivalent count-tool audit / 100 | Arabic script / 50, audit | Arabizi / 50, audit |
|---|---:|---:|---:|---:|
| Router + 20B, first run | 57 | 57 | 38 | 19 |
| Router + 20B, fresh repeat | 58 | 58 | 38 | 20 |
| Jev-first + router/20B fallback, saved | 66 | 66 | 41 | 25 |
| Router then Jev + 20B, saved | 59 | 59 | 40 | 19 |
| **Router + 120B, fresh check** | **61** | **71** | **41** | **30** |

The earlier frozen count expectation was too strict: it accepted only the
dedicated student/teacher count tools. `academic-dashboard_get_kpis` also supplies
`totalStudents` and `totalTeachers` by calling the same services under the selected
year. It is a valid equivalent source for this staff fixture's unfiltered school
counts. It additionally reads grades/attendance, so it can be less efficient than
the narrow count tools; that does not make the count source wrong.

Original scores and raw evidence are preserved. A **post-run secondary audit**
adds that equivalent tool to every applicable saved run, using the same rule.
Ten 120B outcomes change; the other runs do not gain passes because their remaining
errors/arguments/tool plans still fail. Equivalence is restricted to unfiltered
school counts for the admin fixture. It does not apply to girls, a specific class,
an unidentified person or student/parent actors. Other expectations, error checks
and captured-argument checks are unchanged. This correction is not a new frozen
acceptance gate, and it does not score final answers.

## Where the remaining failures occur

The benchmark-only provider observer captured tool names offered to the model
on **all 130 generation calls**, without retaining request bodies or generated
provider text. After the equivalent-tool audit, 120B has 29 failed plans:

| Observed category | Questions | Meaning |
|---|---:|---|
| A required tool/dependency is absent from the initial model-visible set | **23** | A larger model cannot reliably execute a tool it was not offered. Improve routing, dependencies and actor-appropriate availability. |
| Required tools are offered, but the executed plan still fails | **6** | Missing reads, bad arguments or wrong choices also need model/prompt/schema handling. |

Tool availability reflects routing, dependencies and actor policy; these counts
do not prove that embedding ranking alone is responsible. Missing tools and model
mistakes can coexist. The strict frozen diagnosis was 34 missing / 5 offered but
failed; applying count equivalence prevents valid KPI offers being called missing.

Examples:

- **q08, Arabizi student count:** student-count tool is absent, but the academic
  KPI tool is offered. 120B calls it and correctly replies 8; the equivalent audit
  accepts that read.
- **q36, Arabizi last-month student absences:** the offered set contains teacher
  attendance/profile tools and no required student-attendance read. 120B declines
  instead of obtaining the data. This is concrete availability evidence.
- **q31, Arabic maths teachers:** `teachers_get_teachers` is offered, but 120B
  makes no read and refuses. Availability alone does not solve this case.
- **q48, Arabizi student count:** 120B emits a count call with no captured valid
  arguments, then successfully calls the KPI tool and answers 8. The failed first
  call remains a failed plan even after equivalence.
- **q64, Arabizi combined counts:** 120B calls a teacher dashboard with
  `id: "dummy"`, then invents **1,245 students / 78 teachers** instead of fixture
  counts 8/0. A larger model does not remove hallucinations or lookup mistakes.
- **q91, Arabic number of girls:** a required student-list read is offered, but
  the model makes no read. Preserve the requested filter and implement the plan.

## Timing, costs and comparison limits

All 100 chat streams completed; there were zero classifier attempts, four chats
with diagnostic tool failures and no non-read tool calls. No benchmark chat was
retried or cut off by a two-second limit. Per owner direction, this run has **no
average-time acceptance gate**. Mean full completion was **2.67 seconds**, recorded
only as an observation. Existing transport/hang protection is separate from the
quality criterion.

120B retains the normal Cerebras preference with provider fallback. The actual
calls used Cerebras, CoreWeave, DeepInfra and DekaLLM; every captured model is
checked against the frozen 120B arm. Saved 20B runs were CoreWeave-only. Different
providers, processes, cache state and request order prevent a model-size-only
causal conclusion. The router, prompt, reviewed questions and fixture requirements
were not optimized between these runs.

Captured charges are **$0.064905258 for 100 chats**, with no unknown charges or
unaccounted generation IDs. Fresh 20B cost $0.00935099, about seven times less in
this mix. These observations are not monthly guarantees. The fresh estimated
allowance was $0.50, generation reservation $0.004 per chat, classifier allowance
zero; no extra billing investigation was needed.

The wording was owner-reviewed; expectations remain assistant-authored. Fifty
paired families are not 100 independent native examples. The marked fixture has
eight students, zero teachers and empty exams/attendance. Nonempty filtering,
follow-ups, non-staff ownership and concurrent traffic remain unqualified. Passing
plans and correct count facts do not establish all final answers as correct.

## Recommendation and next work

**Optimize the model-visible tool set before another model comparison.** Prioritize
the 23 missing-tool cases: Arabizi school counts/classes, student attendance dates,
exams and required class/section discovery. Validate the shortlist and dependencies
with unpaid routing fixtures. Keep whole-school tools distinct from personal
dashboards and retain existing MCP guards.

Then fix the six offered-but-failed plans: preserve filters, perform required
reads, resolve IDs and reject fabricated targets/results. Add populated fixtures
for subject/date/gender behavior. Once those fixes pass, rerun failed families
with 20B to see how much of the quality gap closes.

120B has the strongest measured tool selection after the equivalent audit; the
cheap 20B/Jev-first direction remains worth developing for the owner's $10/month
budget. Neither is ready for general enablement on this evidence. Do not conclude
that model choice is irrelevant or that Jev-first already beats 120B in quality.
Further millisecond optimization is not the next task.

## Verification and cleanup

**548 script tests and lint pass.** Tests cover the frozen 120B arm, no timing gate,
zero classifier allowance, names-only capture, missing versus offered tools, and
the narrow staff/count equivalence. Production backend behavior/package pins
were reused without changes. Only benchmark scripts, analysis and evidence changed.

Fixture cleanup is saved: Jev off, AI disabled, key removed, model restored to
120B, owned port-3103 app stopped. The primary port-3102 app remained running and
concurrent dashboard/dependency work was left untouched.

Evidence: [frozen checks/answers](darija-router120-check-results-20261008.json),
[equivalent audit across all 500 saved chats](darija-router120-check-equivalence-20261008.json),
[model-visible offers](darija-router120-check-offers-20261008.json),
[cost/provider observations](darija-router120-check-costs-20261008.json),
[paid-run plan](darija-router120-check-plan-v2-20261008.json),
[raw run](darija-router120-check-run-20261008.json),
[cleanup](darija-router120-check-cleanup-20261008.json).
The initial unused plan preceded the distinction between unobserved and empty
tool offers; no paid chats were dispatched under it.
