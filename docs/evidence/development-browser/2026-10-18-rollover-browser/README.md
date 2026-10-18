# Academic-year rollover — isolated development browser

Executed on 2026-10-18 at **http://127.0.0.1:3108** using a newly created,
ownership-marked local clone of `school_history_test`. The ordinary dev app at
port 3102 and its data were not used for rollover writes. Whole-school rollover
requires this isolation. External email, notification dispatch and push were
disabled. Fresh isolated Chromium sessions exercised the real app, REST routes
and PostgreSQL. This is not connected-browser or production acceptance.

**71 final assertions PASS**: [52 workflow assertions](after-ui.json),
[7 access assertions](access.json) and [12 visible-figure assertions](figures.json).
The [before-fix run](before-ui.json) separately retains two passing assertions
and one reproduced failure. They are not added to the final total.

## Defect and fix

After a successful preview, changing “copy discounts” caused the next preview
to return 409: the client reused its previous idempotency key with a different
payload. Changing one-time fees or either year had the same reset path.

The form now creates a new key whenever those inputs invalidate the preview.
Repeating an unchanged preview retains its key and durable run. The fix is
local to `RolloverDialogContent.tsx`; no server contract, calendar policy or
shared package changed. [Before screenshot](before-options-fr.png).

## Executed coverage

| Development case | Result | Observations |
| --- | --- | --- |
| rollover-R01 | PASS for exposed controls | Default previous/active years, explicit year selection, equal-year disablement, discounts, one-time fees and preview invalidation checked. Preview is a dry run for charges, but **does persist a run and audit metadata**. |
| rollover-R02 | PASS | Preview identifies exact controlled records/dates. Fees, installments, settings and academic years retain identical hashes after each preview. |
| rollover-M01 | PASS in disposable environment | Real UI commit, repeated-run prevention, reopen/re-preview and duplicate-skip commit; supporting HTTP retry returns the original run without mutation. |
| rollover-M02 | PARTIAL | Exact charge counts, discounts, optional one-time fee and settings preservation pass. The UI sends `confirmSettingsUpdate: false`; the server refuses `true` with 409 because activation is a separate operation. A separate active-year activation journey was not run. |
| rollover-M03 / installments-M02 | PARTIAL | Actual committed installments span September–June. Controlled-clock July 14/15, August and September 1 payment-cutoff acceptance remains open. |
| Financial-operations access | PASS for rollover | Verified teacher receives 403 on preview/commit, sees no rollover control after redirect to its permitted home, and remains signed in. |

The fixture added two source charges for an existing generated student enrolled
in both source **2024-2025** and target **2026-2027**. The source year was chosen
without other fee assignments, making the expected preview independent of the
other cloned records:

- Recurring tuition: 300 per month over ten months. No copied discount produces
  3,000; copying the 20-per-month discount produces 2,800.
- Including the 125 one-time fee produces two proposed charges totaling 2,925.
- Commit creates exactly those two target fees and eleven installments: ten
  monthly installments plus one one-time installment, totaling 2,925. The
  monthly dates run from 2026-09-01 through 2027-06-01.
- Reopening the dialog finds two existing fees and proposes none. Committing
  that preview skips both and leaves the exact fee rows unchanged.

French desktop exercised the full mutation journey. Arabic dark-mode phone,
English desktop and Spanish desktop exercised real previews after commit,
duplicate figures and cancellation without commit. Dialog bounds and RTL were
checked. French and Arabic visible summary fields independently agree with the
controlled student count, proposed/existing counts, exclusions, errors and total.

[French pre-commit summary](preview-fr.png) shows the expected 2,925 total;
[Arabic phone summary](preview-ar-phone.png) shows two existing fees and zero
proposed charges after commit. Both were visually reviewed. The cloned fixture
uses **USD**, which the shared formatter displays; currency settings were not
changed. Stacked success toasts in the screenshot come from consecutive previews.

## Diagnostics and limits

The final browser journeys recorded no HTTP failures or JavaScript page errors.
Supporting negative requests intentionally returned 403 for the teacher and 409
for coupled settings activation. The initial reproduced option change returned
409. Startup was corrected to use the isolated server's full session-recovery
URL; the harness also changed its native-select locator. Those setup attempts
are excluded from accepted assertions and are not product defects.

Preview persistence is explicit: final cleanup observed twelve run records,
including the original reproduction and subsequent preview/commit checks.
Two runs committed, one creating fees and one skipping existing fees. The client
does not expose credit application or active-year activation in this dialog.
Those workflows, audit database immutability, real delivery and payment-cutoff
enforcement are not accepted by this run. No clock or ordinary-school settings
were changed, and no production checkboxes were updated.

## Cleanup and validation

[Cleanup](cleanup.json) verified the private ownership marker, stopped only the
isolated server, verified no live database connections remained, dropped only
the exact database created for this run and confirmed its absence. This removes
the cloned records, source/target fee fixtures, installments, preview/audit
metadata and temporary teacher login together. Before removal, original history
fixture settings and academic-year hashes matched the cloned baseline; its two
fee rows matched the unchanged original rows in the clone. The normal dev app
continued to return health 200. This does not claim a snapshot of every table.

[Validation](validation.json): **547 automated tests**, lint, type checks,
translation scan, production build and diff checks pass. The build used a
separate output directory. [Source fingerprint](source-fingerprint.json) records
the tested working tree. Credentials, sessions, keys, fixture ownership marker
and raw manifests remain in ignored local files. No commit, push, deployment or
production browser test was performed by this batch.

Subsequent local evidence: the [calendar-boundary API/database follow-up](../2026-10-18-calendar-boundaries/README.md)
tests six controlled payment dates and separate September 1 activation without
fee generation. It preserves historical debt payments after July closeout;
no payment lockout or browser activation flow is introduced or accepted.
