# Darija tool regression — 2026-10-08

The complete 100-question Darija/Arabizi run passed **92/100 tool plans**, compared
with **80/100** in the saved earlier full run. All **10 targeted requests passed**.
Average complete response was **0.888 seconds**, observed without a two-second
cutoff or time acceptance gate. Arabic-script requests passed 47/50, Arabizi 45/50;
both variants passed in 45/50 linked families.

The targeted changes are available through guarded local replies, including with
Jev off. This is an improvement to the whole School pipeline, not proof that the
Jev model alone improved. The production Jev setting remains off.

## What changed

- q29/q30 now read the student and teacher counts for the same selected academic
  year, validate both counts and their sum, and explicitly state the total. Invalid,
  negative, fractional or overflowing counts cannot be rendered as a valid result.
- q79/q80 now read upcoming exams rather than today's exams and reuse the existing
  chronological date/time renderer. Today's-exam routing also offers the upcoming
  read needed by this guarded plan.
- The earlier maths-teacher, girls-count and unidentified-parent changes remain
  passing in both scripts. Quoted text cannot hide extra request qualifiers.

These exact school-wide reads require an admin or principal account. Extra names,
dates, classes and operations remain outside the closed plans. Existing MCP
authorization, academic-year resolution and write refusals still apply.

## What the benchmark proves

The same 100 reviewed questions ran once each, across three preserved segments
(7 + 7 + 86). No completed question was repeated. The pipeline produced 37 Jev
replies, 28 local replies and 35 model replies, using CoreWeave GPT-OSS 20B for
generation. No recorded accepted Jev decision had a wrong expected intent.

An additional **10/10 live checks with Jev off** used zero classifier and generation
calls. Populated synthetic HTTP/MCP tests cover all ten requests for admin and
principal across two academic years: **40 checks**. They verify sums of 9 versus 12,
year-specific exam titles/times, assignment-based maths filtering, deduplication
and incomplete gender data. Fifteen restricted-role chats and nine direct MCP
denials verify that family and teacher accounts do not gain school-wide access.

The first segment stopped after authentication failed while fetching diagnostics.
An unpaid, hash-bound receipt recovered the completed seventh reply and confirmed
20B was used. The access token had a one-hour lifetime; expiry was not established.
The original stopped report is unchanged. The runner now renews authentication
once for failed control reads/restoration, and distinguishes missing diagnostics
from a model mismatch. It never repeats a chat or session grant.

One classifier ledger entry was lost during that interruption; another request
timed out during the second segment. Both charges remain unknown with their full
reserves retained. Known response-reported charges are $0.00779869, with $0.0003 in
unknown classifier reservations. An exact billed total or monthly projection is
not claimed. The new process continued only undispatched jobs under reduced limits.

Tool-plan checks do **not** establish full answer accuracy. Fourteen answers have
semantic review flags, and the questions share 50 paired families rather than
being 100 independent native examples. The live fixture has missing genders and
empty teacher/subject/exam data; populated rendering is tested separately.

## Remaining failures and what to do next

| Cases | Observed problem | Next concrete change |
| --- | --- | --- |
| q33/q34 | Monthly exam count used upcoming exams or a student count. | Read all authorized exams and apply the school-zone calendar-month window; test past and future dates within that month. |
| q37/q38 | Classes with more than 30 students lacked the class read or used the wrong threshold. | Resolve classes and scoped enrollments, deduplicate student identities per class, and apply the requested threshold exactly. |
| q66 | Arabizi request for all classes returned sections. | Extend the guarded class-list wording, preserving the class read and its sections. |
| q97/q98 | Fourth-grade maths lookup never resolved the class/section. | Resolve the authorized class and subject IDs first; clarify absent or ambiguous matches before a grades read. |
| q100 | Context-free “and last year?” attempted a conflicting-year count. | Ask which figure/year is intended before a read; preserve the selected-year boundary. The attempted read was blocked. |

Keep the existing router and narrow local replies. Use Jev only for supported,
validated requests with the 20B fallback in the benchmark; do not enable a general
production Jev rollout yet. Fix these eight cases, review the flagged answers, then
qualify real parent, teacher and student flows with populated authorized data.

## Verification and cleanup

427 chat tests, 557 script tests, 23 focused protocol/historical-guard checks and
13 chat-year checks passed. Lint and typecheck passed; lint reported three existing
frontend hook warnings. The isolated production build passed. Intermediate broad
script runs timed out under concurrent build/benchmark load; the final full suite
passed without changing those tests' time limits.

The fixture was restored to Jev off, AI disabled, key removed and model 120B,
then stopped. Four temporary Next directories were removed, freeing **1.557 GiB**.
The normal app and its active `.next` remain. No new full tool-registry dump was
created. This checkpoint retains roughly 1.2 MiB of raw and combined evidence.

- [Combined scores, failures and input hashes](darija-total-exams-results-20261008.json)
- [Ten live requests with Jev off](darija-total-exams-off-check-20261008.json)
- [Original seven-chat stopped segment](darija-total-exams-run-20261008.json)
- [Unpaid diagnostics recovery](darija-total-exams-auth-recovery-20261008.json)
- [Second seven-chat segment](darija-total-exams-continuation-run-20261008.json)
- [Final 86-chat segment](darija-total-exams-continuation2-run-20261008.json)

Recompute the combined report offline with `scripts/chatbot-darija-final-report.mjs`:
pass the three run paths as one comma-separated argument, the corresponding three
generation-usage paths as the second, the recovery receipt as the third and a new
output path as the fourth. This dispatches no provider calls and preserves raw data.
