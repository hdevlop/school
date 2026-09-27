# Classes

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/classes`. Original coverage: C02.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

An existing cycle and disposable class. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **classes-R01**: Filter/list classes; academic year, level and cycle are correct; mobile cards retain identity.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **classes-M01**: Create a class under the chosen cycle/year, edit it and reload.
- [ ] **classes-M02**: Check required relationships and duplicate feedback; cancel deletion before deleting only the empty owned class.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
