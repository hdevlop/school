# Calendar

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/calendar`. Original coverage: C06.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Known owned event/announcement and identities with different audiences. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **calendar-R01**: Navigate months/today and any exposed views; dates and time-zone boundaries are correct.
- [ ] **calendar-R02**: Open known events and announcements; details agree with their originating feature.
- [ ] **calendar-R03**: Switch locale/role; RTL and audience visibility remain correct, including an empty month.

## Owned-fixture mutations

No mutation is required by this guide. Keep fixture creation and changes in their owning feature guides.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
