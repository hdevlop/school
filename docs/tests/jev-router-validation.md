# Jev + router validation

Work order: [CHATBOT-JEV-ROUTER-PLAN.md](../../CHATBOT-JEV-ROUTER-PLAN.md#work-order).
Current results and archived protocols: [evidence index](../evidence/chatbot-latency/README.md).

Use this guide for the current optimization work. Old native collection sheets
and numerical research gates are historical; no new manual question collection
or French benchmark is required to start these engineering checks.

## Offline first

For the Jev eligibility change, run the existing focused regressions:

```powershell
bun test packages/server/tests/chat/JevAdapter.test.ts packages/server/tests/chat/JevWordingProfile.test.ts packages/server/tests/chat/SchoolReplyLanguage.test.ts
```

Prove that a provably unsupported query sends no paid classifier request, while
previously accepted supported cases remain eligible. Include role, selected year,
history, cancellation, language uncertainty, finite probability validation and
write-intent agreement. A classifier decline must retain ordinary routing.

For class/child resolution, check actual IDs and required arguments, clarification
for missing or ambiguous identities, and no arbitrary section/gender substitution.
Keep grade requests separate from attendance and section labels from class identity.

## Targeted live checks

Freeze expected tools, argument scope and facts before dispatch. Use populated
local fixtures and actual admin/principal, parent, teacher and student accounts
through internal MCP/REST. Read independent ground truth under the same actor/year.
Test the failed Darija/Arabizi families first; use a small unseen holdout after fixes.
Do not merge reused development questions with independently sampled native data.

Record tool/argument correctness and answer facts separately. A recovered malformed
call remains a tool failure; an unavailable reply remains a failed answer. Empty
results do not prove missing identity, lack of permission or zero students.
Role/year refusals and read-only writes must remain safe on every path.

Use a bounded request count and cost allowance for each live check, no automatic
retries and no two-second accuracy cutoff. Record the average complete reply
against the owner's two-second goal. The historical 3,000 ms candidate timeout
is not a selected production setting. Keep uncertain charges unknown/reserved;
no separate invoice or provider-pricing investigation is needed.

## Before release

Run relevant regressions, then lint/typecheck and build for runtime changes.
Run affected year/ownership and workspace checks. Qualify only roles/intents that
pass both tools and facts; benchmark grants alone do not enable ordinary chats.
Verify normal-chat context, selective OSS20B fallback, the monthly budget guard
and rollback. Keep one final report and one compact archive, then remove private
captures, owned test hosts and generated builds. Reports must name the remaining
unsupported workflows and the next concrete action.

## P1 implementation checkpoint — 2026-10-09

On mode now bypasses Jev before settings, transport or a spending reservation when
none of the existing guarded read/greeting replies is possible. The prefilter
does not choose an intent, lower thresholds or authorize a tool. Write refusals
stay in the earlier synchronous path; `write_request` has no positive semantic
guard and therefore cannot make every query eligible. Shadow studies deliberately
retain their previous measurement coverage and privacy/budget restrictions.

Fixed diagnostic codes record eligibility and classification outcome for a matching
request ID. Existing reply source and generation steps show which path answered
and whether a model ran. Recorded snapshots exclude private fields and cannot be
changed by a late classifier completion. Both candidate-first and router-first
integration tests preserve one ordinary router/model fallback with zero classifier
requests for unsupported input.

Offline replay of the frozen 60-chat comparison would bypass **22/32** previous
classifier attempts and keep all eight direct Jev observations reachable. This is
a counterfactual eligibility check, not a new live accuracy or invoice saving result.
There were **zero new paid calls**. Broader personal-role answer failures remain open.

Verification: **1,418 regression tests** passed; 75 focused adapter/diagnostic checks
passed again after adding callback assertions. Root lint/typecheck and production
build passed; final test typechecking passed. The isolated build was removed
(about 992 MiB), with the prior Next type references and the user's tsconfig restored
or preserved. Production model, provider and general Jev enablement are unchanged.

[Compact replay, source and verification archive](../evidence/chatbot-latency/jev-eligibility-20261009.zip).
The verified archive is 25,746 bytes with 12 entries; its SHA-256 is
`44bf03d0ecb97a0b40eac5c95f81356bc493beaf5788981d078b3d4c2da2b717`.
The subsequent class/child implementation is recorded below. Historical comparison
scores above remain unchanged.

## P2 class and child identity checkpoint — 2026-10-09

Class lists preserve the class name with its nested section labels. Fifth-class
counts match a discovered class ID to selected-year student placements, including
both genders and all its sections. Missing or ambiguous classes clarify rather
than become zero counts. Duplicate identities, conflicting placements and invalid
read results fail closed; incomplete placements are explicitly qualified.

Parent child identity comes from the existing owned repository snapshot. A unique
daughter/son or an exact linked child's full name supplies the academic-profile
ID; missing or ambiguous relation identities clarify. Unrecognized names retain
routing. Grades preserve subjects, assessments
and score denominators. No literal `bnti` student search or guessed ID is dispatched.
Additional subject/date/attendance filters remain on the existing routed path.

This describes the identity checkpoint's scope; the bounded academic filters added
subsequently are recorded below.

The published preparation contract now runs synchronous local templates before
routing, including when paid Jev is off. Its independent server-frame/mode gate
still prevents paid classification; no second tool executor or ownership resolver
was added. A failed read returns unavailable without paid generation or retry.

Final actual authenticated internal API checks: **14/14 tool-and-fact passes**.
Six use the marked history fixture (the six original failure questions); eight
use existing populated demo records. The parent's named-child replies reproduce
all **10 grades**; two linked children require clarification for a generic child.
School-wide parent requests refuse; outsider and historical academic reads deny.
Transport is blocked for external hosts and model construction is forbidden:
**zero classification, generation and routing calls**. Only local API/template
timing is measured: about **0.02 seconds average** for these replies. This is not
a new Jev/OSS20B or browser latency benchmark.

Verification: **1,067 backend + 561 script/boundary tests** pass, along with root
lint, typecheck and production build. The isolated build (about 992 MiB) is removed;
Next type references and the user's tsconfig are preserved. Temporary hosts stop,
private data/credentials are not retained, and saved AI settings are not modified.
The compact [identity archive](../evidence/chatbot-latency/jev-identity-20261009.zip)
contains redacted results, source, checks and the live harness.

This verifies bounded class/child local replies. Subject/class grades, pending
grading, other-role broad workflows, general Jev integration, qualified 20B fallback
and the durable monthly allowance remain open. The next concrete work is fixing
subject-grade and pending-grading offers on the existing populated failures.

## P2 academic selection checkpoint — 2026-10-09

Seven reused failures from the populated review now have local, scoped replies:
parent math/diagnostic grades and combined math/absence; student math/diagnostic,
diagnostic-grade count and all-grade formatting; teacher subject list and pending
grading. Exact owned child names or authenticated student/teacher IDs supply the
existing MCP arguments. Stored subject names, assessment titles and mark denominators
are preserved. Unknown names, subjects and extra qualifiers retain routing;
ambiguous math subjects or multiple singular diagnostic quizzes ask for clarification.
Invalid identities, duplicate grade IDs, nonfinite marks, inconsistent attendance
totals and malformed/denied reads fail rather than produce a zero or empty success.

**18/18 actual authenticated chat tool-and-fact checks pass** on existing populated
demo data: three parent, five student, four teacher reads, plus six year/write
refusals. Independent role-authenticated MCP reads establish the facts first.
There is one linked child with ten grades, a student with ten grades, and the
teacher has 44 students/four assignments: Français and **20 assessments with no
grades recorded**. The last number does not count remaining papers in partly
graded assessments. Three outsider and three historical academic reads deny.

The seven are reused development questions with an actual linked child's name
substituted, not native holdout samples. This does not rescore the historical
12/24 report. The existing fourth-class maths template also passes eight synthetic
MCP/chat checks across admin/principal and both years with paid Jev off. Subject
aliases resolve to returned IDs; no broad student search or arbitrary ID is added.

External transport and model construction were forbidden during the live checks:
**zero paid classification, generation or routing calls**, saved AI settings unchanged.
Average complete local API reply: **0.020 seconds**. This is a template/API measurement,
not an end-to-end browser or provider/model benchmark. Fallback context and router
vocabulary/dependencies were improved for academic and mixed attendance requests;
their general model answer quality has not been requalified by these local checks.

Chat/year/ownership regressions (1,093), diagnostic/read-only checks (9), and
script/boundary checks (561) pass. The final focused suite covers 32 academic tests,
including the eight synthetic chats. Root lint, typecheck and isolated production
build pass. Private captures and the owned host/build are removed; the original app
and unrelated work remain intact. The [compact academic archive](../evidence/chatbot-latency/jev-academic-20261009.zip)
contains redacted results, source snapshots and reproducible harnesses.

Next: malformed tool/argument rejection with original-error reporting, then remaining
personal answers (attendance, student class/section and outsider wording), selective
20B fallback and ordinary Jev integration. General Jev/model settings and the durable
$10 monthly guard remain open; these fixes alone are not the final production release.

## Tool failure and personal reply checkpoint — 2026-10-09

Najm chatbot/MCP 3.6.0/2.2.5 already reject invalid tool calls before controller
execution. Nine scripted SDK/MCP scenarios exercise unknown/malformed/unoffered
names, missing/wrong-type/blank IDs, invalid JSON, a denied read and a valid read.
All eight rejected scenarios produce **zero controller reads**; the valid one
produces exactly one. Each scenario uses one scripted tool step and one scripted
answer, with no provider HTTP. These are synthetic contract tests, not live model
tool-selection accuracy. The Desktop Najm checkout remains unchanged.

Original failures now survive model recovery. Diagnostics retain fixed step/code/count
summaries for missing execution records, MCP errors and blocked writes. Unexecuted
model-invented names are replaced in stored step metadata; no tool input/error body
is added to diagnostics. The response stream keeps successful text and tool results,
adds one localized failure notice before finish, and records a failed-call count.
SDK error descriptions in bounded parsed frames are localized; oversized frames pass
through without accumulating their payload and an SDK error header still triggers
the notice. Cancellation adds no notice. Clean replies remain byte-for-byte intact.
Benchmark parsing, measurement and scoring retain failed attempts even after later
success; a completed stream does not establish a correct tool plan.

The remaining bounded personal cases now render actual child attendance counts and
rate, distinguish no attendance records from 0% attendance, preserve student class
and section labels, and clarify explicitly outside-scope grade/contact requests
without a fabricated lookup. Student identity/name and children come from the existing
owned snapshot. Missing identities and extra filters retain routing; own-name contact
requests retain the authorized routed path. No second year/auth resolver is added.

**23/23 actual authenticated internal API tool-and-fact checks pass** on populated
demo records. They include the previous 18 academic checks plus child attendance,
student placement, teacher/student outsider clarifications and a parent outsider
control: eleven reused failure questions, five drafted variants and seven controls.
Three outsider and three historical direct MCP reads deny. Average complete local
API reply is **0.021 seconds**; zero paid classification, generation or routing
calls. Saved AI settings and domain records are unchanged. This is local/template
timing, not a browser/provider benchmark or a new score for the old 24-case report.

Verification: **1,131 backend regressions**, **562 script/boundary tests**, final
focused dispatch/response/personal/security checks, root lint/typecheck and production
build pass. One initial cancellation assertion caught a response guard issue; wider
tests also caught a minimal diagnostic fixture without tools/steps. Both are fixed
and rechecked. Private captures, owned hosts and the isolated build are removed;
original Next references, tsconfig, running app and unrelated edits are preserved.
[Compact call/personal archive](../evidence/chatbot-latency/jev-personal-20261009.zip).

Next: an unseen Darija development holdout for supported Jev plans and selective
OSS20B fallback, then ordinary-chat enablement and the durable $10 monthly allowance.
General Jev is still off and the saved fallback model remains unchanged. The targeted
repairs are ready; broad production qualification remains open.


## Qualified ordinary release — 2026-10-09

**Enabled locally:** guarded Jev + the existing router + selective OSS20B. The saved
model is `openai/gpt-oss-20b`; unrelated AI settings and credentials were preserved.
The local environment enables ordinary Jev and a shared $10/month allowance.
The actual dashboard at port 3102 executes and accounts for both Jev and routed
20B calls. This is local enablement, not a remote production deployment claim.

The release supports four unfiltered global Jev read intents for admin/principal,
existing verified local personal/academic replies, and selective 20B fallback for
qualified global reads and teacher-owned counts/pending grading. Student placement,
own/owned-child grades and named-child attendance use validated local renderers.
Unknown filters/names/workflows clarify instead of consuming an unqualified model.
Principal guards are regression-tested; this live fixture has no principal account.

| Check | Tool + fact/task result | Mean complete API reply | Paid classifier / generation calls |
| --- | --- | --- | --- |
| Initial development, 20 drafted questions | 12/20 original strict score; failures retained | rounded timing only retained | 7 / 15 |
| Targeted first repair, 8 reused failures | 5/8; grade/attendance answer defects remained | 2.79 s | 1 / 15 |
| Local repair, 4 questions | 3/4; comma-separated child grades still needed correction | 0.042 s | 0 / 0 |
| New wording holdout, 8 questions | original 3/8; audited 5/8 | 1.18 s | 1 / 10 |
| Final affected-family recheck, 5 questions | 5/5 | 0.148 s | 1 / 0 |
| Saved-configuration ordinary smoke, 6 questions | 6/6 | 0.83 s | 1 / 5 |
| Running dashboard: fresh Jev and multi-turn router/20B | 2/2, allowance accounting verified | 1.34 s | 1 / 3 |

These are assistant-authored development/recheck samples, with repeats and different
roles; do not combine them into a native acceptance rate or a general model ranking.
Timing covers complete local API streams, not browser rendering. No two-second cutoff
was applied; the slower correct fallback reply completed normally.

The first harness completed all 20 chats but failed while constructing its summary;
only emitted per-case scores/timings and call counts were retained, not full answers.
Later captures were persisted incrementally. The eight-case holdout originally
rejected two valid plans: the same two independent count tools in reverse order,
and `students_get_student_count` under teacher ownership instead of the preferred
profile tool. Authenticated MCP confirmed 44 teacher-owned students versus 103
school-wide. Their scorer correction added **zero provider calls**; original scores
remain in the archive. Holdout class-name wording and an ambiguous teacher “number”
query initially clarified; class-name wording was repaired, while the ambiguous
number stays outside the qualified count scope. Placement was the remaining real
holdout answer failure and now renders the actual class and section locally.

Captured ordinary classification runs accepted three of four candidates; all three
accepted plans were correct. One declined to routing. The dashboard adds another
correct, metered acceptance. Initial emitted successes are retained separately
because their complete capture is absent. This narrow evidence cannot establish
native fluency, confidence calibration or broad Jev reliability.

Corrections preserve stored subject names and denominators, distinguish lateness
from absence, resolve the persisted M/F gender values, accept harmless commas,
and retain unknown qualifiers for clarification. Routing hints use the trusted role
and latest message. Execution still uses published Najm's SDK/MCP guards, ownership
and selected-year boundaries. No new framework fork or duplicate resolver exists.

The running dashboard exposed a Next hot-reload fetch replacement that initially
bypassed the ledger. The transport now reinstalls at each request boundary; nested
wrappers charge once, and Jev's transport is explicitly guarded. A regression and
actual dashboard checks verify one Jev debit and three separate generation debits.
The earlier dashboard answer is excluded from the metered two-case row above.

### Shared allowance, controls and operational limits

`CHATBOT_FLOW=jev-router-20b`, `CHATBOT_JEV_MODE=on`,
`CHATBOT_MONTHLY_MICRO_USD=10000000` and
`CHATBOT_JEV_OPERATING_TIMEOUT_MS=3000` are the enabled local controls.
The candidate timeout is operational, not a two-second answer deadline.
Jev off retains the qualified router/20B fallback and allowance. Full legacy rollback
also removes this ordinary allowance and requires an intentional saved-model rollback
if the historical model is wanted. No request automatically escalates to 120B.

Two shared operational PostgreSQL tables hold UTC monthly integer micro-dollar
debits and attempt settlements. They contain no questions, actor IDs or secrets.
First use requires CREATE TABLE permission. Atomic reservations prevent concurrent
overspending of the application allowance; unknown/canceled/crashed attempts retain
their reservation and reported costs settle once. Unexpected known overruns charge
fully and block subsequent sends. Exhaustion returns a localized unavailable notice
while validated local reads remain usable. It does not prove an exact invoice cap
for unknown prices or unlimited message capacity.

20B is limited to CoreWeave, no provider fallbacks, 4,096 output tokens and configured
input/output price ceilings of $0.25/$0.50 per million tokens, with no per-request fee.
OpenRouter documents these ceiling units in its
[provider-selection contract](https://openrouter.ai/docs/guides/routing/provider-selection).
Generation failure cannot trigger another paid retry. Exact configured free local
embeddings bypass accounting; arbitrary local model endpoints cannot.

Offline transport tests cover missing cost, cancellations, exhausted allowance,
repeated/nested fetch wrappers, failed-provider retries, unauthorized destinations,
and 120B rejection. A zero-paid-call PostgreSQL fixture validates the numeric cap,
12 concurrent attempts with only five allowed reservations, restart persistence,
shared classifier/generation/embedding debits, idempotent settlement, known overrun
and UTC monthly rollover. No billing observer or invoice reconciliation was added.
Earlier local embedding requests conservatively retained 24,000 micro-dollars due
to incorrect endpoint accounting; the configured free endpoint is now fixed. These
retained debits are not claimed as provider spend and were not refunded speculatively.

### Verification and finish

Final verification: 614 chat tests, 365 academic-year tests, 173 ownership tests,
48 security tests and 562 script tests pass, plus workspace-boundary checks, root
lint/typecheck and the production build. The initial script check caught an unwanted
backend import from a pure fallback helper; trusted identities are now explicit
arguments, and the 20 native-intake checks plus the full scripts passed afterward.
The final production build includes the hot-reload transport correction.

One [compact release archive](../evidence/chatbot-latency/jev-router-release-20261009.zip)
contains redacted results, original failures, frozen plans, guard checks, source
snapshots and reproducible harnesses. Private captures, owned temporary hosts and
isolated generated builds are removed. Other dashboard/config work and staged edits
are preserved. Local environment secrets are not committed.

**What can be done next:** use the enabled scoped release. Future work can qualify
owned fee/payment summaries or specific grade filters with fresh Darija questions
and actual facts. Broad free-form queries and unsupported filters remain unqualified;
no new manual collection, price study or repeated “continue” is needed for this release.
