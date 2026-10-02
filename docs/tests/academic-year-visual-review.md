# Academic-year history: visual review of rows 01-43

Reviewer pass by Claude on 2026-10-01, at the owner's request. **This is not the
owner's acceptance**: it records what the screens show so the owner can decide
row by row. Plan section 0.1a item 7 stays open until the owner walks it.

## How it ran

- Main dev server on :3102, demo `school` database (100 / 103 / 106
  enrollments), seed administrator, French interface. Read-only: no form was
  saved, no record changed.
- Playwright headless Chrome, one sign-in, a fresh tab per page. Every row's
  page at 1366 px for **2024-2025** (past) and **2026-2027** (active), then
  every page at **390 px** for 2026-2027. Pages that were still loading were
  recaptured with a longer settle time.
- Automated per page: year shown in the header, sideways overflow, API
  responses of 400 or more, console errors, raw translation keys, refusal
  text. Every screenshot was then looked at.
- Harness: `.cache/history-visual-review.spec.cjs` (run with
  `.cache/history-visual-review-run.ts`). Screenshots and `report.json`,
  `report-2026.json`, `report-partial.json` are in ignored
  `.cache/history-playwright/visual-review/`.
- The working tree held another session's uncommitted page-access work
  (`requirePageAccess` layouts on every route) while this ran; the dev server
  served it.

## Year behaviour: the plan's subject

Every reviewed page kept the selected year in its header, sent no failed API
request, and showed that year's records: 100 students and CM2 B for Rim Qadiri
in 2024-2025, 106 and 1AC B in 2026-2027; 2024-2025 dates and amounts in
Assessments, Exams, Discipline, Expenses, Payroll (June 2025) and Attendance
(30 June 2025). Fee totals agree with the read-only audit of the same day:
2024-2025 overdue 489,545 MAD on Aging, Reminders (85 students) and the fee
totals. A parent's child not enrolled that year reads "Non inscrit en
2024-2025". The student fee page lists other years' unpaid fees.

Exceptions:

1. **Calendar (row 11) opens on today's month for a past year.** With
   2024-2025 selected it shows October 2026, outside that year, so the past
   year looks empty. Attendance and Payroll open inside the selected year; the
   calendar should too.
2. **Dashboard (row 09) changes basis by year.** Past years show whole-year
   totals ("Revenus (2024-2025)"); the active year shows the current month,
   which reads 0,00 MAD on 1 October. Charts plot the active year's future
   months as 0, so every line drops to zero after September.
3. **Payroll (row 22) omits teachers from an unrun month.** The page builds its
   roster from the Staff list, which excludes teachers, plus existing
   payslips (`features/Financial/Payroll/components/PayrollTable.tsx`). June
   2025 and September 2026 have 100 payslips each; October 2026 has none, so
   it lists 50 people and "Payer le salaire (50)" cannot reach the 50 teachers.
   The server's payroll run covers all 100 active staff. The unrun status shows
   as "Non défini".
4. **Behavior Rewards (row 05): BLOCKED.** A signed-in request to
   `/behavior-rewards` gets no response from the current dev server, even
   after three minutes; signed out it redirects at once, and every other page,
   including Discipline with the same structure, renders. Likely tied to the
   in-progress page-access edits or a stuck dev compile; not investigated
   further because that work belongs to another session. Its earlier browser
   evidence (2026-10-01, root plan 0.1d and 0.1e) predates those edits.

## Year fixes, 2026-10-01

Made after this review, at the owner's request; the other defects below were
handed to another implementer.

- **Calendar (exception 1): fixed.** `features/Calendar/CalendarPage.tsx` opens
  on `dateWithinYear(today, viewed year)`, the rule the attendance date uses,
  and remounts when the viewed year changes or its calendar loads. "Today"
  still goes to today.
- **Dashboard (exception 2): charts fixed, basis kept.** The month-versus-year
  basis is the documented row 09 behaviour and is unchanged. The income and
  expenses trend (dashboard and Reports), student attendance and staff
  attendance charts now leave months after the business month blank instead
  of zero (`features/Dashboard/config/monthTrend.ts`, with tests).
