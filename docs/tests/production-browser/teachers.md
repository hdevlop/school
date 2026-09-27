# Teachers

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/teachers`. Original coverage: D05.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned teacher/staff chain, test classes and subjects. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **teachers-R01**: Search/filter teachers; subject/class assignments match detail views.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **teachers-M01**: Create/edit one teacher; save/reload and verify linked staff identity.
- [ ] **teachers-M02**: Use assignment controls, including bulk assignment if exposed, on owned classes/subjects; verify each relationship once.
- [ ] **teachers-M03**: Remove owned assignments before deletion; validation and reference conflicts remain actionable.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
