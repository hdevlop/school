# Announcements

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: `/announcements`. Original coverage: F03.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Draft with test-only audience and controlled recipients. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

### Browser availability

The 2026-10-15 source wires create, view, edit and delete in the announcement UI.
Publish/unpublish exist in the API and hook but have no browser control. For a
serving release with that UI, record announcements-M02 and announcements-M03 as
BLOCKED / no browser control. API publication is separate evidence and cannot
pass either browser case. Recheck against the serving revision before execution;
no runtime outcome is established here. Use an entirely owned class audience for
drafts; do not leave the form's default all-school audience selected for a
fixture that could later be published.

## Browser checks

- [ ] **announcements-R01**: Read list/details; author, status and audience match; Arabic/LTR status labels translate.
- [ ] **announcements-R02**: Record which create/edit/delete/publish/unpublish controls are actually exposed for the allowed and denied identities. Missing publishing controls leave their lifecycle cases BLOCKED; the draft publish-date field does not publish an announcement.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [ ] **announcements-M01**: Create/edit an owned draft and reopen it.
- [ ] **announcements-M02**: Only if a publish control exists on the serving release, publish to an explicitly controlled audience; allowed recipients see it, others do not. Verify calendar appearance where applicable. Otherwise record BLOCKED and retain separate API proof.
- [ ] **announcements-M03**: Only if an unpublish control exists on the serving release, unpublish the owned announcement and verify recipient/calendar visibility after reload. Otherwise record BLOCKED and retain separate API proof. Never send a broad live announcement to test availability.
- [ ] **announcements-M04**: Cancel deletion, then delete only the owned draft through the exposed row/card control; reload the list and verify it is gone. This does not prove unpublishing.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
