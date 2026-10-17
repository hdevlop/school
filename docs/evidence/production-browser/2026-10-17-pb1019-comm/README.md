# PB1019-COMM: Communication release and browser acceptance

Status: **PARTIAL; notification clock fix deployed; targeted Playwright checks PASS; 21 of 25 complete checklist cases still BLOCKED**. Tested the demo at
`https://myscolai.com` on 2026-10-17. Tester: Codex. Finance was assigned to
another coder; no live financial records, settings or roles were changed by this
run. The subsequent fix changes the two notification read timestamps and adds
database regression coverage.

The [handoff](../../../tests/production-browser/handoffs/2026-10-17-communication.md)
names 26 cases, but its five linked checklists contain **25 unique case IDs**:
announcements 6, alerts 8, notifications 5, reminders 3, push preferences 3.
The [case-by-case coverage](checklist-coverage.json) records every one. Four cases now have complete browser PASS; partial checks remain BLOCKED. Transport and local test evidence stay separate.

## Historical API revision and execution boundary

Every final live script began and ended on full serving revision
`041697afcf6bc4eaa8aa2347d8516019c2deecfc`. Login and public readiness returned
200 before and after execution. This proves the revision returned by the public
endpoint; no container/replica inspection or image-digest verification was done.

The local checkout HEAD observed during validation was
`e56e02196c1c67fd0299abffe345b741d91d451a`, with another coder's finance edits.
It is separate from the serving revision and was not an immutable release
candidate. The reviewed announcement controls, reminder page and push preference
component had no committed differences between the serving SHA and local HEAD.

Live requests used internal REST and Najm MCP, French request headers, explicit
year selection where applicable, and the four existing controlled identities:
admin, teacher-A, parent-A and parent-B. Requests ran serially without automatic
retries or response mocks. Request logs record actor aliases, methods, sanitized
paths and statuses; they omit bodies and authentication data. MCP protocol
requests are POSTs, including read-only tool calls; HTTP 200 on a tool refusal
is not counted as tool success.

Browser discovery returned no available browser. No standalone browser fallback
was used. The owner was asked to connect the browser extension and said they
would; UI acceptance requires an actual successful connection. No browser
version, viewport, keyboard, accessibility, page-error or browser-network result
is claimed by this API attempt.

## Results

| Scope | Final outcome | Evidence |
| --- | --- | --- |
| Announcement drafts, permissions, validation and year isolation | 28 PASS; active publication BLOCKED | [Announcements](announcements-results.json) |
| Personal alerts, parent A/B isolation, audience and allowed/refused transitions | 71 PASS; missing student/teacher-B/shared-class coverage BLOCKED | [Alerts](alerts-results.json) |
| Empty inboxes, counts, year independence, auth and push input validation | 52 PASS; positive notification delivery/read and real push lifecycle BLOCKED | [Notifications and push](notifications-push-results.json) |
| Reminder reads, projection validation and financial access denials | 13 PASS; delivery and independent financial reconciliation BLOCKED | [Reminders](reminders-results.json) |
| Final residue, unchanged empty inboxes and readiness | 14 PASS; zero remaining run-owned live fixtures | [Residue](residue-results.json) |
| Focused source/unit contracts | 37 tests PASS, 0 FAIL | [Local validation](local-validation.json) |
| Isolated local PostgreSQL transport | 12 tests PASS, 0 FAIL: notifications 2, announcements 4, alerts 6 | [Local validation](local-validation.json) |
| Continuation: selected repository database cases | 7 tests PASS, 0 FAIL: announcements 4, alerts 3 | [Local validation](local-validation.json) |
| Continuation: notification/subscription lifecycle with older explicit fixtures | 30 assertions PASS; does not clear fresh-notification defect | [Local lifecycle](local-notifications-results.json) |
| Continuation: default-created notification clock reproduction | Historical: 2 product operations FAIL; one defect, subsequently fixed locally | [Clock reproduction](notification-clock-repro-results.json) |
| Fix: fresh notification read and read-all regression | Both tests failed before the change and pass after it | [Fix validation](fix-validation.json) |
| Fix: fresh notification and subscription lifecycle | 30 assertions PASS with default creation times and exact fixture cleanup | [Fresh lifecycle](local-notifications-fixed-results.json) |
| Browser checklist acceptance | 0 executed; 25 BLOCKED | [Exact checklist IDs and remaining work](checklist-coverage.json) |

