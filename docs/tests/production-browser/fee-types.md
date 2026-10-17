# Fee types

Status: **PARTIAL** (0/3 complete cases). Recorded on `7657cc0`, 2026-10-16, and `440c060`, 2026-10-17. Evidence: [PB1018 translated fee names](../../evidence/production-browser/2026-10-17-pb1018/receipts-fees-results.json) and [PB1016](../../evidence/production-browser/2026-10-16-pb1016/README.md) (price snapshot). Complete filter/recurrence/amount validation and referenced-deletion cases remain open.

Entry point: `/fee-types`. Original coverage: G01.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned fee type and optional owned referencing charge. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **fee-types-R01**: Filter/list fee types; recurrence, category and amount agree.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **fee-types-M01**: Create/edit an owned type; reject invalid recurrence or amount.
- [ ] **fee-types-M02**: Try deleting a type referenced only by an owned charge; safe conflict. Remove owned dependencies before deleting.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
