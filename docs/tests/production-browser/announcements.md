# Announcements

Status: **PARTIAL** (4/6 PASS; the rest BLOCKED by missing controls or fixtures), last rechecked on `37147d7`, 2026-10-17. Evidence: [PB1019 Communication](../../evidence/production-browser/2026-10-17-pb1019-comm-continuation/README.md).

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

- [x] **announcements-R01**: Read list/details; author, status and audience match; Arabic/LTR status labels translate. Result: **PASS** — Expanded list/detail author, content, draft status, class audience, empty publish date and Arabic phone projection reconcile with supported reads.
- [x] **announcements-R02**: Record which create/edit/delete/publish/unpublish controls are actually exposed for the allowed and denied identities. Missing publishing controls leave their lifecycle cases BLOCKED; the draft publish-date field does not publish an announcement. Result: **PASS** — Admin create/edit/delete and missing publish/unpublish controls observed.

## Owned-fixture mutations

Run only within the recorded production fixture scope; otherwise mark these cases BLOCKED.

- [x] **announcements-M01**: Create/edit an owned draft and reopen it. Result: **PASS** — Browser creates and edits one unpublished class-targeted draft; reload and supported reads confirm persistence.
- [ ] **announcements-M02**: Only if a publish control exists on the serving release, publish to an explicitly controlled audience; allowed recipients see it, others do not. Verify calendar appearance where applicable. Otherwise record BLOCKED and retain separate API proof. Result: **BLOCKED** — Browser confirms no publish control; class audience includes uncontrolled students.
- [ ] **announcements-M03**: Only if an unpublish control exists on the serving release, unpublish the owned announcement and verify recipient/calendar visibility after reload. Otherwise record BLOCKED and retain separate API proof. Never send a broad live announcement to test availability. Result: **BLOCKED** — Browser confirms no unpublish control; no active publication created.
- [x] **announcements-M04**: Cancel deletion, then delete only the owned draft through the exposed row/card control; reload the list and verify it is gone. This does not prove unpublishing. Result: **PASS** — Browser cancellation preserves the draft; confirmation deletes it once; reload and supported read confirm absence.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
