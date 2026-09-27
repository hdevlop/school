# Payments and allocations

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: Student fee payment controls and `/financial-operations` check controls. Original coverage: G04, G06.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned charges/installments and explicitly authorized test payments. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **payments-R01**: Open single/multi-fee payment controls; outstanding amounts and allocation preview reconcile.
- [ ] **payments-R02**: Inspect cash/bank/check-specific required fields; invalid amounts and missing fields cannot submit.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **payments-M01**: Record one authorized payment across owned fees; reload detail/history and reconcile amount, allocation, remaining balance and status.
- [ ] **payments-M02**: Prevent over-allocation and duplicate submission; repeat/replay guarantees require server/database tests as well.
- [ ] **payments-M03**: For owned checks only, test supported deposited/completed/bounced transitions and void with reason; totals and history reflect the transition. Never charge an external instrument.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
