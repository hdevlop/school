# Drivers

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/drivers`. Original coverage: H02.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned staff/driver with test license details and availability. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **drivers-R01**: List/filter drivers; license, status and vehicle assignment agree.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **drivers-M01**: Create/edit an owned driver; validate required license/assignment fields.
- [ ] **drivers-M02**: Check unavailable driver assignment is refused; remove owned assignments before deletion.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
