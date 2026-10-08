# Darija routing fixes and 20B regression test — 2026-10-08

**The optimized existing router + GPT-OSS 20B passes 74/100 tool-plan checks,
versus 58/100 before the fixes.** Arabizi improves from 20/50 to 36/50; Arabic
script stays at 38/50. All failed reads now have their required tools in the
captured initial model request. The remaining problem is execution/planning,
including malformed tool names and incorrect filtered answers. General 20B
enablement is still not qualified.

## Changes and unpaid validation

School's routing rewriter now recognizes literal Arabizi school vocabulary and
translates only the routing copy. It preserves dates, class codes, unknown names,
negation and write intent; the model receives the original question. Two distinct
recognized words are required before Latin rewriting, so an isolated short token
does not alter an English/French query. This is a vocabulary helper, not a complete
Darija translator or an alternative router.

Narrow read dependencies supply class/section/subject discovery for class student
and grade reads, full attendance for date-window questions, and the exam list
when a monthly question retrieves today's exam tool. MCP permissions and year
handling remain unchanged. The system prompt explains school-wide versus personal
counts, the valid academic KPI alternative, schema inputs, list-based filters,
real ID discovery and the prohibition on fabricated tool responses.

An unpaid live registry check verified all 459 tool names and six scoped reads.
The routing preview initially supplied all required groups on 60/62 read cases;
after the exam dependency fix it supplied **62/62**. The saved effective settings
show these dependencies came from boot configuration. Preview success alone was
not treated as model correctness: the paid observer captured actual offered names.

## Results

| Configuration | Tool plans / 100 | Arabic script / 50 | Arabizi / 50 |
|---|---:|---:|---:|
| Previous router + 20B, fresh repeat | 58 | 38 | 20 |
| Saved Jev-first + old router/20B fallback | 66 | 41 | 25 |
| Saved router + 120B, equivalent-count audit | 71 | 41 | 30 |
| **Optimized router + 20B, Jev off** | **74** | **38** | **36** |

The frozen score and the narrow staff/count-equivalence audit both give 74 for
this run. Saved raw scores remain unchanged. This is an observed configuration
comparison: router vocabulary, dependencies and prompt changed together, and the
120B run used different providers. It does not prove 20B is intrinsically better
than 120B or predict Jev-first with the new router.

One fresh pass dispatched the same 100 reviewed questions: the 29 saved 120B
failures plus 71 regression controls. **10/29 old 120B failures now pass; 19
remain.** Of its 71 old passes, 64 still pass and seven fail. Against the prior
20B repeat, 21 cases improve and five regress, for a net gain of 16. There are
33/50 families with both script variants passing. No regression is hidden.

All 100 streams completed, with zero classifier attempts, 18 synchronous refusal
templates and no mutating tool calls. Actual provider captures show:

| Current outcome | Questions |
|---|---:|
| Passing tool-plan checks | 74 |
| Required tools offered, executed plan fails | 25 |
| Unexpected data read for an ambiguous person question | 1 |
| Required tools missing from initial offer among failed reads | **0** |

Examples worth keeping distinct:

- q31 now reads teachers before answering the maths-teacher question; the fixture
  has no teachers, so this cannot qualify subject filtering on populated data.
- q35 has `attendance_get_all` available but still refuses last-month attendance.
- q58 reads the student count for a teacher-count question, then answers eight
  students. q92 reads the total student count and claims eight girls. These are
  concrete wrong selections/answers despite correct tool availability.
- q10/q29/q63/q64 include tool names with literal `<|channel|>` suffixes. These
  remain unknown/malformed calls, even when a later valid call answers correctly.
  Diagnose the observed model/provider/SDK tool-call path; do not silently execute
  arbitrary rewritten names.
- Several class questions read `sections_get_sections` rather than the required
  class list. That fixture's response can show its one class, but does not prove
  all classes, including classes without sections, were listed. The frozen
  class-list requirement stays unchanged.
- q93 asks about an unidentified parent's payment and performs a data read rather
  than obtaining the missing identity. A completed reply is not a passing plan.

