# Darija filtered replies — 2026-10-09

The final 100-question Darija/Arabizi regression passed **96/100 tool plans**, up from the previous saved **92/100**. All **eight original failures** and all **30/30 targeted cases** passed. Arabic script: 49/50; Arabizi: 47/50. Average complete response: **0.540 seconds**, observed without a two-second cutoff or timing gate.

## What changed

- Monthly exam counts read all authorized selected-year exams and include past and future exams within the school's current calendar month.
- Classes above 30 students use the selected-year roster, deduplicate identities and apply **strictly greater than 30**. Unknown placements are disclosed.
- The reviewed class-list variants read classes and their sections rather than changing the request to sections or timetables.
- Fourth-class maths grades join authorized class/subject IDs. Missing or ambiguous matches request clarification; identified empty results remain distinct. Numeric marks, totals, dates and assessment sources are validated.
- Context-free “and last year?” asks what figure is intended and keeps the selected-year access boundary.
- Previous-month student absences use an explicit student read, the previous calendar month and absent status. The answer counts records, not distinct students, and displays at most 20 with an explicit remainder.
- Reviewed teacher-count variants render the validated number directly, fixing an answer that previously showed an unresolved `{{count}}` placeholder.

These are closed local replies for the reviewed wording. Extra names, dates, classes, quoted qualifiers and operations decline the match. School-wide reads require admin/principal; existing MCP validation, ownership, academic-year scoping and write refusals still apply.

The static grade template reads the authorized selected-year grade list alongside class/subject catalogs, then filters locally or asks for clarification. It may read more rows than a future dependent lookup. It does not fabricate IDs or query another year.

## What was checked

**30/30 additional live requests with Jev off** passed with **zero classifier and generation calls**. Populated synthetic HTTP/MCP tests cover 20 requests for admin/principal in two academic years: **80 checks**. They include the 30/31 boundary, repeated identities, unknown placement, past/future exams, ambiguous class/subject matches, different years' grades, previous-month absent/present filtering and January-to-December rollover. **80 restricted-role chats and 12 direct MCP denials** passed. The school-zone UTC month boundary and business-date override passed.

The first new full run scored **97/100**: all eight old failures passed, but q14/q35/q70 regressed on fallback. Those cases and their paired variants were then covered by closed plans. The final run above is a fresh regression of the revised code, not a relabeling of that first result. Each run preserves every question once across its own segments; there were no chat retries or repeated completed jobs within a run.

The final pipeline produced **30 Jev replies, 48 local replies and 22 model replies**, with 37 CoreWeave GPT-OSS 20B generation calls. No recorded accepted Jev decision had the wrong expected intent. This improvement belongs to the School pipeline, including local replies; it does not show the Jev model alone became more accurate.

The final run used 3 preserved segments (7 + 60 + 33). Missing classifier cost metadata caused bounded stops; continuation used only undispatched jobs with reduced remaining limits. Known response-reported charges were $0.00519191. 2 classifier charges remain unknown with $0.00030 reserved. Exact billing and monthly projections are not claimed.

## Remaining limits and next actions

| Cases | Observed fallback failure | Next concrete change |
| --- | --- | --- |
| q28 | A tool name contained protocol text; the answer counted a section instead of establishing sixth-primary membership. | Reject malformed/unknown tool plans and resolve a unique authorized primary class before counting its scoped roster; clarify missing or ambiguous matches. |
| q56 | A teacher-count request called the student-count tool. | Extend the guarded count-only teacher wording and test that it cannot select the student count. |
| q67/q68 | Class-list wording returned sections only. | Add the paired class-list variants to the guarded class read, preserving sections as class details. |

**Tool-plan success is not full answer accuracy.** 15 replies retain semantic review flags. The live fixture has eight students, missing gender information and empty teacher/subject/grade/exam data; populated behavior is tested separately. The reviewed corpus contains 50 linked Arabic/Arabizi families and is reused development evidence.

Keep the existing router and these local replies. Jev can remain a narrow, guarded helper with 20B fallback in the fixture. Before enabling it broadly, test real parent, teacher and student workflows with populated authorized data, review the flagged Darija answers, and add fresh unseen wording. The grade lookup can later use dependent class/subject resolution to reduce the rows read. No general production Jev enablement is made by this checkpoint.

## Verification and cleanup

**455 chat tests, 557 script tests, 22 protocol tests and 13 chat-year tests passed.** Typecheck, lint, workspace boundaries and the final isolated production build passed. One intermediate script test timed out during concurrent build load; the complete final suite passed afterward without increasing its timeout.

The fixture was restored to Jev off, AI disabled, provider key removed and model 120B, then stopped. 4 temporary directories were removed, reclaiming **2.36 GiB**. The primary app and active `.next` remain. No new full tool-registry dump was created. Raw observations are retained; unrelated dashboard and dependency edits are outside this chatbot commit.

- [Combined scores, per-case checks and input hashes](darija-final-filters-results-20261009.json)
- [Thirty live requests with Jev off](darija-final-filters-off-check-20261009.json)
- [Initial 97/100 run and failures](darija-qualified-filters-results-20261009.json)

Eighteen raw plans, run segments and usage captures are preserved byte-for-byte in [the verified archive](darija-filtered-regressions-20261009.zip). The 2,003,770-byte snapshots compress to 213,615 bytes. Entry hashes remain in the combined reports; archive SHA-256 is `c2e667e26342d25a2804fa19ae9e2a6d679c84624e89d427083124f06b395a3e`.

Extract the archive from the workspace root before recomputing selection and response-reported costs offline (new output paths are required):

```powershell
Expand-Archive -LiteralPath 'docs/evidence/chatbot-latency/darija-filtered-regressions-20261009.zip' -DestinationPath '.'
bun scripts/chatbot-darija-selection-report.mjs 'docs/evidence/chatbot-latency/darija-final-filters-run-20261009.json,docs/evidence/chatbot-latency/darija-final-filters-continuation1-run-20261009.json,docs/evidence/chatbot-latency/darija-final-filters-continuation2-run-20261009.json' NEW_SCORES.json 'docs/evidence/chatbot-latency/darija-jev-read-wording-tools-20261008.json' 'docs/evidence/chatbot-latency/darija-jev-read-wording-fixture-data-20261008.json'
bun scripts/chatbot-jev-model-report.mjs 'docs/evidence/chatbot-latency/darija-final-filters-run-20261009.json,docs/evidence/chatbot-latency/darija-final-filters-continuation1-run-20261009.json,docs/evidence/chatbot-latency/darija-final-filters-continuation2-run-20261009.json' 'docs/evidence/chatbot-latency/darija-final-filters-generation-usage-20261009.jsonl,docs/evidence/chatbot-latency/darija-final-filters-continuation1-generation-usage-20261009.jsonl,docs/evidence/chatbot-latency/darija-final-filters-continuation2-generation-usage-20261009.jsonl' NEW_COSTS.json
```
