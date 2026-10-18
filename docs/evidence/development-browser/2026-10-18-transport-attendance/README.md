# Transport, vehicles and student attendance — development browser

Executed on 2026-10-18 at **http://127.0.0.1:3102**, selected year **2026-2027**.
The existing local demo database and dev server were used. These are isolated
Chromium sessions, not connected-browser or production acceptance. Fresh admin
sign-in and a disposable, verified parent-role account exercised the actual UI;
internal Najm MCP/REST supported setup, stored-value reads and exact cleanup.

**93 passing assertions** across lifecycle segments and focused retests. Three
explicit before-fix failures were retained, plus an odometer defect observed
during screenshot review. All four application defects were fixed locally and
their affected behavior retested. Assertion totals are not checklist-case totals.
The [source fingerprint](source-fingerprint.json) identifies the final working
tree; the chronological segments below deliberately retain earlier behavior.
No production cases were changed and this batch was not deployed.

| Development coverage | Result | Evidence |
| --- | --- | --- |
| Student transport R01, M01, M02 | PASS | [17 lifecycle assertions and two initial failures](transport-before.json), [23 focused retest assertions](transport-after.json) |
| Student attendance R01, R02, M01, M02 | PASS | [16 assertions](attendance.json) |
| Parent restrictions and owned attendance reads | PASS | [9 assertions](access.json) |
| Vehicle M01 create/edit/validation | PASS | [5 creation assertions](vehicle-crud.json), [5 edit/delete assertions](vehicle-edit-delete.json), [6 odometer assertions](vehicle-mileage.json) |
| Vehicle M02 referenced refusal and owned cleanup | PASS | [Unsafe deletion reproduced](vehicle-delete-before.json), [12 French/Arabic refusal assertions](vehicle-after.json), [cleanup](cleanup.json) |
| Vehicle R01 row/card parity | PASS in follow-up | Initially partial here; mileage column added and desktop/card parity verified in the [71-assertion follow-up](../2026-10-18-vehicle-parity/README.md) |

## Reproductions and fixes

1. Ending or replacing a student route left the student in the vehicle's active
   list. The panel now renders only its active routes, including its empty state.
2. Ending the last active assignment hid the student's completed transport
   history. A shared history component now renders in both active and empty
   states. Retests show both dated historical vehicles after reload, with zero
   active occupancy, on French desktop/phone and Arabic phone.
3. Deleting an assigned vehicle returned 200 and cascaded away the owned active
   route while retaining the student's unpaid transport fee. The reproduction
   also removed that owned vehicle's completed route. Single-vehicle deletion now locks
   the asset in a transaction and refuses references from **any academic year**:
   student routes, driver assignments, bus-assistant assignments, refuels and
   maintenance. French desktop and Arabic phone both receive the translated 409
   for active and historical assignments. Vehicle, routes and fees survive.
4. A vehicle created with initial mileage 12,345 displayed current mileage zero.
   Creation now defaults the current odometer to the initial reading. Explicit
   readings and partial mileage edits are checked against the other saved value
   using numeric comparison. Browser create/reload shows 12,345 km; increasing
   the baseline above that value is refused with translated 400 and no change;
   correcting it to 12,000 retains current mileage 12,345 and traveled distance
   345. Existing inconsistent vehicles were not bulk repaired. Unrelated partial
   API edits remain allowed for legacy records.

Transport saves covered cancel, required validation, pickup default/edit,
capacity-one refusal of another add, assignment/profile parity, reassign,
cancel/end, reload and exact dates. Assignment plus reassignment produced one
unpaid transport fee, without a duplicate active route.

Attendance used two new sections and a **complete controlled roster of two**.
The live roster was checked before Save. A draft was discarded by date switching;
search hid one student while Save still persisted the entire owned roster.
Corrections reused each student/date record ID, and switching sections/dates did
not leak marks. Arabic dark-mode phone cards corrected the same stored records.
The parent could neither read school transport nor assign routes/mark attendance
(403); its permitted attendance page returned only its own empty scope with Save
disabled. Its authenticated session remained valid.

## Diagnostics and harness limits

No JavaScript page errors were recorded. The original transport lifecycle,
transport retest and attendance run recorded no HTTP failures. Refusal tests
intentionally produced four vehicle-delete 409 responses, one duplicate-plate
409, one odometer 400, and the three parent REST denials. Assertions checked
translated response messages and retained records as appropriate.

Early script attempts were corrected for date rules, indexed table row IDs,
permitted parent attendance reads, and decimal input formatting. They are not
reported as product failures or additional passing assertions. The vehicle
creation segment paused after five passing assertions because the script
expected `12345` instead of the valid `12345.00`; editing resumed with that same
saved vehicle. Some tracker paths mask entity names as `:id`; the surrounding
segment and assertion labels identify the operation. Credentials, session data
and raw fixture manifests remain in ignored local files.

Screenshots were visually reviewed: [completed transport history](history-fr-desktop.png),
[Arabic attendance cards](attendance-ar-phone.png),
[Arabic deletion refusal](vehicle-refusal-ar.png),
[original zero odometer](vehicle-crud-fr.png), and
[corrected odometer](vehicle-mileage-fr.png). Arabic refusal screenshots contain
stacked toasts from the two intentional attempts. Phone history was checked by
DOM assertions; its initial-viewport screenshot does not show the history area
and is not offered as visual proof of that content.

## Cleanup and verification

[Supported cleanup](cleanup.json) removed two remaining routes, two attendance
marks, two unpaid fees, two students, two remaining vehicles, two sections and the
temporary parent login. Two other owned vehicles were already absent: one from
the deliberate defect reproduction and one from the successful unused-vehicle
UI deletion. Both students' child collections were checked empty before deletion;
students, vehicles, sections and the login were checked absent. The separate
odometer fixture was also deleted and confirmed 404 in
[its result](vehicle-mileage.json). No payments were made. Standard application
audit/session effects were not erased; this is not a claim of a byte-identical
database snapshot.

Validation commands and final exit statuses are recorded in
[validation.json](validation.json). Seven new PostgreSQL tests run only against
the local marked `school_history_test` database and roll back their fixtures;
they cover all reference kinds, past-year history and unused deletion. Unit
tests cover service delete ordering and odometer boundaries. Browser checks used
the dev server; the production build is a separate gate, not a production
browser retest. Table-view mileage parity was completed in the
[separate follow-up](../2026-10-18-vehicle-parity/README.md). Concurrent update/load testing,
English/Spanish browser runs, cross-year browser selection, administrative bulk
vehicle deletion and production
acceptance remain outside this batch.
