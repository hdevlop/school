# Jev guarded read wording — 2026-10-08

The three targeted Darija requests now use Jev successfully: the separate
student/teacher counts (q12), the student count (q50), and `imta lfard jay?` (q78).
The focused live check passed **17/20 tool plans**, compared with 16/20 previously.
**15 replies used Jev**, compared with 9 previously; all 15 matched the frozen
intent, authorized tool plan and answer rendered from the scoped fixture.

| Measure | Previous guard-6 run | New read-wording profile |
| --- | --- | --- |
| Focused tool plans passed | 16/20 | 17/20 |
| Jev replies / chats without GPT generation | 9/20 | 15/20 |
| Selected Jev intent/tool/fixture-answer checks | 9/9 | 15/15 |
| Arabic-script Darija tool plans | 10/12 | 10/12 |
| Arabizi tool plans | 6/8 | 7/8 |
| Generation calls | 25 | 9 |
| Average complete response | 1.962 s | 0.910 s |
| Response-reported cost for 20 chats | $0.002702342 | $0.001616718 |

Timing is observational, with no average-time acceptance gate or two-second chat
cutoff. Different process, cache and load conditions prevent a controlled causal
comparison; the previous run also overlapped a production build. The new build
started after the paid run. No French was rerun and no benchmark request was retried.
All costs were known, with no unaccounted generation IDs or executed mutations.
This targeted subset is not a new 100-question result: the earlier full score
remains 80/100. It is also not independent native-language or school-wide evidence.

## Why the wording is conditional

First, a classification-only comparison alternated old wording 3 and candidate
wording 5 on 48 questions: 24 in each Darija script, including all 18 reviewed
write requests. That dispatched 96 Jev requests, **no school tools or GPT calls**,
and cost $0.004234356. Exact original message text was preserved.

Candidate wording made `imta lfard jay?` an upcoming-exam intent with confidence
1.0. It also reduced the mistaken write probabilities on q12 and q50 enough for
their existing guard to accept the correct count intents. Across the focused
classification comparison, accepted read decisions increased from 10 to 15,
and false write bits on non-write questions fell from six to one.

However, using candidate wording globally failed the frozen development gate:
write-request acceptance fell from eight to seven and q21's deletion request
received a false-negative write bit. **Global wording 5 was not adopted.** The
baseline itself also missed two write bits in this raw classifier test; neither
version is a standalone write-authorizing system.

Runtime **wording profile 6** uses candidate wording 5 only when the existing
guard 6 positively recognizes an unqualified supported read. It keeps wording 3
for writes, filtered or ambiguous questions, arithmetic and small talk. No second
classifier request is made, no message is rewritten, and this preliminary profile
choice does not select a tool or override the final classifier decision.

The existing confidence threshold, write-bit agreement, semantic guard, role/year
scope and shared authorized MCP executor remain required. Normal synchronous write
refusals still run before Jev; nothing here authorizes mutation.

Saved-decision projection predicted increased read coverage while preserving the
baseline write request shapes and write coverage. That projection was explicitly
kept separate from the subsequent **actual 20-chat combined-profile run** above.
Benchmark readiness now requires the recorded runtime wording-profile version;
historical wording-3 protocols cannot silently run as profile 6.

## Actual gains and remaining work

Six questions switched from fallback generation to Jev: q05, q06, q12, q50, q78
and q80. q78 gained a passing exam-tool plan; the other five already passed through
the fallback in the previous run. No tool-plan outcome regressed in this subset.
The latest q12/q50 write probabilities were 0.05/0.10; q78 selected upcoming exams
at confidence 1.0 with write probability 0.05. No threshold or guard was relaxed.

All three remaining failures correctly stayed outside Jev's unfiltered reply scope:

| Case | Actual fallback failure | Concrete next action |
| --- | --- | --- |
| q32: Arabizi mathematics-teacher names | Teacher-list tool was offered but never called; the reply claimed no direct way to obtain the list. | Add a guarded, subject-filtered teacher-list plan and verify it against populated teacher/subject data. |
| q91: girls-only student count | Student-list tool was offered but never called; the reply did not compute the requested count. | Add a guarded gender-count plan using actual scoped student data, with unknown/missing gender handling. |
| q93: how much this parent paid this month | Read school-wide monthly payments and claimed zero for an unidentified parent. | Ask for the parent's identity before data access; then qualify parent ownership and the month filter. |

q30 arithmetic and q35 last-month attendance passed their frozen tool checks but
their calculated/filter answers still need semantic review. Tool-plan success is
not full answer accuracy. Empty exam/attendance fixture data cannot establish
populated filtering correctness.

Keep Jev-first with the existing router/20B fallback as the current experiment.
Next work is these three specific filtered/ambiguous plans, then role-specific
validation for parents, teachers and students. The normal app's Jev mode remains
off; this admin first-turn study does not qualify those actors or production use.
No monthly-price projection is claimed from this selected sample. Total provider
charges for this task's two studies were $0.005851074.

## Verification and evidence

- 392 chat tests passed, including guarded word-profile selection, real HTTP/MCP
  execution, the previously added upcoming-exam path and write-refusal precedence.
- 555 script tests passed with a 20 s test-process limit. The subsequently added
  CLI missing-cost regression and its four companion tests also passed. An unknown
  response stops after one request and retains its full reservation.
- The wording-boundary proof verifies byte-identical baseline payloads for all
  protected reviewed writes/needs-LLM cases and broader write controls. This is a
  deterministic request-shape proof, not a claim that every raw baseline write
  bit is correct.
- The unpaid populated audit passed six supported renderers, vetoed 156/156
  unsupported read injections and matched all 15 captured Jev answers.
- Root lint, root typecheck, server test typecheck, workspace boundaries and an
  isolated production build passed. Concurrent dashboard/financial edits and the
  kit pin are outside this chatbot commit.
- The test fixture was restored to Jev off, AI disabled, key removed and model
  120B, then its port 3103 process was stopped. The normal port 3102 app remained
  running. No normal app setting was changed.

Classification evidence: [frozen plan](jev-wording-v5-plan-20261008.json),
[96-request raw run](jev-wording-v5-run-20261008.json),
[saved combined-profile projection](jev-wording-v5-profile-projection-20261008.json).
The probe's insufficient-budget exit handling was hardened after this completed
run; its request builders, raw decisions and recorded charges are unchanged.

Live evidence: [frozen profile-6 plan](darija-jev-read-wording-plan-20261008.json),
[20-chat raw run](darija-jev-read-wording-run-20261008.json),
[provider calls](darija-jev-read-wording-generation-usage-20261008.jsonl),
[tool scores](darija-jev-read-wording-results-20261008.json),
[costs](darija-jev-read-wording-costs-20261008.json),
[offered-tool diagnosis](darija-jev-read-wording-offers-20261008.json),
[comparison](darija-jev-read-wording-comparison-20261008.json),
[answer audit](darija-jev-read-wording-answer-audit-20261008.json),
[wording-boundary proof](darija-jev-read-wording-safety-20261008.json),
[cleanup](darija-jev-read-wording-cleanup-20261008.json).
