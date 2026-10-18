# Payments and allocations

Status: **PASS** (6/6) on `bfaa158`, 2026-10-18 (R03 on `440c060`, 2026-10-17). Evidence: [PB1022-FIN](../../evidence/production-browser/2026-10-18-pb1022-fin/README.md), [PB1018](../../evidence/production-browser/2026-10-17-pb1018/README.md).

Entry point: Student fee payment controls and `/financial-operations` check controls. Original coverage: G04, G06.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned charges/installments and explicitly authorized test payments. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [x] **payments-R01**: Open single/multi-fee payment controls; outstanding amounts and allocation preview reconcile. Result: **PASS** — per-fee amounts due and "pay all overdue" (12.000,00) equal the read; selection by fee (11.000,00, then 12.000,00) and the single-installment "Payer" (1.100,00) total correctly; the dialog and its checkboxes are named.
- [x] **payments-R02**: Inspect cash/bank/check-specific required fields; invalid amounts and missing fields cannot submit. Result: **PASS** — methods Espèces, Chèque, Virement bancaire, Carte de crédit; a check requires its number and due date (French refusals, translated placeholder); empty, zero, negative and insufficient amounts cannot submit; no request sent.
- [x] **payments-R03**: Print an existing completed payment using the saved school receipt language. French has French labels and left-to-right layout; Arabic has Arabic labels and right-to-left layout. The exact school logo, receipt number, student code, total and year allocation remain intact. Check long Arabic/French names and references on 80 mm paper. Result: **PASS** — receipts, fee names, filters and statistics.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [x] **payments-M01**: Record one authorized payment across owned fees; reload detail/history and reconcile amount, allocation, remaining balance and status. Result: **PASS** — one cash payment of 3.200,00 across tuition #1–#2 and registration; allocations, balances, statuses and history reconcile after reload.
- [x] **payments-M02**: Prevent over-allocation and duplicate submission; repeat/replay guarantees require server/database tests as well. Result: **PASS** — over-tender records only the selection and shows the change; the API refuses an over-allocation in French; a double-click sends one request; a replayed idempotency key returns the first payment. Server tests cover the replay guarantee (`test:finance`).
- [x] **payments-M03**: For owned checks only, test supported deposited/completed/bounced transitions and void with reason; totals and history reflect the transition. Never charge an external instrument. Result: **PASS** — owned checks deposited, encashed and bounced from the payment history; reasons are asked in the in-page form (Cancel sends nothing); a cash payment is voided with a reason; badges, toasts and refusals name statuses in French; totals and history agree.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
