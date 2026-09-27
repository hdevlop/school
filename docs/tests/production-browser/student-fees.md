# Student fee detail

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/students/[id]/fees`. Original coverage: G03.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned student with charge, installment, payment and discount history. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **student-fees-R01**: Open from student profile and Fees; header and all tabs retain the same student.
- [ ] **student-fees-R02**: Inspect overview, payment history, installments, discounts and documents; totals reconcile.
- [ ] **student-fees-R03**: Switch historical academic year; cards/tables and totals agree while active settings stay unchanged.
- [ ] **student-fees-R04**: Try another student's URL as a restricted role; no cross-student financial data is exposed.

## Owned-fixture mutations

No mutation is required by this guide. Keep fixture creation and changes in their owning feature guides.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
