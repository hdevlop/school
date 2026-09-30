# Academic-year history: browser checklist

The manual acceptance of plan section 11.3, written as steps to follow and
tick. Record each outcome here and add a dated entry to
[the evidence ledger](academic-year-history.md). `PASS` means you ran it and saw
the expected result; a step you could not run is `BLOCKED` with the reason.

## Before you start

**Which database.** The plan's scenarios need students who stay across years.

| Database | Good for | Not good for |
| --- | --- | --- |
| `school` (demo, `seed:demo` over three years) | Volume, dashboards, finance totals, page-by-page year switching | Anything about one student across years: its 300 students are each enrolled in exactly one year, no one changes section mid-year, every enrollment is `active` and every placement is open-ended, all three years are `open`, and no receipt pays fees of two years. There is no principal or accounting account, and the teacher, parent and student passwords are unknown. |
| `school_history_test` (fixture) | Steps 1, 5 and 6: the ten students S01-S10 across 2024-2025, 2025-2026 and 2026-2027, Omar's transfer, Mariam's graduation, Aya's fee-only year; admin and principal accounts whose passwords are `SCHOOL_HISTORY_ADMIN_PASSWORD` and `SCHOOL_HISTORY_PRINCIPAL_PASSWORD` | Volume. Writes you make through the UI stay in the fixture; re-run the `seed:history:*` stages afterwards and expect the acceptance suites to need their baseline back. |

To browse the fixture, start a second dev server with `DB_URL` set to the
fixture URL in that shell only. Never edit `.env.local` for this, and never run
`seed:full`, `reset:demo`, `db:push` or `db:drop`.

Use najm-auth 4.2.2 or later, and restart the dev server after installing it.
Earlier versions sign you out when several tabs reload at once (finding 1).

## Results so far

Run on 2026-09-29 by Claude in the owner's Chrome, signed in as the demo admin,
against `school` on `localhost:3102`, in two passes: before and after
najm-auth 4.2.2. Figures were checked against the database with read-only
queries. The language was switched to Arabic and back to English; nothing else
was written.

