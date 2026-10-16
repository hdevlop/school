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

Pending publication and exact-revision live retest. No browser or deployment
pass is claimed by this source record. The live retest will use intercepted
payroll writes for UI checks and internal REST/MCP for persisted operations.
Customer promotion and active-year changes are outside this follow-up.
