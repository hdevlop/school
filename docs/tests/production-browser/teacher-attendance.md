# Teacher attendance

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/attendance/teachers`. Original coverage: E03.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned teacher linked to a staff profile, a distinct owned non-teacher staff fixture and an agreed date. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

The current `/attendance/teachers` page renders the same staff register as
`/attendance/staff`; it has no separate teacher-only roster or attendance store.
Apply the [full-roster attendance rule](00-preflight.md#attendance-saves-require-a-controlled-full-roster).
Browser saves are BLOCKED on a mixed or unverified roster, even when filters show
only the owned teacher. Use isolation for mutation coverage if the full roster
cannot be made entirely run-owned.

## Browser checks

- [ ] **teacher-attendance-R01**: Open both attendance routes for the same date and role; they expose the same staff register, including the eligible teacher's linked staff identity and saved mark. A teacher-only filter is a display filter, not a separate write scope.

## Owned-fixture mutations

Run only within the recorded production fixture scope after the full-roster prerequisite passes; otherwise mark these cases BLOCKED.

- [ ] **teacher-attendance-M01**: On the entirely owned roster, save/update the teacher's staff attendance and reload both routes; both show the same saved mark. Reconcile all submitted staff marks, including default present rows; student attendance remains unchanged.
- [ ] **teacher-attendance-M02**: Switch dates and roles; saved results and denials are correct.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
