# Student transport routes

Status: **PARTIAL** (2/3 PASS) on `65b15ec`, 2026-10-17. Evidence: [PB1017](../../evidence/production-browser/2026-10-16-pb1017/README.md).

Entry point: `/transport` and student transport controls. Original coverage: H04.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned student, vehicle and route/pickup details. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **student-routes-R01**: Inspect route/vehicle list and assigned students; pickup details and capacity information agree. Result: **NOT RUN** — not covered by case ID in PB1017.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [x] **student-routes-M01**: Assign only the owned student, reload transport and student profile; both show the same active route. Result: **PASS** — assign/unassign the owned student-A.
- [x] **student-routes-M02**: Change/end the assignment using supported controls; exact history and active state agree, with no duplicate active assignment. Result: **PASS**.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
