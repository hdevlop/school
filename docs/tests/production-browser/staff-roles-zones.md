# Staff roles and zones

Status: **PASS** (4/4 PASS) on `65b15ec`, 2026-10-17. Evidence: [PB1017](../../evidence/production-browser/2026-10-16-pb1017/README.md).

Entry point: Selectors in `/staff` forms; management controls only if exposed. Original coverage: D08.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned custom staff role/zone with a known dependent fixture. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [x] **staff-roles-zones-R01**: Verify role/zone selectors load and saved selections reopen correctly. Result: **PASS**.
- [x] **staff-roles-zones-R02**: If management has no browser surface, record its lifecycle as API-only; do not invent a route. Result: **PASS**.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [x] **staff-roles-zones-M01**: If management controls exist, create/edit an owned role/zone; duplicate names fail and referenced deletion is refused. Result: **PASS** — zones, job titles, cleaner/security creation.
- [x] **staff-roles-zones-M02**: Remove owned references and delete the disposable role/zone. Result: **PASS**.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
