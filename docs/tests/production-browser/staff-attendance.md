# Staff attendance

Status: **PARTIAL** (1/3 PASS; the rest NOT RUN) on `440c060`, 2026-10-17. Evidence: [PB1018](../../evidence/production-browser/2026-10-17-pb1018/README.md).

Entry point: `/attendance/staff`. Original coverage: E02.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned staff and an agreed attendance date. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

Apply the [full-roster attendance rule](00-preflight.md#attendance-saves-require-a-controlled-full-roster).
The register includes teachers and other staff. Save processes the full loaded
roster and can create present marks for unrecorded people, including rows hidden
by filters. On shared production, browser saves are BLOCKED unless every roster
member is an authorized owned fixture. Selecting or filtering one person does
not satisfy this prerequisite.

## Browser checks

- [ ] **staff-attendance-R01**: Select date/filter; the visible register and saved states match supported roster reads, including eligible teachers. Inspecting filters must not submit marks.

## Owned-fixture mutations

Run only within the recorded production fixture scope after the full-roster prerequisite passes; otherwise mark these cases BLOCKED.

- [x] **staff-attendance-M01**: On the entirely owned roster, save and update marks through allowed transitions; reload after each. Reconcile every submitted person, including unchanged-looking rows that had no saved mark. Result: **PASS** — owned 30 June roster saved, corrected and reloaded; 18 marks removed.
- [ ] **staff-attendance-M02**: Invalid transitions or denied identities cannot modify records; clean up only through supported owned-fixture operations.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
