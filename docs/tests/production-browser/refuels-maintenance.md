# Refuels and maintenance

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: Vehicle-related controls if exposed; no standalone route in this checkout. Original coverage: H05, H06.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned vehicle and cost/odometer fixtures. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **refuels-maintenance-R01**: Look for refuel/maintenance controls in the deployed vehicle surface; if absent, mark BLOCKED / API-only, not a browser pass.
- [ ] **refuels-maintenance-R02**: Where exposed, list records and verify vehicle, date, odometer/fuel or cost/status.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **refuels-maintenance-M01**: Create/edit owned refuel and maintenance records only through exposed controls; reject invalid amounts/odometer/date.
- [ ] **refuels-maintenance-M02**: Reload and verify linkage, then remove only owned records. API validation and database reconciliation remain separate.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
