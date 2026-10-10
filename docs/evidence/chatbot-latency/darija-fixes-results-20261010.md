# Darija repairs and local Jev activation — 2026-10-10

The final repair run passed **15/15 task and fact checks** against independently read application data. After enabling the saved configuration and restarting the local dashboard, **7/7 checks passed on http://localhost:3102**. This is local internal API acceptance; production deployment, browser acceptance and general/native language accuracy were not tested.

The compact [JSON evidence](darija-fixes-results-20261010.json) preserves each repair attempt's paths, timings and errors. The [verification archive](darija-fixes-20261010.zip) also retains the scoped source diff and check logs. Only the final verified replies are retained, with the linked child's name replaced. No credentials, account IDs, tool arguments or private tool results are included.

## Changes

- Recognize `madrasa`/`mdrasa` in Jev eligibility while retaining class, year and unknown-qualifier vetoes. Recognize `weldi` and placement wording for Darija language and tool discovery.
- Add `classes_get_class_student_count`, using the existing validated selected-year roster. CM2 now reads an explicit count rather than asking the model to count a list.
- Discover assessment tools for today's `فروض`, separately from exams.
- Give the model concise ordered instructions for ambiguity, linked identities, selected-year scope, exact stored names and tool-backed facts. Strengthen parent and grade tool descriptions. Qualified OSS20B requests use temperature 0; this reduces variation but does not guarantee identical replies.
- Keep Darija write refusals local. Existing module tools remain the owners of identity and authorization; no personal-data renderer or identity preload was added.

## Ground truth and final checks

Internal MCP reads established 104 students, 13 teachers, 12 CM2 students, and nine classes with A/B/C sections. The reused parent has one linked child in CE1/A. Academic reads established ten subject names and their scores out of 10. The missing-profile case uses an admin account with no linked parent identity. No academic records were created or changed.

| Check | Verified behavior |
| --- | --- |
| Arabic student count and Arabizi dual counts | 104 students; dual request also returns 13 teachers |
| Arabic and Arabizi class lists | Exact class codes and A/B/C sections |
| CM2 count | Dedicated class count returns 12 |
| Today's assessments | Assessment tool, successful empty read, no assessments today |
| Unlinked parent's child request | Calls parent identity; stops on null; no child lookup or offered name search |
| `wrini dakchi dyali` | Clarifies topic without data calls or assuming a profile |
| Student creation request | Darija dashboard-directed refusal; no data calls |
| Explicit different year | Requests dashboard year selection; no data calls |
| Own children | Linked identity chain, exact name, no phone/address |
| Own child's grades | All ten exact subject names and marks/denominators preserved |
| Own child's placement | CE1/A from returned child; no invented grade equivalence |
| Arabic and Arabizi teacher counts | 13 teachers |

The 15-case confirmation had five accepted Jev templates, nine model replies and one local write refusal. Median complete-response time was 1,206 ms; maximum was 4,662 ms. `chhal mn ostad kayn f madrasa?` is now eligible, but the classifier declined it in this run and the fallback answered correctly. Eligibility does not guarantee a direct Jev reply.

These are task/fact checks, not perfect style scores. Some fallback replies still echo the question, add greetings or give an unnecessary grade introduction. They preserve the checked names and records. The existing broader answer-quality scores remain unchanged.

## Earlier attempts retained

1. Initial repair: correct counts and placement, but wrong assessment tool, invalid child lookup after missing identity, and an instruction-like child response remained.
2. Socket-interrupted attempt: temporary Bun host's default idle timeout interrupted slow model replies while a build ran. This is inconclusive infrastructure evidence, not a passing quality run. Subsequent test hosts used a 120-second idle timeout.
3. Shorter instructions: assessment, ambiguity and refusal checks improved; grades and placement still translated names or invented labels. The CM2 reply took approximately 74.8 seconds during the concurrent build; this outlier is retained, not included in the later confirmation's timing sample.
4. Temperature and literal-name instructions: names/labels corrected, but the missing-profile case offered a child-name search without calling identity. The final prompt explicitly requires identity first and stopping on null.
5. Final confirmation: all 15 task/fact checks passed. The earlier errors remain in the JSON summary.

## Main dashboard activation

The saved model changed from `openai/gpt-oss-120b` to `openai/gpt-oss-20b`. The local env now sets `CHATBOT_FLOW=jev-router-20b` and `CHATBOT_JEV_MODE=on`. No saved system prompt overrides the source prompt. The app was restarted after existing requests stopped progressing during the configuration reload.

Seven fresh ordinary chats on port 3102 verified dual counts, Arabizi teacher count, CM2 count, missing-profile refusal, child grades, placement and write refusal. Diagnostics confirm a direct Jev dual-count reply and OSS20B fallback replies using the actual saved configuration, without the temporary host's model override. All seven completed successfully; the slowest was 4,391 ms. The dashboard and its local Qwen3 embedding service remain running.

To roll back locally, set the saved model to `openai/gpt-oss-120b`, remove the two added env keys, and restart the dashboard. This does not deploy anything.

## Verification

- Chat: 418 passed, zero failed, including count/year validation and qualified temperature behavior.
- Academic-year suites: 367 passed, zero failed.
- Workspace boundaries: 28 passed; boundary scan passed.
- Lint, root typecheck and isolated production build: passed on the final source changes.
- Security suite: 48 passed, one failed. Unchanged SEC-004 HTTPS worker lookup test expected `AUDIT_PIN_USED` and received `deadline` under Bun 1.3.14. This remains a separate unresolved security-suite failure; the full suite is not reported green.

The temporary host is closed; private captures and test scripts are removed. The isolated `.next-darija-check` build and non-private intermediate logs remain: automatic approval review rejected recursive build cleanup with the stated reason "blocked by policy." Unrelated working-tree changes are preserved. No commit, push or production deployment was performed.
