# Jev upcoming-exam coverage — 2026-10-08

Guard 6 adds a small, verified upcoming-exam path to Jev-first. The focused live
run passed **16/20 tool-plan checks**, compared with **12/20** for these same
questions in the saved guard-5 run. **9 Jev replies were selected; all 9 matched
the expected intent, tool plan and answer rendered from the scoped fixture.**
This is a targeted development check, not a new 100-question score or independent
Darija qualification. The earlier complete result remains 80/100.

| Measure | Focused result |
| --- | --- |
| Completed chats | 20/20 |
| Passing frozen tool plans | 16/20 |
| Arabic-script Darija | 10/12 |
| Arabizi | 6/8 |
| Selected Jev replies / GPT generation avoided | 9/20 |
| Selected Jev intent, tool and fixture-answer checks | 9/9 |
| Upcoming-exam tool plans | 5/6 |
| Upcoming-exam replies supplied by Jev | 2/6 |
| Actual generation calls | 25, CoreWeave GPT-OSS 20B |
| Jev decisions | 20 |
| Response-reported total cost | $0.002702342, all known |
| Average complete stream | 1.962 seconds, observational |
| Unknown costs / unaccounted generation IDs | 0 / 0 |

No French was rerun. There was no two-second chat cutoff or average-time gate.
The existing 800 ms candidate deadline and separate 5 s billing observer stayed
in place. A production build ran concurrently, so timing is not a clean comparison
with earlier runs. Budget was bounded to 20 chats, 20 decisions and $0.025 combined.
There were no benchmark retries or executed mutations.

## What changed

- Versioned guard 6 recognizes six reviewed, unfiltered exam questions through
  closed phrase patterns, including Arabic-script Darija and Arabizi. Added names,
  classes, subjects, dates, arithmetic, quotes and extra clauses still decline.
  Existing guard-5 exports retain their historical behavior.
- Accepted exam decisions use `exams_get_upcoming_exams` with the server-resolved
  academic year through the existing authorized MCP executor. No second executor
  or permission bypass was added.
- A singular next-exam request selects the earliest future-date row by date and
  start time. General upcoming requests display at most five ordered rows, retain
  each stored title/class/section/date/time together and explicitly say when more
  rows are available. This does not support arbitrary filters or exhaustive lists.
- After the live run, same-day handling was hardened: the repository includes all
  exams dated today, including ones already finished. A singular reply with such
  rows displays the recorded dates/times and says timing must be checked; it does
  not assert that the first row is still ahead. Unexpected past rows fail closed.
  This clarification was tested offline, not on a populated live school database.
- Fresh benchmark protocols declare guard 6. Historical continuation protocols
  preserve their recorded version and cannot pass readiness against guard 6 as
  guard 5. The new focused flag is `--darija-jev-coverage-v6`.

## What the comparison establishes

Four questions gained passing tool plans: q12, q13, q79 and q80. No selected
question regressed. Only q79's gain was a newly selected exam template. q13 became
a Jev class reply; q12 and q80 improved on the ordinary model path. Provider
variation, different processes and changed cache/load conditions prevent attributing
every gain to guard 6.

q77 already passed through the fallback before; it now uses the Jev exam reply and
avoids generation. q05 and q06 still pass through the fallback: Jev chose the
correct intent but confidence was below 0.8 and its write bit also disagreed.
q78 (`imta lfard jay?`) remained incorrect: Jev chose a low-confidence student-count
intent, which the guard rejected, and the fallback requested no exam tool.

The earlier explanation of q12/q50 as vocabulary rejections was incorrect. Their
wording passes guard 5 already. Their read choices conflicted with the independent
write answer: q12's latest write probability was 0.70 and q50's was 0.52. The
disagreement stop remains intact; confidence is not lowered and write disagreement
is not ignored to increase coverage.

Replaying the earlier **saved decisions**, without network calls, makes q77 and
q79 newly eligible, preserves all 31 previously selected Jev replies and admits
no newly eligible wrong intent. This is eligibility replay, not a new paid result.

## Remaining failures and useful next work

| Case | Observed problem | Next action |
| --- | --- | --- |
| q32 | Arabizi mathematics-teacher request produced no teacher read | Improve subject understanding and check teacher-list filtering with populated data. |
| q78 | Short Arabizi next-exam wording confused Jev and fallback | Test bounded Darija examples in a new version of the classification wording, retaining write and arithmetic controls. |
| q91 | Girls-count request used total count and malformed list-tool names | Verify gender filtering and reject malformed model tool plans; a total-student count cannot answer this request. |
| q93 | Unidentified parent-payment request read school-wide monthly payments | Prefer clarification before data access, then qualify parent identity and ownership with the real role. |

Three failed read plans had their required tools offered; q93 was an unexpected
data read. These are selection/argument problems, not evidence that missing tool
retrieval alone explains the failures. Tool-plan success also does not qualify
the wording or filters in the remaining model answers.

Recommended next work is the short-Arabizi and write-bit classification wording,
followed by role-specific, populated read validation. Keep the existing router
as fallback. Jev remains a guarded selector for supported replies, rather than a
replacement for every school tool or a free-form answer generator. The normal
app remains off for Jev; this run does not qualify student, parent or teacher use.
This selected sample does not establish a monthly cost or school-wide accuracy.

## Verification and evidence

- 380 chat tests passed, including real HTTP guards, year-scoped MCP execution
  and zero generation on the new exam path. 21 benchmark protocol tests passed.
- The unpaid forced-choice matrix vetoed **644/644 wrong read choices** across
  the original 100 reviewed questions. The populated audit passed six supported
  renderers, rejected **156/156** unsupported read injections and matched all
  nine captured Jev answers. Future, same-day, invalid-date and ordering tests pass.
- The 551-script-test run had 548 passes and three 5 s process timeouts during
  the concurrent build. The two affected files passed all 35 tests when rerun
  with a 20 s test-process limit. Workspace boundary checking passed separately.
- Root lint, typecheck, server test typecheck and the final production build passed.
  Verification used the current working tree, including concurrent dashboard
  edits and the kit pin; those changes are outside this chatbot commit.
- The fixture was restored to Jev off, AI disabled, key removed and model 120B;
  its port 3103 process was stopped. The normal port 3102 app remained running.

Raw paid evidence is immutable: [protocol](darija-jev-coverage-v6-plan-20261008.json),
[run](darija-jev-coverage-v6-run-20261008.json),
[provider usage](darija-jev-coverage-v6-generation-usage-20261008.jsonl),
[tool scores](darija-jev-coverage-v6-results-20261008.json),
[costs](darija-jev-coverage-v6-costs-20261008.json),
[offered tools](darija-jev-coverage-v6-offers-20261008.json),
[saved/live comparison](darija-jev-coverage-v6-comparison-20261008.json).

Final offline evidence is [answer audit v3](darija-jev-coverage-v6-answer-audit-v3-20261008.json)
and [compatibility proof v2](darija-jev-coverage-v6-post-benchmark-proof-v2-20261008.json).
The latter identifies post-run source changes and confirms unchanged calls/text
for all 12 saved fixture renderer combinations, including the empty exam results.
The first equivalence artifact had an incorrect group label; [equivalence v2](darija-jev-coverage-v6-equivalence-v2-20261008.json)
corrects it and retains the same 16/20 score. Earlier audit/proof artifacts are
intermediate snapshots, superseded for final-code verification by these versions.
