# Notifications and delivery

Status: **BLOCKED** (0/5 PASS; the rest BLOCKED by missing controls or fixtures), last rechecked on `37147d7`, 2026-10-17. Evidence: [PB1019 Communication](../../evidence/production-browser/2026-10-17-pb1019-comm-continuation/README.md).

Entry point: `/notifications` and notification bell. Original coverage: G12; notification inbox extension. Alert status and deletion coverage F04 lives in [Alerts](alerts.md).

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Dedicated recipient with owned unread/read notifications. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **notifications-R01**: Open bell and inbox; ordering, unread counts and destinations agree. Result: **BLOCKED** — Four controlled accounts show empty inbox, zero API count and bell footer; Arabic phone labels pass.
- [ ] **notifications-R02**: Follow a notification link; it cannot expose a forbidden entity. Result: **BLOCKED** — No owned deployed notification destination to follow; no broad trigger invoked.
- [ ] **notifications-R03**: Keep notification inbox/bell read state distinct from `/alerts` status. Follow the separate [Alerts checklist](alerts.md) for acknowledge/resolve/dismiss/delete; a notification read does not pass an alert transition. Backend-only alert creation or health-alert generation remains separate API evidence. Result: **BLOCKED** — Alert status transitions passed separately and inboxes remain empty; positive independent bell/read state requires a real owned message.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **notifications-M01**: Mark one owned notification read, reload, then mark all for the test account; counts reconcile. Result: **BLOCKED** — Parent empty mark-all returns zero and reload stays zero.
- [ ] **notifications-M02**: Use only an authorized test-recipient trigger for delivery; verify no duplicate notification and denied audience cannot read it. Never dispatch to live families. Result: **BLOCKED** — No controlled nonfinancial recipient-only live trigger; no real delivery, duplicate or cross-recipient browser acceptance.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
