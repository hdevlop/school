# Reports

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/reports`. Original coverage: G16.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Known financial period and role-scoped fixture totals. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **reports-R01**: Check academic-year heading and income/expense trend, expense breakdown and collection-by-class charts.
- [ ] **reports-R02**: Compare totals with supported reads for the same period; distinguish empty results from failed queries.
- [ ] **reports-R03**: Use filters/export only if exposed; a download must contain the selected scope and authorized fields. Record absent export as not exposed, not passed.

## Owned-fixture mutations

No mutation is required by this guide. Keep fixture creation and changes in their owning feature guides.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
