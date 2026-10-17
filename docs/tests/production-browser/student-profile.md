# Student profile

Status: **PARTIAL** (1/4 cases complete) on `7657cc0`, 2026-10-16. Evidence: [PB1016](../../evidence/production-browser/2026-10-16-pb1016/README.md). Full profile tabs and linked destinations remain open.

Entry point: `/students/[id]`. Original coverage: D02, D10.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned student with known parents, attendance, fees and transport. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **student-profile-R01**: Open the profile from its row/card and by direct URL; identity/class/status agree.
- [ ] **student-profile-R02**: Inspect every rendered tab, attendance counts, parents, records and avatar.
- [ ] **student-profile-R03**: Follow fees and transport links; they retain the same student identity.
- [x] **student-profile-R04**: Try a forbidden student's URL with a restricted identity; no private profile or internal fields appear. Result: **PASS** — PB1016 teacher/parent ownership checks restrict students and profiles to owned records; the other family receives 404 and not-found feedback.

## Owned-fixture mutations

No mutation is required by this guide. Keep fixture creation and changes in their owning feature guides.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
