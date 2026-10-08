# Darija tool selection: completed three-path comparison

Jev-first is the best candidate in this batch: **66/100 tool-plan checks passed**,
compared with 57/100 for the existing router and 59/100 for router-then-Jev. All
three average below the owner's two-second limit. Keep the existing router as
fallback and improve Jev-first before a general rollout: 34 questions still fail
the tool checks, and passing a tool plan does not establish a correct final answer.

## Measured results

All 100 owner-reviewed questions were run once through each path: **300 completed
chat streams**, 50 in Arabic-script Darija and 50 in Arabizi, covering 50 paired
families. No French questions were rerun. All paths use the same CoreWeave-only
`openai/gpt-oss-20b` fallback. This compares selection paths; 120B was not rerun.

| Path | Tool checks / 100 | Arabic script / 50 | Arabizi / 50 | Both variants / 50 families | Average complete response | Jev direct replies |
|---|---:|---:|---:|---:|---:|---:|
| Existing router → 20B | 57 | 38 | 19 | 18 | 1.28 s | 0 |
| Jev first → existing router + 20B on decline | **66** | **41** | **25** | **24** | **1.06 s** | **32** |
| Existing router → Jev constrained to shortlist → 20B on decline | 59 | 40 | 19 | 18 | 1.68 s | 25 |

Times include all 100 streams per path, including wrong or failed tool plans.
Under two seconds passes the owner's average-time criterion; faster passing paths
get no correctness advantage. Individual slow replies remain in the raw evidence.
Existing synchronous templates supplied another 18 replies per path without Jev.

Compared question by question with the existing-router baseline, Jev-first gains
10 passing plans and loses one; router-then-Jev gains three and loses one. These
are single-run observations, not statistical guarantees. There were 164 classifier
attempts and 57 selected Jev replies. **Zero selected Jev choices disagreed with
the frozen intent labels; all 57 passed the recorded tool checks.** No non-read
tool was called. Ordinary fallbacks still include wrong tools, blocked reads and
malformed calls: eight chats in each of the first two paths and six in
router-then-Jev have diagnostic tool failures.

## What the failures mean

| Reviewed question | Observed behavior | Useful change |
|---|---|---|
| q08: `bghit ghir l3adad dyal tlamd li 3ndna kamlin, bla lista dyal smiyat.` | Jev-first calls student count and replies 8. Router-then-Jev's shortlist omits student count, preventing that Jev action; the LLM fallback emits a malformed count call. | Improve Arabizi retrieval and retain whole-school count tools. Jev-first can avoid this shortlist bottleneck. |
| q10: `ch7al mn ostad kay9erri f lmdrasa dyalna daba?` | All three use a teacher dashboard/overview instead of teacher count; one invents `id: "unknown"`. | Improve teacher-count coverage and distinguish school counts from a personal dashboard. Resolve IDs through lookup. |
| q31: `عطيني السميات ديال الأساتذة اللي كيقريو الرياضيات.` | Router-then-Jev makes the required teacher-list read; the others apologize without reading. The empty fixture cannot prove subject filtering. | Preserve subject filters and perform required list/lookup reads. |
| q36: `werini lghiyab dyal tlamd f chher li fat.` | Two call a teacher attendance trend; router-then-Jev asks for a student ID despite a whole-school question. | Preserve student scope and last-calendar-month dates. |
| q93: `شحال خلص هاد الولي هاد الشهر؟` | Jev-first and router-then-Jev use school monthly payments for an unidentified parent. The baseline asks for the parent. | Clarify identity before a payment read; never substitute a school total. |

Arabizi passes only 25/50 in the strongest path. Jev helps within its supported
count/list/attendance/refusal menu, but does not replace general routing or complex
LLM planning and wording. Router-then-Jev retains retrieval misses as a hard
constraint and supplies fewer direct replies. Making it mandatory is not supported.

## Scope and evidence limits

Expected tools and dependencies were frozen before paid dispatch using the live
459-tool registry and fixture snapshot. Checks cover required tool groups,
captured arguments, required fields/enums, known IDs, year, student attendance
scope/date, unexpected count tools and errors/blocked/non-read tools. Shortlist
observations exist for router-then-Jev; the other paths cannot establish which
layer caused each miss. A no-tool apology on a data question fails.

