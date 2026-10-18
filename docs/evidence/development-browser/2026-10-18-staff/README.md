# Staff: development browser batch

Target: **http://127.0.0.1:3102**, the existing demo and local `school` database.
The selected UI year was **2026-2027**. No deployment was triggered.

Two status display defects were fixed locally. The
[before-fix probe](staff-before.json) found no employment status on cards and
the raw `active` code in the French table. Cards now show the translated
employment status, and the table uses the existing `staff.status.*` catalog.
The accepted run verifies active, inactive and on-leave values after reload,
plus French phone details and an Arabic RTL phone card.

The final unmocked checks have **67 PASS and 1 FAIL**:

| Journey | Assertions | Evidence |
| --- | --- | --- |
| Hourly lifecycle, status changes, table/cards, phone and Arabic | 28 PASS | [Lifecycle](staff-results.json) |
| Teacher account API/browser denial | 15 PASS | [Access](staff-access-results.json) |
| Monthly cleaner, saved zone, ending its reference and UI deletion | 12 PASS | [Assignments](staff-assignment-results.json) |
| Role-dependent assignment controls and driver license validation | 8 PASS | [Role controls](staff-role-controls-results.json) |
| Category/name filtering and clearing the filter | 4 PASS, 1 FAIL | [Filters](staff-filter-results.json) |

The remaining failure is the previously recorded
[shared Najm empty-state defect](../2026-10-18-users/shared-table-empty-state.md):
a no-match filter removes the cards but leaves a blank area instead of showing
School's translated feedback. Clearing the name restores the category results.
The package-fix handoff records the read-only shared-source boundary. This
batch adds no second filter state and changes no Najm package source or pin.

| Development checklist case | Result |
| --- | --- |
| staff-R01 | FAIL: no-match feedback remains broken; exercised positive filters and role/status displays pass |
| staff-R02 | PASS |
| staff-M01 | PASS |
| staff-M02 | PASS |

French required-field and hourly rate/hours validation prevented invalid saves.
Owned hourly name, rate and hours edits were checked after reload through MCP;
status-only edits preserved pay and role. The monthly cleaner's zone persisted
and reopened correctly. Ending its current assignment through supported MCP
preserved the ended history, then the UI deleted that disposable staff record.
Removing its owned zone also succeeded. Employment status and login access are
separate concepts; these staff fixtures supplied no email and created no login.

The denied identity was a separately provisioned account whose actual role was
confirmed as teacher. Staff list/detail/create/edit/delete calls returned 403,
the target remained unchanged, and its browser was redirected away from Staff.
Both authorization fixtures were removed.

The [independent residue scan](staff-residue.json) finds zero owned staff, zones
or users; both final owned staff IDs return 404. Existing people's records were
only read. No invitation, reset or real-delivery acceptance is claimed. Driver
profile mutations, avatar uploads and the full accessibility matrix remain
outside this batch. Accepted browser reports have no unhandled page errors or
HTTP error responses.

[Validation](validation.json) records passing lint, full root type checks,
529 configuration tests, four focused staff schema tests and the production
build in a separate output directory. It includes source fingerprints for the
working tree; this is not an immutable release-candidate gate. Finance work
was preserved, including its independently created commits.

[Earlier attempts](browser-attempts.json) retain selector, numeric-format and
menu-timing failures without counting their assertions as final results.
The [phone probe](staff-phone-probe.json) distinguished an ignored bulk fill
from successful keystrokes. The dev server stopped between attempts; after
confirming port 3102 was unbound, the normal `bun run dev` server was restarted.
Each failed mutation attempt removed its own fixture. Browser contexts closed.

Production checkboxes remain unchanged. Release and live retesting are pending
under the [development workflow](../../../tests/development-browser.md).
