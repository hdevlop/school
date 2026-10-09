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
Next work is P2's class/section discovery and child identity, followed by their
targeted Darija tool-and-fact checks, rather than another full provider comparison.
