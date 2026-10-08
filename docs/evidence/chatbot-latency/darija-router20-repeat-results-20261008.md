# Existing router + GPT-OSS 20B: fresh Darija repeat

**100 new chats completed: 58/100 tool checks passed, averaging 1.13 seconds.**
The earlier router-only score was 57/100; saved Jev-first scored 66/100. Router +
20B meets the owner's average-time requirement, but selection quality still needs
work before a general switch.

| Run | Tool checks / 100 | Arabic script / 50 | Arabizi / 50 | Both variants / 50 families | Mean complete response |
|---|---:|---:|---:|---:|---:|
| Previous router + 20B | 57 | 38 | 19 | 18 | 1.28 s |
| **Fresh router + 20B** | **58** | **38** | **20** | **19** | **1.13 s** |
| Saved Jev-first + router/20B fallback | 66 | 41 | 25 | 24 | 1.06 s |

All use CoreWeave-only `openai/gpt-oss-20b` and the exact same 100 reviewed
Darija/Arabizi questions and frozen expectations. No French was rerun. The fresh
batch keeps Jev off, permits **zero classifier calls**, and completes all 100
streams without repeated benchmark jobs. Six chats have diagnostic tool failures;
these remain in the score and mean. No non-read tool was called.

Only three check outcomes change: q11 and q94 improve, q61 regresses. **56 pass
both router runs and 41 fail both; 97/100 outcomes agree.** The earlier weaknesses
persist. No chatbot prompt, retrieval or model-quality fixes were made between
runs. Separate processes, caches, request order and workspace snapshots mean the
saved Jev-first run is a reference, not a fresh simultaneous control. Current
source hashes disclose concurrent unrelated dependency work left untouched.

## Examples and scoring limits

- q11 now calls both correct count tools and answers 8 students / 0 teachers.
- q61 ends with the correct 8/0, but first emits the nonexistent tool name
  `teachers_get_teacher_count<|channel|>commentary` twice. Those calls remain failed.
- q97 invents `sectionId: "4"` for fourth-year maths grades instead of discovering
  available classes/sections; the read is blocked.
- q94, asking about an unidentified parent's payment in Arabizi, makes no data
  call and passes the clarification tool check. Its wording discusses unrelated
  schedules and football. It does not establish a correct answer.

**Tool checks are not full answer accuracy.** Final-answer correctness stays
unscored. Checks cover expected tools/dependencies, captured required arguments,
enums, known IDs, year, student attendance scope/date and tool failures. Empty
teacher/exam/attendance data cannot establish nonempty filter accuracy. This is
an admin, first-turn, sequential regression run on owner-reviewed wording with
assistant-authored expectations. Student/parent/teacher ownership and actual
conversational follow-ups are not qualified.

## Cost, verification and cleanup

All 132 captured generation calls identify CoreWeave; response-reported charges
total **$0.00935099 for 100 chats**, including failures. No captured charges are
unknown; no generation IDs are unaccounted for. The mix includes 18 existing
synchronous templates without generation. This observed cost is not a monthly
guarantee. Fresh estimated allowance: $0.10, generation reservation $0.0007 per
chat, classifier allowance zero.

The fixture is cleaned up: Jev off, key removed, AI disabled, model restored to
120B, owned port-3103 app stopped. The primary port-3102 app remains running.
No production chatbot configuration or concurrent dashboard edits were changed.
The protocol/report changes pass **543 script tests and lint**; existing backend
and published package behavior were reused without production code changes.

## Recommendation and next work

Develop **Jev-first with the existing router as fallback**. The fresh router-only
score remains eight checks below saved Jev-first. Neither 58 nor 66 passing plans
qualifies the complete path for all users.

Focus on the 41 persistent failures: Arabizi count/attendance retrieval,
whole-school versus personal tools, lookup before IDs, preserved filters and
payment clarification. Inspect malformed 20B tool names against the actual
provider/tool-call format before choosing a remedy. Validate with populated
unpaid fixtures, then a fresh small rerun of failed families. Timing already meets
the owner's average target; billing and millisecond tuning are not the next work.

Evidence: [fresh tool checks/answers](darija-router20-repeat-results-20261008.json),
[paired changes](darija-router20-repeat-comparison-20261008.json),
[cost/provider observations](darija-router20-repeat-costs-20261008.json),
[frozen plan](darija-router20-repeat-plan-20261008.json),
[raw run](darija-router20-repeat-run-20261008.json),
[fixture snapshot](darija-router20-repeat-fixture-data-20261008.json),
[cleanup](darija-router20-repeat-cleanup-20261008.json),
[previous three-path report](darija-selection-results-20261008.md).
