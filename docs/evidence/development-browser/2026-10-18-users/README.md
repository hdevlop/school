# Users: development browser batch

Target: **http://127.0.0.1:3102**, the existing demo and local `school` database,
selected school year **2026-2027**. No production release was triggered.

This batch fixed four application defects locally:

- **Details opened an editable form with no status.** The
  [before-fix probe](users-before.json) records two enabled identity inputs.
  The View action now opens a read-only, translated account view with role and
  status.
- **Account status could not be edited.** Edit now offers the admin API's
  active/inactive/pending values, using Najm's translated status labels. The
  form continues to exclude credentials and verification changes.
- **Duplicate email displayed a translation key.** The
  [before-fix refusal](users-duplicate-before.json) showed
  `users.errors.emailExists` in both the 409 response and toast. All four
  catalogs now contain the message expected by the shared user validator.
- **The Users list stopped at 50 accounts.** The [API contract](users-pagination-contract.json) defaults to 50, while
  the table filters and paginates locally. The loader now reads the bounded
  API pages and preserves the CRUD response envelope. The
  [browser check](users-filter-results.json) observes pages of **100, 100, 43**,
  the correct **243** total, and a searchable account beyond the first 100.
  A failed later page rejects the load rather than returning partial data.

The final unmocked checks have **53 PASS and 1 FAIL**:

| Journey | Assertions | Evidence |
| --- | --- | --- |
| User lifecycle, French desktop/phone and Arabic RTL | 27 PASS, 1 FAIL | [Lifecycle](users-results.json) |
| Actual teacher-role API/browser denial and deactivation/reactivation | 18 PASS | [Access](users-access-results.json) |
| Complete list, name/email/role filtering and table/card details | 8 PASS | [Filters](users-filter-results.json) |

The remaining [shared table defect](shared-table-empty-state.md) is a real
failure: a no-match card filter leaves a blank area. School's translated
filtered-empty renderer is not called. The read-only Najm source boundary and
the required package fix are documented there; this batch changes no shared
package source or pin.

| Development checklist case | Result |
| --- | --- |
| users-R01 | FAIL: no-match empty-state feedback remains broken; other exercised list/detail checks pass |
| users-R02 | PASS |
| users-M01 | PASS |
| users-M02 | PASS |

Creation, name editing and all three statuses were checked after reload and
through supported REST reads. The duplicate email is refused with 409, a clear
French message and an open form. Cancel-delete sends no write. Confirmed
deletion removes the owned account. The
[independent residue scan](users-residue.json) reads every API page, finds no
run-owned account, and gets 404 for the last owned ID. Existing people's records
were only read. Invitations used the console provider; no real email-delivery
acceptance is claimed, and access-reset was not exercised in this batch.

There were no unhandled page errors. The lifecycle's HTTP error is the expected
duplicate-email 409. The access run separately verifies 403 refusals, token
rejection and blocked login after deactivation. Full console/CSP, accessibility,
avatar upload and real delivery matrices are outside this batch.

[Validation](validation.json) records passing lint, full root type checks,
translation scan, 528 configuration tests, nine focused regression tests and
the production build in a separate output directory. These checks apply to
the working tree, which also contains concurrent Finance edits; they are not
an immutable release-candidate gate. [Earlier attempts](browser-attempts.json) retain harness failures,
the corrected response-envelope regression and intermediate product failures;
their assertions are excluded from the final counts. Browser contexts closed,
and failed mutation attempts cleaned up their own fixtures.

Finance edits were preserved. These are dev results: production checkboxes
remain unchanged, with release and live retesting still pending under the
[development workflow](../../../tests/development-browser.md).
