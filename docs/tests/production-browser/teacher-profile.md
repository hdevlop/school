# Teacher profile

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/teachers/[id]`. Original coverage: D06, D10.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned teacher with class, subject and routine fixtures. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **teacher-profile-R01**: Inspect identity, academic details, classes, subjects, schedule, payments and documents as exposed.
- [ ] **teacher-profile-R02**: Compare timetable with Class routines; whole lessons and assignments match.
- [ ] **teacher-profile-R03**: Open a forbidden profile in another context; projection excludes unauthorized/private fields.

## Owned-fixture mutations

No mutation is required by this guide. Keep fixture creation and changes in their owning feature guides.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