The 164 final functional transport assertions and 14 final residue assertions
are not 178 completed checklist cases. Initial discovery checks, preliminary
attempt results and local tests are kept outside those totals. No confirmed
product failure occurred in those initial selected live transport assertions.
The continuation found the local lifecycle defect documented below; the earlier
empty-inbox checks cannot clear it. There are now 56 passing existing local
tests, followed by two new passing regression tests and 30 passing fresh-fixture
lifecycle assertions. The notification defect is fixed locally; live acceptance
of the fix remains open.

## Fix and continued acceptance

`PersonalNotificationRepository.markRead` and `markAllRead` now set `read_at`
with `sql` `CURRENT_TIMESTAMP`, matching the database clock used by normal
creation. Recipient/unread predicates and the existing read replay are retained.
No migration, shared timestamp rewrite, configuration change or finance edit is
needed.

The new `NotificationReadClockDatabase.test.ts` runs inside rollback-only
transactions against guarded local `school_history_test`. A transaction-local
fixed UTC+1 timezone makes the regression deterministic when Casablanca observes
UTC. Fresh records use normal database creation defaults. Both cases failed
before the implementation change with constraint `notifications_read_after_create_check`
and pass afterward, including replay and protection of the other recipient.

The complete local REST/subscription script then passed all 30 assertions with
fresh default-created notifications, without the earlier backdating workaround.
It verified positive read and mark-all, replay, recipient isolation, counts,
subscription encryption/upsert/unsubscribe and exact cleanup. The combined
notification regression and existing history transport tests passed 4 tests and
34 assertions. See [fix validation](fix-validation.json) for commands, source
fingerprints and broader verification status.

No Git publication or production deployment was performed. Browser discovery
still reports no connections; the 25 UI cases are not promoted by these local
results. Earlier failures and older-fixture control results remain below.

## Continuation: fresh notification read failure

The additional positive lifecycle attempt created two entirely owned local
users and three notifications in the isolated history database. A notification
with its normal database-default `created_at` failed its first recipient read
with HTTP 500. The first attempt stopped and removed all owned fixtures; see
[the retained failed attempt](local-notifications-attempt1-results.json).

The [focused reproduction](notification-clock-repro-results.json) confirms both
`PersonalNotificationRepository.markRead` and `markAllRead` fail with PostgreSQL
code `23514`, constraint `notifications_read_after_create_check`. This is one
**PRODUCT** defect affecting two operations, not a flaky assertion.

Root cause: the local database uses `Africa/Casablanca` at UTC+1. Both columns
are `timestamp without time zone`; `created_at` defaults to database `now()`,
while both read methods send `new Date().toISOString()`. At the measured instant,
database creation was around 14:44 and the application wrote 13:44 UTC. The
actual clocks agreed, so clock skew is not the cause. The stored read time
precedes creation and the database correctly refuses it. For a fresh notification
under this offset, even the recipient's mark-all action can fail the entire update.

A control using `CURRENT_TIMESTAMP` for `read_at` succeeds on the same newly
created notification. The narrow proposed fix is to use the database clock in
both read methods, preserving their recipient predicates, unread condition and
idempotent replay. This describes the original failure; the fix and green retest
are recorded above. The pre-fix repository, schema and shared timestamp definitions
had no committed difference from the demo's previously tested SHA, but production
database timezone and live impact were not inspected or reproduced. No production
SQL was used.

To isolate other behavior, a separate attempt explicitly dated its owned
notifications two hours earlier. Its 30 assertions pass: recipient isolation,
source/recipient uniqueness, positive read and replay, unread counts and filters,
mark-all isolation and replay, synthetic subscription upsert, encrypted storage,
cross-recipient unsubscribe refusal and exact owner unsubscribe. These older
fixtures intentionally avoid the clock boundary; they do not fix or pass the
fresh-notification scenario. No external push dispatch was attempted.

The continuation also passed seven existing database tests for annual lists,
audience ownership, class-targeted announcement visibility and rollback-scoped
writes. The finance-specific Alerts database case was excluded. Temporary local
users, notifications and subscriptions were removed after both lifecycle attempts
and the focused reproduction. The first runner's open local pool was stopped
after its cleanup/report; subsequent scripts explicitly closed their pools.

