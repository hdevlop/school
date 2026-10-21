# Rewards, staff attendance details and missing-page recovery

Fixed and verified locally on **2026-10-21**, at **http://localhost:3102**,
academic year **2026-2027**, using standalone Playwright and installed
**Chrome 155.0.8059.86**. No browser plugin was used. The
[results](results.json) retain **19 passing browser/API checks**, diagnostics,
migration and cleanup. The [source fingerprint](source-fingerprint.json)
identifies the tested shared checkout.

| Finding | Change and observed result |
| --- | --- |
| Rewards points above 100 displayed a raw Zod message | Both lower and upper bounds now use a friendly translated range message. The integer and invalid-number checks also name translated messages. English desktop and Arabic phone forms refused 101 without the raw developer text. Direct API requests with 101 returned HTTP 400 with translated range feedback in English, French, Spanish and Arabic. No reward was created. |
| Staff register offered a Late status without arrival time or note | Desktop rows and phone cards now offer **Arrival & note**, enabled after an explicit attendance mark. Applying the dialog updates the register draft; Save attendance persists it. A real save wrote only the owned staff member, retaining Late, arrival time and note after reload. A notes-only correction kept the status and arrival; clearing both details persisted. A legacy roster update omitting arrival time retained the stored time and record ID. An impossible `24:00` arrival was refused with HTTP 400. |
| `/rewards` showed the default black 404 without recovery | A translated root not-found view now offers a dashboard link, which navigated to `/home`. `/rewards` remains HTTP 404; Rewards is at `/behavior-rewards`. Arabic dark phone rendering had the translated link, RTL direction and no horizontal overflow. |

The staff detail editor uses the existing Najm form, dialog and input controls.
It adds no second register owner: the existing draft/save flow tracks
status changes and details-only edits, resets both when the date/context changes,
and leaves unmarked people unrecorded. Existing arrival time and notes are
included in status-only saves. All-year selection, authorization and roster
eligibility rules remain at their existing boundaries.

Arrival time is an optional `HH:MM` field. Generated migration
[`0071_grey_shadowcat.sql`](../../../../packages/server/src/database/migrations/0071_grey_shadowcat.sql)
adds only nullable `attendance.arrival_time`; existing rows are untouched.
Preflight confirmed the configured database was local `localhost/school` and
this was the sole pending migration. `bun run db:migrate` applied it locally.
The tracked snapshot and migration journal were generated with `db:generate`,
and `db:check` passed. Production was not migrated. This migration must accompany
the source change when a release is authorized.

English desktop used 1440 x 1000; phone checks used 390 x 844. The English
phone correction persisted through reload. Arabic dark phone restored the
saved arrival and note in the translated editor. The Arabic 404 screenshot was
visually reviewed. External browser requests were blocked; no map or delivery
acceptance is claimed.

One disposable, login-less staff member and one attendance record were created
for the save tests. Both were removed through supported internal MCP operations,
and authenticated REST reads returned **404 for both**. Other staff attendance
records matched the before-run snapshot. Normal audit records may remain.
Credentials, sessions, raw personal-data responses and temporary screenshots
are not retained here.

Verification:

- PASS: 55 focused schema, draft, attendance-guard/year-write and localization
  tests; the final extension of the staff-write persistence assertion also passed.
- PASS: 587 configuration tests across 82 files.
- PASS: 28 boundary tests and the workspace import-graph check.
- PASS: root lint, root typecheck, final server test typecheck, four-locale
  translation-key check and migration check.
- PASS: final production build in isolated `.next-minor-findings` output.
- PARTIAL: broader academic-year suite, **399 pass / 1 fail**. The unrelated
  `TeachingDays.test.ts` routine-creation mock omits `getSchoolDay()`, which the
  concurrently edited `ClassRoutineService.create` now calls. An isolated run
  reproduces that same failure (**4 pass / 1 fail**). These fixes do not change
  that service or test.

Test counts overlap and should not be summed. No unhandled errors were observed
on the main test page. A cold-route navigation timeout and a corrected harness
variable scope are recorded separately, without counting them as product bugs.

Existing edits, including other attendance/register and routine work, were
preserved. No commit, push, production request or deployment was performed.
