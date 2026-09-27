# Student attendance

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/attendance/students`. Original coverage: E01.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned section roster/date; no real attendance edits. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **student-attendance-R01**: Select section/date; roster and saved marks belong to that selection.
- [ ] **student-attendance-R02**: Change a draft then reset it; saved attendance stays unchanged.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **student-attendance-M01**: Mark owned students, save once and reload; one persisted mark per student/date remains.
- [ ] **student-attendance-M02**: Update the mark and switch sections/dates; drafts and results must not leak. Check phone-card parity and role denial.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
