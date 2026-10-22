# Academic CRUD integrity

Local verification: 2026-10-21, `http://localhost:3102`, selected year `2026-2027`.

## Behavior

- Classes, Sections, Cycles and Subjects offer selected deletion in table and card views, including the phone card list. Confirmation warns that deletion is permanent. Cancel makes no delete request.
- Each selected record uses its ordinary guarded delete endpoint. A protected record stays selected; successful deletions are removed from selection. Refusals are reported, and the confirmation closes after the operation. The year captured when confirmation opens is retained throughout deletion.
- Subject codes are trimmed and uppercased. Case variants conflict on create and update, including concurrent writes. Search matches subject names and codes.
- Section capacity applies to student creation/import, annual enrollment, transfer, correction and year-transition placement. Admission takes a section lock before creating a student. Occupancy uses the peak number of overlapping dated enrollment/placement intervals; end dates are exclusive. Reducing capacity below existing occupancy is refused.
- Classes linked to staff report the staff names. Sections linked to teachers or assistant staff report their names and cannot be deleted or moved until reassigned. Teacher assignment foreign keys also restrict deletion.
- A new class can select only active cycles. Editing a class retains an existing inactive cycle on unrelated edits; assigning a different inactive cycle is refused by the API.
- Class cards/details show the cycle and full description. Standard levels use the same translated labels as cycles. Classes and Sections sort Level alphabetically by the displayed label in the current language, including custom levels, through ascending, descending and default. Cycle cards display Active or Inactive.
- Academic view preferences survive navigation, separately per feature and account. Table pagination leaves space for the floating assistant button.
- Required Section class and Cycle name errors use translated product messages. Staff class assignments are optional, including assistants; clearing an assistant's assignments sends an empty list when editing.
- Admin single and selected teacher deletion automatically removes teaching assignments in every school year, the linked staff record and login in one transaction. Recorded academic, attendance, timetable and payroll dependencies remain protected with an explanation. Other roles retain the assignment guard.

## Migration

`0072_academic_integrity.sql` adds the normalized subject-code unique index and restrictive teacher-section foreign key, normalizes existing subject codes, and supplies missing standard cycles and labels. It links standard classes only where `cycle_id` was empty. Existing class links, inactive cycles and saved labels remain intact.

The migration refuses existing case/space duplicate codes before making changes; it never merges or deletes subjects. It was applied to local `school` after a duplicate preflight, and to the marked `school_history_test` fixture. Cycles increased from 3 to 4 because Maternelle was missing. Classes, Sections and Subjects remain 16, 48 and 10; Students, Teachers and Staff remain 0.

The fixture had the exact `settings.receipt_language` definition from migration 0070 without its journal entry. That definition was verified and its matching migration hash recorded before applying pending migrations. No application-data reset was performed.

## Verification

- Playwright: all eight desktop selected-delete paths pass (four pages, two views), using 16 temporary records. Cancel preserved records before each successful deletion. All four view preferences survive sidebar navigation.
- Playwright: all four phone selection/confirmation/Cancel paths pass at 390 px. Arabic confirmation fits in RTL; French standard class levels and cycle labels agree.
- Playwright: subject code search, friendly validation, full class description, cycle details, inactive-cycle exclusion, protected-delete refusal/closed confirmation, stage ordering and pagination/chat separation pass.
- PostgreSQL/API: `AcademicIntegrityTransport.test.ts` has seven passing cases covering case variants and races, named assignment protections, inactive cycles, assistant creation without classes, last-seat competition/rollback, transfer/correction/capacity refusal, and exclusive end dates. Test records are removed by exact IDs/codes.
- Academic tests: 393 pass, 0 fail. Shared academic-stage tests and focused Staff/layout/deletion tests pass.
- Lint passes with one existing Parents hook warning; the added files have no lint warnings. Root typecheck, the isolated production build, translation-key checks and `db:check` pass.
- The full root test command reaches an existing ownership SQL baseline failure: 39 Students query cases include the pre-existing `missingParentDetails` projection absent from the committed snapshot. That unrelated projection and the ownership snapshot were preserved. Security, Chat, workspace boundaries, Landing and Visit Requests were run separately and pass.

Commands:

```powershell
bun test packages/server/tests/academicYears
bun --env-file=apps/dashboard/.env.local test packages/server/tests/acceptance/AcademicIntegrityTransport.test.ts
bun test packages/contracts/tests/academicStructure.test.ts
bun run lint
bun run typecheck
bun run i18n:check
bun run db:check
$env:NAJM_NEXT_DIST_DIR = '.next-academic-check'
bun run build
```

The transport suite requires the marked local `school_history_test` fixture and its history admin credentials. It refuses another database target.

Detailed browser artifacts are in `%TEMP%/school-academic-fixes-2026-10-21-final/`: `results.json`, `mobile-followup.json`, `language-inactive-followup.json` and screenshots. The initial mobile harness incorrectly waited for the desktop-only settings button; the successful phone follow-up waits for card checkboxes. Earlier runs also encountered independent API-token expiry; final cleanup was verified. These harness failures remain in the artifacts.

