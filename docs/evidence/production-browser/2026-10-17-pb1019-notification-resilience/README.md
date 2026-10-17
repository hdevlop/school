# PB1019 notification resilience and language

The inbox now shows failed and forbidden reads explicitly, offers retry, hides
stale messages, and disables mark-all while loading, empty, failed or pending.
Push preferences require valid configuration, handle browser initialization
errors, roll back a newly created browser subscription when server registration
fails, and preserve the browser endpoint when server removal fails. Cleanup can
be retried after a server row has already been removed. Inbox and bell timestamps
now use the selected application language, including when the browser is English.

Core fix: `2400f28407166d63469d8bc5d92eceffaf7331b6`.
Accepted source: `ff7d5717e2f4cced8e60e741d0bfb7148744234b`.
Its [full CI, image and deployment workflow](https://github.com/hdevlop/school/actions/runs/39068069187)
passes. [Runtime proof](deployment-proof.json) checks the exact revision and
immutable digest on both healthy services, public revision, apex/www login and
health endpoints. This source also contains the already-committed Finance and
class-form changes; unfinished Finance work in the shared checkout was preserved.

| Scope | Accepted result | Evidence |
| --- | --- | --- |
| Before fix, deployed UI with browser-only failure fixtures | Six PRODUCT failures, plus stable source | [Failure reproduction](notification-failures-before.json) |
| Before locale fix, French app with English browser | One PRODUCT failure | [Locale reproduction](notification-locale-before.json) |
| Local final UI, browser-only notification responses and simulated push API | 40 PASS, 0 FAIL | [Local](notification-lifecycle-local.json) |
| Deployed final UI with the same controlled fixtures | 41 PASS, 0 FAIL | [Deployed fixtures](notification-lifecycle-deployed.json) |
| Unmocked deployed REST reads and UI for admin, teacher and two parents | 31 PASS, 0 FAIL | [Live read-only](notification-live-readonly.json) |

The deployed fixture suite checks read/read-all state, counts, reloads, denied
reads, configuration loading/failure, permission refusal, unsupported browsers,
initialization retry, subscription rollback, server/browser removal failures,
French and Arabic timestamps with an English browser, and Arabic phone layout.
Its 500/403/404 responses are intentional browser fixtures. These notification
POST/PATCH/DELETE requests are fulfilled inside the browser and never reach the
installation. No real subscription or delivery is created.

The separate live run uses real responses with no mocks: four empty inboxes,
zero unread counts, bell links, disabled empty-inbox mark-all controls and the
server's disabled push setting reconcile with the UI. It makes no business
mutation, requests no notification permission and invokes no send operation.
No new database fixtures need cleanup. Authentication refresh/sign-in is separate
from business writes. Dedicated local testing processes were stopped; shared
development processes were preserved.

[Validation](validation.json) separates the full isolated local gate on the core
fix from exact-source CI and the final browser reruns. [Attempts](browser-attempts.json)
retain test-harness mistakes and the local intermediate locale mistake separately.
The first overwritten temporary report is documented as summary-only; it is not
represented as a retained raw artifact. Intermediate results are not added to
accepted counts. Final fixture diagnostics observe unhandled page errors; the
unmocked report also retains console/network diagnostics.

Cumulative Communication coverage remains **8 complete cases PASS / 17
partial-BLOCKED**, with the [historical case map](../2026-10-17-pb1019-comm-continuation/checklist-coverage.json)
unchanged. This UI resilience pass does not complete positive deployed inbox
persistence, recipient isolation, native push opt-in/out or delivery. Server push
is disabled. Publication/unpublication controls, reminder delivery and additional
controlled audience/role coverage retain their earlier blockers. School-selected
time-zone/date-format acceptance is NOT RUN: the shared notification item accepts
locale, and these assertions verify language only. Checklist checkboxes remain
unticked; the ledger records execution evidence.