- **Payroll (exception 3): fixed.** New admin route `GET /payroll/roster`
  (`PayrollService.getRoster`, also an MCP tool) returns the active staff with
  a salary, teachers included; the payroll run now uses the same method, and
  the payroll screen reads it instead of the Staff list.
- **Behavior Rewards (exception 4): environment, not code.** The dev server log
  shows `Compiling /behavior-rewards ...` with no completion since that first
  visit, and nothing compiled after it; the other session's production build
  of the same tree compiled the page. Restarting :3102 should clear it.

Verification: lint PASS; `monthTrend` tests 6/6, `DemoPayrollIsolation` 1/1,
`test:academic-years` 342/342, `test:security` 3/3 and
`PayrollHistoryDatabase` 1/1 on `school_history_test` PASS. Workspace
typecheck reports three errors, all in another session's in-progress Calendar
translation (a second `displayDate` declaration), none in these files; that
session has since resolved it.

**Browser check: PASS** after the owner authorized restarting :3102 (the
previous server had already stopped with a corrupted `.next/dev` output).
Playwright, 1366 px, both years, all eight captures clean (no failed request,
no console error): Calendar for 2024-2025 opens on 30 June 2025 with that
month's events; Payroll for October 2026 lists 100 people ("Payer le salaire
(100)", 0 / 100); the 2026-2027 dashboard trends stop at October; Behavior
Rewards loads (60 records in 2024-2025) for both years, so row 05 is no
longer blocked.

## Browser check of the defect fixes, 2026-10-02

Another implementer fixed the defects below (`docs/tests/ui-defect-fixes.md`)
without a browser check. Replayed every page at 1366 px and 390 px for
2026-2027 on a restarted :3102 after the disk was cleared (an earlier replay
was invalidated by `ENOSPC`): 76 captures, no failed request apart from the
chat widget's refresh-and-retry 401 on `/api/mcp` (the retry succeeds).

- **Fixed and seen:** Fee Types read `Actif` with French categories and
  payment types (D1); Settings keeps the year selector clear, with its actions
  on their own row and real card titles (D2); Planning's subtitle no longer
  runs under the selector (D3); Finance operations is French with no raw key
  and its credit controls fit (D4); the 14 table hydration errors are gone
  (D5); the phone dashboard shows its charts and pages have a side margin,
  Payroll scrolls sideways with readable columns, and the student fee header
  no longer overlaps (D6); the student profile is not clipped at 1366 px
  (D7); the teacher page, student fee page, staff roles, attendance "STATUT"
  header and Calendar are French.
- **Still open:** Behavior Rewards at 390 px has a hydration error (it was not
  on the fixed list because it would not load during the review); the
  Attendance date reads "October 1st, 2026"; Grades shows "Assessment" and an
  "Assessment Placeholder" field; Settings shows "24-hour"; typecheck fails on
  `packages/contracts/tests/locales.test.ts:90` (a language string where a
  language code is expected), although the fix record reports it passing.
- **Follow-up fixes (same day):** the locales test types its language as
  `SchoolLocale`, so typecheck passes; Behavior Rewards' table uses
  `responsiveSkeleton` and its phone hydration error is gone; French, Arabic
  and Spanish replace the stub values of `grades.form.assessment`,
  `assessmentPlaceholder` and `feedbackPlaceholder`; Settings' time formats
  read `settings.system.timeFormat12`/`timeFormat24` in all four languages.
  Lint, typecheck, `i18n:check`, `test:config` (311), `test:boundaries` and
  `db:check` pass; Grades ("Évaluation", "Sélectionner une évaluation"),
  Settings ("Format 24 heures") and Behavior Rewards were recaptured clean at
  both widths. The Attendance date stays English: NTable's date filter
  renders najm-kit's `DateInput`, which formats with date-fns `PPP` and no
  locale, so the fix belongs in a najm-kit release.
- **Attendance date: fixed in najm-kit 2.16.15.** `DateInput` and `Calendar`
  now take the locale from the format provider (Najm commit `172c56d`,
  release `ff45fdf`). School pins 2.16.15; `test:boundaries`, typecheck and
  lint pass, and Attendance shows "1 octobre 2026" at both widths. The
  hydration error on that recapture fits the time-zone mismatch below: it
  was taken at 00:43 server time, 23:43 in the browser.
