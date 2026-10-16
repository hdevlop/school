# Payroll hire-month and payment confirmation follow-up

The production browser report left payroll offering months before a staff
member's hire date and paying immediately on a button click. This follow-up
addresses both findings.

Monthly payroll now excludes staff hired in a later month when generating
payslips. Both payment routes, including payment of an existing pending
payslip, reject a pre-hire month with HTTP 400 before writing. Bulk payment
retains its existing partial-result contract and skips ineligible staff.
The hire month remains eligible at the existing full monthly amount; this
change does not introduce salary proration.

The payroll screen uses the same shared hire-month rule. Existing payslips
remain visible, including pre-hire legacy records, but an ineligible pending
record cannot be paid. Historical pending payslips for departed staff retain
their existing payment action when their hire date permits it. Selecting only
nonpayable rows no longer falls back to paying everyone.

Single and bulk payments open a localized confirmation on desktop and phone.
It shows the staff name or count, period, amount and bank-transfer method.
Cancel sends no payment. The confirm callback retains the displayed period
and selected-year write context.

## Source and isolated database verification

- Lint, typecheck, translation checks and production build pass.
- All 1,717 root tests and 104 focused finance tests pass.
- All 16 finance lifecycle transport cases pass against the marked local
  `school_history_test` PostgreSQL fixture. The new case checks direct,
  existing-slip and bulk refusals, unchanged history and no audit writes,
  and successful payment in a mid-month hire's hire month.
- Payroll history database and transport suites both pass (two cases).
- The generation fixture checks that a future hire is excluded while a
  mid-month hire is included. Shared date-rule tests cover year boundaries
  and missing hire dates.

## Deployment and browser acceptance

Source revision: `7b5b8d521b8cef69af3988faa931ff42c67eed6f`.
[CI, image publication and demo deployment passed](https://github.com/hdevlop/school/actions/runs/38955353448).
Published image:
`ghcr.io/hdevlop/school@sha256:782e5ac6ed271d22cf2b349d6d3b528fe4528a51bd2ab1726de84792cb256cf0`.

At 2026-10-16 19:43:06 UTC, the demo app and notifications worker were healthy
on that revision and exact published image. Apex and www login and public
readiness returned HTTP 200. Persistent storage and the test mail hub were
preserved. See [deployment proof](deployment-proof.json).

All [34 live internal REST/MCP checks](api-results.json) passed. The retained
staff record has an October hire date, after the selected 2025-2026 year: its
June payment is now refused with 400 and no payslip. A separate temporary
staff record hired on June 15 successfully received June payroll. That
payslip and staff record were then removed, along with the other one-off
expense, assessment, grade, vehicle and announcement records. Reusable
fixtures were preserved. Earlier finance fixes, teacher grading and family
ownership also passed again.

All [23 payroll browser checks](payroll-browser-results.json) passed in French
at 1440x900 and 390x844. Future hires were absent from the June roster; a
legacy pre-hire pending slip remained visible with payment disabled; an
eligible historical pending slip remained payable. Single and bulk dialogs
displayed the expected staff/count, month and amount. Opening and cancelling
sent zero payments; confirming sent the captured eligible targets exactly
once. There were zero uncaught browser errors. These UI checks intercepted
every payroll write and supplied synthetic presentation fixtures; persisted
financial behavior was tested separately through internal REST/MCP and the
local database suites.

All [27 broader browser smoke checks](browser-results.json) also passed on
this release in Chrome 155.0.8059.80: French forms and in-year defaults,
logout/back, teacher access, both parent profiles without forbidden finance
requests, and Arabic RTL at phone width with no horizontal overflow. There
were zero uncaught page errors. As in the preceding run, the unauthorized
teacher profile's expected 404 responses are retained in diagnostics.

Customer promotion, active-year changes and the full feature matrix are
outside this follow-up. Shared-demo concurrency was not run. Credentials
and raw logs remain in ignored local paths; tracked results contain no secrets
or real identities.
