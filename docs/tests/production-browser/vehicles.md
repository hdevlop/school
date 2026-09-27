# Vehicles

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/vehicles`. Original coverage: H01.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned vehicle with unique test plate. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **vehicles-R01**: Search/list fleet; plate, mileage and state agree in row/card views.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **vehicles-M01**: Create/edit an owned vehicle; duplicate plate and invalid mileage fail.
- [ ] **vehicles-M02**: Remove only owned assignments before deleting the vehicle; referenced deletion must not damage live routes.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
