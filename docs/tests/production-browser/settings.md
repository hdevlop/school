# School settings

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/settings`. Original coverage: B05.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Administrator and denied role; recorded original settings. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **settings-R01**: Read school identity, currency, time zone and academic-year settings; selectors use the shared choices.
- [ ] **settings-R02**: As a denied role, open the route; read/write refusal must leave the role signed in.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **settings-M01**: Only during an explicitly scoped settings run, save an agreed reversible setting, reload and restore it.
- [ ] **settings-M02**: Changing active academic year must not silently create fees or rewrite historical fee selection. Global year/currency changes need an isolated environment unless a production maintenance action is already authorized.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
