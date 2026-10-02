# Academic-year history: browser checklist

The manual acceptance of plan section 11.3, written as steps to follow and
tick. Record each outcome here and add a dated entry to
[the evidence ledger](academic-year-history.md). `PASS` means you ran it and saw
the expected result; a step you could not run is `BLOCKED` with the reason.

## Latest browser checkpoint, 2026-10-01

**Assistant continuation:** OpenRouter / `openai/gpt-oss-120b` now answers successfully. Final admin Chrome check: 1 passed, 48.5 seconds; real tool results exactly match REST and PostgreSQL for selected 2024-2025 / 2026-2027 (100 / 106 students), and switching year clears the previous chat. Actual teacher, parent and student SSE conversations refuse a request for 2024-2025 while viewing active 2026-2027, with no tool execution. Historical chat transport itself returns 403 for all three. This closes the focused step 6 assistant prerequisite/check; role conversations are authenticated API evidence, not separate role UI runs. Root section **0.1j** and the latest ledger entry are the current assistant checkpoint.

**Latest authorized fixes and continuation:** main Playwright **5 passed** (43.2 seconds), fixture payment **1 passed** (7.4 seconds), fixture empty-year/Arabic **2 passed** (25.5 seconds). Students no-match display, unauthorized Student actions and suppressed authorization-error UI are fixed. Existing main accounting credentials were set through admin REST and stored locally under ignored `.cache/`; historical finance/refusal, exact parent/student/teacher ownership and sampled-frame rapid switching pass. A fixture payment dated today allocated to a closed old year, then was voided with cash/balances restored. Actual empty draft 2023-2024 Students and Arabic year notices pass. Fixture :3103 is stopped; main :3102 remains running. Root section **0.1f** records that finance/browser checkpoint; **0.1j** is the latest assistant checkpoint.

**Earlier fixture continuation: 4 passed (26.4 seconds).** Adam, Omar, Mariam and Aya passed without fixture domain changes in that earlier pass. Its empty-module evidence and no-match finding are preserved in the ledger; the new fixes and entirely empty-year case above supersede its open items.

**Further continuation at `33683f1`: 4 Playwright cases passed together (74.5 seconds).** Sixteen pages and actual sidebar links retained 2024-2025; the normal View dialog showed Rim Qadiri's CM2 B placement. Keyboard Tab/Enter/Home/arrows/Escape returned focus; an unsaved attendance mark and dated filters reset without a write. Simulated 403 and 200-empty Students responses showed distinct states, and removing interception restored the real 100 rows. Reports was checked for retained UI context only; exports and a real empty-year fixture were not run. The main server had stopped and was restarted on :3102. Earlier repeated sign-ins hit HTTP 429; the final harness reuses one authenticated context without changing the rate limit. See root plan section 0.1d and the ledger for exact scope.

Playwright resumed these checks in its own headless Chrome; Chrome MCP reconnection is no longer required. These post-seed UI results supplement the dated Chrome/REST/MCP evidence below:

| Case | Latest outcome |
| --- | --- |
| Students/profile | **PASS:** 100 / 103 / 106 students; Rim Qadiri's profile/history reflects CM2 B → CE6 B → 1AC B with actor/time/reason. |
| Tabs/account changes | **PASS:** remembered new-tab year, independent reload years, admin → parent → student → teacher → student → admin, old tab replacing protected data and admin preference returning. |
| Historical links | **PASS:** all three limited-role query links normalize to active; parent/student unowned ID shows not found, teacher's readable shared identity has no historical placement. This closes the student's previously unrun URL case. |
| Delayed reads | **PASS:** old response completes after active selection; sampled animation frames match visible counts and student IDs to the heading year. Final 106 active students. |
| Arabic/phone/keyboard | **PASS on Students/Fees at actual 390 × 844:** no overflow; concurrent layout now places the selector in the drawer below 640 px; settled selector fits and its RTL menu accepts keyboard selection with focus returned. Main language restored to French. |
| No-match filter | **PASS:** Fees and fixed Students search remain available, show no results and recover after clearing. |
| Print | **PASS:** actual Print opens receipt popup; browser PDF and screenshot show Rim Qadiri, 2026-06-01, 1,600 MAD. Native OS print dialog/physical printing dropped by the owner (2026-10-01). |
| Principal closed-year Edit | **PASS:** fixture 2025-2026 A → B → A through normal Edit, audit principal/time/reason, current projection unchanged and year remains closed. Temporary five normal grants removed; exact original four grants restored. |
| Accounting/payment | **PASS:** existing accounting historical finance/refusal and fixture normal cash payment dated today against an old fee. Payment voided afterward; audit retained. |
| Owned/empty | **PASS:** exact owned active Students IDs 1 / 1 / 72; actual empty fixture draft-year Students returns 200 `[]` with the empty state. |
| Still separate | Owner per-module visual/policy review is **OPEN**. Focused local assistant year/refusal acceptance now passes (0.1j); production and broader model acceptance remain separate. Activation (step 7) was dropped by the owner on 2026-10-01. |

