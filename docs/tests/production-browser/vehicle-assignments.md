# Vehicle assignments

Status: **PASS** (3/3 PASS) on `65b15ec`, 2026-10-17. Evidence: [PB1017](../../evidence/production-browser/2026-10-16-pb1017/README.md).

Entry point: Driver assignment controls in `/drivers` and transport surfaces. Original coverage: H03.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned driver and two owned vehicles with agreed periods. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [x] **vehicle-assignments-R01**: Inspect current assignment and availability; driver/vehicle identity agrees across views. Result: **PASS**.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [x] **vehicle-assignments-M01**: Assign the owned driver to a vehicle, reload, then try a conflicting active assignment; reject overlap. Result: **PASS**.
- [x] **vehicle-assignments-M02**: End/unassign the owned assignment; vehicle and driver views refresh and history remains consistent. Result: **PASS** — ending an assignment is API-only.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
