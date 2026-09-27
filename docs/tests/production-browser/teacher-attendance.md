# Teacher attendance

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/attendance/teachers`. Original coverage: E03.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned teacher and date, distinct staff fixture. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **teacher-attendance-R01**: Load teacher register; roster is scoped correctly and distinct from general staff attendance.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **teacher-attendance-M01**: Save/update the owned teacher's mark and reload; staff/student records stay unchanged.
- [ ] **teacher-attendance-M02**: Switch dates and roles; saved results and denials are correct.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
