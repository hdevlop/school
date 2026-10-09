# Remaining Darija routing fixes — 2026-10-09

The fresh 100-question Darija/Arabizi run passed **99/100 tool plans**, compared with 96/100 previously. **4/4 previous failures** and **36/36 targeted cases** pass. Average full response: **0.451 seconds**; timing was observed, with no two-second rejection gate.

## What changed

- q27/q28: sixth-primary counts use the authorized class catalog and selected-year student placements. A unique explicit primary-sixth class name or level is required. Numeric level 6 alone is insufficient. Missing or ambiguous matches ask for a class name/code and cycle; they never substitute a school or section total.
- q55/q56: count-only teacher wording uses the teacher-count tool and validates its numeric result.
- q67/q68: class-list wording uses the class catalog, preserving sections as class details.

These are closed local replies for the reviewed wording, available to admin/principal. Extra qualifiers and protocol text decline the match. MCP schema validation, ownership and academic-year scoping still apply. The targeted plans avoid model-generated malformed tool names; no framework-wide tool-name sanitizer was added.

The static sixth-primary plan reads the authorized selected-year roster alongside the catalog, including when clarification is needed. A future dependent lookup could avoid that extra read. Duplicate student identities are counted once; conflicting placements fail validation, and unknown placements produce an uncertainty caveat. Multiple matching classes require clarification rather than silently summing them.

## What was verified

**36/36 live requests with Jev off** passed with **zero classifier and generation calls**. Populated synthetic HTTP/MCP tests cover 26 requests for admin/principal in two academic years: **104 checks**. Sixth-primary counts differ correctly between years; missing, ambiguous and empty classes, duplicate/conflicting placements and teacher-count validation are tested. **104 restricted-role chats and 12 direct MCP denials** also pass.

**463 chat tests, 557 script tests, 22 protocol tests and 13 chat-year tests pass.** Root lint, typecheck, workspace boundaries and an isolated production build pass.

The full run preserves every question once across 4 segments (11 + 28 + 13 + 48), with no repeated completed jobs. It used the same guarded Jev-first policy and CoreWeave GPT-OSS 20B fallback as the previous run. Replies: **29 Jev, 54 local, 17 model**; 27 generation calls. No recorded accepted Jev decision had the wrong expected intent. The gains belong to the School pipeline, including local replies, and do not prove Jev alone improved.

Remaining tool-plan failures:

- **jev-operator-q11**: unknown_tool; unexpected_count_tool. Tools: teachers_get_teacher_count, students_get_student_count>, students_get_student_count.

## What we can do next

Keep the existing router and validated local replies. 15 answers retain semantic review flags; review those answers and test fresh unseen Darija with populated parent, teacher and student accounts before broad Jev enablement. For q11, extend the existing combined student/teacher-count local reply to the paired wording, verify both count tools and test malformed tool names independently. The fallback retried its malformed student-count name correctly, but the tool plan and its English correction text still failed this check. General production Jev remains off.

Tool-plan checks do not establish complete answer accuracy. The 100 reviewed questions form 50 linked Arabic/Arabizi families. The live admin fixture has eight students, no explicit sixth-primary class, and no teacher/subject/grade/exam records; populated behavior is covered separately by synthetic tests. The run therefore verifies a safe sixth-primary clarification, while the populated tests verify actual counts.

Known response-reported charges: $0.00401177. 3 classifier charges remain unknown with $0.00045 reserved. Missing costs stay unknown; no exact billed total or monthly projection is claimed.

## Evidence and cleanup

Fixture restored to Jev off, AI disabled, key removed and model 120B, then stopped. 4 temporary build directories removed, reclaiming **1.442 GiB**; the running app and active .next remain. No new full registry dump. Raw plans, observations and usage are preserved in one verified compressed archive.

- [Combined results and input hashes](darija-remaining-filters-results-20261009.json)
- [36 live requests with Jev off](darija-remaining-filters-off-check-20261009.json)
- [Previous 96/100 report](darija-final-filters-results-20261009.md)
- [Raw observations archive](darija-remaining-regression-20261009.zip), SHA-256: `3b4f90a0d139e90cfa098e5a906f2bb0d4af2a19b92ed7b4e4bda35725200872`.

To recompute offline from the workspace root, extract the archive and choose unused output paths:

```powershell
Expand-Archive -LiteralPath 'docs/evidence/chatbot-latency/darija-remaining-regression-20261009.zip' -DestinationPath '.'
bun scripts/chatbot-darija-selection-report.mjs 'docs/evidence/chatbot-latency/darija-remaining-filters-run-20261009.json,docs/evidence/chatbot-latency/darija-remaining-filters-continuation1-run-20261009.json,docs/evidence/chatbot-latency/darija-remaining-filters-continuation2-run-20261009.json,docs/evidence/chatbot-latency/darija-remaining-filters-continuation3-run-20261009.json' NEW_SCORES.json 'docs/evidence/chatbot-latency/darija-jev-read-wording-tools-20261008.json' 'docs/evidence/chatbot-latency/darija-jev-read-wording-fixture-data-20261008.json'
bun scripts/chatbot-jev-model-report.mjs 'docs/evidence/chatbot-latency/darija-remaining-filters-run-20261009.json,docs/evidence/chatbot-latency/darija-remaining-filters-continuation1-run-20261009.json,docs/evidence/chatbot-latency/darija-remaining-filters-continuation2-run-20261009.json,docs/evidence/chatbot-latency/darija-remaining-filters-continuation3-run-20261009.json' 'docs/evidence/chatbot-latency/darija-remaining-filters-generation-usage-20261009.jsonl,docs/evidence/chatbot-latency/darija-remaining-filters-continuation1-generation-usage-20261009.jsonl,docs/evidence/chatbot-latency/darija-remaining-filters-continuation2-generation-usage-20261009.jsonl,docs/evidence/chatbot-latency/darija-remaining-filters-continuation3-generation-usage-20261009.jsonl' NEW_COSTS.json
```
