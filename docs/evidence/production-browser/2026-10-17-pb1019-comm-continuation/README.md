# PB1019 Communication continuation

## Latest deployed recheck

The successor forms release `37147d72ef8dc119f282f8a6305fc88fc47a2f3f` passed its full
[CI/image/deployment workflow](https://github.com/hdevlop/school/actions/runs/39062228402).
[Fresh runtime proof](successor-37147d7/deployment-proof.json) confirms both services healthy
on its exact immutable image. Both scripts then ran again on this source:
**35 reminder + 34 announcement + 51 alert assertions PASS, zero FAIL**.
[Reminders](successor-37147d7/reminders-deployed-results.json) repeat the owned installment
reconciliation and keyboard destinations; [announcements](successor-37147d7/pw-announcements-results.json)
also reject short title/content in French without a write. Exact owned cleanup
passes. [Alerts](successor-37147d7/pw-alerts-results.json) also reconcile sidebar navigation, subjects, priorities, statuses and full timestamps on French desktop and Arabic phone. Their three owned alerts are removed and unrelated alerts remain unchanged. No financial data or delivery changed. These 120 assertions are a
separate recheck; they are not added to the earlier runs below.

## Reminder correction and first accepted deployment

The deployed reminder page marked a student as reminded without sending anything,
offered no student destination, and reported zero overdue students after a failed
load. [Before-fix browser proof](reminders-before-fix.json) retains all three
PRODUCT failures on its recorded earlier revision. Its 500 responses were
injected into that browser only; they are not an installation outage.

Commit `e553b1622a5b50e722d90100954bebb031414f92` removes fabricated success state. Individual and bulk send
buttons are disabled with the existing translated explanation, and student names
link to the corresponding fee record on desktop and phone. Loading and failed
reads keep totals unknown; forbidden access has its own state and hides rows.

The exact source passed the full local `bun run check` in an isolated checkout,
and [CI](https://github.com/hdevlop/school/actions/runs/39061459814).
[Deployment proof](deployment-proof.json) verifies both app and notification
worker, immutable image, public revision, login endpoints and health.
[Validation](validation.json) distinguishes an initial shared-workspace build
failure caused by unfinished parallel schema edits from the accepted isolated
check. Those parallel edits were preserved.

| Browser scope | PASS assertions | Evidence |
| --- | ---: | --- |
| Local candidate, browser-only rows and injected error/forbidden/empty states | 21 | [Local](reminders-local-results.json) |
| Deployed controlled overdue record, fee reconciliation and keyboard navigation | 35 | [Live reminders](reminders-deployed-results.json) |
| Deployed announcement draft lifecycle plus expanded author/detail/Arabic projection | 32 | [Announcements](pw-announcements-results.json) |

Final runs have zero failed assertions and no unexpected page errors. Local
tool-discovery POSTs are retained as `tools/list`; they invoke no business tool.
Any proven Next prefetch cancellation remains explicitly classified. No financial
record, email, SMS or push was written or sent. The sole announcement remained
unpublished, and its exact owned cleanup passes.

The [cumulative case map](checklist-coverage.json) advances announcements-R01 and
reminders-R01/R02 plus alerts-R01: **8 complete cases PASS, 17 partial/BLOCKED**. Earlier passes
retain their own source evidence; this is not a full Communication pass. Sending
reminders remains unavailable, as do publication controls, controlled additional
roles/class audience, positive deployed inbox fixtures and enabled push. Disabled
controls do not prove delivery. Assertion totals do not equal checklist cases.

[Harness attempts](browser-attempts.json) retain earlier TEST failures separately.
The final reminder observer distinguishes verified prefetch cancellations from
canceled HTTP 200 RSC streams on the exact owned destination after its student
identity and fee view pass. Missing/failed responses, unrelated destinations,
API cancellations and other network errors remain unexpected. This does not
claim every stream completed; it records why these specific cancellations do
not fail the accepted navigation. Intermediate assertions are not added to the
final counts. Announcement attempts include exact cleanup after a tooltip-helper
failure; final explicit tooltip dismissal and the full rerun pass.