Four dashboard source/test files and three documentation files changed during the latest authorized fixes. Full details, setup retries, final gates and cleanup are in [the ledger](academic-year-history.md). Combined unchecked steps below may have partial or dated evidence above; they are not automatically full acceptance.

## Before you start

**Current reseed checkpoint:** :3102 has 100 / 103 / 106 enrollments across 2024-2025 / 2025-2026 / 2026-2027, with 103 students enrolled in multiple years. Active year is 2026-2027; all three registered years are open. Fresh transport checks remain separate from browser evidence. Main accounting uses its newly set local credential; closed-year principal UI used the fixture. `/api/ai-settings` now returns 200 with enabled OpenRouter / `openai/gpt-oss-120b` and `hasKey:true`. Root plan section **0.1j** is the latest assistant checkpoint; **0.1f** retains the finance/browser details.

**Which database.** The plan's scenarios need students who stay across years.

| Database | Good for | Not good for |
| --- | --- | --- |
| `school` (current history seed) | Volume, dashboards, finance totals, year switching and the same student promoted across years; Rim Qadiri moves CM2 → CE6 → 1AC. Existing accounting credential is in ignored `.cache/history-accounting-credential.json` | Controlled Omar/Mariam/Aya cases and principal closed-year acceptance: all registered years are open. |
| `school` (previous demo baseline, retained history) | Volume, dashboards, finance totals, page-by-page year switching | Its former 300 students were enrolled in one year each, with no mid-year transfer; all three years were open. Accounts/counts and relationships recorded for that baseline are dated evidence. |
| `school_history_test` (fixture) | Steps 1, 5 and 6: the ten students S01-S10 across 2024-2025, 2025-2026 and 2026-2027, Omar's transfer, Mariam's graduation, Aya's fee-only year; admin and principal credentials come from fixture environment variables | Volume. Principal normal Edit passed with temporary normal grants, then exact original grants restored; repeat that bounded preparation for another run. UI correction/cleanup audit metadata and defaulted gender remain. Do not automatically reset/reseed to clear them. |

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
| 7. Activation | **REMOVED 2026-10-01** by the owner: not necessary. |
| 8. RTL, mobile, keyboard, forms | **PARTIAL.** Arabic: `dir="rtl"`, `lang="ar"`, the selector's label and "(الحالية)" translated, no sideways scroll; dropdown menus stay left-to-right (finding 6). Phone: at 500 px, Chrome's narrowest window, the selector is fully visible and nothing scrolls sideways; 390 px not measured. A class filter kept across years matches by name: 2AC in 2024-2025 listed exactly that year's 11 students. Keyboard and the failed-request state are **inconclusive**: the Chrome window was hidden, so screenshots failed, focus did not move into the menu and React Query paused its retries. **2026-09-30 (Playwright): keyboard PASS, error state PASS.** Tab reaches the selector (19 presses on Students), Enter opens it on the first year, arrows move, Enter chooses 2025-2026 and closes the menu with focus back on the selector, and Escape closes it without a change. A refused list shows "Accès refusé" (Staff for the principal) and a refused record "Student not found" (finding 10); a loading dashboard, Fees header or Staff statistics show no figures instead of 0. **390 px:** the selector is fully visible (x 124-265) and nothing scrolls sideways, but the page title and the selector's year are drawn over each other, and the chat button covers the pagination's next button (finding 13, fixed the same day: no overlap on seven pages). |

### Findings

**Chrome MCP continuation, 2026-09-30, before reseed:** the initial empty Browser discovery and Chrome stale-transport failure were resolved by reconnecting the owner's Chrome MCP extension. Actual UI results:

