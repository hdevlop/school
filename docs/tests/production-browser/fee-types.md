# Fee types

Status: **PASS** (3/3) on `bfaa158` and `4daea77`, 2026-10-18. Evidence: [PB1022-FIN](../../evidence/production-browser/2026-10-18-pb1022-fin/README.md). Earlier partial evidence: [PB1018](../../evidence/production-browser/2026-10-17-pb1018/receipts-fees-results.json), [PB1016](../../evidence/production-browser/2026-10-16-pb1016/README.md).

Entry point: `/fee-types`. Original coverage: G01.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned fee type and optional owned referencing charge. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [x] **fee-types-R01**: Filter/list fee types; recurrence, category and amount agree. Result: **PASS** — cards and table agree with the read (9 types); name search and category filter narrow the list; categories are not truncated at 390 px.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [x] **fee-types-M01**: Create/edit an owned type; reject invalid recurrence or amount. Result: **PASS** — create and edit reload exactly; the form refuses empty, short, zero, negative and too-large values in French with no request. The API refused an invalid payment type with the English "Invalid input" on `bfaa158`; fixed in `4daea77` and rerun: refused in French, Arabic and Spanish, record unchanged.
- [x] **fee-types-M02**: Try deleting a type referenced only by an owned charge; safe conflict. Remove owned dependencies before deleting. Result: **PASS** — translated 409 ("Des frais d'élèves utilisent ce type de frais…"), type and charge remain; after the charge is removed the type deletes. A teacher gets 403 on list, create and delete and stays signed in.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
