# Subjects

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/subjects`. Original coverage: C04.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned subject and test teacher/class relationships. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **subjects-R01**: Load/filter subjects; code and linked class/teacher information match supported reads.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **subjects-M01**: Create and edit the owned subject; verify persistence and unique-code rejection.
- [ ] **subjects-M02**: Assign only owned relationships through supported controls; remove those links before deleting the subject.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
