# Finance: development browser batch (PB1021-FIN)

Target: **http://127.0.0.1:3102**, the existing dev demo and its local
database, which the owner authorized changing on 2026-10-18. Run on
2026-10-17 23:15 – 2026-10-18 00:35 UTC by Claude Code, while another coder
ran the People group. Chrome 155 through Playwright, headless, French at
1440×900, with 390×844 and Arabic right-to-left checks. This batch triggered no
deployment and ticks no production case: the production checklist and its
54/225 total are unchanged.

**Why local:** the production demo accounts file
(`.cache/production-browser/myscolai-accounts.json`) was deleted, and the local
admin password is refused on myscolai.com. The owner chose to run locally first
and recheck production once credentials are available.

**Source:** `db257c4` plus the working tree ([validation](validation.json) holds
the file fingerprints). The tree also holds the Payments coder's uncommitted
receipt and cheque-replacement work; the dev server served it during the run.

## Scope

The finance cases left PARTIAL on production: fee types, fees, payments,
installments-M02, financial operations and reports. Identities: the local admin
(allowed) and a run-owned teacher login (denied). Fixtures: section PB1021 in
CM2 with student-A (Pbtest Alpha) and student-B (Pbtest Beta).

## Results

| Case | Dev result | Notes |
| --- | --- | --- |
| fee-types-R01 | **PASS** | Cards and table agree with the read; name search and category filter |
| fee-types-M01 | **PASS** | Create, edit and reload; empty, short, zero, negative and too-large values refused in French with no request; API refuses an invalid payment type and amount |
| fee-types-M02 | **PASS after fix 1** | Deleting a referenced type is a translated 409; deleting it after its charge is removed works |
| fees-R01 | **PARTIAL** | Class, section, student, status and schedule filters and all six totals match the read. The year filter could not run (one local year). The class filter has no accessible name |
| fees-R02 | NOT RUN | Only one academic year exists locally |
| fees-M01 | **PASS** | Two charges with a 1 November billing start and discounts; the preview (8 × 350,00) equals the stored schedule |
| fees-M02 | **PASS** (bulk form) | One charge per selected type and none for the other student. The class form is NOT EXPOSED: its button was removed in `e29ee12` |
| fees-M03 | **PASS after fix 2** | Discount edit reloads with the new net. Negative and over-amount discounts and invalid billing dates are refused in French; values stay |
| payments-R01 | **PASS** | Per-fee amounts due, "pay all overdue" (3.200,00), per-fee and single-installment selections reconcile |
| payments-R02 | **PASS after fix 7** | Amount empty, zero, negative or short is refused with no request. A check requires its number and due date |
| payments-M01 | **PASS** | One cash payment across two fees; amount, allocations, balances and statuses reconcile after reload |
| payments-M02 | **PASS after fix 3** | Over-tender records only the selection and shows the change. A double-click sends one request. A replayed idempotency key returns the first payment. The API refuses over-allocation |
| payments-M03 | **PASS after fix 4** | Owned checks deposited, encashed and bounced from the history. Cancelling the bounce prompt sends nothing. A cash payment is voided with a reason; totals follow |
| installments-M02 | PARTIAL | Controlled-date tests pass (16). The closeout date is stored but enforced nowhere, so the July 15 to September behaviour needs an owner decision |
| financial-operations-R01 | PARTIAL | The pending check is listed and the count equals the read. The credit panel is still absent |
| financial-operations-M01 | PARTIAL | Cheque transitions pass. Rollover commit NOT RUN (school-wide); credits BLOCKED |
| financial-operations-M02 | PARTIAL | Audit entries cannot be changed through the API (PUT/PATCH/DELETE 404, entry unchanged; teacher 403). Audit and notification acceptance tests pass (5). The database itself does not block updates |
| reports-R02, R03 | not rerun | Unchanged: the unmocked failure state needs production; no export control |

Evidence: [fee types](fee-types-results.json), [fees](fees-results.json),
payments [part 1](payments-1-results.json), [part 2](payments-2-results.json)
and [recheck after fixes](payments-3-results.json),
[layout and language](visual-results.json),
[audit append-only](audit-append-only-results.json),
[finance acceptance tests](finance-acceptance-results.json),
[cleanup](cleanup-results.json) and the
[follow-up fixes](followups-results.json) (9/9 PASS, no native dialog). Parts 1 and 2 keep their failed attempts;
part 3 reruns those cases on the fixed code. Every run had zero page errors,
zero CSP reports and zero 5xx except the fee-type delete before fix 1.

## Defects found and fixed

1. **Deleting a fee type in use answered 500 with the SQL statement.** The
   service now refuses a type any fee uses with a translated 409
   (`feeTypes.errors.inUse`). Test: `FeeTypeDelete.test.ts`.