| Case | Outcome |
| --- | --- |
| Tabs and account switch | **PASS:** independent years survived individual reloads; admin → parent → student → teacher → admin replaced data/permissions and restored admin's remembered year. |
| Fixture historical correction and audit | **PASS:** normal Edit changed/restored Ilyas S09's old section; current projection stayed unchanged; history showed actor/time/reason. Audit rows and cleanup metadata remain. |
| Fixture Omar, Mariam, Aya | **PASS:** Omar's Jan 14/15 roster transition, Mariam's active-year absence and Aya's fee-only year. |
| Forms and pending saves | **PASS:** dirty attendance/date/class/section reset, historical multipart request, and a held cleanup PUT while a second tab changed year. Same-tab selector is blocked by the modal. |
| Keyboard, Arabic and filtering | **PASS for measured cases:** focus returned after keyboard year selection; RTL menu; no overflow at actual 500 px; Fees search could recover from no matches. Prior 390 px Playwright results remain separate. |
| Receipt | Generated receipt HTML/date/amount **PASS with temporary capture**; native popup/print preview **NOT RUN**. |
| Limited-role URL UI | Parent/teacher query links and all three historical-only IDs **PASS**; student's query-link UI case **NOT RUN**. Earlier direct REST/MCP checks stay separate. |
| Principal closed-year form | **BLOCKED:** fixture principal lacks Student grants, although sign-in succeeds. Main demo's years are all open. |
| Assistant | Assistant **BLOCKED** (settings 204). Activation was later dropped from the checklist (2026-10-01). |

Three browser fixes passed focused tests, lint, full typecheck, locale check and production build; see [the ledger](academic-year-history.md) for exact scope. The owner subsequently reseeded the main database, so prior IDs/counts/relationships must be rechecked. Full owner visual acceptance remains open.

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

- [x] On Students, switch from the active year to 2025-2026. The header, list
      and count change; each student shows that year's class and section.
      Playwright 2026-10-01: 106 → 103; Rim Qadiri CE6 B in 2025-2026.
- [x] Fixture: Adam (S01) shows his 2025-2026 class, not his current one.
      Omar (S05) shows his section before the transfer date and the new one
      after it, with the dated-roster views (attendance on a day before and a
      day after).
      Playwright fixture 2026-10-01: selected-year Overview; Omar A on
      January 14, absent from A and present in B on January 15. No write.
- [x] Mariam (S04) is not in 2026-2027; Aya (S08) has 2025-2026 fees but no
      2025-2026 class.
      Playwright fixture 2026-10-01: zero current Mariam matches; past
      Mariam visible. Aya profile says Not enrolled; actual past fee GET
      returns 200 with the selected-year header and expected 1,000.00 fee.
- [x] Edit a 2025-2026 student's placement through the normal Student Edit
      form with a reason. Switch to 2026-2027: the student's current class and
      section did not change. The enrollment history shows who, when and why.
      Admin Chrome fixture 2026-09-30; principal closed-year Playwright
      fixture 2026-10-01. Original section restored; audit metadata retained.

### 2. Navigation keeps the year

- [x] With 2024-2025 selected, open profiles, Fees, Attendance, Grades,
      Exams, Payroll, Expenses, Reports and a print or receipt. Every page
      shows 2024-2025, and no URL gains `?academicYear=`.
      Playwright 2026-10-01: 16 pages and sidebar links; Reports UI context,
      Payroll June 2025. Receipt popup/PDF is the earlier same-day check;
      all-year Documents is intentional, no report export acceptance.
- [x] A dialog opened from a past-year page (a profile, a fee) shows that
      year's data.
      Playwright 2026-10-01: normal Students View, Rim Qadiri CM2 B.

### 3. Tabs, reload and account switch

- [x] Open a new tab: it starts on the last year you chose.
      Playwright 2026-10-01: 2025-2026.
- [x] Put two tabs on different years; reload **one at a time**. Each keeps
      its own year, and its reads and writes use it.
      Playwright reads/reloads 2026-10-01: 2025-2026 / 2024-2025;
      captured pending-write case is the dated Chrome fixture check.
- [x] Log out, sign in as another account. Nothing of the first account's
      year choice or data shows; the first account's remembered year comes
      back when it signs in again.
      Playwright 2026-10-01: parent/student/teacher and return to admin.

### 4. Switching quickly