| Step | Outcome |
| --- | --- |
| 1. Past-year students | **PASS (read part).** 2025-2026 and 2024-2025 each list 100 students; the names, classes and sections shown match those years' placements. Every request sent `X-Academic-Year` and no `?academicYear=`. The historical correction was not run (it writes audited rows). **Write, 2026-09-30:** as the principal with 2025-2026 selected, Salma Lakhdar's placement 3AC C was changed to B in the normal Edit form with a reason; the form sent `PUT /api/students/0BE_V` with `X-Academic-Year: 2025-2026` and the correction block, and the server refused it with 409 "Correction conflicts with recorded attendance or grades; reconcile those records first". Nothing was written. Every active 2025-2026 student in `school` has attendance or grades that year, so this safeguard refuses any placement correction on the demo data; the full correction path is for the `school_history_test` fixture. The user saw only "Something went wrong" (finding 12). |
| 2. Navigation keeps the year | **PASS.** Teachers, Fees, Student attendance, Grades, Exams, Payroll, Expenses, Alerts and the Dashboard kept 2024-2025; 17 captured API requests all carried `X-Academic-Year: 2024-2025`. Attendance opened on 30 June 2025, the year's last teaching day. Dashboard income, expenses and collection rate equal the database for 2024-2025 and 2025-2026. |
| 3. Tabs, reload, account | **PASS on najm-auth 4.2.2** (second pass). A new tab restored the remembered year; two tabs on 2025-2026 and 2024-2025 reloaded together three times, stayed signed in and kept their years; the session family stayed `active`. On 4.2.1 the first such reload revoked the session (finding 1). Account switch not run. |
| 4. Rapid switching | **PASS** (read part). With 2025-2026 requests held 4 s in the page, 2025-2026 then 2026-2027 were chosen 0.4 s apart, so the older answer came last: the page went to 2026-2027 and stayed there, and its six visible names are all 2026-2027 students. While a year loads, the header reads "0 students total" (finding 5). The in-flight write was not run. **2026-09-30:** the Edit form is a modal dialog, so the year cannot change under it in the same tab (the selector sits behind it), and other tabs keep their own year; the save above carried the year the form was opened in (`X-Academic-Year: 2025-2026`). The header count is fixed (finding 5). |
| 5. Principal / accounting | **PASS with findings** (third pass, Playwright, see below). The principal edited a 2024-2025 grade's feedback with 2024-2025 selected (200; without the year, 404 because the request stays in the active year) and it was set back. Accounting was refused the same edit and the grade stayed unchanged, but with 401 (finding 8). Accounting opened Fees, switched to 2024-2025 and saw that year's 100 students and balances. Neither role has a finance menu (finding 9). Paying an old year's fee today was not run: it writes a payment. **Payment, 2026-09-30: PASS.** As accounting with 2024-2025 selected, 100 MAD cash on installment #2 (due 2024-10-01) of fee `aoS40tuEl4` for Hasna Khattabi, dated 2026-09-30: payment `BkNm1CbhRd`, receipt `RCP-20260930-GM_9UZV88S`, completed and settled that day. This month's payments went from 75 / 321,415 to 76 / 321,515 MAD and the 2026-2027 dashboard's income for the month and year rose by 100; in 2024-2025 her paid total went from 100 to 200, her balance from 17,436 to 17,336, the installment became paid and the year's collection rate rose, while that year's income stayed unchanged. The first choice (Charaf Fettah) was refused because a pending 2024 cheque reserves each of his open installments, which is the reservation rule working. |
| 6. Limited roles | **PASS with one finding.** Teacher and parent have no year selector; the header shows 2026-2027 as plain text. For teacher, parent and student, `X-Academic-Year: 2024-2025` and `?academicYear=2024-2025` are refused with 403, a 2024-2025 grade by ID with 403, and a 2024-2025-only student by ID with 404. In the page, `/students?academicYear=2024-2025` dropped the value and showed the active year; `/students/<past id>` showed none of that student's data but drew an empty profile (finding 10). Parent: 2 children and their 8 grades; student: herself and her 4 grades; teacher: 64 grades, which equals the teacher rule (students in her 18 sections on the grade's date) evaluated in SQL; a teacher with no graded sections sees 0. The assistant was not asked: its model server was unreachable. |
| 7. Activation | NOT RUN: changes the school's active year; needs a disposable database. |
| 8. RTL, mobile, keyboard, forms | **PARTIAL.** Arabic: `dir="rtl"`, `lang="ar"`, the selector's label and "(الحالية)" translated, no sideways scroll; dropdown menus stay left-to-right (finding 6). Phone: at 500 px, Chrome's narrowest window, the selector is fully visible and nothing scrolls sideways; 390 px not measured. A class filter kept across years matches by name: 2AC in 2024-2025 listed exactly that year's 11 students. Keyboard and the failed-request state are **inconclusive**: the Chrome window was hidden, so screenshots failed, focus did not move into the menu and React Query paused its retries. **2026-09-30 (Playwright): keyboard PASS, error state PASS.** Tab reaches the selector (19 presses on Students), Enter opens it on the first year, arrows move, Enter chooses 2025-2026 and closes the menu with focus back on the selector, and Escape closes it without a change. A refused list shows "Accès refusé" (Staff for the principal) and a refused record "Student not found" (finding 10); a loading dashboard, Fees header or Staff statistics show no figures instead of 0. **390 px:** the selector is fully visible (x 124-265) and nothing scrolls sideways, but the page title and the selector's year are drawn over each other, and the chat button covers the pagination's next button (finding 13, fixed the same day: no overlap on seven pages). |

### Findings

1. **Two tabs reloading together sign the user out** (najm-auth 4.2.1,
   upstream). After a refresh, `TokenService` writes the 120-second grace
   deadline as `new Date(...).toISOString()` into `tokens.previous_valid_until`,
   a `timestamp without time zone` column. PostgreSQL drops the `Z`, so it
   stores UTC wall time; reading it back, `new Date('2026-09-29 17:46:05.186')`
   parses it as the server's local time. In Morocco (UTC+1) the deadline is
   then 58 minutes before the refresh that set it, the grace window never
   opens, and any second refresh presenting the previous token revokes the
   family. Seen: family `nxX8…` revoked at 17:53:36 when both tabs reloaded;
   row `b9km…` holds `updated_at 18:44:05` (local) against
   `previous_valid_until 17:46:05` (UTC). Chrome session restore, or a page
   load whose server and browser both refresh, can do the same. The login
   lockout ended early the same way. **Fixed in najm-auth 4.2.2** (Najm commit
   `d4f6c95`, published 2026-09-29 and pinned here): stored values without a
   zone are read as UTC. Re-check step 3 in the browser after restarting the
   dev server.
