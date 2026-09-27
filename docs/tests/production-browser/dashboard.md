# Dashboard

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/`. Original coverage: B01, I02.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

A role-specific account and known fixture aggregates. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **dashboard-R01**: Load dashboard, reload and compare visible academic/financial/operations totals with supported reads for the same period.
- [ ] **dashboard-R02**: Switch roles in isolated contexts; only permitted panels and records appear.
- [ ] **dashboard-R03**: Inspect charts, empty states and failed reads; a failed aggregate must not appear as a valid zero.

## Owned-fixture mutations

No mutation is required by this guide. Keep fixture creation and changes in their owning feature guides.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
