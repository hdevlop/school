# Expenses

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/expenses`. Original coverage: G08.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Explicitly authorized owned expense and controlled accounting scope. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **expenses-R01**: Filter/list expenses; amount, date, category, code and status match in rows/cards.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **expenses-M01**: Create/edit an owned expense; method-specific check/reference fields validate and persist.
- [ ] **expenses-M02**: Cancel deletion then remove only the disposable expense if supported; posted/irreversible records require an agreed reversal or isolated testing.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