2. **A dead session never reaches the login page.** After the refresh failed,
   both tabs stayed in the shell for minutes: a shortened sidebar, no year
   selector, the dashboard saying "No data available" and Alerts saying "0
   alerts / Loading...". Every request answered 401. The dashboard has no
   client-side gate (`AuthGate` or equivalent); only server navigation checks
   the session. It also breaks the "a failed list is not an empty one" contract
   for the dashboard cards. **Fixed 2026-09-29:** the shell sends the user to
   `/login?from=<page>` on najm-auth's `sessionExpired`
   (`shared/useSessionExpiryRedirect.ts`); seen working when the session was
   revoked at 20:36 that day. That revocation came from tabs refreshing
   together, and najm-auth 4.2.3 fixes it (see the ledger).
3. **Payroll opens a past year on its last reporting month.** 2024-2025 opens on
   August 2025, which has no payslips in a September-June school, so it shows
   MAD 0.00 for 150 staff. Correct figures, confusing default; June, or the
   latest period with payslips, would be clearer. **Fixed 2026-09-29**
   (`Payroll/config/payrollPeriods.ts`): a past year opens on June; confirmed
   in the browser.
5. **A loading list reads as zero.** While a year's list loads, the Students and
   Teachers headers say "0 students total" / "0 teachers total" before the real
   count arrives. The count is already hidden for a failed load
   (`hasFailedToLoad`); hiding it while loading too would match. **Fixed
   2026-09-29** with `isCountUnknown` in 21 headers; confirmed in the
   browser.
6. **Dropdown menus ignore right-to-left.** In Arabic every Radix menu (year,
   language) carries `dir="ltr"`, because no Radix `DirectionProvider` receives
   the page direction. Items align and arrow keys move as in English. The page
   itself is right-to-left. Cause: najm-kit does provide the direction, but six
   Radix packages installed their own `@radix-ui/react-direction`, so their
   menus read a different context. **Fixed 2026-09-29** with one overridden
   version and `scripts/tests/radix-direction.test.mjs`; confirmed in the
   browser after a dev-server restart (menus carry `dir="rtl"`).
13. **At 390 px the header's title and actions overlap.** najm-kit's
   `NPageHeader` centres the title between two equal columns
   (`grid-cols-[minmax(2.75rem,1fr)_minmax(0,auto)_minmax(2.75rem,1fr)]`);
   School's header actions (year selector with its label, notifications,
   language, theme) need about 260 px against about 145 px, so they spill
   left over the title ("Étudiants" and "2025-2026" drawn on each other on
   Students). The floating chat button also covers the pagination's next
   button. **Fixed 2026-09-30.** najm-kit 2.16.13 sizes the controls column
   to its content (`minmax(min-content,1fr)`), so the title truncates instead
   of being covered; below `sm` the year selector drops its two icons and
   Fees' "Facturer une classe" shows its icon only, which left Fees no room
   for its title at all. The shell reserves `pb-20` below `lg` for the chat
   button. At 390 px on Students, Fees, Teachers, Parents, Classes,
   Announcements and Staff: no overlap, no sideways scroll, full titles
   ("Étudiants", "Frais", "Enseignants"), nothing under the chat button
   ("Page suivante" ends 8 px above it); at 1366 px the Fees button keeps its
   label. Arabic at 390 px not re-measured.
