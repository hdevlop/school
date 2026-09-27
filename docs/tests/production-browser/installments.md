# Installments

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: Student fee detail and fee schedule preview. Original coverage: G05.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned fee with known total and agreed schedule. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **installments-R01**: Inspect preview and saved schedule; due dates, paid/due states and sum match the fee net amount.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **installments-M01**: Create/update the schedule through exposed controls; reload and verify no duplicated installment.
- [ ] **installments-M02**: For the configured school calendar, check September-June billing and July 1-14 closeout fixtures; July 15, August and September boundaries need controlled-clock local evidence, never production clock changes.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
