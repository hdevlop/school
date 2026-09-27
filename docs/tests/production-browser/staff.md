# Staff

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/staff`. Original coverage: D07.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned staff profile and known role/zone choices. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **staff-R01**: Search/filter staff; status and assigned role are correct.
- [ ] **staff-R02**: Open role-dependent fields; hourly, driver and assignment controls match the selected role.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **staff-M01**: Create/edit owned staff; check required role-dependent fields, hours/rates and reload.
- [ ] **staff-M02**: Change only owned employment status; remove owned references before safe deletion.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
