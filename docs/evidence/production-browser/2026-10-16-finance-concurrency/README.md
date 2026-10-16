# Finance concurrency follow-up

This continues [pb1016r](../2026-10-16-pb1016r/README.md)'s deferred concurrency
regression. Execution used only the local `school_history_test` PostgreSQL
database with marker `academic-history-alerts-v1`, three calendars and ten
student identities. No concurrent payment tests ran on the shared demo.

## Reproduction and correction

The first attempt stopped in fixture setup: the test inserted another
`accounting` role despite the current unique role-name constraint. The fixture
now reuses that existing role and deletes a role only when this run created it.
Existing grants and accounts are preserved.

The next attempt ran 14 cases: 13 passed and the concurrent identical-key case
failed. PostgreSQL kept one receipt and one 50.00 allocation, but one HTTP
request returned 500 while the other returned 200. `PaymentService` checked
only the outer error for SQLSTATE `23505`; Drizzle puts the PostgreSQL error in
`cause`, so the service did not replay the already committed receipt.

The correction follows the error's cause chain, recognizing only SQLSTATE
`23505` and guarding against cyclic causes. After the losing transaction rolls
back, the existing payload-hash check still rejects a reused key with different
data. Other database errors continue to propagate.

## Verification

Command, with local fixture configuration loaded without printing credentials:

```powershell
bun --env-file=apps/dashboard/.env.local scripts/run-finance-acceptance.ts FinanceLifecycleTransport
```

- **15 PostgreSQL/REST/MCP cases pass.** Identical concurrent requests both
  return 200 with the same receipt ID, exactly one allocation and one completion
  audit record. Concurrent different amounts sharing a key return 200 and 409,
  with a single persisted charge. Competing distinct cash payments cannot
  overpay an installment. The other four finance regressions also pass against
  PostgreSQL.
- **103 finance unit tests pass.** Added cases cover wrapped duplicate-key
  recovery, unrelated SQL errors whose message mentions uniqueness, and cyclic
  error causes.
- Fixture cleanup leaves zero run-owned accounting/outsider users, staff,
  roles or fee types. The original ten students and three years remain.
- Lint, typecheck, translation checks, all 1,715 root tests and the production
  build pass. [Sanitized database test result](fixture-results.json).

## Release and live acceptance

Source revision: `c554edb61389ef6716b0a88f1d29e73aa9be6215`.
[CI, publication and demo deployment passed](https://github.com/hdevlop/school/actions/runs/38950497950).
Published image:
`ghcr.io/hdevlop/school@sha256:6b476401bf3896991de48171bf7413ba11be8d84ee323ca3394490a626f53f9d`.

At 2026-10-16 19:03:59 UTC, the demo app and notifications worker both served
that revision and image and were healthy. Apex and www login and public
database/cache readiness returned HTTP 200. Persistent storage and the test
mail-hub configuration were preserved. See [deployment proof](deployment-proof.json).

All [30 live REST/MCP smoke checks](api-results.json) passed again on this
revision, including the original four finance fixes, workflow actor/date
metadata, teacher grade persistence, family ownership and run-owned cleanup.
The simultaneous payment cases remain isolated to the local marked database;
they were not repeated on the shared demo. There were no frontend changes in
this follow-up; the preceding browser acceptance is recorded in pb1016r.

Logs and credentials remain in ignored local paths. No secrets or identities
are included in this record.
