# Finance review and real integration tests — 2026-10-03

The review found **five reproducible defects**. The final run had **117 passing tests and 5 failing regression tests**. Production code was not changed during this review. The pre-existing edits in `FeeService.ts` and `FinanceIntegrity.test.ts` were preserved.

## Findings

1. **Expense edits bypass the approval and payment workflow.** An accounting account creates a pending expense, then sends `PUT /api/expenses/:id` with `{ "status": "paid" }`. The server returns 200 and persists `paid` with `approvedBy`, `approvedAt`, `paidBy`, `paymentDate`, and `paymentMethod` all null. The update emits `expense.updated`, rather than the approval/payment audit actions. This can introduce paid records that do not satisfy the ordinary payment route's requirements. [ExpenseService.ts](../../packages/server/src/modules/financial/expenses/ExpenseService.ts), update keys around line 122, and [ExpenseDto.ts](../../packages/server/src/modules/financial/expenses/ExpenseDto.ts), line 36, accept the transition. Route status changes through the domain workflow, with explicit validation and audit metadata for any supported correction.

2. **Payroll accepts deductions greater than gross salary.** For a pending payslip with a 100 MAD base and no allowances, `PUT /api/payroll/:id` with `{ "totalDeductions": 150 }` returns 200 and stores a **−50 MAD net salary**. [PayrollService.ts](../../packages/server/src/modules/financial/payroll/PayrollService.ts), lines 250–263, calculates and writes the result without checking its lower bound. Validate the merged allowances/deductions against gross pay before writing; also protect the payment action against invalid existing snapshots.

3. **Concurrent idempotent payment retries return a 500.** Two concurrent identical 50 MAD receipts with the same UUID idempotency key return **200 and 500**, although the database correctly retains one receipt and one 50 MAD allocation. Sequential replay succeeds. [PaymentService.ts](../../packages/server/src/modules/financial/payments/PaymentService.ts), line 27, only inspects the outer error's code/message. The unique violation is wrapped in a Drizzle query error whose outer message is `Failed query: ...`; the recovery at line 300 is consequently skipped. Recognize the PostgreSQL idempotency constraint through the error's cause chain and return the existing receipt after rollback. No duplicate money was observed, but a caller receives failure after the receipt has been recorded.

4. **Partial expense edits skip payment-date validation.** An expense dated `2026-10-03` accepts `PUT /api/expenses/:id` with only `{ "paymentDate": "2026-10-02" }`, returning 200 and storing a payment before the expense. [ExpenseValidator.ts](../../packages/server/src/modules/financial/expenses/ExpenseValidator.ts), line 179, validates only when both dates are present in the submitted body. Validate the merged stored and submitted dates, including edits that move an expense after an existing payment date.

5. **Invalid monetary precision becomes a server error.** A receipt and explicit allocation of `0.001` MAD pass the numeric DTO validation, then return **500** with `Invalid money value: 0.001`. The transaction writes no allocation. [PaymentDto.ts](../../packages/server/src/modules/financial/payments/PaymentDto.ts), lines 8 and 12, accepts the precision, while `toCents` correctly refuses it. Validate monetary precision at the input boundary and return a 400/422; retain the service's defensive money checks.

All five cases are active assertions in [FinanceLifecycleTransport.test.ts](../../packages/server/tests/acceptance/FinanceLifecycleTransport.test.ts). They intentionally remain failing until the application behavior is fixed; they are not skipped or marked as expected failures.

## Verified behavior

| Test group | Passed | Failed |
| --- | ---: | ---: |
| Existing finance integrity and frontend tests, 10 files | 79 | 0 |
| Existing PostgreSQL and authenticated REST/MCP finance acceptance, 22 files | 29 | 0 |
| New HTTP/MCP lifecycle and regression tests, 1 file | 9 | 5 |
| Total | 117 | 5 |

The existing acceptance covers allocations, credits, expenses, fees, fee types, financial audit, financial notifications, installments, payments, payroll, and rollover. It checks selected-year reads/writes, mixed-year receipt portions, historical corrections, credit application, cron dry runs, and rollover replay/concurrency/rollback.

The new suite additionally verifies anonymous/roleless denial; accounting MCP fee creation and recurring discount edits; partial cash and sequential idempotency replay; changed-payload refusal; underallocation transaction rollback; wrong-student and cancelled-installment refusal; competing allocation serialization; check reservation/deposit/settlement/bounce; overpayment credit reversal on refund; expense approval/payment checks; payroll pay/repeated-pay refusal/undo; and acting-account audit attribution. Refunds preserve receipt/allocation history.

## Execution and isolation

The machine initially had only the main `school` database. A separate local PostgreSQL `school_history_test` was created, migrated with the checked-in migrations, and seeded using the existing marked history fixture. The staff row required by payroll acceptance was added only to that fixture. No write request or database mutation targeted the main school database.

The new suite uses the actual Najm server on port 5533, authenticated network HTTP requests, the real MCP registry and fee tools, and PostgreSQL transactions. The existing suites use the actual repositories/server and network MCP. Redis and email are isolated per test process by the runner: memory caching/rate limits and console email. Initial missing-staff, shared-Redis login-limit, and missing-principal-password setup failures were corrected before the final results above.

Cleanup confirmed zero fixture payments, allocations, credit lots/applications, expenses, payslips, and lifecycle test users/staff. The original seed fee and fee type remain. The existing allocation acceptance retains its deletion audit events in this isolated database.

`bun run lint`, server test typechecking, and `git diff --check` passed. No production build was needed because this review added tests, a runner, scripts, and this report. Browser rendering, the Next.js route adapter, physical printing, real bank settlement, and external notification delivery were not exercised.

## Repeat the tests

Fast tests:

```powershell
bun run test:finance
```

For real integration, use a migrated, marked `school_history_test` seeded with `seedAlertsHistory.ts` and the staff fixture from `seedAcademicRecordHistoryCases.ts`. Supply its actual fixture passwords as process environment variables; these are distinct from the school's user credentials:

```powershell
$env:SCHOOL_HISTORY_TEST_DB_URL = 'postgresql://<user>:<password>@localhost:5432/school_history_test'
$env:SCHOOL_HISTORY_ADMIN_PASSWORD = '<fixture-admin-password>'
$env:SCHOOL_HISTORY_PRINCIPAL_PASSWORD = '<fixture-principal-password>'
bun --env-file=apps/dashboard/.env.local run test:finance:integration
```

The [runner](../../scripts/run-finance-acceptance.ts) checks the local database name and fixture marker before execution, starts each suite in a separate process, and writes logs plus `summary.json` under `.cache/finance-review/`. It does not create, migrate, reset, or remove a database. The command currently exits 1 because of the five application defects. To run only the new cases, append `FinanceLifecycleTransport` to the integration command.
