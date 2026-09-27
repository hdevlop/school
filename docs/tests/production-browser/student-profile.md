# Student profile

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/students/[id]`. Original coverage: D02, D10.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned student with known parents, attendance, fees and transport. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **student-profile-R01**: Open the profile from its row/card and by direct URL; identity/class/status agree.
- [ ] **student-profile-R02**: Inspect every rendered tab, attendance counts, parents, records and avatar.
- [ ] **student-profile-R03**: Follow fees and transport links; they retain the same student identity.
- [ ] **student-profile-R04**: Try a forbidden student's URL with a restricted identity; no private profile or internal fields appear.

## Owned-fixture mutations

No mutation is required by this guide. Keep fixture creation and changes in their owning feature guides.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
