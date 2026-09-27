# Roles

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/roles`. Original coverage: B07.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Disposable custom role and owned account; never a bootstrap role. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **roles-R01**: Read roles and assigned grants; verify denied roles cannot read or change protected grants.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **roles-M01**: Create a custom role, assign an allowed grant, reload and verify access with the owned account.
- [ ] **roles-M02**: Edit and remove only the custom role after removing its owned dependencies. Test protected-role denial in an isolated environment; never change live administrator grants.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