12. **A refused save says only "Something went wrong".** najm-kit's
   `useEntityCRUD` shows a server message only when it is a catalog key;
   School's server sends translated text or English literals (here
   `StudentEnrollmentValidator`'s 409), so the reason is replaced by an
   untranslated "Something went wrong". Seen on a refused placement
   correction; it applies to any refused create, update or delete that goes
   through `useEntityCRUD`. **Fixed 2026-09-30** in najm-kit 2.16.13: a 4xx
   shows the reason the server states, a guard's bare "Forbidden" reads as
   "Accès refusé", and a 5xx or status-less error keeps the translated
   generic title because its message can carry driver or SQL text. Browser:
   the same refused correction now toasts "Correction conflicts with recorded
   attendance or grades; reconcile those records first", the dialog stays
   open with the input, and the placement is still C. **Translated
   2026-09-30:** the server's 254 English `Err(...)` literals are catalog
   keys in all four languages, and the dashboard sends its language as
   `X-Language`, so the same refusal now reads "La correction est en conflit
   avec des présences ou des notes enregistrées ; régularisez d'abord ces
   enregistrements". The row menu reads "Voir / Modifier / Supprimer"
   (najm-kit 2.16.14).
7. **Demo data explains the negative balance.** 2025-2026 expenses are paid
   payslips only (MAD 4,830,070, about 480,000 a month) because all 172 other
   expenses are `pending`, against about 118,000 a month of income. The
   dashboard is right; the seed is lopsided.
8. **A signed-in user refused by a guard gets 401, not 403.** najm-guard
   answers `Err.unauthorized()` whenever a guard returns false
   (`najm-guard/src/GuardService.ts`). The browser client takes 401 as an
   expired session: it refreshes, retries and gets 401 again. Accounting's
   Fees page asks for classes, sections and students, so every load costs
   three extra refreshes and the class filter stays empty. Nobody is signed
   out. Upstream; should be 403 for an authenticated request.
   **Fixed in Najm, not yet released (2026-09-30):** commit `5d886da`
   answers 403 when the refused request carries a user and 401 when it
   carries none; a guard that throws keeps its own error. najm-guard's
   tests (18) and the suites of auth, MCP, chatbot, RAG, rate, API, theme
   and WhatsApp pass. Publishing 2.2.0 was refused by the session's
   permission check and is left to the owner; School still pins 2.1.0.
   `5d886da` is pushed to Najm's `master`. **Released 2026-09-30:**
   `najm-guard@2.2.0` (Najm `1e5b1b8`, pushed); School pins 2.2.0 in the
   root and server manifests.
9. **Principal and accounting have no finance menu.** `DashboardShell`
   shows Financial, Teachers, Staff and most sections only when
   `role === 'admin'`; accounting's sidebar is Notifications and Settings.
   The pages work when opened by URL. The menu should follow permissions
   (or `ACADEMIC_YEAR_HISTORY_ROLES`), which is an owner decision.
   **Fixed 2026-09-30:** each sidebar page states the guard of its main list
   route in `shared/DashboardShell/navigationAccess.ts` (a permission from
   the roles screen, or the role group the route uses), and the menu shows
   what the signed-in user's grants admit. Seen in the browser: accounting
   gets Dashboard and Financial (Fees, Expenses, Fee Types, Reminders); the
   principal gets the dashboard, Financial, and every page the principal is
   granted, without Staff, Transport or access control; the teacher's menu
   dropped Alerts, Announcements, Assessments, Exams and Calendar, which the
   server refuses the teacher (finding 11).
11. **The demo database's role grants lag the seed, and the seed has gaps.**
   In `school`, parent and student hold 5 permissions (`read:students`,
   `read:parents`, `read:classes`, `read:subjects`, `read:grades`), so the
   server refuses them Alerts, Announcements, Assessments, Exams, Calendar
   and Conduct: 6 of the 9 pages their menu offered. The seed file
   (`packages/seed/src/scripts/admin/data/rolePermissions.json`) grants
   those, so the database predates it. Teacher holds no `read:alerts`,
   `read:announcements` or `read:events` in the database, and neither has
   `read:assessments` or `read:exams` in the seed, so a teacher cannot list
   assessments or exams anywhere. Accounting has no permissions in either:
   its finance routes work through the role group, but Fees cannot load
   classes, sections or students for its filters. Owner decision: which
   grants each role should have, then bringing `school` in line.
   **Seed updated 2026-09-30** at the owner's request: teacher gains
   `read:assessments` and `read:exams`; accounting gets `read:students`,
   `read:classes` and `read:sections`. **Applied to `school` the same
   day** with the owner's approval: the 29 grants the seed has and the
   database lacked (accounting 3, teacher 6, parent 10, student 10), insert
   only, in one transaction; nothing was removed. `seed:admin` was not used
   because it also resets the administrator's password. Accounts see the new
   grants at their next sign-in.
