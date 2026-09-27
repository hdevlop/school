# Exams

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/exams`. Original coverage: E05.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned exam with test teacher/subject/sections. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **exams-R01**: Filter/list exams; type, date, status and section labels agree on desktop and phone.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **exams-M01**: Create/edit owned exam timing, scoring and assignments; reload.
- [ ] **exams-M02**: Reject invalid duration/marks/relationships. Delete only the owned exam without live grades.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