No commit, push or deployment is claimed. Production migration and production browser acceptance remain separate release steps.

## Follow-up: Level, Staff and Teacher dialogs

The alphabetical Level behavior above supersedes the earlier school-stage ordering. Standard Level labels remain translated to agree with Cycle; stored levels and custom names are preserved.

- Classes starts at 10 rows per page. Selecting another size keeps it through search, card/table changes and viewport resizing. A fresh visit starts at 10. It uses Najm's existing page-size state and selector; automatic layout sizing no longer changes this page's size.
- Staff cards and details use the same current-assignment formatter as the table, including class/section, cycle, zone and vehicle targets. Staff remembers its view with the existing account-specific, tab-local preference hook.
- A refused single teacher deletion displays the mutation's existing error toast and closes the confirmation. The original guard against assignment history was verified here; the admin behavior below supersedes it.
- Librarian intentionally has two wizard steps; Assistant has a third, optional Assignments step. Only roles with a supported assignment target receive that step. Invitation warnings remain separate from successful record creation; this follow-up did not test external email delivery.

Playwright against the running dev server passed nine checks: three-click Level sorting on Classes and Sections, stable Classes page size, Staff assignment parity, Staff view restoration after navigation/reload, blocked teacher deletion with retained assignment, role-specific wizard steps, phone Staff cards at 390 px without horizontal overflow, and diagnostics captured from before login. There were no uncaught page errors, AuthError messages or HTTP 401 responses. The only failed browser request was the expected HTTP 409 from the protected teacher delete.

The run created two classes, one assistant and one teacher through internal REST. The teacher used explicit temporary credentials, avoiding an invitation email. All exact fixtures and their linked login were cleaned up. Before/after totals agree: Classes 16, Sections 48, Cycles 4, Subjects 10, Students/Teachers/Staff 0.

Focused comparator and view-preference tests: 6 pass, 0 fail. Root typecheck, lint and the isolated production build (`NAJM_NEXT_DIST_DIR=.next-academic-check`) pass; lint retains the existing Parents hook dependency warning. Browser results and screenshots are in `%TEMP%/school-academic-followup-2026-10-21/`. Initial attempts, including a pagination approach that hid the selector and harness selector/phone-wait errors, are preserved separately; the final `results.json` contains the completed acceptance run.

## Admin teacher deletion without manual unassignment

The owner requested automatic assignment cleanup when an admin deletes a teacher. The existing delete endpoints now use the authenticated actor's role. Admins may delete a teacher with teaching assignments; the teacher foreign key removes those assignments in all years. Staff and login deletion share the transaction. No schema migration or client-supplied bypass flag is needed. Single and selected-delete confirmations explain the permanent teacher/account/assignment removal in all four languages; MCP confirmations carry the same scope warning.

Assessments, exams, attendance and timetable entries still retain their teacher/assignment references. Their presence produces an actionable refusal recommending deactivation. Linked staff history retains its existing end-date/status explanation. A PostgreSQL acceptance case verifies that a staff-history refusal restores the teacher, both years' assignments and login after the teacher delete was attempted.

Verification:

- Teacher deletion policy tests: 8 pass. Non-admin callers keep the existing guard; trusted controller roles reach both single and bulk service paths. History checks cover all years without needing a selected-year scope.
- `TeacherDeletionTransport.test.ts`: 4 pass on the local `school_history_test` fixture, covering current/past assignment cleanup, linked login deletion, retained academic structure, rollback, recorded assessment preservation and the bulk endpoint. Initial fixture setup needed a temporary teacher role/catalog entry; the test now creates only missing entries and removes only entries it created.
- `TeachersHistoryTransport.test.ts`: 5 pass, including REST/MCP year behavior and recorded-history protection. Its deletion test verifies the fixture's assessment dependency before attempting deletion.
- Academic-year suite: 401 pass, 0 fail. Translation-key validation and root typecheck pass.
- Playwright on the running dev app: Table and Cards each pass warning, Cancel-with-assignment-retained, and confirmed deletion without manual unassignment. Selected deletion of two assigned teachers also passes. No uncaught page errors occurred. All four temporary teachers and linked staff/logins were removed; the baseline remains Classes 16, Sections 48, Subjects 10, Teachers/Staff 0. Artifacts are in `%TEMP%/school-teacher-auto-delete-2026-10-22/`; the first harness run's invalid bulk-fixture phone number is recorded separately from the passing final results.
- Lint and the isolated production build pass. Lint retains the existing Parents dependency warning.

Commands:

```powershell
bun test packages/server/tests/academicYears/TeacherDeletion.test.ts
bun --env-file=apps/dashboard/.env.local test packages/server/tests/acceptance/TeacherDeletionTransport.test.ts
bun --env-file=apps/dashboard/.env.local test packages/server/tests/acceptance/TeachersHistoryTransport.test.ts
```
