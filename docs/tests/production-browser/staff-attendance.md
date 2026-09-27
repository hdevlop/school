# Staff attendance

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/attendance/staff`. Original coverage: E02.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned staff and an agreed attendance date. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **staff-attendance-R01**: Select date/filter; only expected staff and saved states appear.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **staff-attendance-M01**: Save and update owned marks through allowed transitions; reload after each.
- [ ] **staff-attendance-M02**: Invalid transitions or denied identities cannot modify records; clean up only through supported owned-fixture operations.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
