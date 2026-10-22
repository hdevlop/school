# Parent contact requirements and student file imports

Manual parent creation requires a valid phone and CIN, including parents entered
in the student enrollment wizard and manual parent bulk entry. A student's own
phone remains optional. Creating a student without a parent remains supported.

Student XLSX/CSV import uses `POST /api/students/import`, one request per row.
Only this route permits incomplete parent contacts. It uses the same create
permission, academic-year boundary, transaction, duplicate checks and nested
financial/transport permissions as normal student creation. Missing guardian
information creates no placeholder parent. A named guardian can be imported
without phone or CIN; supplied values must still pass validation. Stable CIN,
phone or email may reuse an existing parent; names alone never merge parents.

Normal REST/MCP student creation and the manual parent routes remain strict.
Partial profile updates may omit unknown contact fields, but may not clear
phone or CIN to blank/null. The full parent edit form requires both values.
Database columns remain nullable so existing/imported records are retained;
this change needs no database migration or data repair.

Students and Parents offer a **Missing parent details** choice in the table's
Filters dropdown. Students match when no parent is linked or any linked parent is
missing phone or CIN. Parents match when either field is missing. Filtering
updates the table rows and displayed totals. Completeness reflects the parent's
current identity details, including when viewing a historical enrollment.

## Verification

Run frontend/configuration tests with `bun run test:config`. Run backend
regressions from `packages/server` with:

```powershell
bun test ./tests/security/FamilyRecords.test.ts ./tests/security/StudentNestedWrites.test.ts
```

The PostgreSQL regression below requires the existing marked local
`school_history_test` fixture. It rejects other database targets, rolls its
writes back and checks that student/parent/user counts return to their initial
values. It exercises incomplete imports, shared guardians, ownership and
completeness changing after contacts are filled in:

```powershell
bun --env-file=apps/dashboard/.env.local test ./packages/server/tests/acceptance/FamilyRecordsDatabase.test.ts
```

Browser verification remains separate: check required indicators in manual
forms, import a representative customer workbook on an authorized test
environment, and verify both Filters dropdowns and their totals.

## Family links and list layout follow-up (2026-10-21)

User-reported browser results supersede the earlier missing-bulk-delete finding:
Students bulk delete passed for 3 students in Table view and 2 in Cards view;
Parents bulk delete passed for 2 parents in Cards view and 1 in Table view.
Parent view/edit from Table view and Father selecting Male in the student
wizard also passed. These reports do not identify a serving revision.

Local follow-up adds a Parents section to student edit with existing-parent
linking and confirmed unlinking, plus a Link student action on the parent page.
These use the existing REST routes and their create/delete parent permissions;
the picker also requires read permission for the selected entity. Family links
save immediately and independently from profile changes. A parent may be
created through Parents and linked afterward. Both lists retain their layout
per account in the browser tab, including after creation and return navigation.

Parents with no remaining children are intentionally retained for reuse, per
the user's decision. They may be deleted explicitly; a parent still linked to
any child cannot be deleted. Student deletion does not cascade to parent records.
Use **Parents → Filters → Without students** to find these retained records,
then link them to another student or select them for explicit bulk deletion.
The filtered count changes with the rows. Clear class/section filters when
looking for parents with no linked students, since they have no child placement.

Manual retest remains pending for the new link/unlink controls and Table/Cards
retention. Single delete from a Parents card and parent creation from Table
view remain NOT RUN. The once-reported wizard reset is unconfirmed and was
not reproducible; no fix is claimed for it.

## Teacher bulk-delete selection follow-up (2026-10-21)

Teachers now uses record IDs and controlled row selection in Table and Cards
views. Bulk deletion uses the normal guarded single-record route for each
selected teacher and reports success/failure counts. Deleted IDs are removed
from selection before the list is refreshed; only failed IDs remain selected.
A neighboring teacher cannot inherit a deleted teacher's checkbox by taking
its old row position. Browser retest of this correction remains pending.