2. **A recurring discount above the monthly amount was accepted.** The
   discount is per month, so 5.000 on a 400 monthly fee was stored as a 50.000
   discount on a 4.000 fee and the net silently became 0. The form and the
   API now refuse a discount above the amount
   (`fees.validation.discountTooLarge`, `fees.errors.discountExceedsAmount`),
   and a recurring total discount never exceeds the gross. Tests:
   `FeeDiscountBounds.test.ts` and `feeSchemas.test.ts`.
3. **The API refused over-allocation in English** ("Allocation amount (2000)
   exceeds remaining balance"), forwarding a helper's text. It now uses
   `payments.errors.allocationExceedsAvailable`, and the helper is removed.
   `test:server-i18n` now also fails on a refusal that forwards `.error` or
   falls back to a literal, and fails on the old code.
4. **Check toasts showed the raw status** ("Chèque marqué deposited") on the
   student payment history. They now use the translated label, as the cheques
   page does. Refused actions show an error instead of an unhandled rejection,
   and voiding from the row menu confirms with "Paiement annulé".
5. **Corrupted catalog strings.** French check statuses read "D?pos?",
   "Encaiss?", "Rejet?", Arabic ones "????", and the Arabic and Spanish event
   heading "Place and audience" was damaged too. All came from `6dfb37a`; the
   cheques page showed them in its toasts. A catalog test now fails on a
   letter lost to a question mark.
6. **The payment register's three amounts overlapped** in the wide payment
   dialog at 1440 px. Its columns now follow the register's own width; checked
   at 1440 px, 390 px and in Arabic.
7. **The check due date said "Pick a date"** in English, and the check number
   and due date, which the server requires, had no required marker.
8. **Fee type cards cut the category** ("Sortie scola...").
9. **The installment preview showed ISO dates** (2026-09-01); it now uses the
   school's date format.

Follow-up, after `69b13c7` (same server, [results](followups-results.json)):

10. **Creating fees from `/fees` said nothing and did not refresh the list.**
    A type the student already has, which the server skips, now keeps the form
    open with "Ces frais sont déjà facturés à cet élève pour cette année"; a
    mix names both counts; a new charge confirms and the list updates.
11. **Void and bounce reasons used the browser's `window.prompt`.** The payment
    history now asks in the cheques page's reason form (Cancel and an empty
    reason send nothing), the stale view closes first, and the history,
    balances and installments refresh: the row kept "En attente" before.
12. **Status badges and refusals showed codes.** The history read "Bounced" and
    "Voided"; the shared `status` catalog lacked `deposited`, `bounced` and
    `voided`. "Impossible de passer un chèque de bounced à deposited" now reads
    "… de Rejeté à Déposé", from the same words. Test: `PaymentStatusMessages.test.ts`.
13. **The `/fees` card total said "TPE"** in every language; it is "Carte
    bancaire" / "Card".
14. **The payment dialog and its checkboxes had no accessible name**; they are
    "Enregistrer le paiement", the fee and the installment number.

## Findings not fixed

Najm Kit (shared components):

- The table/cards view switch is a `div` without a button role or tab stop, so
  keyboard users cannot reach it.
- Row-selection labels are English ("Select all rows", "Select row 0").
- The repeatable fee line's remove button reads "Remove Cantine".
- A combobox filter has no accessible name (the fees class filter); select
  filters take their placeholder.
- The date picker stays open after a day is chosen.
- About 24 date fields without a placeholder show the English "Pick a date".

School:

- The `/fees` student picker still offers types the student already has
  (now refused with a message, see fix 10).
- The fee type table shows a raw ID column, as eight other tables do.
- A server error's message is returned to the client (the SQL text above);
  production error masking needs checking.
- Audit entries are append-only only because no route changes them; the
  database has no trigger or rule.
- `paymentCloseoutOn` is stored and validated but enforced nowhere.

## Writes and cleanup

Fixture setup and supporting reads used the API. Every case ran through the UI;
each script records its exact writes. The run created, then removed:
student-B, the teacher login, owned fee types, student-B's charges.

Retained, by design: **student-A (Pbtest Alpha)** and **section PB1021**.
Student-A has payment history (completed, bounced and voided payments on her
Tuition and Registration fees), so the API refuses to delete her ("Mettez fin
à son inscription à la place"), and the section still holds her. No pending
PB1021 check remains. See the [cleanup read](cleanup-results.json).

## Next

Production recheck after one release containing these fixes, once demo
credentials are available again: fee types, fees-M01/M03, payments R01, R02
and M01–M03. Owner decisions: the closeout behaviour after July 14, database
immutability for audit entries, and whether `/fees` should offer only the
types a student lacks.
