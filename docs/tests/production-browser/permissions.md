# Permissions

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/permissions`. Original coverage: B08.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Admin plus denied role; disposable custom role. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **permissions-R01**: Load/search permission catalog and inspect role assignments.
- [ ] **permissions-R02**: Verify restricted access is refused by protected requests, not merely hidden buttons.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **permissions-M01**: If exposed, change a grant only on the owned custom role; reload and check the owned account's access.
- [ ] **permissions-M02**: Restore or remove the disposable assignment. Catalog creation/deletion must not touch application permissions.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
