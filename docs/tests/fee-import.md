# Student fee and payment import

The Fees table's import dialog accepts CSV/XLSX rows with `studentCode`,
`feeType` (or `feeTypeId`), schedule, amount and date, and JSON arrays of existing
students with nested `fees` and `payments`. It uses the selected school year.
It does not create students or import the two-year migration report object.
Summary/detail fee reports are detected before student lookup and refused with
guidance to use the prepared import JSON. The legacy `Student-Fees` workbooks
contain summary balances, obsolete student codes and no receipt metadata, so
their amounts cannot be imported as payments without inventing receipt data.

Nested charge lines for one fee type become one yearly fee with the exact
dated installments, preserving variable prices and omitted months. Overlapping
charge months are refused. An identical existing fee is reused; a different
unallocated schedule can be replaced. Allocated schedules are never overwritten.

Payment lines are grouped by `receiptNumber`, which must identify one student
and consistent receipt details. Every `month`, `feeType` and `amount` line maps
to one installment allocation. The normalized receipt number is retained as the
app receipt number; `myskoolPlusReceipt` is retained as its transaction reference.
Dates and payment methods come from the file, independently of the billed month.

For legacy cheques, absent due dates use the payment date with the note
`Échéance non connue (reprise MyskoolPlus)`. Absent cheque numbers use `NON SAISI`
with `N° de chèque non saisi dans MyskoolPlus`. The import identifies receipts by
receipt number, so repeated or unknown legacy cheque numbers do not merge
payments. Ordinary payment entry retains its duplicate-cheque protection.
Cheques remain pending until explicitly cleared through the normal payment flow.

Each student's fees, installments, payment allocations and audits share one
transaction. A failed student remains in the dialog's error report. Retrying
reuses exact fees and receipts; conflicting receipts are refused. The endpoint
requires school-wide access and `create:fees`, `update:fees`, `create:payments`.

When the JSON supplies `enrollmentDate`, the importer first requests a read-only
date preview for the complete file. An administrator or principal with
`update:students` explicitly chooses **Apply dates and import** after reviewing
the saved and proposed dates. This can restore admission and the initial yearly
placement to an earlier source date; it never postpones existing history.
Transferred or ended enrollments require the normal profile correction flow.
The reviewed state is checked again on save. Admission, enrollment, placement,
fees, receipts and correction audits share the student's transaction, so any
later allocation failure also rolls back the date changes. The ordinary fee
route cannot apply corrections, and its billing-date checks remain in force.

Verification commands:

```powershell
bun test apps/dashboard/tests/features/Financial/Fees/config/feeImport.test.ts packages/server/tests/security/FeeImport.test.ts
bun --env-file=apps/dashboard/.env.local scripts/run-finance-acceptance.ts FeeImportTransport
bun --env-file=apps/dashboard/.env.local scripts/run-finance-acceptance.ts FeeImportDatesTransport
```

The transport runner permits only the marked local `school_history_test`
fixture. It tests grouped allocations, variable monthly prices, original receipt
references, cheque defaults, repeated legacy cheque numbers, ordinary cheque
protection, concurrent retries, transaction rollback, charged-year and roster
refusal, and unauthenticated access. It cleans up its own records.

Verified locally on 2026-10-26: 5 importer transport tests, 10 route-security
transport tests, the existing mixed-year payment transport test, 176 finance
tests, importer validation and schedule tests, typechecks, translation keys,
workspace boundaries, and the production build passed. Lint has no errors and
retains the existing `ParentsTable.tsx` hook-dependency warning. Browser review
and an import into the school's database have not been performed.

On 2026-10-26, the current-year source JSON passed a read-only dry run: 465
students, 1,221 source charge lines consolidated into 960 yearly fees and 5,970
installments, 886 receipts and 2,416 allocations. Planned charges total 5,804,190 DH
and payment lines total 2,395,325 DH. This is file-level reconciliation, not an
import into the school's database or proof that historical cheques have cleared.

The prepared current-year JSON was checked read-only against the running app's
actual 2026–2027 fee roster and active fee-type catalog: all 465 student identities
and fee types matched. That check did not cover saved enrollment dates. All 465
had admission and yearly enrollment recorded as 2026-10-26, blocking the 437 rows
with fees. The new read-only date preview identifies 465 proposed corrections:
464 to 2026-09-01 and one to 2026-10-01, as supplied by the file. No real dates or
financial records were changed by this verification. The legacy XLSX report is
refused with one format-specific message before any student lookup or write.

The complete calculation was then repeated read-only with the actual roster,
fee-type catalog, settings and proposed date corrections: 960 yearly fees,
5,970 installments, 5,804,190 DH in charges and 2,395,325 DH in payment lines,
with no parsing, billing-date, missing-installment or over-allocation problems.
Four date-correction transport tests pass, including stale-preview refusal,
rollback of dates and audits after an allocation failure, and successful
correction/import followed by a duplicate-free retry. Route-security tests,
typechecks, translations, workspace boundaries and the production build pass.