Browser discovery still returned no connections during this continuation. All
25 browser case outcomes remain BLOCKED, with the new defect linked from the
case map. The original live results remain historical evidence for their exact
revision; they were not rerun during this local continuation.

## Preliminary attempt retained

The first announcement script incorrectly expected teacher-A to create an
announcement. It stopped with 23 passing assertions and one failed expectation,
and removed its one draft. The attempt is retained in
[announcements-attempt1-results.json](announcements-attempt1-results.json).

Diagnosis: `/api/auth/me` confirms teacher-A has `read:announcements`, with no
creation or update grant. Creation was correctly refused. Classification:
**TEST**, not a product authorization defect. The corrected attempt checks the
effective grants first and verifies creation refusal through both MCP and REST.
It reran the complete script after cleanup; no product change or deployment was
needed. No unexpected write was accepted during the failed expectation.

## Findings and unresolved prerequisites

- **Class audience is broader than the controlled section.** The PB1016 section
  contains exactly the two controlled students, but its CM2 class contains 13
  students in the selected year. Announcements accept class targets, not section
  targets. The handoff's proposed section therefore does not isolate publication.
  The single final draft stayed unpublished and was deleted. No shared class
  alert was created.
- **Announcement publication UI remains absent in the reviewed source.** The
  table wires create/edit/delete; publish/unpublish exist in the hook/API without
  a table/card control. Browser availability was not observed. Active publication,
  unpublication and recipient/calendar visibility remain open on the demo.
  Publication/year lifecycle passed separately on isolated local PostgreSQL.
- **Controlled inboxes are empty.** All four test accounts returned zero
  notifications. Three controlled non-admin empty mark-all calls returned zero;
  a missing message returned 404. These do not prove reading an existing live
  message or cross-recipient isolation. Positive recipient/read isolation passed
  on local PostgreSQL. A finance job or a visit-request trigger would broaden
  the current live scope, so neither was invoked to manufacture notifications.
- **Push is unconfigured on the demo.** For all four identities, push config
  returned `enabled: false` and `publicKey: null`. Unsafe provider URLs and invalid
  keys were refused with 400; missing unsubscribe returned 404. No synthetic
  valid subscription was registered. Browser opt-in/out, permission states and
  delivery suppression remain untested.
- **Reminder send buttons do not deliver.** In the reviewed source,
  `RemindersPage` handlers update component state and show the SMS-coming-soon
  toast, with no send API call. This is a source finding, not a browser result.
  A toast cannot establish reminder delivery. No cron or worker dispatch ran.
- **Additional identities and surfaces remain open.** The handoff has no
  controlled student login or teacher-B. Supervisor, shared class notice actions,
  nonempty notification destinations, mobile/Arabic/keyboard/accessibility
  checks and complete browser diagnostics were not accepted by this run.

## Local database proof

Before running existing transport suites, the configured history URL was checked
to be a loopback host with database name `school_history_test`. The suites ran
separately, with no schema changes, seed/reset, or production database connection.
They verify announcement publication/corrections, selected-year REST/MCP behavior,
alert history, recipient-specific notification reads and protected writes.

The existing Alerts suite also creates and removes a temporary fee-source fixture
inside this isolated local database to verify trusted reminder attribution. That
is not a demo financial write or finance acceptance result. Started test servers
stopped; ports 5497 and 5498 were no longer listening after completion.

Expected negative tests emit permission, missing-record and conflicting-year
errors. Local startup also warned about an optional unavailable embedding
provider, unmounted StorageStudioController and absent client address in in-process
requests. These suites do not establish rate-limit or production worker health.

## Fixtures and cleanup

Final successful live attempts created and removed one unpublished announcement
and three person-targeted alerts (parent-A, parent-B, teacher-A audiences). Exact-ID
rereads returned 404 after deletion. The preliminary announcement attempt created
and removed one additional unpublished draft. Five records were created and
removed across all attempts; four belong to the final successful attempts.

The alert script also checked that its two pre-existing visible alerts retained
their status and update time. No existing alert was mutated. All controlled
inboxes stayed empty; no subscription or notification was created. No mail,
SMS, push or school-wide communication was triggered. No live financial record,
school setting, account credential or shared grant was changed.

