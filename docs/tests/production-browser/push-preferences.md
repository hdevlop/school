# Push notification preferences

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/preferences`. Original coverage: Notification extension.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Dedicated account and browser profile with controllable notification permission. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **push-preferences-R01**: Open preferences with permission undecided/denied and in an unsupported browser; feedback is accurate.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **push-preferences-M01**: Opt in for the test account, grant browser permission, reload and verify subscription state.
- [ ] **push-preferences-M02**: Opt out and verify it persists; an authorized controlled test notification must not reach an unsubscribed profile. Keep endpoint/subscription secrets out of evidence.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
