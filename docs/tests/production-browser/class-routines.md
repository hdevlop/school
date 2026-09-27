# Class routines and timetable

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/class-routines`. Original coverage: C05.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned schedule/section, teacher assignments, periods and duty staff. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **class-routines-R01**: Switch class and teacher views; days are rows, outer periods are columns, lesson counts agree.
- [ ] **class-routines-R02**: Inspect long labels, Arabic/French, both themes, touch, keyboard and 200% zoom; break duties remain usable.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **class-routines-M01**: Save/reopen plain, three-label, alternative-only and mixed cells; labels and OR pairs preserve ordering.
- [ ] **class-routines-M02**: Exercise zero to six content groups, convert/reorder/remove groups and preview; no nested timing or rotation-calendar controls appear.
- [ ] **class-routines-M03**: Reject end-before-start and whole-period teacher overlaps. Edit a parent field without replacing content; groups remain.
- [ ] **class-routines-M04**: Use two editors on the same owned lesson; stale content replacement/deletion refuses the old version. Check layout remapping and break-duty editing without losing entries.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).

See [existing timetable evidence and remaining checks](../routine-timetable.md). Migration preservation/concurrency are separate database obligations; a healthy endpoint does not prove them.