Account data, tokens, exact fixture manifests and temporary execution scripts
remain only under ignored `.cache/production-browser/pb1019-comm/`. The committed
evidence candidate contains aliases and sanitized outcomes, with no response
bodies or runtime identities. No screenshots, trace, HAR or video were captured.

## Historical handoff before browser continuation

Connect a supported browser, verify the intended serving revision, and execute
the 25 browser cases from the existing checklists using the per-case map. A
fully controlled class audience, additional identities and a controlled
nonfinancial notification trigger are needed for the blocked lifecycle cases.
Real push acceptance also requires an appropriately configured test deployment.
Finance reconciliation remains with the finance coder.

The local notification fix and regression test are now part of this change.
Lint, typecheck and root tests passed; production build status is recorded in
the fix validation artifact. Source, local PostgreSQL, deployed transport,
browser, delivery, image/replica and full-promotion statuses remain separate.


## Release and Playwright continuation

The owner requested commit, deploy, clean tree and continued Playwright testing.
The Communication fix and evidence were committed and pushed as `38997fe4c194ac66e9b88de17fbb068edfdd7ab8`.
The other coder's Finance edits and local Claude skill changes remain unstaged;
this release does not claim a clean shared worktree or Finance acceptance.

`bun run check` passed before publication, including lint, typecheck, translations,
root tests, workspace boundaries, production build and database checks.
[GitHub release run](https://github.com/hdevlop/school/actions/runs/39040254743)
passed verification, image publication and deployment/readiness.
[Exact runtime proof](deployment-proof.json) records both app and notification
worker healthy on the full source SHA, matching image digest
`sha256:79121e2688defdfa3c06fba917cd6ea7025ab9ee918984c223d6e4d2b19d7e0e`.
The storage mount is retained; apex/www login and health endpoints return 200.

The in-app browser discovery still returned no sessions. Following the owner's
explicit Playwright request, standalone Playwright launched Chrome 155.0.8059.80
using Node and dedicated per-account profiles. Final serial runs checked the
public full serving SHA before and after. French desktop used 1440 x 900; Arabic
phone used 390 x 844. Scoped setup and exact-ID cleanup used internal MCP/REST.
No production SQL, seed/reset, Finance write, broad publication or delivery ran.

| Final standalone browser run | PASS assertions | FAIL | Supplemental blocked subchecks | Evidence |
| --- | ---: | ---: | ---: | --- |
| pw-announcements | 27 | 0 | 2 | [Results](pw-announcements-results.json) |
| pw-alerts | 44 | 0 | 3 | [Results](pw-alerts-results.json) |
| pw-inbox-preferences-reminders | 40 | 0 | 8 | [Results](pw-inbox-preferences-reminders-results.json) |

The 111 passing assertions include fixture cleanup, revision and diagnostic
checks; they are not 111 complete checklist cases. The 25-case map records
**4 PASS, 21 BLOCKED, 0 FAIL**. Complete passes are announcements-R02,
announcements-M01, announcements-M04 and alerts-M04. Other cases retain their
missing mandatory parts even where browser subchecks pass. All three runs have
zero unexpected page/console/request/HTTP diagnostics. Proven Next route
prefetch cancellations are retained explicitly and excluded only using method,
origin, route, prefetch headers, non-navigation and exact cancellation code.

Draft create/edit/delete, parent A/B alert isolation, allowed status transitions,
year switching, Arabic RTL labels and phone overflow checks pass. Inbox and bell
empty states agree for four identities; empty mark-all persists zero. Push
unavailability is accurately explained by the disabled accessible switch.
The controlled reminder button displays its coming-soon toast without any API
write; actual delivery remains unimplemented.

Final browser writes were exactly three owned announcement writes, eight owned
alert writes and one empty-inbox mark-all. Final runs removed their one draft
and three personal alerts; earlier attempts also cleaned their exact fixtures.
[All browser attempts](browser-attempts.json) retain preliminary TEST failures,
corrections and successful reruns. API prefetch/refetch failures were never
blanket ignored. No application code changed to resolve harness failures.

Remaining work requires an entirely controlled class, student/teacher-B and
supervisor identities, a supported recipient-only notification trigger and an
enabled push test installation. Publication controls, reminder navigation/send
implementation, full keyboard/accessibility and broader permission matrices
remain open. Finance reconciliation belongs to the Finance coder.
