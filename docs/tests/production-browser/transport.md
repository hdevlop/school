# Transport workspace

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/transport`. Original coverage: H07.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned vehicle, driver, route and assigned students. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **transport-R01**: Open the routes workspace; vehicle panels and assigned student counts reconcile with Students/Vehicles/Drivers.
- [ ] **transport-R02**: Check unassigned/empty vehicles, search where exposed, and phone layouts.
- [ ] **transport-R03**: Follow available detail links and verify role denial for forbidden records.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **transport-M01**: Run vehicle assignment and student route checklists, then reload the workspace; all aggregate panels reflect those changes.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
