# Darija routing and answer closeout — 2026-10-09

The fresh 100-question Darija/Arabizi regression passed **100/100 tool plans** (previously 99/100), with **0.364 seconds average full response**. All **42 targeted cases** pass. **42/42 additional live Jev-off requests used zero classifier or generation calls.** Timing was observed, with no two-second rejection gate.

## Fixes

- q11/q12: separate student and teacher counts use both validated selected-year count tools in a fixed order, then label each number. This bypasses the previous malformed fallback tool name and English correction text, without adding an arithmetic total.
- q57/q58: the reviewed teacher-count wording uses the teacher-count tool and displays zero explicitly.
- q39/q40: the reviewed vague reference asks for a name/topic without inventing a subject or reading data.

These are closed guarded local replies for reviewed wording, not a change to Jev's model. Extra names, dates, operations, quotes or protocol text decline the match. School-wide counts require admin/principal, and every read retains MCP validation, authorization, ownership and selected-year scoping. No framework-wide malformed-tool-name sanitizer was added.

The latest-message template API does not supply conversation history. The exact vague phrases therefore conservatively ask for clarification even when an earlier turn might identify the referent; broader history-aware resolution remains a separate improvement.

## Review of the 15 previously flagged answers

The assistant found **13 answers supported by fixture data or a correct clarification, and two defects** (q40 and q58). Both defects are now fixed. All **15 captured answers** pass the assistant's fixture evidence review after the fixes. This is recorded separately from the frozen scorer's 14 current review flags; earlier observations and expectations were not relabeled.

| Cases | Subject | Evidence review |
| --- | --- | --- |
| q33/q34 | Monthly exams | Month, selected year, and zero recorded exams match the fixture. Populated tests cover past/future and month edges. |
| q35/q36 | Previous-month absences | Recorded student absences match September 2026; no claim about unique absent people. |
| q37/q38 | Classes above 30 | No fixture class exceeds 30; populated tests cover the 30/31 boundary and duplicates. |
| q39/q40 | Vague reference | Now asks for the person/topic with no tools. The previous q40 invented a subject. |
| q58 | Teacher number | Now explicitly displays zero from the teacher-count result. The previous reply omitted it. |
| q91/q92 | Girls count | Known female records are separated from eight records with unknown gender; no exact total is invented. |
| q93/q94 | Parent payment | Asks for identity with no tools; does not guess a parent account or payment. |
| q99/q100 | Previous year | Clarifies the missing subject and points to permitted year selection, without cross-year reads. |

This review establishes the captured answers' relationship to the fixture and tested filters; it is **not independent native-speaker acceptance or general answer accuracy**. Your review can still confirm whether the phrasing sounds like your Darija. The live fixture has eight students with unknown gender, empty teacher/subject/grade/exam records and no explicit sixth-primary class. Populated behavior is checked separately through synthetic HTTP/MCP tests.

## Validation

**471 chat tests, 557 script tests, 22 protocol tests and 13 chat-year tests pass.** The qualified reply suite has 44 tests, including **128 populated admin/principal checks across two years**, **128 restricted-role chats**, and **12 direct MCP denials**. Separate counts preserve both numbers, reject malformed results and retain zero. Existing sum, month, class-size, grade-join, year and role regressions pass. Root lint, typecheck, workspace boundaries and an isolated production build pass.

The 100-question run used the same Jev-first policy and CoreWeave GPT-OSS 20B fallback as the prior run. Each question occurs once across 3 preserved segments (45 + 15 + 40), with no repeated completed jobs. Replies: **25 Jev, 60 local, 15 model**, with 23 generation calls. No recorded accepted Jev decision had the wrong expected intent. Improvements belong to the complete School pipeline, including the local replies.

No tool-plan failure in this run.

Known response-reported charges: $0.00345242. 2 classifier charges remain unknown with $0.00030 reserved. No exact billed total or monthly estimate is claimed.

## What we can do now

Keep the existing router and these validated local replies. The scoped routing fixes and assistant fixture review are complete. Jev can remain a guarded helper with 20B fallback in the test configuration. Before broad production enablement, use fresh unseen Darija and populated authorized parent, teacher and student workflows; this reused 50-family development corpus cannot establish that acceptance. No known tool-plan failure remains in this final observation. General production Jev remains off; this change does not switch the running school's AI settings.

## Evidence and cleanup

Fixture restored to Jev off, AI disabled, key removed and model 120B, then stopped. 2 temporary build directories removed, reclaiming **1.18 GiB**. The active app and .next remain. New raw evidence is compressed in one hash-verified ZIP; prior reports are unchanged. No full tool-registry dump.

- [Combined results, answer review and input hashes](darija-answer-closeout-results-20261009.json)
- [42 live checks with Jev off](darija-answer-closeout-off-check-20261009.json)
- [Previous 99/100 report](darija-remaining-filters-results-20261009.md)
- [Verified raw archive](darija-answer-closeout-20261009.zip), SHA-256: `1060f439b7bf32395d1870eff6b1680ccb5c26e227a381f14320e1c00eb6eb80`.

To recompute offline from the workspace root, extract the archive and use new output paths:

```powershell
Expand-Archive -LiteralPath 'docs/evidence/chatbot-latency/darija-answer-closeout-20261009.zip' -DestinationPath '.'
bun scripts/chatbot-darija-selection-report.mjs 'docs/evidence/chatbot-latency/darija-answer-closeout-run-20261009.json,docs/evidence/chatbot-latency/darija-answer-closeout-continuation1-run-20261009.json,docs/evidence/chatbot-latency/darija-answer-closeout-continuation2-run-20261009.json' NEW_SCORES.json 'docs/evidence/chatbot-latency/darija-jev-read-wording-tools-20261008.json' 'docs/evidence/chatbot-latency/darija-jev-read-wording-fixture-data-20261008.json'
bun scripts/chatbot-jev-model-report.mjs 'docs/evidence/chatbot-latency/darija-answer-closeout-run-20261009.json,docs/evidence/chatbot-latency/darija-answer-closeout-continuation1-run-20261009.json,docs/evidence/chatbot-latency/darija-answer-closeout-continuation2-run-20261009.json' 'docs/evidence/chatbot-latency/darija-answer-closeout-generation-usage-20261009.jsonl,docs/evidence/chatbot-latency/darija-answer-closeout-continuation1-generation-usage-20261009.jsonl,docs/evidence/chatbot-latency/darija-answer-closeout-continuation2-generation-usage-20261009.jsonl' NEW_COSTS.json
```
