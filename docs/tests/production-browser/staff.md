# Staff

Status: **PASS** (4/4) on `7022277`, 2026-10-18. Evidence: [PB1023-PEOPLE](../../evidence/production-browser/2026-10-18-pb1023-people/README.md).

Entry point: `/staff`. Original coverage: D07.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned staff profile and known role/zone choices. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [x] **staff-R01**: Search/filter staff; status and assigned role are correct. Result: **PASS** — category and name filters, the no-match state and clearing it (najm-kit 3.6.3); status and role on cards and table.
- [x] **staff-R02**: Open role-dependent fields; hourly, driver and assignment controls match the selected role. Result: **PASS** — hourly, driver licence and assignment controls follow the selected role.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [x] **staff-M01**: Create/edit owned staff; check required role-dependent fields, hours/rates and reload. Result: **PASS** — hourly staff created, edited and reloaded with its rate and hours; French and Arabic phone views.
- [x] **staff-M02**: Change only owned employment status; remove owned references before safe deletion. Result: **PASS** — status changes; a monthly cleaner's zone assignment is ended before deletion; a teacher account is refused every staff route.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
