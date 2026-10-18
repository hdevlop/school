# Finance follow-up: API and database acceptance

Date: **2026-10-18**. Continued the unfinished finance checks from the
[earlier development batch](../2026-10-18-finance/README.md).
**218 tests passed, zero failed** across the three groups below. This run adds
API, MCP and database evidence; no new browser or production case is accepted.

| Verification | Result |
| --- | --- |
| Complete finance integration runner, 23 suites | 56 PASS |
| Focused finance regression command | 146 PASS |
| Calendar contracts and historical billing calculations | 16 PASS |
| Server acceptance-test TypeScript check | PASS |
| Root lint | PASS |

See [case results](results.json), [source fingerprints](source.json) and
[cleanup verification](cleanup.json). The full integration run was followed by
focused allocation and rollover retests after the final test changes. Repeated
tests are counted once. The source is a mutable working tree based on `f081af7`,
with unrelated ongoing changes preserved.

The existing demo at `http://127.0.0.1:3102` answered health and authenticated
MCP registry requests with 200. All financial writes ran on the separate local
`school_history_test` database after checking its
`academic-history-alerts-v1` marker. The acceptance runner used its own servers,
disabled Redis and used the console email provider. No demo financial records,
production settings or production records were changed by this follow-up.

## Coverage added and verified

- Credit application rejects zero, negative, sub-cent and above-balance amounts
  with 400. Each refusal leaves the credit lot, installments, allocations and
  credit applications unchanged. Anonymous and signed-in roleless accounts
  cannot apply credit. Positive REST/MCP applications to historical and current
  fee years and reversal after refund pass in the existing lifecycle tests.
- Rollover preview records a run and audit entry while leaving fees and school
  settings unchanged. Commit with settings confirmation disabled also preserves
  settings. Selected-year isolation, repeated and concurrent commit, an injected
  failure midway through a run, transaction rollback and successful retry pass.
- All five required money-integrity regressions pass over authenticated HTTP
  and PostgreSQL: generic expense edits cannot bypass approval/payment; payroll
  deductions cannot exceed gross; identical concurrent payment keys resolve to
  one receipt; partial expense payment-date edits respect the stored expense
  date; and sub-cent payments fail without an allocation.
- The complete runner also checks fee and installment year isolation, shared
  receipts, check reservations/settlement/bounce, automatic cheque replacement,
  payroll hire-date restrictions, audit access and notification dry-run/history.

## Cleanup defect fixed

The first full run passed its assertions but the independent table comparison
found one extra `allocation.deleted` audit row. The allocation acceptance test
removed its fixture payment and allocation without removing that allocation's
audit entry. Its teardown now removes audit entries for its exact two fixture
allocation IDs and asserts they are absent.

Only this run's extra audit row was removed from the isolated fixture. Older
rows were preserved. The focused allocation retest passed all three tests with
no table changes; the final rollover retest passed all four tests. Final counts
and content hashes for **all 16 checked financial/settings/person tables match
the pre-run baseline**, including the original 43 audit rows. This comparison
does not claim a snapshot of every authentication/session table.

## Remaining boundaries

- Browser discovery returned no available browser, so no browser journey,
  responsive check or visual acceptance ran in this follow-up. The absent
  credit panel still blocks the student-credit browser cases.
- The 16 calendar tests verify explicit-date contracts and September-June
  billing; they do not advance a running server clock or prove payment cutoff
  enforcement on July 14/15, August or September. `paymentCloseoutOn` remains
  stored/validated calendar metadata without a payment enforcement check.
  Installments-M02 and rollover-M03 remain partial.
- Rollover browser controls and active-settings confirmation need separate
  acceptance. No school-wide rollover ran against the development demo.
- Notification tests use dry runs/history. Real email/push delivery is open.
  Audit route protection does not establish database-level immutability.
- Production error masking, the reports failure state and missing export
  control remain outside this run. Production checkboxes are unchanged.

No deployment or package upgrade was performed. Runtime code did not change;
this follow-up changes acceptance tests and documentation. Production build
verification was therefore not repeated.
