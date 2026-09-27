# Academic-year rollover

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/financial-operations` rollover panel. Original coverage: G10.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Known source/target years and an isolated data set. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **rollover-R01**: Inspect source/target year, discount and one-time-fee controls; choose preview only when its deployed endpoint is confirmed read-only.
- [ ] **rollover-R02**: Preview must identify the intended period/records and must not change active settings or create charges.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **rollover-M01**: Commit/idempotency testing belongs in a disposable environment unless the exact production-wide rollover is explicitly authorized; this operation can affect all students.
- [ ] **rollover-M02**: Verify one committed run creates the intended fees once, optional discounts/one-time charges obey selection, and setting updates require the explicit confirmation.
- [ ] **rollover-M03**: Retain July 14/15, August and September 1 boundary cases locally; settings changes alone must not regenerate existing fees.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
