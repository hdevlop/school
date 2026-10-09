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
