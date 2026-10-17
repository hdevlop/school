# Push notification preferences

Status: **BLOCKED** (0/3 PASS; the rest BLOCKED by missing controls or fixtures), last rechecked on `37147d7`, 2026-10-17. Evidence: [PB1019 Communication](../../evidence/production-browser/2026-10-17-pb1019-comm-continuation/README.md).

Entry point: `/preferences`. Original coverage: Notification extension.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Dedicated account and browser profile with controllable notification permission. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **push-preferences-R01**: Open preferences with permission undecided/denied and in an unsupported browser; feedback is accurate. Result: **BLOCKED** — All four accounts show a disabled switch with accessible unavailability reason; Arabic phone labels pass.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **push-preferences-M01**: Opt in for the test account, grant browser permission, reload and verify subscription state. Result: **BLOCKED** — Server enabled=false/publicKey=null; real opt-in and reload persistence unavailable.
- [ ] **push-preferences-M02**: Opt out and verify it persists; an authorized controlled test notification must not reach an unsubscribed profile. Keep endpoint/subscription secrets out of evidence. Result: **BLOCKED** — No live subscription or delivery; real opt-out persistence and nondelivery unavailable.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