10. **A refused record is drawn as an empty one.** `/students/<id>` for a
   student the reader may not see gets 404 from `/api/students/<id>` and
   `/parents`, then shows "Unknown", 0 absences and MAD 0.00 instead of "not
   found". Nothing leaks, but it breaks the failed-load contract.
   **Fixed 2026-09-30:** the profile shows "Student not found" (404),
   najm-kit's forbidden state (401/403) or an error with retry, and keeps the
   header and year selector. Fixing it showed that `isAuthorizationError`
   never matched: najm-auth bundles each entry point separately, so the
   `AuthError` that School's `auth.api` throws is not the class
   `najm-auth/client` exports. Every refused table therefore drew the generic
   error instead of "Access denied"; it now matches the error's name and
   status. Seen in the browser as the parent: `/students/rddm0` shows
   "Student not found", the parent's own child opens normally, `/teachers`
   shows "Access denied".

## Steps

Tick each line and write the outcome next to it.

### 1. Past-year students and the historical correction (admin)

- [ ] On Students, switch from the active year to 2025-2026. The header, list
      and count change; each student shows that year's class and section.
- [ ] Fixture: Adam (S01) shows his 2025-2026 class, not his current one.
      Omar (S05) shows his section before the transfer date and the new one
      after it, with the dated-roster views (attendance on a day before and a
      day after).
- [ ] Mariam (S04) is not in 2026-2027; Aya (S08) has 2025-2026 fees but no
      2025-2026 class.
- [ ] Edit a 2025-2026 student's placement through the normal Student Edit
      form with a reason. Switch to 2026-2027: the student's current class and
      section did not change. The enrollment history shows who, when and why.

### 2. Navigation keeps the year

- [ ] With 2024-2025 selected, open profiles, Fees, Attendance, Grades,
      Exams, Payroll, Expenses, Reports and a print or receipt. Every page
      shows 2024-2025, and no URL gains `?academicYear=`.
- [ ] A dialog opened from a past-year page (a profile, a fee) shows that
      year's data.

### 3. Tabs, reload and account switch

- [ ] Open a new tab: it starts on the last year you chose.
- [ ] Put two tabs on different years; reload **one at a time**. Each keeps
      its own year, and its reads and writes use it.
- [ ] Log out, sign in as another account. Nothing of the first account's
      year choice or data shows; the first account's remembered year comes
      back when it signs in again.

### 4. Switching quickly

- [ ] DevTools > Network > Slow 4G. On Students, switch 2024-2025 >
      2025-2026 > 2026-2027 quickly. The final heading's year is the one whose
      rows appear; no rows or error from an earlier year flash under it.
- [ ] Open an edit form, switch year, submit: the write goes to the year the
      form was opened in, or the form resets as the dirty-form rule says.

### 5. Principal and accounting

- [ ] Principal edits a closed year's academic record with the normal forms,
      without reopening the year.
- [ ] Accounting uses finance pages in a past year and is refused academic
      edits.
- [ ] Paying an old year's fee today records today's date; the cash shows in
      today's month, the allocation in the fee's year.

### 6. Teacher, parent and student

- [ ] No year selector; the header names the active year.
- [ ] A link carrying `?academicYear=<past year>`, a past-year record ID
      typed into the URL, and the assistant asked for last year's data are
      all refused or show only the active year.
- [ ] Each sees only their own or their children's records.

### 7. Activating a year (disposable database only)

- [ ] With one tab on "active" and another on an explicit old year, activate
      the prepared next year. The "active" tab moves to it after its context
      refreshes; the explicit tab stays. Only the lifecycle action changed
      Settings and current classes.

### 8. Language, layout and forms

- [ ] Arabic: the selector, banner and tables read right to left, and every
      year-related text is translated.
- [ ] Phone width: the selector is reachable and the cards readable.
- [ ] Keyboard only: open the selector, choose a year, close it.
- [ ] An empty year shows an empty state; a failed request shows an error,
      not an empty list.
- [ ] Changing year resets class, section and date filters that do not exist
      in the new year.
