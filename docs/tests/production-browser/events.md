# Events

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/calendar` event controls; no standalone `/events` page. Original coverage: C07.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned event with audience limited to test identities. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **events-R01**: Open the event form from Calendar; date defaults and validation are visible.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **events-M01**: Create an owned event, reopen it from Calendar, edit date/details and reload.
- [ ] **events-M02**: Check allowed versus denied audience visibility, then delete only the owned event; the calendar updates.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
