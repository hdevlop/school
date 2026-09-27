# Announcements

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/announcements`. Original coverage: F03.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Draft with test-only audience and controlled recipients. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **announcements-R01**: Read list/details; author, status and audience match; Arabic/LTR status labels translate.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **announcements-M01**: Create/edit an owned draft and reopen it.
- [ ] **announcements-M02**: Publish only to an explicitly controlled audience; allowed recipients see it, others do not. Verify calendar appearance where applicable.
- [ ] **announcements-M03**: Unpublish/delete through supported controls; no broad live announcement may be sent just to test the button.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
