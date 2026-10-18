# Payment calendar boundaries and separate year activation

Executed on 2026-10-18. **72 tests PASS**: eleven new HTTP/PostgreSQL integration
cases, 33 calendar/lifecycle regression tests and 28 workspace-boundary tests.
Lint, server acceptance-test type checks and the workspace import scan pass.
This batch adds tests and a runner; it changes no application behavior and
performs no browser or production acceptance.

The integration runner creates a new local database from the marked history
fixture, assigns a private ownership marker and runs the app's actual HTTP
server on loopback port 5544. Email uses the console provider; notification
dispatch and push are disabled. The normal dev server/database are not used for
financial or activation writes. The original fixture is not mutated.

Run with the repository's existing local fixture credentials:

```powershell
bun --env-file=apps/dashboard/.env.local run test:calendar:integration
```

The command refuses an existing target database, a non-loopback or unexpected
source, or an incorrect source marker. Teardown checks its ownership marker and
zero remaining connections, then drops only the database it created. Private
marker values, credentials and logs stay in ignored local files.

## Payment boundaries

Six integration cases set **APP_BUSINESS_DATE** to 2027-06-30, 2027-07-01,
2027-07-14, 2027-07-15, 2027-08-01 and 2027-09-01. The cloned active calendar's
closeout date is explicitly configured as July 14. The operating-system clock
and normal dev app's business date are unchanged.

On every date, actual authenticated HTTP records one 100 cash payment against
a closed **2025-2026** fee and another against **2026-2027** debt. Assertions
verify:

- Receipt/payment and settlement dates equal the controlled date; allocations
  retain their original fee/year. Each installment receives exactly one
  allocation, and a repeated idempotency key returns the same payment.
- Today's cash summary increases by exactly 200 and includes both receipts.
  Historical allocation does not move the receipt into the fee's calendar date.
- Paid amounts advance by 100 on each fee. Gross/net amounts remain 1,000,
  discounts remain zero, and the twenty existing installment IDs and amounts
  remain unchanged. No fee or schedule regeneration occurs.
- Active settings and the configured July 14 metadata remain unchanged across
  July 15, August and September 1. A date crossing does not activate a year.

These assertions preserve the established ability to settle historical debt
with its actual receipt date. **July 14 is calendar closeout metadata, not an
implemented payment lockout.** This run records the existing accepted-payment
behavior; it does not add or accept a new rule denying late payments. It also
does not test browser date-picker behavior at simulated dates. September–June
schedule generation through the real rollover UI remains separately evidenced
in the [rollover browser batch](../2026-10-18-rollover-browser/README.md).

## Separate academic-year activation

Five integration cases exercise the real academic-year HTTP routes and database:

1. Create a 2027-2028 draft and verify its calendar. Active settings and all
   financial rows remain unchanged.
2. Activation without the required committed academic transition returns 409.
   A signed-in teacher receives 403 and retains its authenticated session.
3. With prepared transition data, August 31 activation returns 409. Closing the
   still-active source year also returns 409, preserving students/settings.
4. On September 1, two concurrent activation requests both return 200, with
   exactly one `changed: true`. Settings point to 2027-2028, the prepared
   student's current class/section are projected, the target opens and only one
   activation audit entry is written. The previous year remains open. Repeating
   activation returns `changed: false`. Fee/installment snapshots stay identical.
5. Closing the previous year is a separate successful action. Historical fees
   remain readable, the active pointer stays on the target and no charges change.

The activation prerequisite is **seeded committed transition data** with a
target enrollment/placement and explicit outcomes for the other source students.
This is activation acceptance, not acceptance of the transition preparation UI
or commit workflow. The rollout dialog exposes no activation control; no browser
confirmation journey is claimed. All current-student projections and year
changes occurred only inside the disposable database.

## Evidence and cleanup

[Results](results.json) record commands, counts and boundaries. The integration
suite has **169 assertions**, all passing. Repeated development runs are counted
once. [Source fingerprints](source-fingerprint.json) identify the final working
tree. [Cleanup](cleanup.json) confirms removal of the marked test database.
[Original-fixture comparison](source-comparison.json) confirms equal counts and
content hashes before/after for all eight checked tables: fees, installments,
payments, allocations, settings, academic years, students and enrollments.
This does not claim a snapshot of every authentication or audit table.

The ordinary dev server was no longer listening at the final health check.
It was restarted with `bun run dev`; `/api/health/status` then returned 200/ready.
No reset, reseed or database repair was performed.

Expected 403/409 refusals are asserted, including unchanged state. No application
defect was found in these paths. An initial test-variable annotation was fixed
after TypeScript rejected it; the final suite and type check pass. Runtime source
did not change, so a production build was not repeated. Earlier runtime fixes
still require their separate release and production recheck. No commit, push,
deployment, ordinary-school activation or production clock change was performed.
