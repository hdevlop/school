# Cycles

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/cycles`. Original coverage: C01.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned cycle and optional owned dependent class. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **cycles-R01**: Load/search cycles; details and mobile cards identify the same cycle.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **cycles-M01**: Create and rename an owned cycle; reload each time. Try a duplicate; expect validation/conflict.
- [ ] **cycles-M02**: With an owned class referencing it, deletion must be refused; remove owned dependents before deleting the cycle.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
