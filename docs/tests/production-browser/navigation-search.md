# Navigation and global search

Status: **NOT RUN**. Target: `https://myscolai.com`.

Entry point: Dashboard shell and any exposed search control. Original coverage: B02, D09.

[All features](README.md) · [Required preflight](00-preflight.md) · [Evidence ledger](evidence-ledger.md)

## Setup

Allowed and denied identities plus known searchable owned records. Use an identity allowed by the deployed grants and a separate denied identity where access is tested; never infer permission from a role name. Complete the shared preflight and record the exact serving revision.

## Browser checks

- [ ] **navigation-search-R01**: Visit every route in the index from the sidebar and directly; active links, breadcrumbs and back navigation agree.
- [ ] **navigation-search-R02**: Type a forbidden route as a restricted role; backend reads must refuse access, even if navigation is hidden.
- [ ] **navigation-search-R03**: Open any exposed global search; search an owned student/parent/teacher and open the correct result. Forbidden records must not appear.
- [ ] **navigation-search-R04**: If global search is not exposed in this revision, record BLOCKED / no browser surface; retain D09 API coverage.

## Owned-fixture mutations

No mutation is required by this guide. Keep fixture creation and changes in their owning feature guides.

## Finish and evidence

Record each case ID, expected versus observed result, serving SHA, sanitized request status/diagnostic counts and PASS / FAIL / BLOCKED / NOT RUN. Reopen saved records before passing a mutation. Remove only owned fixtures through supported cleanup or record an agreed retention/reversal outcome. Run the relevant [shared viewport, locale and keyboard checks](responsive-accessibility.md).

A read-only pass does not accept skipped mutations, authorization not observed, or database guarantees. Record those separately in the [ledger](evidence-ledger.md).
