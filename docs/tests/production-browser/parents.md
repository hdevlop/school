# Parents

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/parents`. Original coverage: D03.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned parent with unique CIN/phone/email; optional owned child. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **parents-R01**: Search parents and inspect details; linked-child and no-child states are explicit.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **parents-M01**: Create and edit an owned parent, attach only an owned child and reload.
- [ ] **parents-M02**: Duplicate CIN/phone/email produce safe feedback; nested student creation reuses the intended parent without duplication.
- [ ] **parents-M03**: Cancel deletion, then remove only the owned unlinked parent.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