- **Migration 0062: keep, not applied.** The installed najm-chatbot declares
  `ai_settings.provider` as text and supports providers (`openrouter`,
  `mistral`, `deepseek`) that the 0009 enum rejects, so an OpenRouter
  provider cannot be saved until it runs. `db:check` passes with it. Applying
  it to `school` is an owner step, after a backup.
- **Not from these fixes:** Attendance and Calendar show a text hydration
  error while the server's and the browser's dates differ. On this machine
  Bun and Node put Africa/Casablanca at UTC+1 while Windows and Chrome use
  UTC+0, so between 23:00 and 00:00 the server renders tomorrow. Both pages
  render "today" during server rendering; the Calendar year fix uses the same
  pattern as Attendance.
  **Fixed:** "today" on both pages (the date picked on opening, the Today
  button, the Calendar's highlighted day) is now the date in the school's
  time zone (`useSchoolToday`, `todayInTimeZone`), which the server render and
  the browser share. Recaptured with the browser in America/Los_Angeles,
  a day behind the server: both Attendance pages and Calendar show
  2 October at both widths with no console error.
- **Outside the brief:** the fixes add migration
  `0062_ai_settings_provider_text.sql` (`ai_settings.provider` enum to text),
  not mentioned in the fix record. It is not applied: `school` holds 62
  migrations (0000-0061) and the column is still the enum.

## Defects found (not year-specific)

| # | Where | What | Evidence |
| --- | --- | --- | --- |
| D1 | Fee Types (row 18) | Every type shows **Inactif**; all 9 are `active` in the database. The column reads `isActive`, which the API does not return. | `useFeeTypesTableColumns.tsx:69-75`; read-only count `active: 9` |
| D2 | Settings (row 32) | The "Révision des données scolaires" button is drawn over the year selector; on a phone "Save Settings" is cut off. Both cards are titled "Titre". | desktop and phone screenshots |
| D3 | Planning (row 07) | The header subtitle runs under the year selector. | both years |
| D4 | Finance operations (rows 13/15/21/23) | Raw key `payroll.paid` on screen; "Apply credit" spills out of its card; cards overflow on a phone. | automated raw-key check |
| D5 | 14 pages | React hydration mismatch (server HTML differs from client), shown as "1 Issue" by the dev badge. | `report-2026.json` console errors |
| D6 | Phone, 390 px | Dashboard chart cards collapse to their titles; pages have no side gutter; Payroll's table squeezes every column unreadable; the student fee header stacks avatar, name and "Overdue Payments" on each other. | phone screenshots |
| D7 | Student profile (rows 29/34), 1366 px | Right side clipped: tabs, "Télécharger le rapport" and the right-hand cards. | both years |

## Untranslated text in the French interface

Calendar (all of it, including Mon/Tue, "Month view", "Add event"); Finance
operations (most of the page); the student fee page ("Fees Overview", "Pay",
"Fee Installments", "View"); the teacher detail page (all labels); Grades
("Assessment"/"Exam", "Select assessment", "Highest/Lowest/Pass Rate"); Fees
search placeholder "Search By Student"; Attendance date "June 30th, 2025" and
the "STATUS" header; Staff roles shown raw (`secretary`, `busAssistant`,
`itSupport`); fee type category and payment type raw (`fieldtrip`,
`oneTime`, `recurring`); Transport "Student Routes", "Assign Student", vehicle
type `fullbus`; the dashboard calendar widget ("October 2026", Su/Mo/Tu).

## Layout polish

Column headers and titles cut mid-word on Announcements, Assessments, Exams,
Discipline and Expenses at 1366 px; dashboard headline cards clip labels and
values ("-3.568.438,00 MA"); the floating chat button covers the "… sur N"
count on every list; fee cards' "En retard"/"Payé" badges cover the student
code, and amounts touch their icons; vehicle plates wrap one segment per line;
the Staff and Teachers cards wrap "E-mail:"; the parent detail cards repeat
their title as the action label ("Notes récentes … Notes récentes") and greet
the administrator as the parent ("Bon retour, Aicha").

## Demo data, not code

No cycles (row 08 has nothing to show) and no timetables (row 07 shows only its
empty state); every 2024-2025 alert dated 30/09/2026, the seed's run time; all
84 2024-2025 expenses pending; expenses (payroll only) 4.67M against 1.10M
revenue; every 2024-2025 exam and assessment on 30/06/2025, with titles that do
not match their subjects; vehicle plates carrying a year label and hash, with
repeated vehicle names.

## Row by row

| # | Module | Page(s) | Year behaviour | Findings |
| --- | --- | --- | --- | --- |
| 01 | alerts | /alerts | OK | seed dates; chat button covers count |
| 02 | announcements | /announcements | OK | titles/headers cut |
| 03 | assessments | /assessments | OK | headers cut; seed type/title mismatch |
| 04 | attendance | /attendance/students, /teachers, /staff | OK (opens 30 June 2025 / today) | English date and "STATUS"; raw staff roles; phone strip overflows |
| 05 | behaviorRewards | /behavior-rewards | OK after dev restart (60 in 2024-2025) | the hang was a stuck dev compile |
| 06 | classes | /classes | OK | none |
| 07 | classRoutines | /class-routines | OK | D3; no timetables in demo data |
| 08 | cycles | /cycles | OK (shared) | empty catalog in demo data |
| 09 | dashboard | /, /reports | OK | exception 2; KPI cards clip; D6 phone charts |
| 10 | discipline | /discipline | OK | columns cut at 1366 px |
| 11 | events | /calendar | OK after fix (opens 30 June 2025) | was exception 1 |
| 12 | exams | /exams | OK | headers cut; seed dates/titles |
| 13 | financial/allocations | /financial-operations, /aging | OK (aging matches audit) | D4; English |
| 14 | financial/auditLog | /financial-operations | OK (all-year) | D4; English |
| 15 | financial/credits | /financial-operations | OK | D4; English |
| 16 | financial/expenses | /expenses | OK | all pending (data) |
| 17 | financial/fees | /fees, /students/:id/fees, /aging | OK (other-year banner) | English fee page; badge overlap; D6 phone header |
| 18 | financial/feeTypes | /fee-types | OK (shared) | **D1 all shown Inactif**; raw enums |
| 19 | financial/installments | /students/:id/fees | OK | English labels |
| 20 | financial/notifications | /reminders | OK (85 students, 489,545 MAD) | none |
| 21 | financial/payments | /financial-operations | OK | D4; English |
| 22 | financial/payroll | /payroll | OK after fix (100 in October 2026) | was exception 3; "Non défini"; D6 phone |
| 23 | financial/rollover | /financial-operations | OK | English |
| 24 | financial/utils | none | no UI surface | none |
| 25 | grades | /grades | OK | English toolbar |
| 26 | health | none | no UI surface | none |
| 27 | notifications | /notifications | OK (all-year, empty) | none |
| 28 | parents | /parents, /parents/:id | OK ("Non inscrit en 2024-2025") | duplicated card labels; greeting |
| 29 | profiles | student, parent, teacher detail | OK (CM2 B / 1AC B) | D7; teacher page English |
| 30 | search | none found in the shell | no UI surface | none |
| 31 | sections | /sections | OK | none |
| 32 | settings | /settings | OK (active pointer shown) | **D2** |
| 33 | staff | /staff | OK (shared) | "E-mail:" wraps |
| 34 | studentEnrollments | student profile | OK | D7 |
| 35 | students | /students | OK (100 / 106) | none |
| 36 | subjects | /subjects | OK (shared) | none |
| 37 | teachers | /teachers, /teachers/:id | OK | teacher detail English |
| 38 | transport/drivers | /drivers → /staff (by design) | OK | as row 33 |
| 39 | transport/maintenance | /transport, /vehicles | OK | English tab labels |
| 40 | transport/refuels | /transport, /vehicles | OK | as row 39 |
| 41 | transport/studentRoutes | /transport | OK | English; seed plates |
| 42 | transport/vehicleAssignments | /transport, /vehicles | OK | as row 41 |
| 43 | transport/vehicles | /vehicles | OK (shared) | plate wrapping; duplicate names (data) |