- [x] DevTools > Network > Slow 4G. On Students, switch 2024-2025 >
      2025-2026 > 2026-2027 quickly. The final heading's year is the one whose
      rows appear; no rows or error from an earlier year flash under it.
      Playwright 2026-10-01 automated equivalent: real old reply held;
      every sampled animation frame's card IDs/count matches its year;
      no denied state. A real DevTools Slow 4G run was dropped by the
      owner on 2026-10-01; the held-response evidence stands.
- [x] Open an edit form, switch year, submit: the write goes to the year the
      form was opened in, or the form resets as the dirty-form rule says.
      Chrome fixture 2026-09-30: the modal blocks same-tab switching;
      historical multipart and held cleanup PUT retain 2025-2026 while
      another tab selects active. Unsaved Attendance reset also passes.

### 5. Principal and accounting

- [x] Principal edits a closed year's academic record with the normal forms,
      without reopening the year.
      Playwright fixture 2026-10-01: normal Student Edit, both saves 200;
      2025-2026 stays closed, current projection unchanged, grants restored.
- [x] Accounting uses finance pages in a past year and is refused academic
      edits.
      Authorized credentials set 2026-10-01: existing accounting Fees and
      Expenses 200 in 2024-2025; normal Student actions omit Edit/Delete,
      real Grades 403 displays Access denied; Student PUT 403, unchanged.
- [x] Paying an old year's fee today records today's date; the cash shows in
      today's month, the allocation in the fee's year.
      Fixture normal form 2026-10-01: 100 cash, October/current-year income
      +100; allocation/collection in closed 2025-2026, past cash unchanged.
      Voided once afterward; cash and paid balances zero, audit retained.

### 6. Teacher, parent and student

- [x] No year selector; the header names the active year.
      Playwright 2026-10-01: teacher/parent/student desktop, 2026-2027.
- [x] A link carrying `?academicYear=<past year>`, a past-year record ID
      typed into the URL, and the assistant asked for last year's data are
      all refused or show only the active year.
      A permanent identity readable through ownership may return 200 without
      enrollment in the active year; its class, section, placement and year
      status must be null. Require 404 for an unowned identity, not every ID
      that also appears in history (plan section 4.3).
      URL/ID UI cases passed 2026-10-01. Actual GPT-OSS conversations now
      explain the historical restriction for all three roles without calling
      tools; a historical chat URL also returns 403 for each role. These are
      authenticated SSE/API checks; admin year-switch chat passed in Chrome.
- [x] Each sees only their own or their children's records.
      Playwright 2026-10-01 Students responses exactly match SQL ownership:
      parent/student/teacher 1 / 1 / 72. Own/excluded-name filters and clear
      recovery pass. Earlier module-specific ownership evidence is separate.

### 7. Activating the next year (removed)

Removed on 2026-10-01: the owner ruled a browser activation check not
necessary. The server side (one switch, two at once, rollback) passes on
`school_history_test`. The number is kept so references to step 8 stay valid.

### 8. Language, layout and forms

- [ ] Arabic: the selector, banner and tables read right to left, and every
      year-related text is translated.
      Shared visible states pass 2026-10-01: selector label/active option,
      limited-role reset banner and fee-only Not enrolled notice match Arabic
      catalog text; menu/cards/banner/profile RTL. Preferences restored.
      Full per-module owner visual/translation review remains open.
- [x] Phone width: the selector is reachable and the cards readable.
      Playwright 2026-10-01: actual 390 × 844 Arabic Students/Fees,
      settled drawer selector, no horizontal overflow.
- [x] Keyboard only: open the selector, choose a year, close it.
      Playwright 2026-10-01: after reload, 24 Tabs; Enter/Home/arrow/Enter,
      Escape cancels without changing year; focus returned, counts checked.
- [x] An empty year shows an empty state; a failed request shows an error,
      not an empty list.
      Playwright 2026-10-01: simulated 403 and 200 [] UI branches pass and
      real 100-row historical list recovers. Fixture Behavior Rewards has
      a real 200 with empty data and the correct empty state for 2024-2025.
      Actual empty fixture draft 2023-2024 now returns Students 200 [] and
      No students yet; zero enrollments/fees/classes, return-active count 8,
      active pointer unchanged. Students no-match title fixed and verified.
- [x] Changing year resets class, section and date filters that do not exist
      in the new year.
      Playwright 2026-10-01: dirty Attendance 3AC / 2025-06-20 resets to
      CP/A / 2026-06-30 for 2025-2026; Save disabled, zero attendance writes.