**These percentages are tool-plan checks, not full answer accuracy.** Final-answer
correctness is deliberately unscored in the JSON. Clarification, refusal wording
and calculated/filtered answers need semantic assessment. For example, q94 in
Jev-first makes no data call and passes the clarification tool check, but asks
about students instead of the intended parent's payment. A passing plan can still
produce a poor answer. Templates answer Arabizi in Arabic script; output
transliteration preference was not evaluated.

The owner reviewed wording; labels and expected plans remain assistant authored.
There are 50 linked families, not 100 independent native examples. The fixture has
eight students, zero teachers, one class with two sections, no exams and no today's
student attendance. Empty data cannot establish nonempty subject/date/gender
filtering. This is an admin, first-turn, sequential fixture run. Student/parent/
teacher ownership, actual conversational follow-ups and concurrent traffic are
not qualified. These are limitations, not requests for more reviewer paperwork.

Five preserved segments contain 43 + 69 + 21 + 107 + 60 chats. Usage lookup
failures, two unselected unknown-cost classifier attempts and a between-chat
control timeout interrupted earlier segments. Continuations dispatched only
remaining jobs with reduced allowances and retained unknown reserves. No benchmark
chat was repeated. Fresh processes reset caches; pooled timing describes this
operational run. Provider/SDK extra generation captures remain visible; 300 chats
does not mean 300 provider calls. Per-chat billing lookup was removed for the final
segment; request/classifier limits and estimated spending stops remained.

Known response charges total **$0.02764 for this batch**. Six chats have incomplete
charge evidence, including two classifier attempts. Costs stay unknown/reserved,
never zero. This is a lower bound, not an exact invoice or monthly $10 guarantee.
No further billing investigation is needed for the selection recommendation.

## Implementation and verification

Router-first is published as `najm-chatbot@3.6.0` and pinned exactly in School's
root, server, dashboard and Bun lockfile. It completes ordinary routing/context
preparation, passes the server shortlist to Jev, accepts only calls within that
shortlist, and reuses preparation on decline/error/timeout. It does not reroute or
start the fallback LLM alongside Jev. Default parallel policy and synchronous
template behavior are preserved. These experimental arms require marked fixture
controls and fixed one-use sessions; they do not apply to ordinary user questions.

Upstream commit `9a5aa96e95c9fe935f4fe8e2a9622117f8e83ba5` is pushed to
`origin/master`; [registry identity](najm-chatbot-3.6.0-registry-20261008.json) matches
the reviewed artifact. The matching writable release clone has 287 passing package
tests and passing build/API/release checks. The read-only Desktop reference is
older than School's pin; it was not edited or consumed.

School checks: **1,912 root test executions, zero failures**, workspace boundaries,
21 focused report/protocol tests, lint, typecheck and production build pass.
Published-hook integration tests verify one routing operation, one guarded read
and no generation for a matching candidate, and one ordinary fallback when its
tool is absent. The fixed fixture helper adds `read:exams` through the permission
service. No academic-year/ownership boundary changes were made.

Cleanup is saved: fixture Jev off, AI disabled, key removed, model restored to
120B, isolated port-3103 app stopped. Real-question/production defaults remain
unchanged. Package publication/adoption is complete; deployment and general Jev
enablement were not performed.

## What we can do next

1. Develop **Jev-first with the existing router as fallback**. Improve Arabizi
   count/list/attendance coverage and retrieval for q08/q10 and related failed
   families. Retain confidence, write, permissions and scope guards.
2. Fix fallback planning: school versus personal tools, discovery before IDs,
   preserved subject/gender/date filters, and clarification before payments.
   Check malformed 20B calls against the actual schema; a failed call or guessed
   total must not count as success.
3. Validate with focused unpaid fixtures, then a fresh bounded rerun of failed
   families. Add populated filtering data and actor-scope checks before enabling
   real users. Completed benchmark requests stay consumed.

The benchmark is finished. Next work is a specific quality fix, not further
millisecond or billing tuning. Production keeps the existing configuration until
the complete path produces acceptable answers.

Evidence: [tool checks and answers](darija-selection-results-20261008.json),
[cost/stream observations](darija-selection-costs-20261008.json),
[segment manifest](darija-selection-segments-20261008.json),
[frozen questions/plans](../../../datasets/chatbot-latency/darija-tool-selection-20261008.json),
[fixture snapshot](darija-selection-fixture-data-20261008.json),
[cleanup](darija-selection-cleanup-20261008.json).
