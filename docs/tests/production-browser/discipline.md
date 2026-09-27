# Discipline

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/discipline`. Original coverage: F01.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Owned student and controlled conduct record. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **discipline-R01**: Filter records; category, severity, student and state are correct; unauthorized roles see no private detail.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **discipline-M01**: Create/edit an owned violation and use its resolution action; reload each transition.
- [ ] **discipline-M02**: Reject incomplete input and remove only the owned record using supported cleanup.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
