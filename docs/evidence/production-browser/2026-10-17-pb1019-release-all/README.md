# PB1019 combined release and Playwright retest

The owner authorized all current changes after validation. The final application
revision is `b472ff2c28fc4f0d1b0d485ae2686b117aadf1a3`. Finance commits and the Communication timestamp fix are
included; the corresponding source snapshot is in [validation.json](validation.json).

The full local `bun run check` passed on the corrected-picker commit. The last
locale-only corrections then passed translations, 505 config tests and 7
server-message tests. The exact final candidate passed the full independent
[GitHub workflow](https://github.com/hdevlop/school/actions/runs/39052227814).
Focused Finance tests passed **124/124**, isolated PostgreSQL fee tests **3/3**,
and authenticated REST/MCP fee tests **2/2**. The first transport attempt found an
outdated local fixture column; the existing additive migration was applied only
to guarded loopback `school_history_test`, then the full transport file passed.
No production SQL, migration, reset or financial write was performed by this run.

[Deployment proof](deployment-proof.json) records both the app and notification
worker healthy on the full source SHA and matching immutable image
`ghcr.io/hdevlop/school@sha256:56a78d58112442249b1551447ac9cf350b6afe48ea52d8e4464bbd2131fa9e22`. Apex/www login and health return 200, and the storage
mount is retained. Superseded release runs cancelled before deployment are not
claimed as deployed.

## Browser results on the deployed revision

Chrome 155 ran serially using standalone Playwright explicitly requested by the
owner, dedicated test-account sessions, French desktop 1440 x 900 and phone
390 x 844, plus Arabic RTL phone checks. Each final script checked the exact
public revision before and after. Fixture setup and cleanup used internal
MCP/REST. Reports keep aliases rather than identities, credentials or raw bodies.

| Final run | PASS assertions | FAIL | Blocked subchecks | Evidence |
| --- | ---: | ---: | ---: | --- |
| pw-announcements | 27 | 0 | 2 | [Results](pw-announcements-results.json) |
| pw-alerts | 44 | 0 | 3 | [Results](pw-alerts-results.json) |
| pw-inbox-preferences-reminders | 40 | 0 | 8 | [Results](pw-inbox-preferences-reminders-results.json) |
| pw-finance-release | 46 | 0 | 0 | [Results](pw-finance-release-results.json) |

**157 targeted assertions passed, zero failed.** This includes diagnostics,
revision and cleanup checks; it is not 157 completed checklist cases.
Communication retains **4 complete cases PASS, 21 partial/BLOCKED**:
announcements-R02/M01/M04 and alerts-M04 pass. Missing publishing controls,
controlled student/teacher-B/supervisor identities, nonempty notification inboxes,
recipient-only delivery triggers and enabled push still block mandatory parts.
The [original case map](../2026-10-17-pb1019-comm/checklist-coverage.json) retains
its historical revision; these new reports prove the rerun on the final source.

Finance smoke covers all five schedule filters and six matching visible totals,
unfiltered restoration, French invalid-form feedback, keyboard fee selection,
viewed-year previews, empty/cleared billing calendars and the school-year end
limit, translated expense and phone payment cards, chart height/two series and
French calendar accessibility labels. No financial record was saved. This smoke
does not replace full Finance workflow acceptance by the Finance coder.

All final scripts have zero unexpected page, console, request or HTTP diagnostics.
Proven Next route prefetch cancellations are retained explicitly. The reports page
issues one read-only audit-list POST; it is not a financial mutation. Owned draft/alert
cleanup passes. No email, SMS, push or broad announcement was dispatched by these scripts.

## Calendar defect found and resolved

The final expansion found a PRODUCT regression in published Najm Kit 3.6.0:
an empty FormInput date became Invalid Date and was supplied as defaultMonth,
throwing **Invalid time value**. The failing deployed attempt is retained in
[attempt 18](pw-finance-release-attempt18-results.json). A validated rollback
was prepared, then superseded before deployment by the separately published
**Najm Kit 3.6.1** correction. School adopts the published exact version; no local
Najm source, workspace link or tarball was used. The read-only Desktop reference
matches 3.6.1. Final deployed tests prove empty and cleared dates work and the
billing calendar retains its school-year limit. Server enrollment validation and
translated refusals remain intact. [Rollback and resolution](calendar-rollback.json)
preserve that history; [all attempts](browser-attempts.json) distinguish PRODUCT,
TEST and RUNNER events. Intermediate assertions are not added to final totals.
One preliminary announcement attempt inherited a diagnostic session's historical
year. Its original cleanup checked only the intended year and was insufficient;
the exact manifest draft was subsequently removed from its actual year, and both
years reread absent. [Correction and cleanup](pw-announcements-year-cleanup.json)
retain that limitation. The final mutation script selects its expected year first.
