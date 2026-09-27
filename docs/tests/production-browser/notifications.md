# Notifications and alerts

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/notifications` and notification bell; legacy alert controls only if exposed. Original coverage: F04, G12.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Dedicated recipient with owned unread/read notifications. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **notifications-R01**: Open bell and inbox; ordering, unread counts and destinations agree.
- [ ] **notifications-R02**: Follow a notification link; it cannot expose a forbidden entity.
- [ ] **notifications-R03**: If legacy alert/health-alert controls are absent, retain their API checks as unverified.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **notifications-M01**: Mark one owned notification read, reload, then mark all for the test account; counts reconcile.
- [ ] **notifications-M02**: Use only an authorized test-recipient trigger for delivery; verify no duplicate notification and denied audience cannot read it. Never dispatch to live families.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
