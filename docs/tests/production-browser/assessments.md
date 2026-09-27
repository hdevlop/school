# Assessments

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/assessments`. Original coverage: E04.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned subject/teacher/class/section and assessment. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **assessments-R01**: Filter assessments; linked subject, teacher and class/section are correct.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **assessments-M01**: Create/edit an assessment with its score limits; reopen after save.
- [ ] **assessments-M02**: Reject incompatible relationships and invalid scoring. Remove only the owned ungraded assessment or expect a reference conflict.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