## Time, charges and scope

Mean complete response is **1.45 seconds across all 100 streams**. Timing is
observational: no average-time acceptance gate or two-second cutoff was applied.
There were 155 generation calls, all CoreWeave/20B, and two chats with diagnostic
tool failures. Captured charges total **$0.01191781**, all known and attributable;
no classifier charge or unaccounted generation ID exists. That is about $0.12 per
1,000 similar benchmark chats, not a monthly guarantee. No additional billing
investigation or benchmark HTTP retry was performed.

These are 50 linked families with owner-reviewed wording and assistant-authored
expectations. The admin fixture has eight students, zero teachers and empty exams
and attendance. The benchmark assesses executed tools/arguments, not full final
answer correctness. Populated gender/date/subject filtering, follow-ups and
student/parent ownership remain unqualified. The wrong girls answer illustrates
why the tool score cannot be presented as answer accuracy.

## Recommendation and what to do next

**Keep the existing router with these routing fixes. Do not replace every
fallback with 20B yet.** The missing-offer problem is resolved on this corpus,
and the cheap model improves substantially, but 26 plans still fail. Making all
tools visible did not make 20B consistently choose and use them correctly.

For the $10/month goal, use guarded deterministic/Jev-selected replies for the
supported simple requests, and a separately validated fallback for complex
filters, identities and multi-step questions. Saved Jev-first results apply to
the old router; this run does not claim to test or enable the new combination.
The next useful work is:

1. Validate supported count/class/attendance/exam plans and final answers on
   populated fixtures, retaining gender, date, subject and actor constraints.
2. Diagnose the malformed CoreWeave tool names with captured responses and SDK
   parsing fixtures, and enforce clarification before unidentified-person reads.
3. Measure the guarded combination after those correctness fixes. Reserve 120B
   for complex fallback only if that combined path is validated and fits the
   budget; do not rerun French or spend effort shaving milliseconds now.

No new user-authored question collection is needed. No automatic switch of the
normal model or Jev mode follows from this experiment.

## Verification, provenance and cleanup

377 relevant chat/analyzer tests and lint pass. The wider script suite had 547
passes and two five-second CLI timeouts while the build and benchmark ran; all
28 CLI tests, including those two, passed on the isolated rerun. Production build
passes after correcting a TypeScript inference error.

The paid run's original source fingerprint is preserved. After dispatch, an
explicit `string[]` annotation fixed Next build inference with byte-identical
Bun runtime output. A Map lookup then preserved unknown prototype-like words
such as `constructor`; all 100 benchmark routing outputs remain identical. Both
checks are recorded, and no paid requests were replayed. Verification used the
shared working tree; concurrent dashboard edits and its Najm Kit version change
are excluded from this chatbot commit.

Fixture settings are cleaned: Jev off, AI disabled, provider key removed, normal
120B model restored, owned port-3103 app stopped. Port 3102 remains running.
No Najm release or package pin change is needed for these School-only fixes.

Evidence: [frozen plan](darija-router-fix-plan-20261008.json),
[raw run](darija-router-fix-run-20261008.json),
[routing previews](darija-router-fix-preview-20261008.json),
[latest tool scores](darija-router-fix-results-v2-20261008.json),
[actual offered tools](darija-router-fix-offers-20261008.json),
[consistent count audit](darija-router-fix-equivalence-20261008.json),
[case comparison](darija-router-fix-comparison-v2-20261008.json),
[charges/providers](darija-router-fix-costs-20261008.json),
[type-only proof](darija-router-fix-type-proof-20261008.json),
[routing compatibility](darija-router-fix-corpus-proof-20261008.json),
[cleanup](darija-router-fix-cleanup-20261008.json).
The initial keyless preflight stopped without dispatch; the enabled fixture
preflight was ready with zero paid calls. Earlier analysis artifacts are retained;
v2 fixes the comparison's category summary for synchronous zero-generation replies
and the score report's tool-capture description without changing scores.
