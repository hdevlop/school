# Academic-year history implementation evidence

## Loading and refused figures, and the remaining browser steps, 2026-09-30

Uncommitted in School.

- **Figures are unknown while loading or refused, not zero.** The dashboard's queries wait for the year with `enabled: isReady`, and TanStack Query reports a waiting query as not loading, so every card drew 0 or "No data" for about a second; `useDashboardHooks` now reports a query waiting for the year as loading (`untilYear`). Fees' header count now uses `isCountUnknown` with the table's own loading flag. Staff hides its statistic cards when its list failed or was refused, and Payroll does the same, guards its header count, and shows the forbidden or error state, treating a failed staff list like a failed payroll. Browser: the dashboard went from skeleton straight to "Total Élèves 100", Fees from no count to "100 étudiants au total", and the principal's `/staff` shows only "Accès refusé". Dashboard typecheck, lint of the touched files and `test:config` (287) pass.
- **Step 8 keyboard: PASS**; **step 5 old-fee payment: PASS**; **step 1 correction: refused by the attendance-and-grades safeguard** on every demo student, nothing written; **step 4 write**: not reachable in one tab (modal dialog), the save carried its form's year. Details in the checklist.
- **Finding 12.** A refused save shows "Something went wrong" instead of the server's reason; see the checklist.
- **Seen in passing.** A hydration warning on najm-kit's table filter inputs (`style={{caret-color:"transparent"}}` present in the server HTML only), once, on `/staff`.

## Guard status and the sidebar, 2026-09-30

Browser-checklist findings 8 and 9; found finding 11. Uncommitted in School.

- **najm-guard answers 403 to a signed-in user (finding 8).** Najm commit `5d886da`: a refused request that carries a user (the `USER` token najm-auth's resolver sets before any guard) answers 403; without one it answers 401. A new test failed on the old code (401) and passes; najm-guard 18 pass, and the suites of najm-auth 540, najm-mcp 52, najm-chatbot 166, najm-rag 201, najm-rate 79, najm-api 3, najm-theme and najm-whatsapp (through their own scripts) pass. **Released** after the owner widened the session's permissions: `najm-guard@2.2.0` (Najm `1e5b1b8`, pushed with `5d886da`), pinned in School's root and server manifests. The demo database then received the seed's 29 missing role grants (insert only; accounting 3, teacher 6, parent 10, student 10). On 2.2.0 the transport suites that pinned 401 for a signed-in account refused by a guard now expect 403 (`RouteSecurityTransport` storage and timetable cases, and 13 `*HistoryTransport` files: a principal, librarian, outsider or limited account); requests with no token or an invalid one still expect 401. `test:security:transport` 9 + 3 pass; the 40 `*HistoryTransport` files 120 pass, 0 fail; `bun run typecheck` and `bun run test` (including the Najm pin check) pass.
- **Browser on 2.2.0 and the synced grants** (dev server, demo database, fresh sign-ins): parent, student and teacher get 200 from Alerts, Announcements, Assessments, Exams, Events, Behavior rewards, Discipline and Attendance and 403 from Fees and Staff; accounting gets 200 from Students, Classes, Sections and Fees and 403 elsewhere; the principal gets 403 from Behavior rewards, Discipline and Staff. The principal's `/staff` shows "Accès refusé" within about 4 seconds after one `/api/staff` request and no refresh-and-retry (about 10 seconds before). The parent's menu again lists My children, Alerts, Announcements, Conduct, Assessments, Exams, Calendar and Routine. Still open: `/staff`'s statistic cards show 0 above the refusal, and `/behavior-rewards` redirects the principal to the dashboard by its own page rule.
- **The sidebar follows the route guards (finding 9).** `apps/dashboard/src/shared/DashboardShell/navigationAccess.ts` states, for each page, the guard of its main list route: a permission (`read:students`, …) checked with najm-auth's `usePermissions().can`, or the role group the route uses (`isAdmin`, `isFinancial`, `isStaff`). `createSidebarItems` gives each entry its rule, and a group without a visible page disappears. The family menu keeps its labels and is filtered the same way. `navigationAccess.test.ts` pins accounting, principal, administrator, a parent and an unknown session; `test:config` now includes `apps/dashboard/src/shared` (287 pass). Dashboard typecheck and lint of the shell pass.
- **Browser**, on the demo database: accounting sees Dashboard, Financial (Fees, Expenses, Fee Types, Reminders) and Notifications, and Fees lists 2024-2025's 100 students; the principal sees the school dashboard (100 students, 150 teachers, finance cards) and Financial; the teacher sees Dashboard, Students, Parents, Teachers, Attendance, Conduct, Grades, Routine and Academic. The server refuses the teacher `/api/alerts`, `/announcements`, `/assessments`, `/exams`, `/events` and `/cycles` (401 on najm-guard 2.1.0), the pages the menu no longer offers.
- **Finding 11.** The demo database's role grants lag the seed, and the seed itself gives teachers no `read:assessments` or `read:exams` and accounting nothing; see the checklist.
- **Seen in passing.** While the year resolves, the school dashboard's cards show 0 and "No data available" for about a second, and Fees' header says "0 students total" under its skeleton: the loading-as-empty pattern of finding 5, not yet fixed there.

## Refused records and lists, 2026-09-30

Fixes browser-checklist finding 10. Uncommitted in School.

- **The profile.** `features/Students/components/StudentProfile` drew a refused or missing student as an empty one ("Unknown", 0 absences, MAD 0.00). It now shows "Student not found" for 404, the forbidden state for 401/403 and an error with retry otherwise, keeping the header and year selector; `useStudentProfile` returns the error and `refetch`.
- **`isAuthorizationError` never matched.** najm-auth builds every entry point with `splitting: false`, so `najm-auth/client/server` (School's `auth.api`) throws its own `AuthError`, and `instanceof` against the class `najm-auth/client` exports was always false. Every table's `renderError` fell through to the generic error, and `AgingDetailTable` to its generic text. `services/apiError.ts` now reads the status from any error named `AuthError`, and adds `isNotFoundError`; `AgingDetailTable` uses the helper.
- **Tests.** `apps/dashboard/src/services/apiError.test.ts` failed on the `instanceof` check with a second copy of the class and passes; `test:config` now includes `apps/dashboard/src/services` (282 pass). Dashboard typecheck and lint of the touched files pass.
- **Browser**, as the parent `danyaltanjaoui3495@live.com`: `/students/rddm0` shows "Student not found"; `/students/gGSGC` (the parent's own child) opens normally; `/teachers` shows "Access denied" after the query's retries, about 10 seconds.

## Browser acceptance, third pass: roles, 2026-09-29

Playwright against the owner's dev server and the demo database `school`, with the owner's standing permission to create test data there. The active year is 2026-2027. Details and findings 8-10 are in [the browser checklist](academic-year-browser-checklist.md).

- **Accounts.** Created `principal.test@demo.local` and `accounting.test@demo.local` through `POST /api/users`. Set the password `Demo#Test2026` through `PUT /api/users/:id` on nine seeded accounts: the 2025-2026 family and teacher picked first (`afna.baraka4591@protonmail.com`, `tawfiqbouchaara2925@live.com`, `i.amrani8478@gmx.com`), a 2026-2027 family without grades (`f.boumehdi3124@mail.com`, `amrani.bilal.244@web.de`, `hakimi.amal.650@zoho.com`) and the family and teacher used for the grade checks (`danyaltanjaoui3495@live.com`, `yasmina.tanjaoui6639@yandex.com`, `mernissi.chahinez.188@hotmail.com`).
- **Step 6 PASS with finding 10.** Past-year header, query value and record IDs are refused for teacher, parent and student; each sees only their own records, and the teacher's 64 grades equal the SQL evaluation of `GradeForTeacher`.
- **Step 5 PASS with findings 8 and 9.** The principal edits a past-year grade with that year selected (set back afterwards); accounting is refused academic writes and reads Fees in 2024-2025. The old-fee payment is not run.
- **Not changed.** No School or Najm code changed in this pass.

## najm-auth 4.2.3: refreshes sharing one cookie, 2026-09-29

Resolves the open revocation at 20:36:29 in the entry below; the owner had not signed out. Najm commits `7e62360` (fix) and `bef574d` (release), pushed to `master`; `najm-auth@4.2.3` is published. School's root pin, its override and the dashboard, server and seed pins name 4.2.3, and `bun.lock` resolves only 4.2.3. Uncommitted in School.

- **Cause.** Tabs share one refresh cookie, and Chrome aligns the timers of hidden tabs, so several refreshes presented the same token at once. On 4.2.2 the first rotated it, a second claimed the single-use grace slot and rotated again, and a third matched neither the current nor the previous hash and revoked the family as a stolen token. A request that lost the conditional rotation got a 401, and the client answered any refresh failure with `/auth/logout`, which carried the winner's live cookie and revoked every tab's session.
- **Fix.** A rotated refresh token is rebuilt from the token it replaced (an HMAC jti, and the expiry the family row records). Inside the 120-second grace window, presenting the replaced token rotates nothing and returns a new access token and that same successor, however many times, so the jar ends up with the current token whichever response lands last. A request that loses the rotation race is served the same way, and a rotation whose response never reached the browser recovers. The client no longer calls logout after a 401 refresh. Reuse after the window, or of a token the family never issued, still revokes the family.
- **Reproduced first.** `packages/server/tests/acceptance/ConcurrentRefreshTransport.test.ts` signs in on `school_history_test` and keeps a cookie jar. On 4.2.2 three refreshes sent together answered `[200, 200, 401]` and the replaced cookie presented twice more answered `[200, 401]`. On 4.2.3 both answer 200 throughout, every concurrent response sets the same refresh cookie, a lost response recovers, and the session keeps refreshing afterwards (3/3). It now runs as the second half of `test:security:transport`; the two files cannot share one process because a stopped Najm server does not listen again. In Najm, `concurrent-refresh-db.test.ts` (real SQLite repository) and a client test failed on 4.2.2 and pass; najm-auth 540 pass, 13 skipped, 0 fail; build and `api:check` pass.
- **The dev server exhausted PostgreSQL.** While testing, every new client got `53300 too many clients already`: the running Next dev server held 99 of 100 connections. `packages/server/src/database/db.ts` made a postgres.js pool (up to 10 connections) on every evaluation, and Next evaluates it again on hot reload and in each module graph, never closing the old pool. It now keeps one pool per connection string on `globalThis`. After the dev server restarted at 20:40 it held 8.
- **Gates.** `bun run typecheck`, lint of the touched files, `bun run test:boundaries` (28, boundaries passed), `bun run test` (config 280, access reset 60, routines 13, academic years 342, teacher dashboard 17, ownership 172, security 3, boundaries 28; 0 failures) and `test:security:transport` (9 + 3) passed.
- **Browser PASS.** Dev server restarted on 4.2.3 with `ACCESS_EXPIRES_IN=1m` (a temporary `.env.local` line, removed afterwards). Three tabs (`/students`, `/teachers`, `/`) signed in as the admin refreshed in the same second every 48 s: 21:12:59, 21:13:47, 21:14:35, 21:15:23. All 12 refreshes answered 200 and no tab sent `/auth/logout`. After four rounds `/api/auth/me` answered 200, the family stayed `active`, and the owner's own Chrome session stayed `active` too. PostgreSQL held 20 connections.

## Browser findings fixed, 2026-09-29

Uncommitted. Fixes for findings 2, 3, 5 and 6 of [the browser checklist](academic-year-browser-checklist.md); finding 1 was fixed in najm-auth 4.2.2 (entry below).

- **A session that ends on an open page now reaches sign-in.** `shared/useSessionExpiryRedirect.ts`, used by the dashboard shell, listens for najm-auth's `sessionExpired` and does a full navigation to the configured login route with `from=<path>`, as the proxy's own redirect does. A normal logout emits `logout`, so the sign-out button still clears UI preferences before it navigates. Seen working at 20:36: when the admin's session family was revoked, the open tabs went to `/login?from=/students` and `/login?from=/teachers` instead of staying in a 401 shell. The cause of that revocation is not established; see open items.
- **Payroll opens a past year on its last teaching month.** `Payroll/config/payrollPeriods.ts` lists the year's periods and picks the shown one: the picked period while the year has it, else the business day's month kept inside the year by `dateWithinYear` (June for a past year, September for a future one). The initial month now comes from the school's business date, not the UTC month of `toISOString()`. Tests: `payrollPeriods.test.ts`, 7 cases.
- **List headers do not say "0" while loading.** `isCountUnknown(error, rows, isLoading)` in `services/apiError.ts` adds the query's first-load flag to `hasFailedToLoad`; the 21 list headers that guarded their count with `hasFailedToLoad` use it with the loading flag they already pass to `NTable`. CLAUDE.md's "failed list" contract names it.
- **Radix menus follow the page direction.** Six Radix packages had their own `@radix-ui/react-direction` (five at 1.1.1, the slider's a separate 1.1.2), so najm-kit's `DirectionProvider` never reached menus, selects, radio groups or tabs. A root override pins 1.1.2; the lockfile dropped the nested entries, and the stale folders Bun left in `node_modules` were removed. `scripts/tests/radix-direction.test.mjs` (part of `test:boundaries`) fails when a second copy is installed; it failed before the fix with six extra copies. Takes effect after a dev-server restart.
- **Gates.** `bun run lint` (the existing `activeLabel` warning only), `bun run typecheck`, `bun run test` (config 280, access reset 60, routines 13, academic years 342, teacher dashboard 17, ownership 172, security 3, boundaries 28; 0 failures) and an isolated production build (`NAJM_NEXT_DIST_DIR`, removed afterwards) passed.
- **Browser confirmation, after the owner restarted the dev server and signed in.** Payroll opened 2024-2025 on June 2025, 2025-2026 on June 2026 and 2026-2027 on September 2026; June 2026 showed MAD 700,384 with 34 pending, equal to its 100 payslips in the database. With 2026-2027 student requests held 3 s, the Students header showed no count while loading, then "100 students total" (previously "0 students total"). In Arabic the Radix menus carried `dir="rtl"` (previously `ltr`); the capture read the language menu, which uses the same Radix menu package as the year selector. The language was set back to English; the owner's other tab stayed in English.
- **Open, since resolved.** The revocation at 20:36:29 (`k6h7g…`), with later sign-ins at 20:37:27 (still active) and 20:37:33 (revoked 20:38:35): if the owner did not sign out, it points to three refreshes presenting one token at once, which najm-auth still treats as reuse because its grace window allows a single reuse. The owner had not signed out; fixed in najm-auth 4.2.3 (entry above).

## Browser acceptance, second pass on najm-auth 4.2.2, 2026-09-29

Uncommitted. Same setup as the first pass below, after the dev server was restarted on 4.2.2 and the owner signed in again. Details are in [the browser checklist](academic-year-browser-checklist.md).

- **Step 3 PASS.** Two tabs on 2025-2026 and 2024-2025 reloaded together three times; both stayed signed in with their years, and the session family stayed `active` with a grace deadline 2 minutes after its refresh (it was an hour before on 4.2.1).
- **Step 4 PASS (read part).** 2025-2026 requests were held 4 s in the page and 2026-2027 chosen 0.4 s after 2025-2026, so the older answer arrived last. The page ended and stayed on 2026-2027, and its six visible names are all 2026-2027 students (database check). While loading, the header read "0 students total".
- **Step 8 PARTIAL.** Arabic sets `dir="rtl"` and `lang="ar"` and translates the selector; Radix menus stay `dir="ltr"` (no `DirectionProvider`). At 500 px (Chrome's narrowest window) the selector is visible and nothing scrolls sideways. A class filter kept across years matches by name: 2AC in 2024-2025 listed exactly that year's 11 students. Keyboard and failed-request checks were inconclusive: the Chrome window was hidden (`visibilityState: hidden`), so screenshots failed, focus stayed on the trigger and React Query paused retries.
- **Not run / blocked.** In-flight writes, account switch, activation; roles without accounts.

## najm-auth 4.2.2: stored timestamps read as UTC, 2026-09-29

Fixes the sign-out found in the browser pass below. Najm commits `d4f6c95` (fix) and `5000055` (release), pushed to `master`; `najm-auth@4.2.2` is published as `latest`. School's root pin, its override and the dashboard, server and seed pins name 4.2.2; the lockfile holds no 4.2.1. Uncommitted in School.

- **Cause.** najm-auth writes deadlines with `toISOString()` into PostgreSQL `timestamp without time zone` columns and read them back with `new Date()`, which takes a zone-less string as local time. On a UTC+1 server the refresh grace deadline (`tokens.previous_valid_until`) had passed an hour before it was written, and a login lockout (`users.lockout_until`) ended before it began.
- **Fix.** `storedTimeMs()` reads a value with no zone as UTC and keeps a zone the value carries (SQLite ISO strings, `timestamptz` output, `Date`). The three refresh grace checks and the lockout check use it; the SQL comparisons already compared UTC with UTC and are unchanged. Existing rows need no migration.
- **Najm tests.** New regressions for the grace window and the lockout run in `Asia/Tokyo` so they fail on a UTC machine too; both failed with the old parsing and pass with the fix. `stored-time.test.ts` covers four zones and zoned values. najm-auth suite 533 pass, 13 skip (the real PostgreSQL/Redis files), 0 fail, plus 13 RSC; build and the release script's build, test and public API checks passed.
- **School gates.** `test:boundaries` 26/26 (including the Najm pin test), `typecheck`, and `bun run test` (0 failures) passed. `test:security:transport` failed once in setup without an error message right after the install, then passed 9/9 twice.
- **Open.** The running dev server must be restarted to load 4.2.2, and the two-tab reload re-checked in the browser.

## Browser acceptance, first pass, 2026-09-29

Uncommitted. Plan section 11.3, run by Claude in the owner's Chrome, signed in as the demo admin, against the demo database `school` on `localhost:3102`. Database figures come from read-only queries. The step-by-step list and its open steps are in [the browser checklist](academic-year-browser-checklist.md). No code was changed.

- **Demo data.** Three `open` years; 300 students, 100 enrolled in each year and none in two, each with one open-ended placement and an `active` enrollment; 150 teachers; no principal or accounting account. It cannot show one student across years, a mid-year move or a mixed-year receipt; the fixture `school_history_test` can.
- **Passed.**
  - A new tab restored the remembered year (2025-2026). Students in 2025-2026 and 2024-2025: 100 each, names, classes and sections equal to those years' placements.
  - Teachers, Fees, Student attendance, Grades, Exams, Payroll, Expenses, Alerts and the Dashboard kept 2024-2025 through sidebar navigation. 17 captured API requests carried `X-Academic-Year: 2024-2025`; none carried `?academicYear=`.
  - Dashboard, 2025-2026: income MAD 1,181,364, expenses MAD 4,830,070, collection 72.9%. 2024-2025: MAD 1,120,374, MAD 4,743,330, 72.3%. Each equals completed allocations to that fee year, paid payslips in its periods, and allocations over non-cancelled installments. Exams: 18 per year, as stored.
  - Two tabs on 2025-2026 and 2024-2025 kept their own years through a reload (`sessionStorage`).
- **Found.**
  - Reloading both tabs together revoked the admin's session family (`tokens.status = revoked` at 17:53:36; `/api/auth/refresh` 401). Cause, in najm-auth 4.2.1: the grace deadline is written with `toISOString()` into `timestamp without time zone` and read back as local time, so on a UTC+1 server it lies an hour before the refresh that set it (row `b9km…`: `updated_at` 18:44:05 local, `previous_valid_until` 17:46:05 UTC). Plan trap 23.
  - After that, neither tab left the shell for the login page: shortened sidebar, no year selector, "No data available" and "0 alerts / Loading..." while every request answered 401. Plan trap 24.
  - Payroll opens 2024-2025 on August 2025, which has no payslips (MAD 0.00 for 150 staff).
- **Not run.** The historical placement correction (writes audited rows), rapid switching, account switch, activation, RTL/mobile/keyboard. **Blocked:** principal, accounting, teacher, parent and student steps (no accounts or unknown passwords in `school`).

## Najm 3.0 guard adoption: review and follow-ups, 2026-09-29

The adoption is in commit `23ba818`; the follow-ups below are uncommitted. No browser review or deployment is claimed.

- **Adoption reviewed (Najm commit `8d9c2c8`).** najm-core, najm-api and najm-storage 3.0.0, najm-guard 2.1.0, najm-mcp 2.2.2, najm-auth 4.2.1 and najm-theme 0.2.2. The Najm sources match these pins.
  - najm-core mounts only the controllers that `.load()`, `.scan()` or a plugin's `.services()` declares. In development it warns about imported ones it skips; School's only one is `StorageStudioController`.
  - najm-guard's `default` guards apply to methods that declare none and are not `@Public()`, and najm-mcp applies the same decision to tools. School registers `guards({ default: [isAuth()] })` before `auth()`. najm-auth, najm-theme and School mark their deliberately public routes `@Public()`.
  - najm-storage: `manageGuards` covers listing, file info, upload, delete, namespace delete, the studio and the MCP tools; `guards` covers serving. MCP needs explicit guards. `storage_upload_from_path` exists only with `mcpUploadFromPath.allowedRoots`, stays inside them after `realpath`, and is refused in production unless allowed. `DELETE /:namespace/files` now reaches `deleteNamespace`. Optional controllers answer 404 when their feature is off, and so does `RegistrationController` when `publicRegistration` is false. School uses `guards: [isAuth()]`, `manageGuards: [isAdmin()]` and `mcp: false`; `guardStorageRoutes()` is gone.
  - On the running server: 679 routes. By the guards that run, 25 are open and 24 are behind sign-in alone, all on the reviewed lists, and none relies on the default. Without sign-in, appearance, branding, health and logout answer. The cron triggers refuse a missing secret themselves (401), storage listing asks for sign-in (401), and the studio is not mounted (404).
  - All 73 acceptance files passed one at a time (208/208), with `bun run test`, typecheck, lint, i18n, build and `db:check`.
- **Follow-ups.**
  - `RouteSecurityTransport.test.ts` sorted routes by the guards they declare, so a public route that lost `@Public()` would have demanded sign-in unnoticed. It now uses `getEffectiveGuards` with the running server's guard config. It checks that the server has the default, fails on any route that relies on the default alone, and calls the public routes without sign-in in a new test.
  - `apps/dashboard` declared najm-kit 2.16.11 and `packages/seed` najm-auth 4.1.0, against the root's 2.16.12 and 4.2.1; the overrides had installed the root versions. Both are fixed, with `bun.lock`; the installed packages did not change. New `scripts/tests/najm-pins.test.mjs`, in `test:boundaries`, checks every workspace's Najm pins against the root and each pin against its override.
  - `config/storageRoutes.ts` held only a list that the unit test used; the list moved into the test.
  - Plan traps 13 and 22, `CLAUDE.md` and `AGENTS.md` now describe the default guard and `@Public()`.
- **Gates after the follow-ups.**
  - `bun run check` passed: lint with 0 errors (the existing `activeLabel` warning), typecheck, i18n, build and `db:check`.
  - `bun run test` passed: config 273, access reset 60, routines 13, academic years 342, teacher dashboard 17, ownership 172, security 3, boundaries 26.
  - `test:security:transport` passed 9/9.
  - The follow-ups change no server runtime code, so the other acceptance files were not rerun.
- **Upstream notes, not changed here.**
  - `storage()` appends its guards to the shared classes on every call, so a second call in one process (a second test server, a development reload) adds a duplicate set.
  - `storageFeatureGate` replaces `route.handler`, so a gated route's `@Validate` schema would be missing from OpenAPI output. Storage routes have none.

## Auth and account-management helper removal after security review, 2026-09-28

Uncommitted. This follow-up supersedes the auth-wrapper implementation and route totals in the original security record below; its broader verification results remain historical.

- Removed the entire `auth-tools` module, its module export and the obsolete `MCP_AUTH_TOOLS` environment option. This includes `sameLimitAs`, all duplicate `/tools/auth/*`, `/tools/users/*`, `/tools/roles/*` and `/tools/permissions/*` routes, and their MCP tools. The dashboard already uses Najm's built-in auth, user, role and permission routes.
- Reason: copied rate-limit decorators protected only the wrapper's REST routes. The installed MCP executor skipped that middleware; six consecutive duplicate-email registration calls still reached the service. Removing the redundant wrapper closes that path without another limiter implementation.
- MCP clients log in through `POST /api/auth/login` and then send its access token as their bearer token. Account, role and permission management now uses REST only. Updated the repository's operator instructions and environment template.
- Focused verification: security unit tests passed 2/2; fixture transport tests passed 8/8. They check absent auth/user/role/permission tools (including attempted calls), no mounted routes under the removed prefixes, and 404 on removed auth routes and management collections for anonymous and admin callers. Built-in `/users`, `/roles` and `/permissions` still answer admin reads; creating a user with explicit active status still permits sign-in. Built-in registration retains pending status, privileged-field stripping and the sixth-attempt rate limit. The reviewed controller-route lists contain 25 public routes and 24 sign-in-only routes; directly mounted MCP endpoints are outside that metadata audit.
- Server and server-test typechecks and `bun run build` passed after removing all account-management wrappers. `bun run lint` passed with the existing `activeLabel` warning. No browser or deployment acceptance is claimed.

## Route security: storage, self-registration and timetables, 2026-09-28

Uncommitted. Not a plan row: found during the full-plan review. No browser review or deployment is claimed.

- **Found.**
  - Plugins mount every controller they import, whatever their options say (trap 22). najm-storage's studio was served although School sets `studio: false`, with no guard at all: it answered listing, upload, move and delete requests with no sign-in.
  - The storage file routes had `guards: [isAuth()]` throughout, so any signed-in account, including one with no role, could list, overwrite or delete every stored file, or a whole namespace.
  - `mcp: true` exposed five storage tools with no guards. `storage_upload_from_path` copied any file the server can read, `.env.local` included, into storage, where it could be read back.
  - Self-registration (`/auth/register`, and School's `/tools/auth/register`) created an active account with no role. It could sign in at once and call every route that asks only for sign-in, timetables included. `/tools/auth/register` also accepted `roleId`, `status` and `emailVerified` from the body. It had no rate limit, and neither did `/tools/auth/login` or `/tools/auth/refresh`.
- **Fixes.**
  - `config/storageRoutes.ts`: `guardStorageRoutes()` puts najm-auth's `isAdmin()` on the studio and on `listFiles`, `getFileInfo`, `uploadFile`, `deleteFile` and `deleteNamespace`. It runs before the router builds its middleware, and applies each guard only once. Serving and previews stay open to every signed-in account (avatars). School's services write files through `StorageService`, which these guards do not affect. `mcp: false`.
  - `registrationMode: 'pending'`: a self-registered account waits until an administrator activates it, and login answers 403 (`accountInactive`). Accounts School creates pass `status` explicitly. najm-auth's `inviteUser`, `provisionUser` and `seedAdminUser` already did; School's users tool and `DriverService` now do. najm-auth's own `POST /users` without a status now creates a pending account; the dashboard does not use that route.
  - The auth tools validate with najm-auth's `registerDto` and `loginDto`. They take the rate limits of najm-auth's own `/auth/register`, `/auth/login` and `/auth/refresh`, read from those routes.
  - The six class-routine reads ask for `read:classes` instead of sign-in alone. Every seeded role the dashboard shows the timetable to (admin, teacher, parent, student) holds it, and so does the principal. Nurse and driver do not, and are not shown it.
  - The registration message now says the school reviews the account before sign-in (four locales).
- **Tests.**
  - New `tests/security/RouteSecurity.test.ts` (`bun run test:security`, part of `bun run test`) passed 3/3:
    - admin guards on the studio and on each file-management route, none added to serving, `guardStorageRoutes` idempotent, and the `StorageController` route list pinned;
    - `read:classes` on each timetable read, and no class-routine route behind sign-in alone;
    - the auth tools' schemas and rate-limit options are najm-auth's own.
  - New `RouteSecurityTransport.test.ts` (`test:security:transport`) passed 8/8 on port 5530:
    - of the 731 mounted routes, the 28 with no guard and the 26 behind sign-in alone match reviewed lists;
    - the studio answers 401 with no sign-in, with no role, and with only `read:classes`, and 200 to an administrator;
    - an uploaded file cannot be listed, read, overwritten or deleted by non-administrators, is served to them, and gets 401 with no sign-in;
    - there are no `storage_` MCP tools; `class-routines_get_periods` is refused with no role and runs with `read:classes`;
    - REST timetables answer 401 with no role and 200 with `read:classes`;
    - `/auth/register` and `/tools/auth/register`, the latter sent `roleId`, `status` and `emailVerified`, leave a pending account with no role; login answers 403; the sixth register try for one address answers 429;
    - an account made through the users tool is active and signs in.
  - The suite adds a role, a `read:classes` permission when the fixture has none, and two accounts. It removes them, every account it registered, and its probe files.
- **Reviewed and left as they are.** The unguarded financial cron routes check `FINANCIAL_CRON_SECRET` themselves. OAuth routes answer 404 for a provider School has not configured. `/ai-settings` hides the API key. The operations KPIs are counts narrowed by ownership.
- **Gates.**
  - All 73 acceptance files passed one at a time (206/206).
  - `bun run test` passed: config 273, access reset 60, routines 11, academic years 342, teacher dashboard 17, ownership 172, security 3, boundaries 24.
  - `typecheck`, `i18n:check`, `build` and `db:check` passed. Lint has 0 errors (the existing `activeLabel` warning).
  - The fixture is back to 12 users, 2 roles and 14 permissions.
  - The step that temporarily undoes each fix to watch its test fail was not run.
- **Operator follow-up.**
  - Active accounts with no role can still sign in and reach sign-in-only routes; review them in production.
  - If a deployment exposed the studio or the storage MCP tools, review its access and consider rotating its secrets.
  - Upstream Najm:
    - plugin controllers are mounted regardless of their options;
    - the storage MCP tools have no guards;
    - `uploadFromPath` has no sandbox;
    - `DELETE /:namespace/files` reaches `deleteFile` and answers 400.

## Teacher child visibility and partial update follow-up, 2026-09-28

Uncommitted. Owner visual/browser review, production migration and deployment remain open.

- A teacher's parent-children reads now require a taught placement in the selected year, in addition to Student ownership. The 2026 fixture shows Aya and Omar, and excludes Mariam, whom the teacher taught only in an earlier year. The 2025 fixture shows Mariam and excludes Omar after his transfer. The current student projection does not replace the selected year's placement. `ParentsHistoryDatabase.test.ts` passed 3/3 with transaction rollback; `ParentsHistoryTransport.test.ts` passed 5/5.
- Eleven update DTOs (Alerts, Assessments, Events, Exams, Parents, Sections, Students, Teachers, Vehicles, routine periods and routine schedules) now leave omitted create-default fields out of partial updates. The Students change prevents an unrelated edit of an inactive student from receiving an implicit `active` status and failing validation; its service does not write status through this route. Allocations has no public update route. `PartialUpdateDefaults.test.ts` passed 11/11.
- Staff-role creation no longer ignores access-grant failures or role-lookup failures. It skips existing grants and duplicates in the request, and one transaction covers RBAC role creation, grants and the staff-role row. `StaffRoleGrantFailures.test.ts` passed 2/2. Authenticated `StaffRoleGrantRollbackTransport.test.ts` passed 2/2: a failed later grant rolls back a new RBAC role and its earlier grant, or a new grant to an existing RBAC role, and leaves no staff-role row.
- Authenticated one-field update regressions cover Alerts by REST and MCP, Assessments, Events, Exams, Parents, Sections, Students, Teachers, Vehicles, routine periods and routine schedules. They preserve nondefault stored values. The vehicle table has no image column, so the original report's claim of a persisted vehicle-image reset was inaccurate. Allocations has no public update route. All 72 acceptance files passed one at a time on the marked local test database (198/198 tests); the base fixture gate passed again afterward (3/3). `bun run test`, `bun run typecheck`, `bun run i18n:check`, `bun run db:check`, and `bun run build` passed; `bun run lint` passed with the existing `activeLabel` warning. Dashboard edit forms were reviewed in source. Browser review could not run because no browser session was available; production acceptance remains open.

## Staff shared identity and dated assignments (row 33), 2026-09-28

Uncommitted. Rows 34-35 were done in parallel by another session and are recorded there. No browser review or deployment is claimed.

- **Classification.** No migration; not in `yearScope`, no year input on any `staff` or `zones` tool.
  - Shared, the same in every year: the staff record, its role, contact and pay fields, and its employment dates (`hireDate`, `endDate`, `status`). The role and zone catalogs.
  - Dated, all years listed: cleaner and security zones, accountant cycles, bus-assistant vehicles and assistant classes (`startDate`/`endDate`, the end day inclusive), and a driver's vehicle assignments (row 42, the unassignment day exclusive). Staff reads return every year's rows, each with its dates and a `current` flag for the business day.
  - Owned by other modules: payslips (row 22), staff attendance (row 04) and timetable duties (row 07). All three restrict the staff delete in the database.
- **Fixes.**
  - Every staff update with assignments deleted every year's rows and inserted the request again. The form sends back every row it loaded, so ids, and for assistants dates and status, were lost on each save. `StaffAssignmentRepository.syncCurrentForRole` now keeps ended rows. A request row updates the row with the same target and start date, or the current row with the same target; other rows start on the business day. Current rows the request leaves out end that day; a row that has not begun yet is removed.
  - A driver's save deleted every year's vehicle assignments and inserted each vehicle again as active from the database's today, so ended assignments became current and overlapped. Ended rows sent back are now ignored; the same current vehicle is a no-op. A different vehicle ends the current one on the business day and starts the new one through the new `VehicleAssignmentService.assignDriverFromToday`, which uses row 42's `assignDriver` rules. Two current vehicles are refused (400).
  - A role change deleted the old role's assignments; they now end on the business day. Leaving the driver role deletes the driver profile with its vehicle rows, so a driver with any vehicle history keeps the role (409). **Owner decision:** keep this refusal, or allow the change and keep the driver profile.
  - `updateStaffDto` was `partial()` of a schema with defaults: an update naming only a phone number set `status` back to `active` and `compensationMode` to `monthly`. It now changes only named fields.
  - An update carrying only assignments sent an empty `SET` and failed with 500 "No values to set".
  - Deleting a staff member with payslips, attendance or duties, and a zone any year's assignment names, failed on the foreign key with 500. Both now answer 409 before anything is deleted.
  - The attendance roster defaulted to the server's local date; it uses the business date.
  - Dashboard: the staff form loads only current assignments, and the table lists only current ones.
- **Tests.**
  - New `StaffHistory.test.ts` (7): update DTO, driver reassignment only through the vehicle service, two vehicles 400, cleaner sync with the business date, role change ends the old role, driver history refusal, delete refusals before any write, roster date, the inclusive end day. `SeedDependencyWiring.test.ts` follows the new `StaffService` dependency.
  - New `StaffHistoryDatabase.test.ts` passed 3/3, rolled back, business date 2026-09-27. A cleaner with a 2024-2025 hall row and a current one: sending the current row back changes nothing; the yard ends the hall on 2026-09-27 and starts on it; a correction updates in place; a role change ends it all; a future row left out is removed. `current` flags, history counts and zone assignment counts.
  - New `StaffHistoryTransport.test.ts` passed 7/7 with 48 assertions on port 5529, business date 2026-09-27, while the server clock read 2026-09-28. It covers:
    - the same staff record under no year, 2024-2025, 2025-2026 and 2026-2027, and a driver's dated assignments with their flags;
    - a cleaner moved to the yard, and a driver saved with the form's rows (history unchanged) then moved to bus B;
    - two vehicles 400, leaving the driver role 409, a partial update keeping `inactive`/`hourly`;
    - the default roster leaves out someone hired on 2026-09-28;
    - delete 409 with a staff attendance mark, and zone delete 409 and 200;
    - MCP `staff_update` partial and `staff_get_staff_member` with no year input.
  - It creates two zones, two vehicles, four staff and a driver, and only the missing catalog roles, and removes them all.
- **Re-runs.** Vehicle assignments transport 2/2, Drivers transport 2/2, Vehicles transport 2/2.
- **Gates (rows 32 and 33, on the tree with rows 34-35).** Lint 0 errors (the existing `activeLabel` warning); typecheck exit 0; `bun run test`: config 273, access reset 60, routines 11, academic years 324, teacher dashboard 17, ownership 172, boundaries 24; `i18n:check` no missing keys; build PASS. The step that temporarily undoes each fix to watch its test fail was not run.

## Settings shared record and the active-year pointer (row 32), 2026-09-28

Uncommitted. No browser review or deployment is claimed.

- **Classification.** One settings row, shared by every year and not in `yearScope`. The active year is that row's pointer, read by `findWithActivePointer` from the newest row; only academic-year activation moves it (`switchActiveYear`).
- **Fixes.**
  - `POST /settings` (admin or principal, MCP `settings_create`) inserted a second row. The newest row holds the pointer, so it switched the active year and registered an open year without activation's checks. Settings are now created once; later creates answer 409 with the translated `settings.errors.alreadyExists`. Seeds create settings only on an empty database (`reset:demo`, `seedSystem`); `seed:school` on a populated database now stops there instead of switching years.
  - `updateSettingsDto` was `partial()` of a schema with defaults, and `@Body()` receives the parsed result. An update naming one field reset time zone, currency, language, formats, every switch, maintenance mode and the start and end months. The time zone decides the school-local day of year boundaries, and a school whose year starts outside September got 409 on every such save. Defaults now live only in `SettingsService.create`.
  - Dashboard: the active year was a select of five computed years, and the server refused any change. It is now read-only, with a note that it changes when a registered year is activated. The form schema no longer submits `startMonth`, `endMonth`, `maintenanceMode`, `maintenanceNotifications` or `autoBackup`, which the form never shows.
  - `settings.errors` was missing in `ar` and `es` (trap 12); `idExists` was missing everywhere. The unused `getAll`, `delete`, `validateX` and duplicate existence reads are gone.
- **Tests.**
  - `SettingsYearPointer.test.ts` (6): the partial DTO, a second installation refused with no write and no year, a first installation with defaults and its registered year, and the existing pointer and month rules. `settingsSchemas.test.ts` pins that the form submits none of the fields it does not show.
  - New `SettingsHistoryDatabase.test.ts` passed 3/3, rolled back. The same row under 2024, 2025 and 2026. A partial update changes only the name after the time zone, currency, language and switches were set away from their defaults. A second installation and a pointer move are refused, and the settings count, year count and the pointer to `history-year-2026` do not change.
  - New `SettingsHistoryTransport.test.ts` passed 4/4 with 46 assertions on port 5528. It covers:
    - `/settings/public` for a role with no permissions under no year and each year;
    - admin and principal partial updates, and 401 for other roles;
    - pointer and month changes 409, and `POST` 409 for admin and principal with no 2027-2028 year;
    - MCP tools with no year input, a partial `settings_update`, and a refused `settings_create`.
  - The suite restores the settings row exactly.

## Enrollment and Student slices (rows 34-35), 2026-09-28

Uncommitted in the owner's existing working tree, after the published ownership
API adoption. Preserve the concurrent settings/staff and validator cleanup.
Owner visual/browser review remains **OPEN / NOT RUN**. Production migration,
Git publication and deployment were not performed.

### Row 34: studentEnrollments

- **Inventory.** Administrator/principal REST: detail, create, transfer, end,
  and correction `PUT /student-enrollments/:id`. These routes are registered
  under `student-enrollments`; ordinary detail/transfer/end/correction find
  records only in the selected year. Existing public create `academicYearId`
  stays compatible but must match that resolved selection. This controller
  remains REST-only. All-year student enrollment history, explicit-year
  transition/activation rosters, source checks and seed reset remain named
  trusted operations; their years are not inferred from request selection.
- **Correction contract.** The request identifies a placement, gives the
  corrected enrollment status/start/exclusive exit and placement dates, and
  supplies the entire original enrollment/placement state plus a reason.
  A locked enrollment row serializes corrections with transfers and exits;
  a changed original state returns 409. Validate admission, registered year,
  class/section agreement, interval bounds and non-overlap. Reject a correction
  that leaves recorded attendance or grade sources without their dated section.
  On success, record authenticated actor/role, reason, year and before/after in
  `audit_logs` in the same transaction. Only the active year's correction
  updates current class/section/status through StudentEnrollmentService.
- **Migration.** `0060_student_enrollment_corrections.sql` replaces the old
  blanket placement/start immutability triggers with deferred final-state
  integrity checks. Stable enrollment student/year and placement enrollment
  identities, one enrollment per student/year, one open interval, non-overlap,
  class/year/reference restrictions and exclusive dates remain enforced.
  Table schema snapshot semantics are unchanged from 0059; no unrelated
  generated index or column changes are included.
- **Focused tests.** `EnrollmentCorrections.test.ts`: **10 PASS**, covering
  closed-year corrections, unauthorized roles, stale complete state, foreign
  placement, overlap, status/exit agreement, invalid dates, reason and impacts.
- **PostgreSQL.** `EnrollmentsHistoryDatabase.test.ts`: **4 PASS**. Selected-year
  detail isolation; joint date/section correction without active projection
  change; database rejection of cross-year sections/overlaps; attendance/grade
  impact detection. Writes roll back.
- **Authenticated REST.** `EnrollmentsHistoryTransport.test.ts`: **4 PASS**.
  Bad/conflicting selection, missing sign-in and cross-year ID refusal;
  historical audit and stale retry; principal correction without reopening;
  impact-conflict rollback with no success audit; active projection changes
  and restoration. Temporary audit rows are removed, correction fields are
  restored in `finally`.

### Row 35: students

- **Inventory/year basis.** List (annual or `onDate`), count and gender chart
  read repository `@Year()`; services/controllers/dashboard/profile consumers
  no longer forward the year. The shared MCP hook now owns the single year
  input for Students, removing its old query exception. Permanent identity,
  parents, uniqueness checks and all-year enrollment history remain shared.
  A readable identity without enrollment in the selected year returns null
  class, section, enrollment, placement and yearly status.
- **Roster/ownership.** Annual lists select the latest placement before
  evaluating the teacher's section, so ownership cannot fall back to a former
  placement after transfer. Daily lists use half-open enrollment and placement
  dates. Parent/student identity policies are preserved; teacher identity
  relationships use recorded placements, and year reads additionally require
  the exact annual/daily placement in that year. Aggregates use the same
  ownership/year rules. Unknown roles see no students.
- **Existing Student Edit.** Administrators/principals can correct a specific
  placement (including an earlier interval), yearly status and dates with a
  reason in the same form. It loads and retains an immutable original history
  snapshot; cache refresh cannot silently authorize a stale edit. A normal
  `/students/:id` update passes a nested `enrollmentCorrection` to the enrollment
  service inside the shared/profile update transaction. Unaudited direct
  projection writes remain rejected. A year without enrollment is not repaired
  implicitly. Identity/contact edits remain shared; old-year corrections leave
  the active projection unchanged. Detail caches include year/account context;
  edit, enrollment-command and new-student forms retain their original target
  year through `withAcademicYear`.
- **Focused UI contract.** `studentCorrection.test.ts`: **3 PASS**: identity-only
  and missing-enrollment edits, earlier placement identity and full original
  state, exclusive end dates and reason; no mutation of original state.
- **PostgreSQL.** `StudentsHistoryDatabase.test.ts`: **5 PASS**: annual counts
  **7 / 8 / 8**, no transfer duplication, selected-year status, daily transfer
  and exit boundaries, unknown/student ownership, teacher annual/daily section
  rules and equivalent count, concurrent years on one injected repository.
- **Authenticated REST/MCP.** `StudentsHistoryTransport.test.ts`: **5 PASS**.
  Active default, historical fields and unenrolled shared identity; permission
  and bad-input refusal; normal Student Edit with shared identity update and
  two concurrent original-state submissions (**one 200, one 409**); wrong
  enrollment/student/year refusal; real MCP schemas and concurrent year input,
  header and conflict calls. Principal update permission is temporarily added
  only to the fixture and removed afterward; test identities/audits are removed
  and corrected data restored. The fixture's grants are not application grants.
- **Regression sensitivity.** Temporarily replacing the Students year condition
  with `true` made the real PostgreSQL annual-count test fail (**expected 7,
  received 23**). Restored the condition and reran acceptance successfully.

### Commands, target and remaining gates

Only the verified local **school_history_test** was migrated, from **0059 to
0060**, using `bun --env-file=apps/dashboard/.env.local
packages/server/tests/academicYears/fixtures/migrateHistory.ts`. The runner checks
the URL and actual database name before and after migration. The base fixture
seed ran twice successfully: **3 years, 10 students, 23 enrollments** both times.

- `bun test packages/server/tests/academicYears/EnrollmentCorrections.test.ts`.
- `bun test apps/dashboard/src/features/Students/config/studentCorrection.test.ts`.
- With the fixture env loaded: `test:history:enrollments:db`,
  `test:history:enrollments:transport`, `test:history:students:db`,
  `test:history:students:transport` (root scripts added for repeatable checks).
- Shared regression acceptance after changing year registration/MCP hooks:
  Alerts + Announcements PostgreSQL **8 PASS**, Alerts REST/MCP **5 PASS**,
  Announcements REST/MCP **4 PASS**. Dashboard PostgreSQL **3 PASS** after
  removing Student year forwarding.
- Configured `bun run test` passed; source and test typechecking passed after
  the concurrent Staff test's own author fixed its type error. Lint passed with
  the existing Transport `activeLabel` warning. `i18n:check` and `db:check` passed.
- Production build: PASS (`bun run build`), after running Next type generation sequentially to avoid a transient missing build manifest from concurrent generation.

Browser/owner visual acceptance remains open. The new database migration has
not been applied to the application or production database. Bulk/nested
student-create and file-upload browser acceptance are not newly claimed here;
the existing active-year creation rules remain in force.

## Profiles selected-year slice (row 29), 2026-09-28

Uncommitted, alongside the concurrent service/validator cleanup, which does not touch Profiles. No browser review or deployment is claimed. The profile routes serve MCP and API clients, the in-app assistant included; the dashboard's own profile pages call each module's routes instead.

- **Inventory and year basis.** No migration. All three controllers were already registered.
  - Student profile (`student-profile`):
    - `/overview`: the student with the selected year's class, section and enrollment, or none when not enrolled that year, and the parents linked now.
    - `/academic`: the year's grades, and the student's own assessments and upcoming exams by placement on each date. "Upcoming" counts from the business date.
    - `/attendance`: a summary of the year's marks.
    - `/financial`: the selected fee year's summary; `204` with no body when the student has neither a fee nor an enrollment that year.
    - `/transport`: the year's route intervals.
  - Parent profile (`parent-profile`):
    - `/unread-alerts`: the year's active alerts of each child linked now.
    - `/children`: row 28's children, each with its fee summary for the year.
    - `/fees-due`: the named all-year exception, every year's fees of each child linked now (cross-year debt).
    - `/upcoming-events`: the year's upcoming events that parent sees.
  - Teacher profile (`teacher-profile`):
    - `/classes`: the classes the teacher teaches in the selected year; an assignment belongs to its class's year.
    - `/schedule-today`: those classes, and today's assessments only in the year that holds the business day.
    - `/pending-grading`: the year's ungraded assessments that are not cancelled.
    - `/students`: the students placed in the teacher's sections that year.
- **Implementation.**
  - No profile route takes a year parameter. `StudentProfileService` and `TeacherProfileService` read `@Year()`, and pass it to Students and Teachers, which still take it as an argument until rows 35 and 37.
  - `TeacherService.getClasses` still lists every year's assignments for `/teachers/:id/classes`. The teacher profile keeps the selected year's by class label, the rule the teacher's students already use.
  - New `EventRepository.getUpcomingForParent(parentUserId)`, with its `EventService` method: the selected year's upcoming events that are in both the reader's own view and `ownedIds(Event, 'parent', parentUserId)`. That is the rule events already apply to a signed-in parent.
  - `ExamService.getForStudent(..., { upcoming })` counts from the business date.
  - `StudentProfileService` lost its unused `StudentRepository` and `ParentService` dependencies.
- **Fixes.**
  - Access. Every profile route asked only for sign-in, and the MCP tool list shows every tool to every signed-in user; only a route's guards refuse the call. Since school-wide roles read every row, a librarian, driver, nurse, secretary, counselor or assistant could read any student's grades, attendance and fees, and any family's debts across years. A teacher could read their pupils' fees, and a family its own fees and routes, which their dashboard never shows. Each route now asks for what its data's own module asks for on its own routes:
    - `read:students` for the student overview, `read:grades` for the academic tab, `read:attendance` for attendance;
    - the finance roles (`isFinancial`) for a student's fees, a parent's children with fees, and fees due, as the fee routes do; admin for transport, as the student-route routes do;
    - `read:alerts` and `read:events` for a parent's alerts and events;
    - `read:teachers` for the teacher tabs, and `read:grades` as well for pending grading.
  - The teacher's classes and today's schedule listed every year's assignments under any year.
  - Today's schedule used the UTC date, and in another year gave an empty list, which reads as a free day. It now uses the business date, and is `null` outside the year that holds it.
  - A parent's upcoming events kept any event without a section or without a class. That let in other classes' events and, for a school-wide reader, staff, teachers' and private ones. They now follow the events' own parent rule: public and parents' events, and a class or section event only when a child was placed there on its day.
  - The `.catch(() => null)` and `.catch(() => [])` around fees, route intervals and events are gone; a failed read fails the tab.
  - An attendance summary with no marks reported 0%; its `percentage` is now `null`.
- **Tests.**
  - New `ProfilesYearScope.test.ts` (10 tests) covers:
    - each route takes only its id, and has the guards listed above;
    - Students and Teachers get the request's year;
    - no marks gives `null`;
    - a failed fee, route-interval or event read fails the tab;
    - only the selected year's classes are listed;
    - today's assessments come only in the year that holds the business day, and are not even read otherwise;
    - events come through the parent's own account.
  - `OwnedRepositoryReads.test.ts` lists the new read, and pins its SQL for a principal (the parent rule alone) and a teacher (both rules): ownership 172. The student profile's unit test follows the new constructor.
  - New `ProfilesHistoryDatabase.test.ts` passed 2/2, rolled back, with the business date 2026-09-27. A temporary parent is linked to Omar, with eight events: the school's, a parents' meeting in section A, a section B outing, and staff, teachers', private, cancelled and past ones.
    - The admin, the parent and the principal get the school's event and section A's.
    - The fixture teacher, given a temporary user, gets only the school's. An unknown role gets none, and 2025-2026 has none.
    - The reader's own upcoming list keeps the others, so the parent rule is what narrows it.
    - With Omar's current section set to B, his 2026-2027 placement in A still decides.
  - New `ProfilesHistoryTransport.test.ts` passed 6/6 with 73 assertions on port 5527, with the business date 2026-09-27. It creates a temporary parent linked to Omar and Aya, four events, one of the teacher's assessments on the business day, and a temporary `librarian` role holding only `read:students` and `read:teachers`.
    - Teacher classes: `history-class-2024` in 2024-2025, `history-class-2025` in 2025-2026, `history-class-2026` by default. Each year's students of section A. Today's assessment by default and `null` in 2025-2026. Pending grading.
    - Student tabs: Aya with no class in 2024-2025 and in the 2026 class by default; Omar in section B in 2025-2026. Aya's attendance with no marks has `percentage: null`. Her fees answer 204 in 2024-2025, and show her 2025-2026 fee. Transport is `{ route: [] }`.
    - Parent tabs: upcoming events are the school's and section A's only, and none in 2025-2026. The 2025-2026 children carry each child's fee summary. Fees due show Aya's 2025-2026 fee under any year.
    - The librarian gets 200 for the overview and for the teacher's classes, today and students. They get 401 for the academic, attendance, fees and transport tabs, the parent's alerts, children, fees due and events, and pending grading. The principal gets 200 for fees and fees due, and 401 for transport. Without a token, 401.
    - 400 for an invalid or conflicting year; 404 for an unknown year, teacher or student, with their English messages.
    - MCP `teacher-profile_get_my_classes` offers `academicYear`, and takes the year by header and by tool input; a conflict is an error. The librarian calling `student-profile_get_financial` gets "Access denied".

    The suite deleted what it created. A check found no events, parents, links or profile users, 5 assessments, 2 roles and 14 permissions, and the principal's 4 grants unchanged.
  - Not run: undoing the fixes to watch these tests fail. The session's auto-mode permission check refused the temporary edit that removed the new route guards. It needs the owner's permission, or can be done by hand.
  - Re-run: Events database 3/3 and transport 4/4; Exams database 3/3 and transport 4/4; Assessments transport 4/4; Attendance transport 5/5; Grades transport 3/3; Alerts transport 5/5; Parents database 3/3 and transport 4/4.
  - Root scripts `test:history:profiles:db` and `test:history:profiles:transport` were added.
- **Gates.**
  - `bun run typecheck` passed.
  - `bun run lint` passed; its one warning is in the transport work.
  - `bun run test`: config 270, access reset 60, routines 11, academic years 304, teacher dashboard 17, ownership 172 and boundaries 24 passed.
  - `bun run build` passed. No locale or schema change.
- **Open.**
  - Owner review of the access change. Families no longer read fees or student routes through the profile tools; the dashboard never showed them, since its Fees and Transport tabs call the fee and route modules. Teachers no longer read their pupils' fees.
  - Teachers hold neither `read:assessments` nor `read:exams`, so `/assessments` and `/exams` refuse them, although those modules' teacher rules would let them read their own. That is a grants decision; nothing was changed here.
  - `/teachers/:id/classes` still lists every year (row 37).
  - The Assessments and Exams today, week and upcoming lists still use the UTC date.
  - No dashboard page uses these routes. The owner check is through the assistant, as a restricted role and in a past year.

## Parents selected-year slice (row 28), 2026-09-28

Uncommitted, alongside the concurrent service/validator cleanup, which does not touch Parents. No browser review or deployment is claimed.

- **Year basis.** No migration.
  - A parent's record, list, search, CIN and phone lookups, count and `totalChildren` are shared identity, the same in every year.
  - Links (`student_parents`) are current: they carry no dates, and linking or unlinking changes every year's view. A dated link history would need its own design.
  - A parent's children in a year: each linked child with that year's latest placement (class and section) and enrollment, or none when not enrolled that year. This is unchanged in meaning; the read moved.
  - Current-link reads (unread alerts, fees due and upcoming events on the parent profile) keep the child's current class.
- **Implementation.**
  - New `ParentChildrenRepository`, `@Owned(Student)` with `@Year()`, holds both children reads: `getChildren` for the selected year and `getLinkedChildren` for now. They share one `readCondition`.
  - `ParentService.getChildren(id)` takes no year. `ParentController` and `ParentProfileController` lost their `@Year()` parameters, and `parentChildrenQuery` (the `academicYear` query) was removed.
  - `parents` is registered in `yearScopedModules`. Every Parents route now resolves the year; an invalid year header is 400 there too, as on Students.
  - `seed.ts` registers the new repository in `ParentService`'s dependencies.
- **Fixes.**
  - A teacher who could read a parent through one pupil got all of that parent's children, including siblings outside the teacher's sections, with their address, phone and medical notes. The 2026-09-26 ownership review had left this open. Both children reads now apply the Student rules in their only `.where()`: a parent sees their children, a school-wide role all, a teacher their pupils, a student themself, and any other role none.
  - `DELETE /parents` deleted every parent even when linked. The link cascades, so every year's parent–child links went with them, although single and bulk deletes refuse a linked parent. It now refuses with 409 `parents.errors.someLinked` while any link remains. The seed and the demo reset call the new `clearForSeedReset()`; both clear students first.
  - French, Arabic and Spanish had only `invalidMaritalStatus` in `parents.errors`, and no `students.errors` at all; English lacked `phoneExists`, `invalidGender` and `invalidRelationshipType`. Users therefore saw raw keys such as `parents.errors.notFound`. All four locales now have the 12 `parents.errors` and 6 `students.errors` messages; `i18n:check` reports "Missing keys: none".
- **Tests.**
  - `ParentChildrenYearScope.test.ts` was rewritten for the moved reads and the Student rules per role. `OwnedRepositoryReads.test.ts` gained both children reads (ownership 170).
  - New `ParentsHistoryDatabase.test.ts` passed 3/3, rolled back. A temporary parent is linked to Omar (moved A→B in 2025-2026), Mariam (graduated after 2025-2026) and Aya (fee-only in 2025-2026, enrolled 2026-2027):
    - every link in every year, by name;
    - 2024-2025: Omar and Mariam in section A, Aya with none;
    - 2025-2026: Omar in B (his latest placement), Mariam graduated and left 2026-07-01, Aya with none;
    - 2026-2027: Omar and Aya in A, Mariam with none;
    - the current-link read keeps Omar's current class;
    - with Aya moved to 2026 section B, the fixture teacher (given a temporary user) sees Omar but not Aya; the parent and principal see all three; an unknown role sees none;
    - the delete-all check sees the links, and none once they are removed.

    Removing the Student condition made the teacher case fail with Aya listed. The file was restored byte for byte.
  - New `ParentsHistoryTransport.test.ts` passed 4/4 with 56 assertions on port 5526:
    - the same placements by header, with no selection meaning 2026-2027;
    - the principal reads the family, with `read:parents` granted for the suite since the fixture grants no Parents permission, then removed;
    - the parent profile's children in 2025-2026, with fees;
    - the parent record and list identical across years;
    - link, a second link refused (409), then unlink, over REST;
    - `DELETE /parents` and a single delete of a linked parent refused with their English messages, links kept;
    - 401 for a signed-in outsider and without a token; 400 invalid and conflicting year; 404 unknown year and unknown parent;
    - MCP `parents_get_children` with `academicYear` once, selection by tool input and by header, and the conflict error.

    Temporary parent, users, role, permission and grant were deleted; a check found none, and the fixture again has no parents.
  - Re-run: Alerts database 4/4 and transport 5/5, Announcements database 4/4 and transport 4/4, Dashboard transport 3/3.
  - Root scripts `test:history:parents:db` and `test:history:parents:transport` were added.
- **Gates.**
  - `bun run typecheck` passed.
  - `bun run lint` passed; its one warning is in the transport work.
  - `bun run test`: config 270, access reset 60, routines 11, academic years 294 (including the concurrent cleanup's new tests), teacher dashboard 17, ownership 170 and boundaries 24 passed.
  - `bun run i18n:check` and `bun run build` passed.
- **Open.**
  - Owner review of the sibling rule, and a browser check of a parent profile as teacher and as admin in a past year.
  - The dashboard's `createBulkParentsApi` posts to `/parents/bulk`, which the server does not have (its bulk route is the admin-only `/parents/seed`). Not changed here.

## Dashboards selected-year slice (row 09), 2026-09-28

Uncommitted, alongside a concurrent service/validator cleanup that is not part of this slice. No browser review or deployment is claimed. Owner direction 2026-09-28: fix every finding of the row 09 inventory, including the unused dashboard code.

- **Inventory and year basis.**
  - `dashboard` (registered):
    - `/today` (admin; MCP `dashboard_get_today_snapshot`): today's attendance, receipts, paid expenses and events, only in the year that holds the business day, else `null`. Overdue fees are the selected fee year's as of today.
    - `/widgets` (finance roles): the selected year's enrolled students; current teacher and parent counts; fee-year revenue; paid expenses over the reporting interval.
    - `/students-by-gender`, `/attendance/students-monthly`, `/attendance/staff-monthly` (staff): the year's enrollments, and the year's attendance months (stored year, else date). Today and this week come only in the year that holds today.
  - `academic-dashboard` (registered; staff; MCP only): the year's enrolled students and the grades the reader owns, plus the current teacher count. Today's attendance rate comes only in the year that holds today, and only when there are marks.
  - `operations-dashboard` (registered; MCP only): the selected year's active and critical alerts, including shared ones, and live announcements the reader may see. Today's events come only in the year that holds today.
  - `finance-dashboard` (newly registered; finance roles):
    - fee figures by the selected fee year, from completed allocations, with cancelled installments left out;
    - cash by date over the year's reporting interval: receipts by settlement, else payment, date; paid expenses by expense date; paid payslips by payment date;
    - "this month" and today only in the year that holds today;
    - recent payments by cash date in the year;
    - the class report from the year's placements, where only the active year may fall back to the current class.
  - `teacher-dashboard` (not registered): the signed-in teacher's active year, unchanged.
- **Implementation.**
  - `DashboardService`, `AcademicDashboardService`, `OperationsDashboardService`, `FinanceDashboardService` and `FinanceDashboardRepository` read `@Year()`, and no dashboard controller takes a year parameter. Students (row 35) still receive the year explicitly.
  - New `holdsDay(year, day)` in `academicRecordYear.ts`.
  - `FinanceDashboardRepository.yearInstallments()` is the one builder behind aging, overdue, aging detail, collection rate and collection by class. `receiptsIn`, `expensesIn` and `payrollIn` are the cash conditions.
  - `AttendanceRepository.getMonthlyStats(type)` reads `this.year`; it replaces `getMonthlyStatsForYear(type, year)`.
  - The finance DTOs moved to `FinanceDashboardDto.ts` without `academicYear`. The unused `DashboardDto.ts` was removed.
- **Fixes.**
  - Principal and accounting finance cards showed 0 students and 0 teachers: `/widgets` answered only `admin`. It now has `@isFinancial()`, the finance dashboard's audience, and returns the cards for all three roles.
  - The collection rate and collection by class counted cancelled installments as due and read the cached `paid_amount`, which stops following an installment once it is cancelled. They now use the same basis as aging.
  - Finance cash-out counted rejected, cancelled, pending and approved expenses. It now counts paid ones, as the Expenses module totals them.
  - Past years showed today's receipts and events, and a 0% attendance rate, under their own name. Those figures are now `null` there.
  - The `.catch(() => [])` and `.catch(() => ({ count: 0 }))` around the today snapshot, operations and academic reads are gone; a failed read now fails.
  - `/dashboard/academic/kpis` answered any signed-in user, parents and students included, with school-wide counts. It now requires staff.
  - Events' today, upcoming, past and active lists used the UTC date; they now use the school business date. "Days overdue" used the machine clock; it now uses the business date.
  - Removed unused UI code:
    - the `RecentPayments` component, its hook and API call;
    - `Widgets/index.tsx` (`Widgets/Widget.tsx` stays: the Parents profile uses it);
    - the `useTeacherAttendanceMonthly` alias;
    - the farm-app leftovers in `dashboardApi.ts` and all of `services/fieldApi.ts`, whose endpoints do not exist.
- **Dashboard UI.** The finance cards choose between month and whole-year figures and labels from the server's `null`s instead of "is this the active year". The trend tooltip shows today's figures only when the server sends them.
- **Docs.** Section 6 of `financial/FLOW.md` now describes the actual read model.
- **Tests.**
  - Unit: `DashboardYearScope.test.ts` and `FinanceDashboardYearScope.test.ts` were rewritten, and `DashboardAudience`, `ControllerParameterResolution` and `YearScopedModules` were updated.
  - New `DashboardHistoryDatabase.test.ts` passed 3/3 with 51 assertions, rolled back, with the business date fixed at 2026-09-27:
    - 7/8/8 enrolled students;
    - staff attendance months with a stored-year row and a legacy row;
    - finance figures before and after a March receipt, a mixed-year September receipt, a same-day receipt, a pending check, an installment paid 10.00 before it was cancelled, and a paid and a rejected expense;
    - exact changes: 2025-2026 due +100, paid +55.25, 60+ days +44.75, Omar 118 days overdue; 2026-2027 due +100, paid +20.75, 1-30 days +79.25, current +93, September income +68; 2024-2025 unchanged.
  - Undoing the fixes one at a time each failed that suite: cancelled installments (due 140), expense status (111.50) and the recent-payments year (September receipts listed in 2025-2026). The file was restored byte for byte.
  - New `DashboardHistoryTransport.test.ts` passed 3/3 with 176 assertions on port 5525:
    - the same finance cases through REST, including month and today `null`s in 2025-2026 and the collection rate matching the class report;
    - widgets 7/8/8, and 8 for the principal;
    - the gender chart against an independent count;
    - academic, operations and attendance figures `null` outside the year that holds today;
    - 401 for a signed-in outsider on widgets, finance, academic, today and gender, and without a token;
    - 400 for an invalid or conflicting year, 404 for an unknown one;
    - MCP: eight finance tools, each with `academicYear` once, selection by tool input and by header, the snapshot tool, and the conflict error.

    Created rows were deleted, and a check afterwards found none.
  - Re-run: Events database 3/3 and transport 4/4, Attendance database 2/2 and transport 5/5, Alerts transport 5/5.
  - Root scripts `test:history:dashboard:db` and `test:history:dashboard:transport` were added.
- **Gates.**
  - `bun run lint` passed; its one warning is in the transport work.
  - `bun run typecheck` passed. Its first run stopped on `AcademicYearTransitionService.ts`, a file of the concurrent cleanup; that error was gone on the next run.
  - `bun run test`: config 270, access reset 60, routines 11, academic years 279, teacher dashboard 17, ownership 168 and boundaries 24 passed.
  - `bun run build` passed. No schema or locale change.
- **Open.**
  - Owner review, and a browser check of the finance cards and trend in a past year and as principal.
  - `avgGPA` still averages raw marks across different maximums; this is not a year issue.

## Cycles and subjects shared-catalog slice, 2026-09-28

Uncommitted, alongside the concurrent work; no browser review or deployment is claimed.

- **Classification.** Cycles (row 08) and subjects (row 36) are shared catalogs. Every year reads the same rows, so they get no `@Year()` and are not registered in `yearScopedModules`; their MCP tools take no year. Renaming one corrects it in every year, which is the intended meaning of a catalog.
- **History fix: in-use entries can no longer be deleted.** Deleting a catalog entry reached every year's records:
  - A subject delete cascaded to the teacher assignments of every year that used the subject. When a lesson, exam, assessment or attendance record held one of those assignments, the foreign key stopped it with a 500. When none did, the assignments were silently deleted, and with them what a past year's classes, teachers and grade visibility were built on.
  - A cycle delete set `classes.cycle_id` to null on every year's classes that used it. An accountant assigned to the cycle stopped it with a 500.

  Now deleting a subject that any teacher assignment or alert uses is refused with 409 `subjects.errors.inUse`. "Delete all" is refused with `someInUse` when any subject is in use. Deleting a cycle that any class or accountant assignment uses is refused with 409 `cycles.errors.inUse`, which suggests deactivating it instead. Unused entries delete as before. `SubjectService.clearForSeedReset` is the trusted reset (`SeedService`, `reset-demo`); it runs after teachers and their assignments are gone.
- **Messages.**
  - `subjects.errors` existed only in English. French, Arabic and Spanish now have it, and all four have the two new keys.
  - Cycle errors were hard-coded English strings. They now come from a new `cycles.errors` block (`notFound`, `nameExists`, `inUse`) in all four locales.
- **Tests.** New `CatalogsHistoryTransport.test.ts` passed 4/4 on port 5512. It covers:
  - identical subject and cycle lists for 2024-2025, 2026-2027 and no selection;
  - the 409 for the fixture's Mathematics subject, which each year's section-A assignment uses, and for delete-all, with the subject still present;
  - an unused subject deleted, then "Subject not found";
  - a cycle linked to a 2024-2025 class: refused with the English message, the class still linked, the cycle deactivated, then deleted once the class was gone;
  - no `academicYear` input on the MCP tools, even with a year header.

  Created rows were deleted, and a check afterwards found none.
- **Gates.**
  - `bun run lint` passed; its one warning is in the concurrent transport work.
  - `bun run typecheck`, `bun run i18n:check` ("Missing keys: none") and the build passed.
  - `bun run test`: config 270, access reset 60, routines 11, academic years 251, teacher dashboard 17, ownership 167 and boundaries 24 passed.
- **Open.** Owner review. The Subjects and Cycles pages show the server's message when a delete is refused; that has not been checked in a browser.

## Teachers shared-identity and assignment-year slice, 2026-09-28

Uncommitted with other work in the tree. No migration or deployment; owner visual and browser review remain open.

- Teacher identity and current Staff fields remain shared. Assignment summaries, `/teachers/:id/classes`, and teacher student rosters now use the selected year's class and enrollment. The teacher profile uses the repository's selected-year classes directly. The teacher dashboard still resolves the active year independently and uses a shared identity lookup.
- Assignment create validates the class in the selected year; assignment lookup and removal cannot reach another year's row. Normal teacher delete and delete-all refuse any assignment history with 409. Trusted seed cleanup calls `clearForSeedReset` after academic sources and students have been removed. Teachers still lack the assessment and exam read grants; that owner decision is unchanged.
- Teacher list/detail and profile class reads now use the selected year in both request and cache key. The card resolves class names from the viewed year. The old "current assignments" notice was removed. The redundant assignment body year was removed from server and form schemas.
- Marked local `school_history_test` fixture: `TeachersHistoryDatabase.test.ts` 2/2 PASS (22 assertions) in rolled-back transactions; `TeachersHistoryTransport.test.ts` 4/4 PASS (28 assertions) with admin REST, MCP, old/current year, invalid/conflicting year, cross-year assignment refusal and history-preserving delete refusal. No records persisted by the new tests.
- Focused profile, roster and registration tests pass. `bun run check` PASS: lint (one unrelated Transport warning), all typechecks, i18n with no missing keys, config 273, access reset 60, routines 11, academic years 324, teacher dashboard 17, ownership 172, boundaries 24, production build and Drizzle journal check. A teacher registration regression was added afterward and passed with the handler arity check (7/7). Browser interaction and owner review have not run.

## Classes, sections and class routines selected-year slice, 2026-09-28

Uncommitted, alongside the concurrent student and transport work; no browser review or deployment is claimed. Owner decision 2026-09-28: a new class, section or timetable takes the selected year, the body year field is removed, and nothing moves between years.

- **Year basis.** No migration.
  - A class belongs to the year label stored on it.
  - A section belongs to its class's year.
  - A timetable belongs to the year label stored on it, which must be its section's class year.
- **Classes (row 06).**
  - `ClassRepository` has `@Year()` and one read condition (ownership plus year) applied in its builder's only `.where()`. List and detail use it.
  - The class's students, parents and analytics come from the selected year's placements. Its sections, teachers and subjects are read only after the class is found in that year.
  - Create stamps the selected year; `academicYear` is gone from the create and update bodies and the list query. Update, delete and delete-all stay inside the year. `clearForSeedReset` is the trusted reset (`SeedService`, `reset-demo`).
  - Seed data spans years: `POST /classes/seed` and `seedDemoClasses` keep each class's own year through `createForSeed`, outside any year scope.
  - Other modules keep the any-year reference lookups `getById` and `ClassValidator.ensureExists`; they apply their own year rules. `getByAcademicYear` stays a named-year read for fees.
- **Sections (row 31).**
  - `SectionRepository` has the same shape through its join on classes. Students, parents and analytics come from the selected year's placements.
  - Create, or moving a section to another class, requires a class of the selected year: 409 `classOutsideSelectedYear`.
  - Delete now refuses any section that ever held a placement (409 `hasStudents`). Before, a past section had no current students, passed the check, and failed on the placement foreign key with a 500.
- **Class routines (row 07).**
  - `ClassRoutineRepository` limits list, detail, the section's published timetable and the teacher's week to the selected year. Every change goes through that detail, so another year's timetable is 404.
  - Create takes the selected year and refuses another year's section: 409 `outsideSelectedYear`. The lesson-assignment list refuses it too.
  - The teacher dashboard still names the active year for its week (`getTeacherScheduleIds`); periods and duty candidates stay shared.
- **Registration.** `classes`, `sections` and `class-routines` are registered. Their controllers no longer take `@Year()` or role parameters.
- **Messages.**
  - `classes.errors` and `sections.errors` existed only in English, so French, Arabic and Spanish users saw raw keys. All four locales now have them, plus `hasSections`, `classRequired`, `hasStudents`, `sectionRequired`, `validationFailed` and `classOutsideSelectedYear`, which English lacked too.
  - All 32 routine error calls passed their keys straight to `Err`, so users saw `classRoutines.errors.*`. They now go through `t()`.
- **Dashboard.**
  - The class form has no year field; a class takes the year being viewed.
  - The timetable page no longer sends a year when it creates one.
  - Class and section detail reads are keyed by year.
- **Tests.**
  - `OwnedRepositoryReads.test.ts` adds `getInSelectedYear` for classes and sections (ownership 167/167).
  - New `ClassesHistoryDatabase.test.ts` passed 4/4 with rolled-back rows. It covers:
    - each year's exact class and sections;
    - 8 placed students and 2 sections for 2025-2026, and Omar alone in section B;
    - a teacher who sees only the selected year's class, and an unknown role who sees nothing;
    - a past section held by its placements;
    - year-bound create, update and delete;
    - timetables by year, section and teacher, with the dashboard's named-year read.
  - New `ClassesHistoryTransport.test.ts` passed 6/6 on port 5511. It covers:
    - 401 without a token;
    - a body year ignored in favour of the header;
    - 404 with the English message for another year's class, section and timetable;
    - the three 409 messages (section's class, timetable's section, and the 2024 section that held students);
    - the 400 conflict and an unknown year;
    - MCP `classes_get_classes` and `sections_get_sections` by header and tool input.

    Created rows were deleted, and a check afterwards found none.
  - Four mock tests of the removed role and year parameters were replaced by `ClassSectionRoutineYearInput.test.ts` (3/3).
  - The Alerts, Announcements, Assessments, Attendance, Exams, Events and Grades database and transport suites, which look classes and sections up, passed again.
- **Gates.**
  - `bun run lint` passed; its one warning is in the concurrent transport work.
  - `bun run typecheck`, `bun run i18n:check` ("Missing keys: none") and the build passed.
  - `bun run test`: config 270, access reset 60, routines 11, academic years 251, teacher dashboard 17, ownership 167 and boundaries 24 passed.
- **Open.**
  - Owner visual and browser review of the Classes, Sections and Timetable pages in a past year.
  - Class and section ownership for parents and students still follows the current projection (`students.class_id`). They may only select the active year, where that matches.

## Vehicle assignments dated-interval slice, 2026-09-28

**Policy and source.** Driver assignments use the existing start and exclusive end dates as continuous intervals visible in every reporting year they overlap. `VehicleAssignmentRepository` scopes list/detail/vehicle/driver/status/count and ordinary update/delete/delete-all with `@Year()`. The named live active lookup and vehicle's computed current driver use the business day across all years. A driver change checks overlap, closes the prior row and inserts a new one transactionally; it no longer changes the old row's `driverId` or `assignmentDate`. Direct create and edits validate interval and status coherence and prevent vehicle overlap. Staff driver deletion and seed reset use explicit all-year paths. Vehicle creation derives the registered year from the optional driver assignment date without changing shared vehicle read scope; a multiple-driver creation payload is rejected because the current vehicle view has one driver. The vehicle table captures the selected year for its driver-assignment action. Assignment routes now require admin authentication, consistent with driver administration. No schema migration. Owner policy and browser review remain open.

**Connected checks.** `bun --env-file=apps/dashboard/.env.local test packages/server/tests/acceptance/VehicleAssignmentsHistoryTransport.test.ts` passed 2/2, 30 assertions against marked local `school_history_test`, authenticated admin REST and MCP on port 5524. Temporary vehicles, staff, drivers and assignments tested two-year overlap, completed old intervals, cross-year detail refusal, wrong-year and overlapping create refusal, reassignment preserving the first driver/date, shared current-driver projection, vehicle-create side effect, and MCP list. Fixture rows were deleted. `bun run typecheck`, `bun run lint`, configured `bun run test` and an isolated `.next-history-vehicle-assignments` production build passed. Existing overlapping legacy rows and concurrent overlap races remain for integrity review; owner/browser review and production deployment remain open.

## Student routes dated-interval slice, 2026-09-28

**Policy and source.** The existing start and exclusive end dates define a continuous assignment. A row appears in each selected reporting year it overlaps, including a completed row in its earlier year; no schema migration or synthetic annual rows are needed. `StudentRouteRepository` uses `@Year()` for normal list/detail/student/vehicle/count and update/delete/delete-all. The live active-route and occupancy checks remain explicitly all-year and use the school business day. Route creation checks the selected-year start date, that day's student enrollment and placement, and overlapping intervals across all years. Reassignment closes the old row and inserts a new one in one transaction; unassignment accepts a selected-year correction date through `POST /:id/unassign` while the existing DELETE action still uses today. Transport fees are created in the selected charged year, and ending/resuming transport now looks up only that year's fee. Seed cleanup calls `clearForSeedReset`. The Students controller receives the same request-year scope for nested student creation; its two existing MCP query inputs are reused rather than duplicated. The transport hook keys reads by selected year and captures the year for form writes. Owner policy and browser review remain open.

**Connected checks.** `bun --env-file=apps/dashboard/.env.local test packages/server/tests/acceptance/StudentRoutesHistoryTransport.test.ts` passed 2/2, 37 assertions against marked local `school_history_test`, authenticated admin REST and MCP on port 5523. Three temporary completed routes, two vehicles and one temporary transport fee type tested exclusive interval overlap, an assignment spanning two years, wrong-year and missing-placement refusal, overlapping-route refusal, historical fee creation, reassignment preserving the first vehicle/date and prior-year fee, current-year unassignment changing only the current fee, and MCP list. Created route, fee, installment, audit and vehicle rows were cleaned. `bun run typecheck`, `bun run lint`, configured `bun run test` and an isolated `.next-history-student-routes` production build passed after the Students query-input exception was added to the shared MCP scope contract. Owner/browser review, production migration and deployment remain open.

## Events selected-year slice, audience and sign-in fix, 2026-09-28

Uncommitted, alongside the concurrent transport and student work; no browser review or deployment is claimed.

- **Security fix.** `EventController` had no `@isAuth()`, and ten read routes had no guard: `/today`, `/upcoming`, `/past`, `/active`, `/type/:type`, `/class/:classId`, `/section/:sectionId`, `/date-range`, `/mcp/date-range` and `/participant/:participantId`. A probe against the fixture got 200 without a token. Now:
  - the class has `@isAuth()`, and every read route needs `read:events`;
  - participant reads (`/:id/participants…`, `/participant/:id`) need `manage:participants`. That permission is not in the catalog, so only admin's wildcard passes it; the dashboard never reads participants.
- **Year.** An event belongs to every year whose reporting interval its dates overlap. One spanning the boundary shows in both years: this module's shared exception. No migration.
  - `EventRepository` has `@Year()` and one `readCondition` (audience plus year) applied in its builder's only `.where()`. That covers list, detail, the status, type, organizer, class, section and visibility filters, today, upcoming, past, active, date range, events by participant and the analytics.
  - Update, delete and the admin delete-all stay inside the year. `clearForSeedReset` is the trusted reset (`SeedService`, `reset-demo`).
  - Create, update and postpone require the dates to overlap the selected year: 409 `outsideSelectedYear`.
  - The controller is registered as `events`. The demo seed's event phase runs in the seed year, and the generator keeps past demo events inside it.
  - The Calendar's `useEvents` list and detail are keyed by year. The parent dashboard's upcoming items stay on the active year, which is intentional.
- **Audience.** `visibility` was stored and never applied. The new `Event` token (`EventGuards.ts`) applies it; school-wide roles still see everything.
  - Teachers read public, teacher and staff events, and every event they organize, private ones included.
  - Students read public and student events; parents public and parent events. A class or section event reaches them only when the student (or a child) was placed in it on the event's first day. A missing visibility counts as public.
  - Only the principal held `read:events`, so the Calendar showed teachers and families no events. `rolePermissions.json` now grants `read:events` to teacher, parent and student; run `bun run seed:admin` on existing databases.
- **Other fixes.**
  - `events.errors` was missing in all four locales. It now has the nine keys in use and `outsideSelectedYear`.
  - `getByClass` failed on every call: an unqualified `class_id` in its subquery was ambiguous. It now uses JSON containment.
- **Tests.**
  - `OwnedRepositoryReads.test.ts` adds six event reads and pins the parent rule's SQL (ownership 165/165).
  - New `EventsHistoryDatabase.test.ts` passed 3/3 with rolled-back rows. It covers:
    - exact ids per year, with the boundary event in 2024-2025 and 2025-2026, plus the class filter and analytics;
    - a teacher with and without their own private event;
    - Omar, who gets the class event and the February section-B event after his transfer, and Adam, who gets the class event but not section B's;
    - Aya, with no 2025-2026 enrollment, who gets neither;
    - Omar's parent and an unlinked parent, and an unknown role, who gets nothing;
    - year-bound update, delete and delete-all.
  - New `EventsHistoryTransport.test.ts` passed 4/4 on port 5510. It covers:
    - 401 without a token on every formerly open route;
    - a past-year create listed only in that year;
    - 404 for another year's detail, update, cancel and delete;
    - 409 with the English message for dates moved out of the year;
    - the 400 conflict, an unknown year, the translated not-found message, and MCP `events_get_events` by header and tool input.

    Created rows were deleted.
- **Gates.**
  - `bun run lint`, `bun run typecheck`, `bun run i18n:check` ("Missing keys: none") and `bun run build` passed.
  - `bun run test`: config 270, access reset 60, routines 11, teacher dashboard 17, ownership 165 and boundaries 24 passed.
  - Academic years had 261 pass and 1 fail. The failure names only `StudentController.getStudents` and `getStudent` query inputs, from the concurrent students conversion (not yet in its ledger). It is not in this slice.
- **Open.**
  - Owner visual and browser review of the Calendar as teacher, parent and student.
  - `/:id/participants/count` is declared after `/:id/participants/:type`, so "count" is read as a type; left as is.

## Vehicles shared-identity slice, 2026-09-28

**Scope.** Vehicles are shared identities. License plates, purchase dates, status and mileage remain present-time fields across selected years. The repository's computed driver is the currently active assignment, not a historical driver view. Dated driver intervals belong to row 42; vehicle creation's optional driver assignment depends on that row. Vehicles stay outside `yearScopedModules`; no schema or production change. This independent verification advanced while row 41's historical-assignment policy awaits the owner.

**Connected checks.** `bun --env-file=apps/dashboard/.env.local test packages/server/tests/acceptance/VehiclesHistoryTransport.test.ts` passed 2/2, 29 assertions against marked local `school_history_test`. Two temporary vehicles with different purchase dates and current statuses appeared in repository and authenticated admin REST/MCP list/detail/count under omitted, old, current and invalid year headers; both were deleted afterward. Server test typecheck and focused ESLint passed. Owner/browser review and production acceptance remain open.

## Refuels dated-reporting slice, 2026-09-28

**Source.** Refuel records and fuel aggregates use the school-local day of `datetime` in the selected reporting interval. The refuel repository scopes list, detail, vehicle/driver/voucher/date reads, recent/count, cost and efficiency reports, monthly trends, and normal update/delete/delete-all. Create and datetime edits reject dates outside the selected year. Voucher uniqueness still searches all years, while the rolling 90-day fuel-needs prediction remains a live operational calculation. Seed cleanup uses `clearForSeedReset`; demo seeding supplies a resolved year. No migration.

**Verification.** `bun --env-file=apps/dashboard/.env.local test packages/server/tests/acceptance/RefuelsHistoryTransport.test.ts` passed 2/2, 30 assertions on the marked local `school_history_test` database and authenticated REST/MCP. Two temporary refuels plus a vehicle, Staff and driver tested old/current year results, costs and vehicle reports; cross-year detail/delete refusal; historical create and wrong-year edit rejection; global voucher uniqueness; and MCP list. All temporary rows were deleted. `bun run --cwd packages/server typecheck:test`, `bun run typecheck`, `bun run lint`, `bun run test` and a production build using isolated `.next-history-refuels` passed. Owner/browser review and production acceptance remain open.

## Maintenance dated-reporting slice, 2026-09-28

**Policy and source.** Planned maintenance belongs to the selected year's `scheduledDate`; completed work belongs to the school-local day of `completedAt`. Older completed records with no completion timestamp fall back to their scheduled date. Open jobs without either date are mileage-driven operational work visible across years. The assumption follows row 39 of the forward plan and awaits owner review. `MaintenanceRepository` now scopes ordinary list, detail, filtered reads, counts, cost analytics, update and delete. `MaintenanceValidator` accepts historical scheduling corrections only within the selected reporting interval. Existing mileage alerts, due-hour duplicate checks and global overdue marking remain all-year operational paths. Seed cleanup uses `clearForSeedReset`; demo seeding supplies a resolved year. No migration.

**Verification.** `bun --env-file=apps/dashboard/.env.local test packages/server/tests/acceptance/MaintenanceHistoryTransport.test.ts` passed 2/2, 37 assertions against the marked local `school_history_test` database and authenticated REST/MCP. Four temporary maintenance rows and one vehicle tested old/new planned work, completion-date attribution, shared mileage work, cross-year detail/update/delete refusal, historical create/edit, invalid year, live alerts and MCP list. Cleanup removed all temporary rows. `bun run --cwd packages/server typecheck:test`, `bun run typecheck`, `bun run lint`, `bun run test` and a production build using an isolated `.next-history-maintenance` directory passed. The test exposed and the implementation fixed a numeric cost analytics comparison with an empty string. Owner/browser review and production acceptance remain open.

Status: **source implemented; whole-school history remains off by default pending complete acceptance**. The server-side `ACADEMIC_YEAR_HISTORY_ENABLED` switch remains unset/false in normal configuration. A reviewed transition and activation succeeded both on an isolated synthetic fixture and on a dated copy of the regenerated demo. Browser acceptance and the remaining permission and rollback cases are open.

Current source note (2026-09-27): The administrator `/year-review` endpoints and list-time context-issue notices were removed at the owner's request. Dated results below document tests of the earlier design and are not current acceptance evidence for those removed endpoints. Normal year-filtered reads, create/edit validation, and the migration issue workflow remain. The full test and build checks for this removal are recorded separately from the earlier connected evidence.

Removal verification (2026-09-27): `bun run test`, `bun run lint`, `bun run --cwd packages/server typecheck:test`, and `bun run build` passed. Source search found no remaining `reviewYear`, `withContextIssues`, `/year-review`, or client context-issue notice references. These checks do not constitute connected browser or live database acceptance.

## Assessment error messages, 2026-09-28

`AssessmentValidator` reads `assessments.errors`, which no locale had, so every assessment error reached users as a raw key such as `assessments.errors.notFound`. The block now exists in all four locales with the seven keys in use. It also has `outsideSelectedYear` and `yearCannotChange`, which replace two hard-coded English messages: the new `AssessmentValidator.ensureSameYear` carries the second. Done in the Assessments module with the owner's approval. `AssessmentsHistoryTransport.test.ts` (4/4) now pins the English 409 and 404 messages. `bun run i18n:check` ("Missing keys: none"), server typecheck, lint and `bun run test:academic-years` (262/262) passed.

## Grades selected-year slice and personal notifications, 2026-09-28

Grades follow the Assessments and Exams conversion; personal notifications are verified shared across years. Uncommitted, alongside the concurrent slices; no browser review or deployment is claimed.

- **Grades: year.** A grade belongs to its stored `academic_year_id`, or, without one, to the year of its one source's date (`gradeInReportingYear`, unchanged). No migration.
  - `GradeRepository` has `@Year()` and one `readCondition` applied in its builder's only `.where()`. That covers list, the student, section, subject and teacher filters, detail, by assessment, by exam and count.
  - Update, delete, bulk delete and the admin delete-all match only the selected year's ids. A legacy grade's year needs its source's date, which an UPDATE or DELETE cannot join, so they filter by an id subquery. `clearForSeedReset` is the trusted every-year reset, now used by `SeedService` and `reset-demo`.
  - A new grade's source year must be the selected year: 409 `outsideSelectedYear`, in all four locales. In practice another year's source is already a 404, because its existence check reads the selected year.
  - The service's `resolveRecord` checks on detail, by-source reads and create were removed. The year middleware already checked that the role may use the selected year, and every row read now lies in it.
  - The controller lost its `@Year()` and role parameters. The unused `gradeListQuery` is gone.
  - The consumers (academic dashboard KPIs, student profile, teacher pending grading) call without a year, and their silent `.catch(() => [])` around grade reads was removed.
  - The dashboard already keyed grades by year. `studentApi.getStudentGradesApi` calls a `/students/:id/grades` route that does not exist and has no callers; left as is.
- **Grades: teacher rule.** Teachers read a grade when the student was *currently* in a section they teach. A transferred student's earlier grades left their old teachers, and the new section's teacher saw years of history that were not theirs. `GradeForTeacher` (`GradeGuards.ts`) now gives a teacher:
  - the grades of their own assessments and exams;
  - every grade of a student placed in a section they teach on the grade's source date;
  - for a student with no dated enrollment at all, the current section: the same fallback grade creation accepts.

  Parents and students keep `Grade`. `writeBy` is inert in najm-auth 4.1.0: it is stored and never read.
- **Grades: tests.**
  - `OwnedRepositoryReads.test.ts` runs every grade read in a year and pins the teacher SQL (ownership 158/158). Five year unit tests moved to the new signatures, and the old-grade update test now pins that a grade outside the selected year is not found. `GradeWriteContract.test.ts` adds the refusal before insert (academic years 262/262).
  - New `GradesHistoryDatabase.test.ts` passed 3/3, with rolled-back rows, a February A+B exam, and two teachers without sources. It covers:
    - exact ids per year, including a legacy dated grade, count, the student filter, by-assessment and the cross-year detail;
    - the source's teacher sees every grade;
    - the section-B teacher of 2025-2026 sees only Omar's February grade, not his October one;
    - the section-A teacher of 2026-2027 sees Adam's 2026-2027 grade and none of his 2025-2026 ones, which the old rule showed;
    - Omar sees his own grades;
    - year-bound update, delete, bulk delete and delete-all.
  - New `GradesHistoryTransport.test.ts` passed 3/3 on port 5509. It covers:
    - a past-year create stored in its source's year and read there through list, student, assessment, section, teacher, report and the student profile, but not in the current year;
    - 404 for detail, update, delete and by-assessment from another year, and a 404 create for another year's source;
    - the 400 conflict and an unknown year;
    - MCP `grades_get_all` by header and tool input.

    Created rows were deleted.
  - Assessments database 4/4 and transport 4/4, and Exams database 3/3 and transport 4/4, still pass.
- **Notifications: shared across years.**
  - `/notifications` is a personal inbox: every read and write is keyed by the signed-in recipient. A notification has no year, and its source carries one: a financial reminder's charged year, row 20.
  - It is REST-only with no MCP tools, is not registered for the year, and the dashboard keys it `['personal-notifications', …]` without a year or header. No code change.
  - New `NotificationsHistoryTransport.test.ts` passed 2/2. The same inbox and unread count appear under no header and under 2024-2025, 2025-2026 and 2026-2027. Another recipient's notification is never listed, and marking it read returns 404 and leaves it unread. The recipient marks their own read under a past year's header. The two rows were deleted.
- **Gates.** `bun run lint` (clean), `bun run typecheck`, `bun run i18n:check` ("Missing keys: none") and `bun run build` passed. `bun run test` passed every suite: 270, 60, 11, 262, 17, 158 and 24 tests.
- **Open.**
  - Owner visual and browser review.
  - The teacher's student-profile grades tab and grade entry screen have not been checked in a browser with the new teacher rule.

## Drivers shared-identity slice, 2026-09-27

**Scope.** `drivers` is a profile on shared Staff identity; its `hireDate`, current status, license and contact details are not a selected-year roster. The controller is admin-only. Its create/update/delete routes are retired (410) because Staff owns those writes. Dated vehicle assignments live in row 42. Drivers remain outside `yearScopedModules`; no migration, new year filter or production change.

**Connected checks.** `DriversHistoryTransport.test.ts` passed 2/2 with 32 assertions on the marked local `school_history_test` fixture. It inserted one older inactive and one newer active Staff/driver pair, verified repository list/status/license reads, then checked admin REST list/detail/license access with omitted, old, current and invalid year headers. A normal delete returned 410 and left the driver row intact. Authenticated MCP listed the old driver. Both temporary driver and Staff pairs were deleted afterward. Server test typecheck and focused ESLint passed. Owner/browser review and production acceptance remain open.

## Search shared-identity and ownership slice, 2026-09-27

**Scope.** The four `/search` GET routes and four MCP tools search current student, teacher and parent identities, independent of the selected academic year. Search remains outside `yearScopedModules`; no year filter, schema migration or dashboard UI change. Previously, `@isAuth()` allowed any signed-in user to search all three tables, including email and phone. `SearchRepository` now ANDs each resource's existing Student, Teacher or Parent ownership condition with the term in one SQL WHERE. The typed routes require the corresponding read permission; the global route requires all three. Its response shape and limits are unchanged.

**Checks.** `SearchOwnership.test.ts` passed 3/3 with 26 assertions: each resource's SQL rule, deny-by-default for an unknown role, unfiltered school-wide identity, and route permission metadata. `SearchHistoryTransport.test.ts` passed 2/2 with 43 assertions against the marked local `school_history_test`: admin REST and MCP, unchanged student identity across three historical labels, invalid and conflicting year inputs, anonymous refusal, and real PostgreSQL ownership of one student identity. A disposable actor with only `read:students` got an empty owned student search but was refused teacher, parent and global REST search; MCP allowed student search and refused global search. The actor, role and test-only permission were cleaned up; fixture student rows were unchanged. `bun run test`, `bun run typecheck`, `bun run lint` and production `bun run build` with `NAJM_NEXT_DIST_DIR=.next-history-search` passed. Lint reported two unrelated unused-parameter warnings in concurrent profile work. Owner/browser review and deployment remain open.

## Health shared-infrastructure slice, 2026-09-27

**Scope.** `HealthController` exposes public REST `GET /health`, `/health/ping` and `/health/status`; there is no persistence model, academic data, write route or MCP tool. Status checks PostgreSQL and cache readiness and sends `Cache-Control: no-store`. Health remains outside `yearScopedModules`; no `@Year()` property, migration or production change is needed. The student health Alert is a separate Alerts route, covered in its own slice.

**Connected checks.** `HealthHistoryTransport.test.ts` passed 2/2 with 33 assertions on the marked local `school_history_test` fixture. All three REST routes returned 200 with no year, each of two historical years, and an invalid year header; status remained ready with both actual PostgreSQL and cache checks `ok`. A conflicting header/query year also left readiness unchanged. Focused failure checks verified independent `database: unavailable` and `cache: unavailable` outcomes. `bun run --cwd packages/server typecheck:test` and `bun run lint` passed. This slice is read-only and left fixture data unchanged. Browser/production readiness and owner review remain unrun; no deployment is claimed.

## Exams selected-year slice, 2026-09-27

Exams now follow the Assessments conversion. An exam belongs to its stored `academic_year_id`, or, for a legacy row without one, to the year whose reporting interval holds its date. No migration. Uncommitted, alongside the concurrent financial slices; no browser review or deployment is claimed.

- **Code.**
  - `ExamRepository` has `@Year()` and one `readCondition` (ownership plus year) applied in its query builder's only `.where()`. That covers list, filters, detail, by type, status and assignment, today, upcoming and count.
  - Create stamps the selected year. Update, delete, bulk delete and the admin delete-all stay inside it. `clearForSeedReset` is the trusted every-year reset, now used by `SeedService` and `reset-demo`.
  - `ExamService.create` and context-changing updates refuse sections whose year is not the selected one, with 409 `outsideSelectedYear`. "Year cannot change" is now the translated `yearCannotChange`.
  - The controller lost its `@Year()` parameters and `examListQuery`, and is registered as `exams`. `StudentProfileService` calls `getAll()` without a year.
  - The demo seed's exam phase runs in the seed year.
  - The dashboard list was already keyed by year.
- **Family rule.** Students and parents saw exams through the student's current `students.section_id`. A transferred student lost their past exams and saw the new section's instead. Exams now use the same rule as Assessments: the student (or the parent's child) was placed in a target section on the exam date. That rule moved from `AssessmentGuards.ts` to `academicSources/placedOnSourceDate.ts`, shared by both. Its SQL is unchanged, and Assessments database 4/4 and transport 4/4 still pass.
- **Translations.** `exams.errors` did not exist in any locale, so every exam error reached users as a raw key such as `exams.errors.notFound`. It now has the eight existing keys and the two new ones in all four locales. `assessments.errors` is missing the same way; left for its owner.
- **Tests.**
  - `OwnedRepositoryReads.test.ts` runs every exam read in a year and pins a parent's `getById` SQL: placement on `"exams"."date"`, no `students.section_id`, the stored year and the id (ownership 152/152).
  - Two unit tests now call `getAll` without a year.
  - New `ExamsHistoryDatabase.test.ts` passed 3/3 on the fixture, with rolled-back rows. It covers exact ids per year including a legacy dated row, count, filters, and the cross-year detail.
  - It also covers Omar (S05, moved A to B on 15 January 2026). He sees December's section-A exam and February's A+B exam, but not February's A-only exam. Adam sees all four. Omar's parent sees what Omar sees, and an unlinked parent nothing. Under the old current-section rule Omar would see none of them.
  - It also covers the year stamp on create and year-bound update, delete, bulk delete and delete-all.
  - New `ExamsHistoryTransport.test.ts` passed 3/3 on port 5508.
    - A past-year create is stored in that year and listed by section, teacher and year only there.
    - Another year's detail, update, delete and `/grades/exam/:id` return 404.
    - A create whose sections are outside the selected year returns 409 with the English message.
    - It covers the 400 conflict and an unknown year (404), and MCP `exams_get_all` by header and by tool input.
    - Created rows were deleted.
- **Gates.** `bun run lint`, `bun run typecheck`, `bun run i18n:check` ("Missing keys: none") and `bun run build` passed. `bun run test` passed every suite: 270, 60, 11, 258, 17, 152 and 24 tests. The academic-years suite dropped from 259 to 258 because of the concurrent payments edits, not this slice.
- **Open.** Owner visual and browser review.

**Follow-up, 2026-09-28.**
- **Grading was not affected.** The exams entry flagged `ExamValidator.ensureStudentInExam` as checking the current section. `GradeService.create` already requires placement in the grade's section on the source date (`ensureCreateEligible`). The current-section checks run only for a student with no dated enrollment at all, where the current section is the only record. `GradeValidator.validate` has no callers. Nothing changed.
- **Student profile `/academic`.**
  - `upcomingExams` filtered on `examDate`, which does not exist, so it was always empty.
  - `assessments` returned everything the reader may see, so staff got the whole school's assessments as this student's.
  - Both now use one student's reads: new `ExamRepository.getForStudent` and `AssessmentRepository.getForStudent`, through `ExamService.getForStudent(studentId, { upcoming })` and `AssessmentService.getForStudent`. A source is the student's when they sat in a target section on its date: `studentPlacedOnSourceDate`, the student-keyed form of the shared placement rule, in the same year and ownership condition. The silent catch on the exam read was removed.
- **Tests.**
  - `ExamsHistoryDatabase.test.ts` (3/3) adds Omar's own exams, from a date, and none for Hamza in 2026-2027.
  - `ExamsHistoryTransport.test.ts` (4/4) adds the profile check. Adam's current profile lists a new May 2027 section-A exam and his one assessment. Hamza, not enrolled in 2026-2027, gets neither; before, his profile listed the year's assessment. A past year has no upcoming exams.
  - Assessments database and transport stay 4/4.
  - Ownership 154/154 covers both new reads.
- **Gates.** `bun run typecheck`, `bun run lint` (one warning, in the concurrent `PayrollHistoryTransport.test.ts`) and `bun run build` passed. `bun run test` passed every suite: 270, 60, 11, 258, 17, 154 and 24 tests.

## Discipline selected-year slice, 2026-09-27

Same basis as Behavior rewards. An incident belongs to the year whose reporting interval holds the school-local day of `incidentAt`. There is no column and no migration. Uncommitted, alongside the concurrent financial slices; no browser review or deployment is claimed.

- **Code.**
  - `DisciplineRepository` reads with one `readCondition`: ownership plus the year, applied in the builder's only `.where()`. Update and delete stay inside the selected year, so resolve and reopen do too.
  - Create and update take class and section from the student's placement on the incident's day in the selected year. Before, they used the student's current class, and required the student to be active today, which blocked corrections for a student who has since left.
  - A date outside the selected year returns 409 (`outsideSelectedYear`), as does a student not placed that day (`notPlacedOnDate`). These replace `studentInactive` and `studentAcademicPlacementRequired` in all four locales. A teacher must be assigned to that day's section. Changing only the date re-checks the placement too.
  - The placement lookup moved to `studentEnrollments/placementOnDay.ts` (`studentPlacementOn`), shared with Behavior rewards.
  - The controller is registered as `discipline`. The dashboard list and detail are keyed by year. The demo generator dates incidents inside the seed year after each student's placement begins; the seed's conduct phase already ran in the seed year.
- **Tests.**
  - `OwnedRepositoryReads.test.ts` pins a parent's `getById` SQL: ownership, the interval and the id in one condition (ownership 151/151).
  - New `DisciplineHistoryDatabase.test.ts` passed 3/3 on the fixture. It covers exact ids per year, the Casablanca boundary, ownership inside each year, placement across S05's transfer and after S07's withdrawal, and year-bound update and delete. `DisciplineOwnershipDatabase.test.ts` still passes 1/1. All rows were rolled back.
  - New `DisciplineHistoryTransport.test.ts` passed 3/3 on port 5507. It covers past-year create filed under the day's section and a date change moving it across the transfer. It also covers cross-year 404s for read, update, resolve and delete, and the 409 refusals. Finally it checks the 400 conflict, an unknown year (404), and MCP `discipline_list` with the year as header and as tool input. Created rows were deleted.
  - Behavior rewards database 3/3 and transport 3/3 still pass on the shared helper.
- **Gates.** `bun run lint`, `bun run typecheck`, `bun run i18n:check` ("Missing keys: none") and `bun run build` passed. `bun run test` passed every suite: 270, 60, 11, 259, 17, 151 and 24 tests.
- **Open.**
  - Owner visual and browser review.
  - The teacher dashboard's open-incident count (`TeacherDashboardRepository.countOpenIncidents`) is not year-filtered; that controller resolves its own year and belongs to the dashboard row.

## Financial utilities history slice, 2026-09-27

**Scope.** `financial/utils` has no CRUD routes. Fee creation, installment generation and rollover use explicit charged/target year inputs for the September-June billing range. The utility range resolver now rejects an invalid explicit academic year instead of silently switching to the current year, and requires consecutive year labels. July 1-14 remains payment closeout, outside the fee billing interval. The seed container was updated with `RolloverService`'s academic-year validator dependency, found by the academic-year suite. No schema or API change.

**Checks.** `FinancialUtilsHistory.test.ts` passed 3/3 with two historical ranges, a ten-month fee and installment schedule, exact minor-unit sum, July billing refusal and malformed/non-consecutive year refusal. `SeedDependencyWiring.test.ts` and the full configured `bun run test` passed after seed wiring was fixed. `bun run typecheck`, `bun run lint` and a production `bun run build` with `NAJM_NEXT_DIST_DIR=.next-history-finance-final` passed. No separate database or transport test applies to pure utilities. Owner review and browser acceptance remain open; no production deployment is claimed.

## Financial rollover source/target slice, 2026-09-27

**Scope.** Preview selects active students from source-year enrollment and dated placements, not their current class. A candidate needs an active target-year enrollment; its target enrollment date drives the new fee's effective date. Preview and commit require selected year to match the explicit target, with the source preceding it. The financial operations UI sends target-year context. Academic-year activation stays separate. The existing per-fee transaction boundary, idempotency key and persisted item outcomes remain.

**Connected checks.** On marked local `school_history_test`, `RolloverHistoryDatabase.test.ts` passed 1/1 with 4 assertions against source/target roster membership. `RolloverHistoryTransport.test.ts` passed 2/2 with 24 assertions through authenticated REST and MCP: wrong selected target refusal, source/target preview, idempotent preview, target fee creation, old-year isolation, idempotent commit and MCP year input. A post-preview target duplicate produced one failed item, zero new fees and a stable failed-run retry. Temporary fees, installments, run items, runs and audit rows were removed. This failure case occurs before a fee insert; it does not prove a mid-write rollback or concurrent commits.

**Gates.** Server source/test and dashboard typechecks and lint passed. Owner UI/browser review and concurrent/mid-write failure acceptance remain OPEN. No production migration, deployment, commit or push is claimed.

## Payroll period slice, 2026-09-27

**Scope.** A payslip belongs to the registered reporting year containing the first day of its `YYYY-MM` period. Normal list, detail, staff, period, summary and SQL edit/delete routes use that selected year; creation, run, pay-staff and unpay reject a period outside it. Payment date remains the actual cash date, even when it falls in the next reporting year. The payroll view offers the selected year's period months, keys the period query by year and retains historical payslip snapshots when a staff member is no longer active. The shared current staff catalog still supplies missing-row salary estimates; historical compensation changes are not reconstructible from that catalog and need owner review before backfilling an old missing payslip. No schema migration.

**Connected checks.** On marked local `school_history_test`, `PayrollHistoryDatabase.test.ts` passed 1/1 with 14 assertions in a rolled-back transaction: July 2026 payslip in 2025-2026, September 2026 payment date, current-year isolation, summary and wrong-year SQL edit/delete refusal. `PayrollHistoryTransport.test.ts` passed 1/1 with 15 assertions through authenticated REST and MCP: lists, detail, period summary, wrong-year writes and run/pay-staff refusal, an old-year correction and MCP year input. Temporary rows were deleted.

**Gates.** Server source/test and dashboard typechecks and `bun run test:academic-years` (258/258) passed. Owner UI/browser review remains OPEN. No production migration, deployment, commit or push is claimed.

## Payments mixed-receipt slice, 2026-09-27

**Scope.** The normal payment list reads the selected fee year from `@Year()` and returns each receipt once with `yearAllocatedAmount`; the receipt's full amount and actual payment date remain unchanged. A fee-specific history route returns its allocated portion in the selected fee year and returns 404 under another year. Revenue endpoints use selected fee year while monthly revenue groups by the cash settlement or payment date. Receipt detail, per-student history, pending checks and status/refund/void actions remain shared because one receipt can settle several fee years. The dashboard already keys the school-wide payment list by year and labels the allocated portion separately. No schema migration.

**Connected checks.** On marked local `school_history_test`, `PaymentsHistoryDatabase.test.ts` passed 1/1 with 13 assertions in a rolled-back transaction: a September 51.00 receipt split 30.25/20.75 between 2025-2026 and 2026-2027 appears once in each year, pending check allocation is excluded from completed revenue, exact revenue deltas and cash month are preserved. `PaymentsHistoryTransport.test.ts` passed 1/1 with 13 assertions through authenticated REST and MCP: fee-year list portions, shared receipt detail, a 404 for wrong-year fee history, revenue route and MCP year input. Temporary rows were deleted.

**Gates.** Server source/test typechecks and `bun run test:academic-years` (258/258) passed. Lint passed. Owner UI/browser review remains OPEN. No production migration, deployment, commit or push is claimed.

## Financial notifications operational history slice, 2026-09-27

**Scope.** Cron reminders are operationally all-year, including overdue debt from an old charged year. Overdue rows group by fee year and carry a fee source into year-attributed Alerts. Cancelled installments are excluded from overdue debt. A check group with no one source year creates only its personal notification. Admin delivery history stays all-year so its log is not hidden by the current year selection. No schema migration.

**Connected checks.** On marked local `school_history_test`, `FinancialNotificationsHistoryDatabase.test.ts` passed 1/1 with 4 assertions in a rolled-back transaction: old/current debt grouping, cancelled schedule exclusion, one-year source and mixed/unallocated check refusal. `FinancialNotificationsHistoryTransport.test.ts` passed 1/1 with 6 assertions through authenticated admin and cron REST: both years' delivery records appear under a selected-year header, missing cron secret is refused, and dry-run includes old-year debt. Temporary rows were deleted. The earlier `AlertsHistoryDatabase.test.ts` also checks overdue sources per charged year.

**Gates.** Server test typecheck passed. Owner review of real sends, UI and browser remains OPEN. No production migration, deployment, commit or push is claimed.

## Installments selected charged-year slice, 2026-09-27

**Scope.** Normal installment lists, status lists, detail, fee detail, statistics, edits and deletion use the selected year of the parent fee. Creation validates that the fee belongs to that year; an edit cannot reassign an installment to another fee. Payment and allocation source paths use named all-year reads and updates so later receipts can settle old fees. Cancellation and resumption by source fee remain all-year; recalculation leaves cancelled installments cancelled. Public writes cannot set `paidAmount` or `status`, or edit/delete an installment that has allocations. The dashboard list/detail cache is year-keyed and mutations carry the selected year. No schema migration.

**Connected checks.** On marked local `school_history_test`, `InstallmentsHistoryDatabase.test.ts` passed 1/1 with 17 assertions in a rolled-back transaction: charged-year list/detail/status isolation, wrong-year SQL update/delete refusal, named all-year source reads, cancellation and resumption. `InstallmentsHistoryTransport.test.ts` passed 1/1 with 14 assertions via authenticated REST and MCP: selected-year lists/detail/overdue, wrong-year create/update/delete refusal, a historical amount correction and MCP year input. Temporary rows were removed.

**Gates.** Server source/test and dashboard typechecks, `bun run test:academic-years` (259/259), and lint passed. Owner UI/browser review remains OPEN. No production migration, deployment, commit or push is claimed.

## Fee types shared-catalog slice, 2026-09-27

**Decision and scope.** Fee types are one school-wide catalog. They have no academic-year field or `@Year()` scope; fee rows keep their own charged year and refer to the same fee type across years. The existing service checks names globally and transport reads, edits and deletion ignore a selected-year header. The dashboard uses one shared fee-type cache. No source or schema migration was needed. Name uniqueness is service-enforced but lacks a database unique index, so concurrent duplicate creates need a separate integrity review before claiming database-enforced uniqueness.

**Connected checks.** On marked local `school_history_test`, `FeeTypesHistoryDatabase.test.ts` passed 1/1 with 8 assertions. A rolled-back row stayed visible by ID, name, status, category and count under three selected years. `FeeTypesHistoryTransport.test.ts` passed 1/1 with 15 assertions through authenticated REST and MCP: a type created under 2025-2026 remained visible under 2024-2025, 2026-2027 and an unknown year header; a same-name create under another year returned 409; an update was global; MCP listed it without a year input; deletion removed it globally. The temporary row was deleted.

**Gates.** Server test typecheck, `bun run test:academic-years` (259/259) and lint passed. The fee-type production code did not change. Owner UI review is OPEN; no production migration, deployment, commit or push is claimed.

## Parents and students read their own records, 2026-09-27

Owner decision: parents and students see behavior rewards, alerts, assessments, attendance, announcements, notifications, grades and similar records. A student sees their own; a parent sees their children's; neither changes any of them. Uncommitted, alongside the concurrent financial slices; no browser review or deployment is claimed.

- **Server.**
  - `BehaviorRewardGuards.ts` gained parent and student rules.
  - `discipline` gained ownership: `DisciplineGuards.ts` gives teachers what they reported, students their own and parents their children's, and `DisciplineRepository` applies it in its one `.where()`. This replaces the service's role check, under which any role other than teacher saw every incident.
  - Assessments, attendance, exams and grades already had family rules. Notifications were already per person.
  - `rolePermissions.json` grants parent and student `read:assessments`, `read:exams`, `read:attendance`, `read:behavior-rewards`, `read:discipline` and `read:sections`. The section rules already limit families to their children's sections. Every name exists in `permissions.json`, and `bun run seed:admin` adds them to existing databases.
- **Dashboard.**
  - `useViewerRole()` (`shared/useViewerRole.ts`) marks parents and students. The Students list, Assessments, Exams, Behavior rewards and Discipline show them no create, edit or delete. The profile's Grades tab is read-only for them.
  - The Behavior rewards and Discipline pages now admit parents and students, and families get a shared empty-state text.
  - The menu gives families My children or My profile, Alerts, Announcements, Conduct, Assessments, Exams, Calendar and Timetable. Grades and attendance are in the child's profile.
- **Alerts page.**
  - New `/alerts` page (`features/Alerts`), keyed by year, with table and card views, for everyone including staff.
  - Families acknowledge alerts about themselves or their child. Teachers handle alerts about someone; other staff handle all; admins delete. The server enforces the same rules.
  - The profile's Alerts tab, a placeholder until now, lists that student's alerts.
  - `alertApi.ts` now calls only routes the server has; nothing used the old helpers.
- **Calendar.** Add, edit and delete are for admin and principal only; teachers and families saw them before.
- **Tests.**
  - `OwnershipPolicy.test.ts` pins teacher, student and parent SQL for both conduct tokens. `OwnedRepositoryReads.test.ts` covers the discipline reads (ownership 150/150).
  - `BehaviorRewardsHistoryDatabase.test.ts` now checks that a student sees only their own rewards year by year, a linked parent their two children's, and an unlinked parent or unknown role nothing (3/3).
  - New `DisciplineOwnershipDatabase.test.ts` passed 1/1 on the fixture: admin all, teacher their reports, student own, parent children, others none. Unseen ids are not found. All rows were rolled back.
  - After all the changes, Behavior rewards transport 3/3 and the Alerts plus Announcements database suites 8/8 passed.
- **Gates.**
  - `bun run typecheck`, `bun run lint` and `bun run i18n:check` ("Missing keys: none") passed.
  - `bun run test` passed every suite: 270, 60, 11, 256, 17, 150 and 24 tests.
  - `bun run build` passed and lists `/alerts`. A first build failed only because it ran at the same time as another agent's build over the same `.next` folder.
- **Open.**
  - Browser review as a parent and as a student.
  - Families no longer land on the staff dashboard: `/` sends them to My children or My profile. The staff charts were refused to them on the server anyway. A family home with summary cards is not built, because the server's `getParentWidgets` and `getStudentWidgets` are empty stubs.
  - Staff still cannot create alerts from the page.
  - Exams' family rule reached students through their current section. Done in the exams slice: placement on the exam date.

## Fees selected charged-year slice, 2026-09-27

**Scope.** The registered selected year filters fee list, detail, per-student, overdue and summary reads by the fee's stored charged-year label. Fee-only students with no enrollment that year remain visible, with unknown historical class. Ordinary fee update, delete and recalculate refuse another year's ID. Fee create and bulk-class creation use the selected year; a conflicting body year is refused. Fees nested in a new student create use that student's resolved enrollment year, and a different supplied fee year is refused. Fee write bodies retain their existing `academicYear` field, which also supplies the MCP year selection for those tools, avoiding a duplicate tool input. Explicit all-year outstanding and per-student debt discovery remain, as do named source-fee reads and recalculation used by payment, allocation, rollover and transport jobs. Annual and all-year balances now sum completed allocations, so a receipt dated in the next year contributes only its allocated portion to each charged year. No schema migration.

**UI.** Fee list and details already used year-keyed reads. Fee mutations now carry the year captured when the form opens; direct bulk and class-bulk requests do likewise. The outstanding all-year table remains a discovery view and does not expose edit/delete actions under an unrelated selected year.

**Connected checks.** On marked local `school_history_test`, `FeesHistoryDatabase.test.ts` passed 1/1 with 24 assertions in a rolled-back transaction. It checked a fee-only 2025-2026 student, 2026-2027 fee isolation, per-student and overdue reads, wrong-year SQL update/delete, and a September receipt split 30.00/20.00 across two fee years. It caught and fixed an ambiguous SQL reference in per-student allocation metrics. `FeesHistoryTransport.test.ts` passed 1/1 with 22 assertions through authenticated REST and MCP: selected/default lists, detail, student and overdue reads; wrong-year update/delete/recalculation; an old-year correction; body/header conflict; MCP list and old-year create using its charged-year field. Temporary fee, installment, fee-type and audit rows were cleaned afterward.

**Gates.** `bun run test:academic-years` passed 259/259 after the nested new-student fee regression case, and `bun run test` passed its full configured suite. Server source/test and dashboard typechecks passed; `bun run lint` passed cleanly. `NAJM_NEXT_DIST_DIR=.next-history-slice bun run build` passed compilation, TypeScript, page generation and traces. Owner UI/browser review remains OPEN. No production migration, deployment, commit or push is claimed.

## Expenses selected business-date year slice, 2026-09-27

**Scope.** An expense belongs to the registered year whose reporting interval contains its `expenseDate`. The actual `paymentDate` may be later, including in the next school year. `ExpenseRepository` applies the selected-year predicate to lists, direct IDs, pending approvals, current-day/month reads, counts, summaries, analytics and update/approval/payment/delete SQL. Its invoice, receipt and check lookups remain all-year for uniqueness; `deleteAll` remains the named trusted seed reset. `ExpenseValidator` rejects a new or corrected expense date outside the selected interval and returns the scoped row for audit before-images. `ExpenseService.getTotalExpenses` uses the selected registered reporting interval for the root dashboard widget. The controller joins the common REST/MCP year scope. No schema migration.

**UI and seed callers.** The Expenses list and optional detail use the shared year-keyed query, and create/update/delete capture the selected year when the dialog opens. The demo expense phase runs in its seed year; the seed task registers the property injector before server initialization. This did not change payroll records or payment dates.

**Connected checks.** On marked local `school_history_test`, `ExpensesHistoryDatabase.test.ts` passed 1/1 with 20 assertions. Its rolled-back transaction placed a paid July expense in 2025-2026 with a September payment date and a pending September expense in 2026-2027, then checked exact list/detail/date-range/pending IDs, summary and count deltas, global invoice lookup and wrong-year SQL writes. `ExpensesHistoryTransport.test.ts` passed 1/1 with 25 assertions through authenticated REST and MCP: selected/default-year lists and direct IDs, pending read, rejected wrong-year create/date correction/update/approval/delete, global invoice uniqueness, old-year approval, old-year payment with a later actual date, MCP tool year input and list, and correct-year deletion. Its temporary expense and audit rows were cleaned after the test.

**Gates.** `bun run --cwd packages/server typecheck` and `typecheck:test`, `bun run --cwd packages/seed typecheck`, `bun run --cwd apps/dashboard typecheck`, `bun run lint`, `bun run test:academic-years` (256/256), focused fixture tests above, `git diff --check`, and `NAJM_NEXT_DIST_DIR=.next-history-slice bun run build` passed. Owner UI/browser review is OPEN. No production migration, deployment, commit, or push is claimed. Decision: HOLD for owner review; implementation may continue under the owner's prior continuation request.

## Student credits selected target-year slice, 2026-09-27

**Scope and implementation.** A credit lot is an unallocated balance tied to a student's actual source payment, so `GET /student-credits/student/:id` remains all-year. `POST /student-credits/apply` now applies it only to installments whose target fee is charged to the selected registered year. The controller enters the common REST/MCP year scope; the service reads the resolved `@Year()` property on apply, and the installment lock query takes an optional fee-year predicate. Payment auto-allocation continues to call that lock query without a year and keeps its existing all-year behavior. The original source payment retains its payment date, and each credit application creates a normal payment allocation linked to the target fee. The Financial Operations form names the target year, holds Apply until selection loads, and captures that year when sending the write. Its student list is keyed and requested by viewing year; the shared credit-lot list remains keyed by student only. No schema migration.

**Connected checks.** On marked `school_history_test`, the database test passed 1/1, 6 assertions: the same available lot remained visible while installment locks returned only 2025-2026, only 2026-2027, none for 2024-2025, or both under the explicitly all-year payment path. All inserted rows rolled back. The authenticated REST/MCP transport test passed 1/1, 19 assertions: a real 150.00 cash receipt allocated 50.00 to a 2026-2027 fee and created 100.00 credit; a 2024-2025 apply with no target failed without consuming credit; 30.00 applied to a 2025-2026 fee; 20.00 applied to the 2026-2027 fee; MCP applied another 10.00 to the older year. The same lot was visible under either year throughout, ending at 40.00; the target allocation API returned only each year's portions. Direct deletion of a credit-backed allocation returned 409 and preserved that allocation. Temporary payment, credit, allocation, fee and audit records were cleaned after the suite.

**Gates.** `bun run --cwd packages/server typecheck` and `typecheck:test`, `bun run --cwd apps/dashboard typecheck`, `bun run lint`, `bun run test:academic-years` (256/256), `git diff --check`, and `NAJM_NEXT_DIST_DIR=.next-history-slice bun run build` passed. Owner UI/browser review is OPEN. No production migration, deployment, commit, or push is claimed. Decision: HOLD for owner review before advancing this lane.

## Financial audit log shared-history slice, 2026-09-27

**Decision and scope.** `POST /financial-audit-logs/list` and `GET /financial-audit-logs/:id` (including their MCP tools) remain admin-only and all-year. The append-only log has no academic-year column; its before/after snapshots and metadata can describe several years, so filtering by a selected year would hide evidence or guess an attribution. It is intentionally absent from `yearScope.ts`; a year header is ignored by this shared route. `FinancialAuditController.ts` names this exception, and the Financial Operations panel labels the latest audit records as covering all school years. The existing `limit: 50` panel fetch is a page size, not a year filter. There is no schema migration, retention deletion, or new write path.

**Connected checks.** On the marked `school_history_test` fixture, the database suite inserted two audit rows with 2025-2026 and 2026-2027 snapshots inside a rolled-back transaction. It passed 1/1, 13 assertions: both rows remained in list/count/detail under either selected-year context, and action filtering still worked. The authenticated transport suite inserted temporary rows, then removed them. It passed 2/2, 20 assertions: admin REST list and detail returned both rows under no header, either registered year and an unknown header; the principal request was denied; MCP exposed no added `academicYear` tool input and returned both records despite a year header. No fixture audit rows remained from either suite.

**Gates.** `bun run --cwd packages/server typecheck`, `typecheck:test`, `bun run lint`, and `bun run test:academic-years` (256/256) passed. `NAJM_NEXT_DIST_DIR=.next-history-slice bun run build` passed compilation, TypeScript, page generation and trace collection. Owner UI/browser review is OPEN for the panel wording. No production migration, deployment, commit, or push is claimed. Decision: HOLD for owner review before advancing this lane.

## Financial allocations selected-year slice, 2026-09-27

**Scope.** `GET /payment-allocations`, `/:id`, `/payment/:paymentId`, `/student/:studentId`, and `DELETE /:id` are financial-only REST/MCP operations. An allocation belongs to the year charged on its target fee, even when a receipt date falls in another year or one receipt pays fees from two years. The controller is registered in the common REST/MCP year scope. The repository's API reads combine the fee-year condition with their existing ID/student/payment condition. The delete uses a fee-year subquery in its SQL predicate, then the existing transactional audit and recalculation path. `PaymentService` still reads every allocation of a receipt when processing payment state; it explicitly uses the repository's all-year mode. Credit and payment write workflows remain for their later module turns. No schema change or dashboard screen uses the allocation controller directly.

**Marked fixture.** `school_history_test` passed the base 3/3 identity/marker checks. The allocation database suite inserted a 150.00 receipt with 75.00 applied to a 2025-2026 fee and 75.00 to a 2026-2027 fee inside a rolled-back transaction. It passed 1/1, 14 assertions: exact selected-year list, detail, payment and student rows; both 75.00 portions; all-year internal receipt access; a wrong-year delete changing nothing; and a matching-year delete leaving the other portion intact. The authenticated transport suite created the same shape with unique temporary IDs and removed it afterward. REST and MCP passed 3/3, 32 assertions: selected and default-active-year list and detail, principal access, per-receipt and student reads, wrong-year 404, year conflict 400, unknown year 404, MCP tool input, successful selected-year delete, and survival of the other year's allocation. A third case recorded a real mixed-year payment through `POST /payments` and found exactly 10.00 in each fee year's allocation API. The suite cleaned up its temporary payment and allocations; no fixture rows remained.

**Gates.** `bun run --cwd packages/server typecheck`, `typecheck:test`, `bun run lint`, and `bun run test:academic-years` (256/256) passed. `NAJM_NEXT_DIST_DIR=.next-history-slice bun run build` passed compilation, TypeScript, page generation and trace collection. The allocation database suite passed again after the transport suite's cleanup. Owner source review is OPEN; no browser flow uses this controller, so UI/manual acceptance is N/A for this slice. No production migration, deployment, commit, or push is claimed. Decision: HOLD for owner source review before advancing this lane.

## Behavior rewards slice; Alerts and Announcements read-condition follow-up, 2026-09-27

Worked alongside the Assessments and Attendance slices, in the same uncommitted tree on top of `b397b57`. No migration, browser review, production change or deployment is claimed.

- **Alerts and Announcements (section 5.6).** Each repository now has one `readCondition(...filters)`: ownership plus the year predicate. Its query builder applies it in the builder's only `.where()`, and each method passes just its own filters. Writes keep their own year-only predicates, since the service loads the target through the owned read first. `AnnouncementGuards.isLive()` is now exported and reused by the published and active lists, so "live" is defined once.
- **Announcements dashboard.** The list was cached under `['announcements']` alone, so switching years kept showing the previous year's list until it refetched. `useAnnouncements` now uses `useYearScopedList`, and so does the Calendar, which uses the same hook.
- **Behavior rewards: year basis.** The year is dated: a record belongs to the year whose reporting interval holds the school-local day of `behaviorAt`. There is no column and no migration, following the dated inventory's classification (D).
  - The new shared helpers `occurredInReportingInterval` and `schoolLocalDay` in `academicRecordYear.ts` compare instants against the interval's first and last days in the school time zone (`settings.time_zone`), so the index on `behavior_at` still applies. Discipline has the same shape.
- **Behavior rewards: code.**
  - Reads use one `readCondition` (teacher ownership plus the year).
  - Update and delete stay inside the selected year.
  - Create and update take class and section from the student's placement on that day in the selected year, not from the current class.
  - A date outside the selected year returns 409 (`outsideSelectedYear`), as does a student not placed that day (`notPlacedOnDate`).
  - A teacher must be assigned to that day's section.
  - The controller is registered as `behavior_rewards`. The dashboard list is keyed by year. The demo seed runs the conduct phase in the seed year, and the demo generator keeps reward dates inside the seed year after each student's placement begins.
- **Behavior rewards: tests.**
  - `BehaviorRewardsHistoryDatabase.test.ts` passed 3/3 (30 assertions). It covers:
    - exact ids per year;
    - the Casablanca boundary: 21:30Z on 31 August stays in 2024-2025, and 23:30Z moves into 2025-2026;
    - teacher ownership, with families and unknown roles seeing nothing;
    - S05's placement before and after the 15 January transfer, S07 after withdrawal, and S08 without an enrollment;
    - year-bound update and delete.
  - `BehaviorRewardsHistoryTransport.test.ts` passed 3/3 on port 5499. It covers:
    - past-year create filed under the day's section, and a date change moving the record across the transfer;
    - cross-year 404s;
    - the 409 refusals, the 400 conflict, an unknown year (404) and principal denial (401);
    - MCP `behavior_rewards_list` with the year as header and as tool input.
  - Every row either suite creates is rolled back or deleted; the fixture holds no behavior rewards afterwards. With the registration removed, the transport cases fail with 500.
- **Gates.** `bun run lint`, `bun run typecheck`, `bun run i18n:check` ("Missing keys: none") and `bun run build` passed. `bun run test` passed every suite: 270, 60, 11, 255, 17, 145 and 24 tests. After the 5.6 refactor, Alerts database 4/4, Announcements database 4/4, Alerts transport 5/5 and Announcements transport 4/4 passed.
- **Open.** Owner visual and browser review. Whether parents and students should see their own or their child's rewards: today only staff with `read:behavior-rewards` and the awarding teacher see them. The module keeps its `Can('…:behavior-rewards')` guards instead of `@Policy`, because `@Policy` would derive `behavior_rewards` and silently drop the existing grants.

## Assessments and Attendance selected-year slices, 2026-09-27

**Scope and source.** Uncommitted School changes on `b397b57`; no schema migration was needed because both tables already store `academic_year_id`. Both repositories read the selected `@Year()` property for normal lists, detail, counts or dated views, and update/delete predicates; creates stamp that year. The stored year is authoritative; a legacy null-year row is visible only in the year containing its record date. Source/context lookups and monthly attendance reporting retain explicitly named cross-year parameters. Assessment create/update checks its target sections' registered year against the selection. Attendance student, staff, status-correction and roster writes check the dated year before mutation. Full seed cleanup uses named all-year methods; the demo and school seed runners bind a validated year for new records. Assessment student/parent ownership now uses dated enrollment placement and all targeted sections, rather than the current section projection. Consumer routes in profiles, grades and dashboards entered the year scope where they reach these repositories. Their own year flows remain in the later queue.

**Fixture.** `bun --env-file=apps/dashboard/.env.local run seed:history:academic-records` ran twice successfully and idempotently against marked local `school_history_test`, after checking the database name, fixture marker and exactly ten students. The shared manifest adds five Assessment and five Attendance rows: three stored-year rows each, one dated null-year legacy candidate each, and one out-of-range null-year row each. It also adds one staff teacher, one subject and annual assignments, while retaining the existing three years, ten student identities and S05's midyear A-to-B transfer. No application database was seeded or migrated.

**Connected database and transport.** On the fixture, `bun --env-file=apps/dashboard/.env.local test packages/server/tests/acceptance/AssessmentsHistoryDatabase.test.ts packages/server/tests/acceptance/AttendanceHistoryDatabase.test.ts` passed **6/6, 65 assertions** (Assessment 4/4; Attendance 2/2). It checked exact annual IDs, legacy fallback, unresolved exclusion, detail/count/filter and ownership reads, past-year writes, wrong-year update/delete denial, selected-year bulk deletion, staff-roster attribution and rollback cleanup. A transactional parent link, S05's dated placement and a two-section assessment proved historical Assessment ownership; the temporary parent and all repository mutations rolled back. Both suites failed on cross-year detail assertions when their detail-year predicate was temporarily removed, then passed after restoration.

`bun --env-file=apps/dashboard/.env.local test packages/server/tests/acceptance/AssessmentsHistoryTransport.test.ts` passed **4/4, 30 assertions**. `bun --env-file=apps/dashboard/.env.local test packages/server/tests/acceptance/AttendanceHistoryTransport.test.ts` passed **5/5, 38 assertions**. Authenticated REST checked past and default-year lists, date/detail reads, principal permission denial (401), malformed/conflicting selection (400), wrong-year IDs (404), matching/mismatching creates, edits, attendance correction/history, and the S05 transfer boundary. Connected profile, grade-source and dashboard requests returned the selected-year results instead of masking a missing scope as an empty list. Authenticated MCP checked selected year in the header and tool input plus conflict rejection for both lists. Temporary REST writes were deleted in `finally`.

**Repository gates.** `bun run test` passed all configured suites after the new ownership assertion was updated; a subsequent focused registration test brought the academic-year suite to **256/256**, while ownership passed **144/144**. `bun run lint`, `bun run typecheck`, and `git diff --check` passed. `bun run build` passed before the final consumer cleanup. A later ordinary build compiled and typechecked, then failed while collecting `/_not-found` because its generated `.next` page file disappeared during concurrent build activity. A direct final Next build with `NAJM_NEXT_DIST_DIR=.next-history-slice` passed compilation, TypeScript, page generation and traces after the cleanup. The isolated build directory is untracked; automatic approval review rejected recursive removal with reason `blocked by policy`, so cleanup remains for the owner. No browser/manual review, production migration, commit, push, CI image or deployment is claimed. The test server still emits MCP `@custom` warnings for older controllers that retain parameter-based year flow; their conversion remains in their later module turns. Assessment and Attendance visual/browser review is **NOT RUN**. Decision: **HOLD for owner review before the next queued module**.

**Shared-scope regression:** after registering the additional consumers, the previous Alerts and Announcements PostgreSQL suites passed **8/8, 117 assertions**, Alerts authenticated transport passed **5/5, 45 assertions**, and Announcements authenticated transport passed **4/4, 41 assertions**. Assessment and Attendance transports also passed after removing silent consumer catches (**4/4** and **5/5**).

## Ownership for Alerts and Announcements; year scope for their consumers, 2026-09-27

The owner asked for Alerts and Announcements to follow the same ownership workflow as the other modules. People handle their own alerts, and each announcement reaches only its intended audience. Both changes are uncommitted in School on top of `b397b57`. No browser review, production migration or deployment is claimed.

- **Ownership rules.** `auth.ts` gained a School `when(...)` step. After a join chain it narrows the chain by a condition on the row; on its own it is the whole rule for audience rows. `ownedIds()` returns a user's owned ids as a subquery.
  - **Alerts** (`AlertGuards.ts`): five tokens.
    - Students, parents and teachers see alerts about a student they can see, within the alert's audience.
    - Teachers also see alerts that name them or one of their assignments.
    - Class-wide notices reach class members; school-wide notices reach their audience group.
  - **Announcements** (`AnnouncementGuards.ts`): live announcements (published, started, not expired) for the reader's audience, class announcements for classes the reader belongs to, and announcements the reader wrote.
  - **Access by role.** School-wide roles read everything their permissions allow. Unknown roles read nothing.
- **Routes and writes.** Both controllers use `@Policy(...)` with `@Can*` permissions; bulk and school-wide operations keep `@isAdmin()`.
  - Teachers may set any status on alerts about their students or addressed to them. Parents and students may only acknowledge alerts about their child or themselves. Class-wide and school-wide notices, and alert content edits, stay with staff.
  - Only an announcement's author or school-wide staff may edit, publish, unpublish or delete it.
  - `rolePermissions.json` grants teacher, parent and student `read:alerts`, `update:alerts` and `read:announcements`; `bun run seed:admin` adds them to existing databases.
  - The dashboard hides announcement create, edit and delete from non-managers.
- **Supersedes two earlier statements in this ledger.** `/announcements/published` now requires sign-in and returns 401 anonymously; the old public, active-year behavior is gone. The fixture principal is refused alert routes (401) because it lacks alert permissions, not because of `@isAdmin()`.
- **Consumer fix.** `/profiles/parents/:id/unread-alerts` always returned zero unread, and `/dashboard/operations/kpis` always reported zero alerts and announcements. Both read the year-scoped repositories outside a year, and a `.catch(() => [])` hid the error.
  - Both controllers are now registered in `config/yearScope.ts`, and the silent catches are gone.
  - Registering `parent-profile` first stopped the server from starting: najm-mcp rejects a tool that declares `academicYear` twice. The route's own declaration was removed.
  - `tests/academicYears/YearScopedModules.test.ts` now checks every registered controller's MCP tool params, query and body for `academicYear` without booting.
- **Verification (ownership change).**
  - Lint, typecheck, `i18n:check`, boundaries, build and `db:check` passed.
  - `bun run test` passed every suite: 270, 60, 11, 252, 17, 144 and 24 tests.
  - History database suites passed 11/11, Alerts transport 4/4 and Announcements transport 4/4.
- **Verification (consumer fix).**
  - Lint, typecheck and build passed.
  - `bun run test` passed every suite: 270, 60, 11, 255, 17, 144 and 24 tests.
  - On `school_history_test` (env file `apps/dashboard/.env.local`):
    - Alerts transport 5/5. The new case links a temporary parent to two fixture students, checks unread alerts per child in 2025-2026 and 2026-2027, and checks KPI counts over REST and MCP; it deletes the parent afterwards.
    - Announcements transport 4/4, Alerts database 4/4, Announcements database 4/4 and history base 3/3.
  - With the registrations temporarily removed, the new REST case failed (500 instead of 200) and the MCP case failed (no `academicYear` input), so the tests catch the bug.
- **Open.** Owner visual and browser review. No dashboard page yet lists alerts for teachers, parents or students. The handoff for the remaining modules is section 0 of the plan.

## Repository year context: revised flow, 2026-09-27

The owner requested moving selected-year access into repositories. This checkpoint supersedes the service-property forwarding and method-wrapper design described in the dated entries below. The scope policy, fixture migrations and sequential module queue are unchanged.

- **Flow:** `config/yearScope.ts` registers Alerts and Announcements once for REST and MCP. REST uses Najm's public route middleware injection at order 50, after guards (40) and DTO validation (45). It resolves through `AcademicYearValidator`, then awaits the controller inside `runWithResolvedYear`. MCP retains the published per-invocation hooks. The same ALS store holds a frozen copy of the resolved year. The `@Year()` property injector only installs getters and leaves every method untouched.
- **Domain calls:** `AlertRepository` and `AnnouncementRepository` read the operation year in explicit predicates and stamp it on normal creates. Their services no longer declare a forwarding year property or pass year IDs for ordinary CRUD. `AlertValidator` reads `@Year()` for shared/year-owned attribution. Explicit `checkDuplicateAlertInScope`, `createFromSourceYear`, and `clearForSeedReset` preserve shared notices, the charged fee year and trusted all-year cleanup. The obsolete `YearFromSource` wrapper exception is removed.
- **Focused evidence:** the real-container getter/REST/MCP tests pass, including one resolution per request, no resolution after failed DTO validation, missing context, synchronous helpers, concurrent actors/years, and restored nested scopes. Both repository suites now resolve actual singleton instances through DI and enter trusted scopes using stored fixture years. They also reject unscoped reads/creates/deletes and exercise trusted cleanup inside rolled-back transactions.
- **Real PostgreSQL and transports:** the two database suites passed **5/5, 98 assertions**; Alerts authenticated REST/MCP passed **4/4, 34 assertions**, and Announcements authenticated REST/MCP passed **4/4, 40 assertions**. Commands: `bun --env-file=apps/dashboard/.env.local test packages/server/tests/acceptance/AlertsHistoryDatabase.test.ts packages/server/tests/acceptance/AnnouncementsHistoryDatabase.test.ts`, followed by the `test:history:alerts:transport` and `test:history:announcements:transport` root scripts under the same env file. Temporary writes were deleted or rolled back. No schema or seed migration was required for this refactor; the target remains marked `school_history_test` at `0059` with ten student identities.
- **Repository gates:** `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`, and `git diff --check` passed. School source remains uncommitted; browser review, School publication and deployment are not claimed.

## Announcements slice: selected-year notice history, 2026-09-27

The owner instructed continuation after the Alerts slice. School remains an uncommitted working tree based on `b397b57`; no School push, CI image, production migration or deployment is claimed. The existing `@Year()` service wrapper now leaves synchronous helpers synchronous, after the connected create test showed that wrapping a normalizer as an async method lost its fields. A focused property regression test covers the correction; the Alerts real REST/MCP tests passed again after it.

- **Scope and policy:** Announcement list, detail, author, class, audience, published/upcoming/expired views, stats, create, edit, publish/unpublish and deletion require the selected registered year. Schoolwide announcements also belong to their selected year. Class targets must belong to that year. Existing route grants remain in place. The public published endpoint uses the active year for unauthenticated callers; historical selection still requires an authorized actor. Existing wall-clock publish/expiry semantics remain. Legacy rows without verified attribution have a null year and stay outside selected-year views; no creation-date inference was used.
- **Schema and fixture:** `0059_next_vector.sql` adds only `announcements.academic_year_id`, its foreign key and index; the unrelated generated role-name index was removed from the SQL and snapshot. It was applied only to the marked local `school_history_test` database after `0058` (60 journal entries). The guarded Announcement seed was run twice with the same four year-owned notices and one unresolved notice. The shared fixture still has three years, exactly ten students, 23 enrollments and 24 placements. The application `school` database was not migrated for this slice.
- **Database and transport:** `bun --env-file=apps/dashboard/.env.local run test:history:announcements:db` passed **2/2, 47 assertions**. `bun --env-file=apps/dashboard/.env.local run test:history:announcements:transport` passed **4/4, 40 assertions** against the authenticated server and real PostgreSQL. The tests check exact annual IDs, stats and class/audience filters; unresolved-row exclusion; in-scope publish, edit and delete; cross-year failures; class-year mismatch; public/current behavior; concurrent admin historical and principal current reads; MCP header/tool conflict; and an actual MCP past-year create with wrong-year delete denial. Temporary server writes were explicitly deleted, and repository mutations were rolled back in a transaction.
- **Gates and remaining review:** `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`, `bun run db:check`, and `git diff --check` passed. The Alerts database **3/3** and transport **4/4** suites also passed after the shared wrapper change. Visual/browser review is **NOT RUN**. Assessments is **HOLD** until the owner reviews this module slice. The test server emitted existing MCP `@custom` warnings for other modules and an unavailable optional Ollama indexer; neither caused these suites to fail.

## Alerts slice: published hook and connected fixture, 2026-09-27

This checkpoint supersedes the preparation status in the next section; those earlier results remain dated evidence. The user authorized publication, lint, build and tests. Najm source commit `5a9149b` added the post-guard per-tool context hook; version commits `4de8c37` and `663f860` published `najm-mcp@2.2.1` and `najm-api@2.0.6` from packed tarballs. The npm registry verification matched the published tarballs; both package URLs returned HTTP 200 before School ran `bun install`. Najm `origin/master` is at `663f860` with a clean tree. School pins both exact versions in `package.json`, overrides and `bun.lock`, and its installed declarations contain the new hook options. This is a package publication, not a School deployment.

- **Schema and fixture:** `0058_marvelous_doctor_spectrum.sql` adds only `alerts.academic_year_id`, its foreign key and index; an unrelated generated `roles_name_unique` index was removed from the migration and snapshot. That role index remains a separate future schema decision and may appear in a later generator diff; this slice does not assert role-name uniqueness on existing data. The migration was applied only to the marked local `school_history_test` database, now at 59 journal entries. The base fixture still has exactly three years, ten students, 23 enrollments and 24 placements. The guarded Alert stage was run twice idempotently and contains exactly five year-owned plus two shared Alerts. The existing application `school` database was not migrated by this slice.
- **Source and policy:** `AlertService` reads a request-scoped `@Year()` property; repository list/detail/count/status/mutation and duplicate queries require an explicit year. Shared system and untargeted emergency rows remain visible across selected years. Selected-year bulk deletes leave shared and other-year rows; trusted seed reset has a separate all-year repository operation. Student enrollment, class year and historical student placement are validated. Legacy null-year rows without a provable shared scope remain hidden. Financial overdue notifications group by charged fee year and call a trusted fee-source Alert method; a check without one unique fee source sends its personal notification without inventing an Alert year.
- **Real database and transport:** `bun --env-file=apps/dashboard/.env.local test packages/server/tests/acceptance/HistoryBaseDatabase.test.ts packages/server/tests/acceptance/AlertsHistoryDatabase.test.ts packages/server/tests/acceptance/AlertsHistoryTransport.test.ts` passed **10/10** with 82 assertions. It checked exact list/detail/count IDs per year, shared rows, cross-year write denial and bulk deletion, fee-only student attribution, overdue fee-year grouping, authenticated REST create/update/delete and validation, authenticated MCP with concurrent year selections, principal denial and header/tool conflict. Temporary writes rolled back or were deleted; rerunning the guarded Alert seed confirmed exactly the seven manifest rows. The current server returns 401 for a principal denied by `@isAdmin()`; the test preserves that actual guard result.
- **Repository gates:** `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`, and `bun run db:check` passed against the published Najm pins. The focused `@Year()` REST/MCP suites also passed in `test:academic-years`. No browser review, production migration, School commit/push, CI image, or deployment is claimed. Announcements has not started; the owner visual review of this Alerts diff remains open.

## Alerts-first shared year-context prerequisite, 2026-09-27

The owner authorized lint, build and test execution for the prepared shared context. The source remains uncommitted in School and the sibling Najm checkout; the Najm extension is not published or installed in School, so the School callback remains unregistered and no Alert runtime filtering is active.

- Najm: `bun test packages/najm-mcp/test/invocation-hook.test.ts` passed 4/4, including concurrent direct calls, nested restoration and authenticated Streamable HTTP calls with separate actor/year headers. `bun run test:mcp` passed 51/51; `bunx turbo run build --filter=najm-api` passed 16/16 tasks, including MCP and API declaration builds. This verifies Najm source, not the installed School package or a School connected MCP call.
- School: `bun run test:academic-years` passed 245/245. `bun run lint`, `bun run typecheck`, `bun run test` including the workspace boundary check, and `bun run build` passed after correcting fixture typing. `git diff --check` passed in both checkouts.
- Dedicated local PostgreSQL: created `school_history_test`, applied unmodified migrations through `0057_aromatic_squadron_supreme.sql` (58 journal entries), and ran the guarded `seedAlertsHistory.ts` twice. Both runs retained exactly three years, ten students, 23 yearly enrollments and 24 placements. `bun --env-file=apps/dashboard/.env.local run test:history:base:db` passed 3/3: active pointer/identity, 7/8/8 annual memberships with the midyear transfer, and Aya's 2025-2026 fee without that year's enrollment. Fixture connection and actor passwords are in the ignored `apps/dashboard/.env.local`; no existing `school` data was changed.
- Remaining: publish and pin the Najm MCP hook, register the School callback, implement Alert schema/service/repository year scope and module tests, then run authenticated School REST/MCP and browser acceptance. The base database has no Alert fixture rows yet. No production or deployed revision is claimed.

## `@Year()` refactor: inventory, decorator gate and groundwork, 2026-09-27

Against the rewritten plan. Source and unit evidence only; no database, browser or deployment check was run for this section, and the history switch is unchanged.

- **Phase 0 inventory.** [academic-year-scope-inventory.md](../plans/academic-year-scope-inventory.md) classifies the 555 routes of 60 controllers, the MCP tools, internal callers and the client surfaces, and lists the callers that rely on an omitted year meaning "all years".
- **Phase 1 gate: failed on the installed Najm.** A real-container scratch spike against `najm-core 2.0.6`, `najm-guard 2.0.2` and `najm-mcp 2.1.2` showed: a `'custom'` parameter resolves to `undefined` on REST and MCP; guard results never reach a REST handler (nested ALS copy); route middleware does not run for tools; a guard's `@Query()` reads the MCP transport request (the call failed); two tool calls of one message each received the other's year. The owner chose to extend Najm first.
- **Najm prerequisite, prepared and not published.** In the Najm checkout (uncommitted): `najm-core` `createParamDecorator(resolve)` and `resolveCustomParam`; `najm-mcp` asynchronous tool arguments with custom parameters resolved inside each call. New tests: 9 (core) and 6 (MCP, including a real Streamable HTTP call and two batched calls without cross-talk). Suites: core 75, guard 16, validation 29, MCP 47, auth 521 pass / 13 skipped / 0 fail; `api:check` current; `najm-mcp` builds with declarations.
- **School server.** `AcademicYearValidator` now owns resolution (`resolve`, `resolveRecord`, `resolveSelection`); `AcademicYearService` keeps lifecycle operations. Contracts gained `ACADEMIC_YEAR_HEADER` (`X-Academic-Year`), `ACADEMIC_YEAR_QUERY` and `readAcademicYearSelection` (blank means active; `all` and malformed values refused; header/query conflict refused). `resolveRequestYear` reads header, query value and actor for one request, ready to become `@Year()` once the Najm release is consumed. Explicit all-year read: `GET /fees/outstanding` (with MCP tool) replaces the fee table's omitted-year all-year request.
- **School client.** Tab-local, per-account selection store (`sessionStorage` per tab, `localStorage` remembered, versioned keys, storage failures tolerated, unauthorized years dropped with a visible notice) and a root owner that clears the query cache when the signed-in account changes and normalizes legacy `?academicYear=` links. Link decoration is removed; the fee view's other-year debts select the year instead of linking. The shared HTTP layer sends `X-Academic-Year` on JSON, multipart and retried requests, captured when each request starts; the year-scoped query adapter takes the year from its cache key.
- **Checks.** `bun run test` passed (all groups, 0 failures), server and dashboard typechecks passed, `i18n:check` found no missing keys, ESLint passed on the changed areas. New tests: contracts 5, server 7 (selection, request year, outstanding fees), client 26 (header scope, selection restore, store, cache keys and request year).
- **Not yet done.** Controllers still read the `academicYear` query; `@Year()` waits for the published Najm release. Domain services and repositories, feature migration to the adapter, removal of duplicate year helpers, `useYearAwareList` and the history switch, and all connected acceptance remain open.

## Local demo database and exact migration chain, 2026-09-26

The owner confirmed the `localhost:5432/school` database is disposable demo data and authorized reset and reseeding. Before changing it, `pg_dump -Fc` produced `C:\Users\hdevlop\AppData\Local\Temp\school-demo-before-academic-5be063c382434ca884c6e0945ae1fc85.dump` (515,216 bytes, SHA-256 `365A63100471A292E2AB0EDCAF16CC2D0F72CAA45508C83D2CF6992925E7D53A`); `pg_restore -l` read 514 entries. The existing Drizzle journal had 48 entries and no academic-year tables. `bun run db:migrate` applied the pending academic migrations `0049`–`0057`; the journal then held 58 entries and `bun run db:check` passed. The seeded 2026-2027 year initially had assumed provenance, with 100 legacy students lacking dated enrollments. The pre/post migration fingerprints were identical: fees 605/`a8c5ff109cc3bf0f468df9c6b6e422b7`, installments 2459/`8fc4911f6f2d3603fc68fd6805ab6508`, payments 86/`472b9d37c2baa81ce853e91dfd8c9106`, and allocations 502/`b879cebeed7621680f88777b0c9098e6` (see `fixtures/financial-snapshot.sql`). The first read-only audit found 100 missing enrollment placements, 551 student and 770 staff attendance rows without a year, and 30 assessments, 18 exams, and 64 grades without a year. Those were older demo records, not evidence for invented enrollment dates.

After pgvector 0.8.6 was installed, a separate empty local PostgreSQL database, `school_academic_fullchain_20260926`, ran the **unmodified** repository migrations `0000`–`0057` with `drizzle-kit migrate`. The Drizzle journal has 58 entries and `pg_extension` reports `vector` 0.8.6. This closes the exact empty-database chain and pgvector availability gate; it does not by itself prove restoration of historical application data.

The local `school` demo data was reset after the backup, then regenerated through `seed:demo`. Seed container constructor registrations had drifted from the services; they are aligned and pinned by `SeedDependencyWiring.test.ts`. The seed task runs with a synthetic administrator request identity so owned repository reads can see the fixture classes. Synthetic Settings calendar provenance is explicitly verified, student creation stores the fixture's dated yearly enrollment and placement, assessment/exam dates stay inside September–June, and grade generation uses the IDs returned by source creation. The final successful seed contains 100 students, 100 enrollments, 100 placements, 30 assessments, 18 exams, and 64 grades. A read-only enrollment issue scan found zero missing placements.

The final attendance backfill dry run found 672/672 student and 1,016/1,016 staff rows eligible with no ambiguity. `--apply --run-id=demo-20260926-attendance-final` assigned all 1,688 rows in four 500-row batches, inserted zero issues, and left zero null-year rows. A fresh audit found zero relationship, routine, source, date-boundary, or financial rollup mismatches and zero open migration issues. Earlier demo balances were intentionally replaced by the authorized reset; the pre/post fingerprint comparison applies only to the migration before reset. These checks established the dated **single-year demo** used for the separate two-year copy below. Browser acceptance and the remaining authenticated permission/write matrix remain open; the viewing switch stays off.

## Dated two-year demo clone, 2026-09-26

The owner designated the local school database as disposable demo data. `school_academic_two_year_20260926` was cloned from the regenerated, dated `school` database; the original stayed at one open 2026-2027 year with 100 enrollments. The clone inherited 58 Drizzle journal entries. The separate fresh database above is the evidence for the exact `0000`–`0057` pgvector 0.8.6 chain; the regenerated demo and this clone do not have the `vector` extension installed.

With the history switch enabled only for the clone and the business date set to 2027-09-01, authenticated administrator REST calls created and verified 2027-2028, copied nine classes and 27 sections into it, and mapped each source section to its next class (3AC repeated). Preview proposed 100 enrollments with zero issues. Activation before commit and a stale-hash commit returned 409. Commit created 100 outcomes; replaying its key returned the same run, while a second key returned 409. Activation then placed 100 students, moved the Settings active pointer, and a replay returned `changed=false`; the former year was closed separately.

Post-transition PostgreSQL checks found 100 enrollments in each year and all 100 current student class/section fields matching target-year placements. The read-only academic audit found zero relationship, routine, date-attribution, migration-issue, and financial-rollup mismatches. Fee, installment, payment, and allocation counts and row fingerprints matched the clone's pre-transition baseline: 624/`a9a0b6f9999a8a0d41edca17d289391b`, 2578/`1302ba1481ee760883137710d6df9885`, 91/`ca02353e3d77652eb6538bf4b0821a44`, and 552/`546c9c8b3f0c92e98bcee043f2f46434`. Authenticated selected-year REST reads returned 100 students, nine classes, and 27 sections in each year; only 2026-2027 held the 1,688 attendance and 64 grade rows. The fee list intentionally includes enrolled students with zero charges: both years returned 100 student rows, with 624 fee items in 2026-2027 and zero in 2027-2028. Payments were 91 and zero respectively.

This is a dated demo-copy success, not a transition of the old pre-reset backup: that legacy backup still has 1,533 unresolved date/year issues and is retained as migration evidence without guessed history. The remaining rollback/role combinations and browser UI checks are separate gates.

## Dated 100-student rollback clone, 2026-09-26

`school_academic_rollback_100_20260926` was independently cloned from the still single-year `school` demo. Authenticated REST created and verified an adjacent draft, nine target classes, and 27 target sections; preview again proposed 100 enrollments with zero issues. A disposable PostgreSQL trigger raised on the **50th** target placement insert. The commit returned 500; the sequence recorded 50 attempts, while PostgreSQL retained zero target enrollments, placements, and transition runs. The source year stayed open, the target stayed draft, and Settings still pointed to 2026-2027. After removing that trigger, the same idempotency key committed 100 outcomes and replayed the same run.

A second disposable trigger raised on the **50th** student class projection during activation. That request returned 500; the sequence recorded 50 attempts, all 100 prepared target enrollments remained, zero students pointed at target-year classes, the target was still draft, and Settings still pointed at 2026-2027. Removing the trigger allowed activation to place all 100 students; a repeat returned `changed=false`. Both probes and their sequences were removed afterward. A post-retry audit found zero relationship, attribution, migration-issue, and financial-rollup mismatches. All four financial counts and row fingerprints matched the pre-transition dated demo clone values above. This extends the synthetic two-student rollback evidence to midstream failures on dated demo data; other failure positions remain untested.

### Late activation audit failure on a dated 100-student clone, 2026-09-26

`school_academic_activation_audit_20260926` was copied from the separate dated rollback fixture. Authenticated administrator REST verified 2028-2029, created nine classes and 27 sections, previewed 100 proposed enrollments with zero issues, and committed 100 enrollments and 100 placements in one run. The prior active year was 2027-2028. A temporary `BEFORE INSERT` trigger on `audit_logs` raised only for this target's `academic-year.activate` row. Activation returned 500 after its 100 student projections, target status update, and Settings switch had been attempted. PostgreSQL still showed 100 committed target enrollments and placements, but zero students projected into the target, a draft target, Settings on 2027-2028, and zero target activation audit rows.

The trigger and function were removed. A fresh activation returned `changed=true` and `placed=100`; a second returned `changed=false`. PostgreSQL then showed 100 students projected into 2028-2029, an open target, Settings pointing to it, and exactly one target activation audit row. The fee, payment and allocation row counts and fingerprints remained identical across the retry (624, 91, 552 rows). The read-only academic audit found zero relationship and financial mismatches. The probe affected only this disposable clone.

## Dated two-year role, edit, and payment acceptance, 2026-09-26

On `school_academic_two_year_20260926`, two temporary fixture accounts were created through the authenticated Najm user MCP tool for the seeded principal and accounting roles. The seeded admin, teacher, parent, and student accounts supplied the other four roles. Authenticated REST checks against the closed 2026-2027 year returned 200 for admin and principal on year detail, student, grade, and fee lists; accounting received 200 on year detail and fees, with its normal 401 on students and grades. Teacher, parent, and student received 404 on old-year detail, 403 on old-year student and grade lists, and their normal 401 on fees. For active 2027-2028, a parent saw two linked students and a student saw only their own student record; foreign student details returned 404. Their own active-year details returned 200, while old-year details and an old-year grade report returned 403. A parent's active-year grade report returned 200. The accounting user's old-year fee detail returned 200 and the same fee under the new year returned 404; a parent received 401 for either fee detail.

A principal transferred one student's **closed-year** enrollment from section A to B effective 2026-12-01; accounting received 401 for the same command. Authenticated dated rosters showed section A on 2026-11-30 and B on 2026-12-01, while PostgreSQL still showed the student's current class and section in active 2027-2028. An accounting user ran the normal class bulk fee tool against old-year section SC27 with an explicit 2027-05-15 roster date: it created one previously absent field-trip fee and skipped three duplicates. A wrong-year class was refused; a July target date created no fee. The created fee was deleted through the normal MCP bulk-delete tool. Fee, installment, payment, and allocation row fingerprints then matched the pre-test dated-demo baseline above.

The accounting user next recorded a **new** completed cash receipt of 20 on 2027-09-01, explicitly allocated to installment 1 of a 2026-2027 fee. PostgreSQL stored one payment and one allocation with the old fee label. The selected old-year payment list showed the receipt once with `yearAllocatedAmount=20.00`; the selected new-year payment list had zero receipts allocated to its fees. The old fee's paid amount became 20.00. The 2027-2028 finance KPI reported `incomeYear=20`, while the 2026-2027 KPI's `incomeYear` remained 368213; `incomeMonth` reflected the current month on both screens as designed. Replaying the same payment idempotency key returned the same payment ID and left one payment/allocation. A fresh read-only academic audit found zero relationship and financial-rollup mismatches or open migration issues. This payment intentionally changes the disposable clone's financial fingerprints after the transition baseline; it was not written to the main `school` demo.

Teacher follow-up on the same clone: after the transition, the new year had no teaching assignments, so the sampled teacher's active student list was empty. An ordinary new-year subject assignment made three students visible. The teacher's old-year grade and attendance lists and an old attendance date returned 403. A second new-year assignment to the current section of a student with an old grade let us test the grade ID path: both reading and updating that old grade returned 403. The seeded teacher role had only `manage:attendance`, which the installed permission guard does not treat as create/read/update; explicit teacher grants were added to the seed and applied to the clone and main disposable demo. Login supplies a user ID but no `teacherId`, so attendance now resolves the teacher record from that authenticated ID and checks their section assignment. The teacher's 2027-08-31 mark returned 403; their 2027-09-01 mark succeeded (record `0aHRr`) and its normal update succeeded. A daily correction with no date also succeeded against the business date 2027-09-01 after that record was set to absent; the correction restored it to present. An unscoped teacher student-attendance list returned only that active-year row. Eight old attendance records for the sampled student remained in the administrator's old-year list; teacher read/update by one old ID returned 404 under ownership. Four focused record-year and teacher-identity regressions pass. A subsequent read-only academic audit counted 673 student attendance records, all with a year, and reported zero relationship, date-attribution, financial-rollup, or open migration issues. A fresh dev-server `GET /attendance/today?type=student` returned that active row dated 2027-09-01. `bun run check` completed successfully after the code and seed changes: lint, typecheck, locale keys, tests, production build, and migration consistency. These are local authenticated API, PostgreSQL, and source results; browser acceptance remains unrun.

Active-year grade identity follow-up on the same clone: teacher `cwwfK` and a second teacher were assigned to the same new-year section and subject. Two ordinary assessments dated 2027-09-01 gave each teacher a source. The first teacher created and updated their own grade (200 each). Their attempt to create a grade using the colleague's teacher ID and assessment returned 403, and their attempt to update the colleague's grade, which an administrator had created, also returned 403. The teacher's current-section grade list still showed both grades, preserving existing read access. Grade writes now resolve the teacher from the authenticated user ID on the server and compare it with the source assignment's teacher ID; six focused record-year/teacher-identity tests pass. Both test grades and assessments and the temporary second-teacher assignment were deleted. A read-only clone audit then counted the original 64 grades and 30 assessments, with 673 student attendance rows, zero relationship and financial mismatches, and zero open migration issues. Browser acceptance remains unrun.

Closed-year edit follow-up on the same clone: the principal used the normal `PUT /grades/zptt7` and `PUT /attendance/inxLB` routes to change an old grade's feedback and a 2026-09-23 attendance status. Each change persisted, and each original value was restored through the same route. Accounting received 401 for both academic edits. A fresh read-only audit still found 64 grades, 673 student attendance rows, zero relationship/financial mismatches, and zero open migration issues. The focused tests, server typechecks, repository lint, and production build passed after the teacher grade-identity fix. A local `next start` probe was attempted against this clone, but authenticated requests returned 500 during startup because production rate limiting requires a Redis URL that this local environment does not provide; this is **not** production-runtime acceptance. The authenticated edit checks above used the local dev API. Browser acceptance remains unrun.

Routine history access follow-up on the same clone (2026-09-27): administrator REST created one temporary published routine in closed-year section `SC26` and one in active-year section `Bqmt-`. An authenticated teacher's no-year routine list returned only the active routine (200), active routine detail returned 200, and old routine detail and old section assignments returned 403. An explicit old-year published-routine read also returned 403. The administrator read the old routine detail and its 13 section assignments (200). Both routines were deleted from the disposable database afterward; cascading period deletion left zero routines and zero probe periods. A fresh read-only academic audit found zero relationship and financial mismatches and no open migration issues. These are local dev API and PostgreSQL results, not browser or production-runtime acceptance.

Closed-year academic creation follow-up on the same clone (2026-09-27): authenticated administrator REST used the ordinary `POST /assessments`, `/exams`, and `/grades` routes to create an assessment, exam, and assessment grade dated 2026-10-02/03 in closed 2026-2027, with an existing old-year teacher assignment and dated student placement. Each stored the registered old-year ID `EbxHm`. The ordinary `PUT` routes changed the assessment and exam titles and the grade feedback; the grade detail returned the correction. Normal `DELETE` routes removed the grade first, then both sources. PostgreSQL confirmed zero probe IDs and the original counts of 30 assessments, 18 exams and 64 grades. The read-only audit found zero relationship and financial mismatches and no open migration issues. This tests an administrator's permitted workflow; principal, teacher, and browser combinations remain separate.

Dashboard widget year follow-up on the same clone (2026-09-27): an explicit old-year `GET /dashboard/widgets?academicYear=2026-2027` had returned current-only widgets for a teacher. The route now resolves an explicit year for every non-administrator before reading role-specific widgets. Authenticated REST returned 403 for that teacher's old-year query, 200 for active-year and no-year queries, and 200 for the administrator's old-year query. One focused controller/service regression proves the refused year stops the current-widget read; server and test typechecks, repo lint, and production build pass. Other dashboard roles and browser behavior remain open.

A second separate database, `school_academic_restored_20260926`, restored the verified **pre-migration backup** with its 48-entry Drizzle journal and the original 605 fees, 2,459 installments, 86 payments, and 502 allocations. The unmodified pending migrations applied through Drizzle to 58 entries; all four financial fingerprints remained identical. On that restored copy, read-only scans found 100 students without confirmed dated placements; 551 student and 770 staff attendance rows, 30 assessments, 18 exams, and 64 grades had no stored year. The original calendar was still `assumed`, so every attendance/source/grade backfill correctly reported zero eligible rows. Apply runs wrote **1,533 open review issues** (100 student, 1,321 attendance, 30 assessment, 18 exam, 64 grade), assigned no guessed year, and left the financial audit with zero mismatches. This proves the restored legacy-data migration and unresolved-review path. It does not establish a reconciled historical record or an activation from that restored copy; those need source evidence or a separately prepared dated fixture.

## Isolated transaction rollback rehearsal, 2026-09-26

The stopped synthetic PostgreSQL 18 cluster from the earlier rehearsal was cloned into `C:\Users\hdevlop\AppData\Local\Temp\school-year-rollback-f0b46286e4e04bfaae1478f0c6b0c6a2` and served on `127.0.0.1:55440`, database `school_legacy_full`. The app's authenticated internal REST API ran on `127.0.0.1:3203` in local development mode with `DB_URL` pointed at the clone, `ACADEMIC_YEAR_HISTORY_ENABLED=true`, and `APP_BUSINESS_DATE=2028-09-01`. A year-list read confirmed its active pointer matched the clone. Port 5432 and the earlier synthetic cluster were untouched. This clone inherits the earlier pgvector substitutions, so it does not satisfy exact full-chain migration or restored-target acceptance.

- Only in the clone, remove the previous synthetic 2028-2029 transition run, placement, and enrollment. Baseline: active 2027-2028 Settings pointer, source-year class/section on the student, draft 2028-2029 target, and zero target enrollments, placements, and runs. The four financial fingerprints in `fixtures/financial-snapshot.sql` were recorded.
- Install a temporary `AFTER INSERT` placement trigger that raises for the target year. An authenticated preview had `commitAvailable=true`, one proposed enrollment and zero issues. `POST /api/academic-years/xtV3R/transition/commit` returned 500 at the injected failure. PostgreSQL then held zero target enrollments, placements, and runs; Settings, student projection, and year status matched baseline. All four financial row counts and fingerprints matched baseline. Remove the trigger and function.
- Retry commit without the probe: it created one target enrollment, one placement, and one transition run. Install a temporary `AFTER INSERT` audit trigger that raises on `academic-year.activate` for that target. `POST /api/academic-years/xtV3R/activate` returned 500 after the projection, target status and Settings updates had been attempted. PostgreSQL retained the committed target enrollment, placement, and run, but kept Settings on 2027-2028, the student in its source class and section, the target as draft, and zero target activation audit rows. Financial fingerprints again matched baseline. Remove the trigger and function.
- Retry activation without the probe: the first request returned `changed=true`, a second returned `changed=false`. Settings moved to 2028-2029, the student projection moved to the target class and section, the target opened, exactly one activation audit row persisted, and no probe triggers remained. The four financial fingerprints still matched baseline.

This tests two failure points with one synthetic student through real PostgreSQL and authenticated HTTP. It does not cover every partial-write position, a restored application database, the exact pgvector/Drizzle migration chain, browser behavior, or production.

### Two-student partial-write follow-up, 2026-09-26

A second fresh clone of the same stopped synthetic cluster ran at `127.0.0.1:55440` from `C:\Users\hdevlop\AppData\Local\Temp\school-year-rollback-multi-48569f898d374c889676c1003ca45301`. Only in that clone, the prior draft-target transition was removed and a second synthetic student was given a verified 2027-2028 enrollment and placement. The authenticated 2028-2029 preview proposed both students in order, with zero issues.

- A temporary `AFTER INSERT` placement trigger counted target placement attempts in a PostgreSQL sequence and raised on the second student. Commit returned 500. The sequence reached **2**, confirming the first placement insert was attempted before the second failed. PostgreSQL held **0 target enrollments, 0 placements, and 0 runs** afterward; both students remained in the source class, Settings stayed on 2027-2028, and the target stayed draft.
- After removing the probe, commit created two target enrollments and placements with one transition run and two outcomes. A retry with the same idempotency key returned the same run.
- A temporary `AFTER UPDATE OF class_id` student trigger counted projections and raised on the second student. Activation returned 500. The sequence reached **2**. PostgreSQL retained the committed **2 enrollments, 2 placements, and 1 run**, but both students reverted to the source class and section, Settings stayed on 2027-2028, the target stayed draft, and there were **0 target activation audit rows**.
- After removing the probe, activation returned `changed=true` with `placed=2`; a repeat returned `changed=false`. Both students moved to the target class and section, Settings and target status switched, exactly one activation audit row persisted, and no probe trigger remained. The four financial row counts and fingerprints matched the baseline after both failures and the successful retry.

This proves rollback after an earlier student's write in both transactions on a synthetic two-student fixture. It does not cover every error position, a restored target, exact pgvector/Drizzle migrations, browser acceptance, or production.

## Isolated PostgreSQL and authenticated acceptance, 2026-09-26

The target was a fresh PostgreSQL 18 cluster on localhost port 55439, separate from the application database, with synthetic users and records. Migrations `0000`–`0057` ran in order using `psql -1`. This is an **academic migration rehearsal**, not an exact full-chain or Drizzle-journal rehearsal: the local Windows installation lacked pgvector, so only disposable copies of migration `0014` used `double precision[]` in place of its three vector columns, and disposable `0020` omitted its HNSW index. No repository migration was changed for this workaround. The isolated database was left with two open migration issues, because the old student's placement date was deliberately unconfirmed.

- Pre/post migration and post-transition fingerprints matched for `fees` (2), `fee_installments` (2), `payments` (1), and `payment_allocations` (2); the one receipt of 150 remained allocated 75 to each fee year. The audit reported zero financial mismatches, zero invalid labels, and one mixed-year receipt.
- Enrollment issue registration applied once and inserted one issue; the second apply inserted zero. The source backfill attributed both assessments. Attendance and grade backfills attributed the active-year rows, left one older row each unassigned, and registered one review issue for each. Repeated applies updated zero records and inserted zero issues. The cutoff predicate was corrected to `$3::text::timestamp` in the three scripts after a real `postgres.js` binding shifted a direct `$3::timestamp` comparison by the local timezone.
- A transaction-only trigger rehearsal rejected a wrong-year placement, overlapping placement, historical enrollment start rewrite, placed class-year rewrite, and graded assessment context rewrite. The SQL fixture rolls back every attempted change.
- Authenticated administrator REST reads returned 200 for old and active students, classes, sections, attendance, fees, payments, assessments and grades. An initial attendance 500 exposed default-valued controller parameters ahead of `@User()`; removing those defaults fixed it and the same pattern in student, parent and grade detail routes. Najm's installed parameter resolver uses JavaScript `handler.length`, which drops parameters after a default.
- On the synthetic role matrix after activation, admin and principal read the older year across year registry, students, attendance, grades, fees and payments (all 200). Accounting read the year registry, fees and payments (200), while student, attendance and grade routes returned their normal route-permission 401. Teacher, parent and student were offered only the active year; old-year detail returned 404, old-year student and grade lists returned 403, and other protected resources returned their normal 401. Detail uses 404 to avoid revealing an unavailable year; resolved year queries use 403.
- Authenticated MCP `tools/list` succeeded with a bearer token. `students_get_students`, `attendance_get_all`, `grades_get_all`, `fees_get_fees`, and `payments_get_all` each returned old-year fixture data through `tools/call` with `academicYear=2026-2027`.
- Authenticated normal writes on the closed 2026-2027 year succeeded for administrator attendance marking and a principal fee create, update and delete. The attendance row stored the closed year's ID. A later historical enrollment transfer closed the prior placement at 2026-12-01 and opened the new section that day; the student's active 2027-2028 class and section projection did not move. The test fee was deleted, returning all four financial fingerprints to their baseline. An ordinary fee charge to a draft year returned 409; an unknown year returned 404. Normal fee mutations now resolve a registered writable year with the caller's role, and bulk mutation preflights every target year before writing.
- Extended authenticated reads covered all twelve administrator year-review resources, student/enrollment, attendance and grade details, the grade report, dashboard widgets/charts, seven finance dashboard year routes, normal class routines, overdue list and summary, and selected-year fee and payment details. The selected-year fee detail returned 404 for a fee from another year. The mixed receipt appeared once per fee year with a full amount of 150 and `yearAllocatedAmount` of 75 each. Each year's overdue summary returned one student and 25 outstanding; the old year's cash-received KPI stayed zero while the receipt-date year counted 150. Accounting read the finance KPI; teacher received its route-level 401 and old-year school-wide chart/routine reads returned 403.
- This pass found and fixed a Najm default-parameter `@User()` omission in seven finance dashboard routes and the normal routine list. It also found the overdue summary's unqualified correlated fee/payment/installment columns, which failed on PostgreSQL. All nine affected authenticated reads then returned 200, and the SQL correlation now has a focused regression assertion.
- The same installed Najm parameter resolver uses `handler.length` for single and trailing decorated parameters. Removing remaining controller defaults restored the year query in the main dashboard, the body in payment statistic tools, the date in staff attendance rosters, and optional attendance, routine, announcement and notification inputs. On the isolated fixture the dashboard student widget changed from 0 in the unconfirmed older year to 1 in the enrolled year; staff roster dates returned 1 and 2 staff; four financial statistic routes returned the expected 75 allocated to each fee year. Dashboard current attendance now uses the same business-date override as activation: the older year returned no today/week figures and the current year returned zero-valued figures.
- Transition preview proposed one enrollment with no issues. Commit with a stale preview hash returned 409; commit returned one run and a repeated identical key returned that same run. With isolated `APP_BUSINESS_DATE=2027-09-01`, activation moved the Settings active pointer and one student projection; repeating activation returned `changed=false`. The former year closed separately. Financial fingerprints remained identical. For a second synthetic target, two simultaneous commits returned one 200 and one 409; early activation returned 409 and left the Settings pointer on the current year. The broader transaction rollback matrix remains open.
- Source follow-up: activation now checks the committed transition's stored enrollment date against the business date before projecting students or moving Settings. The projection also refuses any target-year enrollment without a placement. Focused lifecycle tests reject future or invalid dates and missing placements before any writes. These guards have not been exercised through PostgreSQL or authenticated HTTP.
- A further authenticated write/permission pass used `school_acceptance_matrix`, a database cloned from the isolated two-student fixture on localhost port 55440; the normal demo database was untouched. All six fixture roles logged in through REST. For the closed 2026-2027 year, administrator, principal, and accounting year details returned 200; teacher, parent, and student details returned 404. Accounting updated the existing year's fee notes (200), while teacher, parent, and student fee updates returned 401. Administrator marked student attendance on 2026-10-01 (200); accounting, teacher, parent, and student attempts returned 401. Principal updated feedback on a grade sourced from that year (200); teacher received 404 and accounting, parent, and student received 401. PostgreSQL confirmed the new attendance row stored `ay_2026_2027`, the fee retained `2026-2027`, and the grade kept its score of 17. This tests these specific role/action combinations only; the full mutation and ownership matrix remains open. The cloned fixture still uses the earlier pgvector migration substitutions.
- Browser runtime discovery returned no available browser. No browser interaction, selected-year navigation, draft reset, or visual acceptance was run. Connected acceptance on a restored/production-like database also remains open.

## Implemented source

The implementation inventory below was written in stages before the isolated rehearsal. Statements in it that say a script or route was not yet run refer to that earlier source stage; the dated evidence section above gives the current test status.

- Ownership (2026-09-26, reshaped 2026-09-27): `academicYears/` holds only the year registry, its lifecycle, year resolution, and the generic stored-year-or-date rule. Every other year query, rule, and administrator review lives in the module that owns the records. Its school-wide year reads sit in the module's main repository, in a section marked as never applying `ownershipCondition()`; ownership is a per-query condition, so an owned repository can hold them. The year rules live in the module's main service, including grade-entry eligibility and the year a new attendance mark is stored under. There is no separate year repository, service, or controller. The module's main controller serves its review at `GET /<resource>/year-review/:id`: assessments, exams, grades, attendance (`/year-review/:id/students` and `/staff`), fees, payments (receipts), class routines, classes, sections, and student enrollments (the annual roster, and the dated roster at `/year-review/:id/roster/:date`; enrollments also hold the year placements the fee and grade reviews use). The target and teaching-assignment rules assessments and exams share live in `academicSources/`. The year transition is `academicYearTransitions/` and the migration-issue review `academicYearMigrationIssues/`; the review asks the owning module whether a fix was recorded, and each module writes and clears only its own table. Responses are unchanged. On 2026-09-27 each review moved from `/academic-years/:id/<resource>` to its owner's `/<resource>/year-review/:id`; the dated REST evidence below predates that move. The unassigned grade-source review is `GET /grades/unassigned-sources`.
- Browser-safe year label, date-only, and calendar contract; default September 1–June 30 instruction, July 14 closeout, August 31 reporting end.
- Registered-year API with explicit draft creation, calendar verification, activation, and closure routes. Settings creation registers an assumed active calendar. Activation requires the history switch, a committed transition, an adjacent verified draft, and a business date inside the target reporting interval; the isolated REST rehearsal above exercised it.
- Administrator-only `POST /academic-years/:id/transition/preview` is read-only. It requires the active verified source year, its adjacent verified draft target, an enrollment date inside the target year, explicit source-section mappings, and optional per-student promotion, repeat, graduation, withdrawal, or omission decisions. It reports proposed placements, missing source-end placements, disagreements between active student profiles and the dated source roster (including exact class/section), unresolved source-year migration issues, duplicate target enrollments, invalid target sections, and target capacity conflicts using the target roster on the proposed date. It returns `commitAvailable` when there are no reported issues and a SHA-256 `previewHash` for stale-preview protection. It changes no enrollments, source statuses, Settings pointer, or fees.
- Administrator-only `POST /academic-years/:id/transition/commit` accepts `{ preview, expectedPreviewHash, idempotencyKey }`. In one transaction it locks year, settings, structure, active student, and enrollment rows; recomputes the preview; rejects stale or unresolved proposals; creates draft-target enrollments and placements for promoted/repeating students; and persists a unique target-year run with its input, payload hash, actor, and per-student outcome. A repeated key with the same payload returns the run, while a changed payload or second run for the target is rejected. Graduated, withdrawn, and omitted students are recorded as decisions without prematurely changing source-year enrollment or the active student projection. `GET /academic-years/transition-runs/:runId` allows administrator review. This source contract uses migration `0057`; its stale-preview and repeat paths were rehearsed on isolated PostgreSQL, while concurrent writers and the full rollback matrix remain open. Activation and fee rollover remain separate.
- Additive year and enrollment/placement tables. Enrollment and placement triggers check year boundaries, status and end-date consistency, concurrent overlaps, wrong-year classes, mismatched sections, and historical identity rewrites. These SQL guards still require PostgreSQL rehearsal.
- Separate enrollment create, transfer, and end commands for administrators. Editing an old enrollment does not update the active-year student compatibility columns.
- Normal student creation now requires `yearEnrolledOn`, distinct from the permanent admission date. It validates the active class year before provisioning the user, writes the dated enrollment and initial placement in the student transaction, and defaults nested fee timing to the yearly date. Demo and static seed inputs supply an explicit synthetic yearly date. Profile edits cannot change class, section, or enrollment status; the dated enrollment operations own those changes, including for legacy students after their dates are confirmed. Original admission cannot be moved after an existing yearly enrollment. Students with any yearly history cannot be deleted by ordinary delete routes.
- Administrators can retrieve a student's annual enrollments and dated placements at `GET /students/:id/enrollments`, newest year first; each enrollment names its registered year (label, status, reporting dates) and each placement its class, section and reason. Broader historical access waits for dated teacher assignment and ownership checks.
- Enrollment commands in the dashboard (2026-09-26): a School years tab in the student profile, for administrators and principals (the roles `/student-enrollments` admits), lists that history and offers the three existing commands for the viewed year, or the active year with history off: enrol in the year (when the student has no enrollment in it and it is not a draft), change class or section from a date with a reason, and end the enrollment as withdrawn, graduated or transferred. Each form offers that year's classes and sections and bounds its date by the year and the current placement; the server re-checks every rule and its refusal is shown. A placement change refreshes the student, parent, fee and dashboard reads. Before this there was no way in the dashboard to move a student or record a withdrawal, since profile edits had already stopped changing class and section.
- The profile edit shows class and section read-only, points to the School years tab, and leaves class, section and enrollment status out of what it saves, so an edit opened from another year's list (whose row carries that year's class, or none) is no longer refused. The Add-student dialog always offers the active year's classes, as the server places new students only in the active year; when another year is viewed its title names the year the student joins.
- The yearly enrollment statuses are declared once in `@sms/contracts` (`STUDENT_YEAR_ENROLLMENT_STATUS_VALUES`, pinned in `enums.test.ts` with the CHECK constraint that holds them, and `STUDENT_YEAR_ENROLLMENT_END_STATUS_VALUES` for the end command). The server's end DTO and the dashboard's end form both read them.
- Exports: the dashboard has no CSV/spreadsheet export and the server no export route. The printable outputs are the receipt (year portion shown, full amount kept), the grades report card (follows the viewed year), and the student fee Documents list, which is labelled as all years. Opening a parent from the parents table or card now keeps an explicit viewing year, like the other in-page links.
- `GET /student-enrollments/year-review/:id` gives administrators an annual roster from enrollment rows, with the last dated placement, annual count, and count of recorded open migration issues for that year. A zero issue count does not prove the legacy issue inventory is complete until the audit and reconciliation run. It does not use the current student class projection. Other roles and other domain reads are not yet scoped.
- `GET /student-enrollments/year-review/:id/roster/:date` gives administrators the students whose enrollment and placement intervals cover that date. This is a dated read primitive for review. Attendance and grade entry use the ownership-scoped `GET /students?academicYear=&onDate=` roster instead (see dated rosters below).
- `GET /classes/year-review/:id` and `GET /sections/year-review/:id` give administrators structure from classes registered under that year.
- The normal `GET /classes` and `GET /sections` routes accept an optional validated `academicYear` query (also shared by their MCP tools). An explicit year is resolved through the registered-year access rules, then read in SQL (`getAllForYear`) with the year and the existing ownership rules in one `.where()`. Omitted year retains the current all-year contract. With the history switch on, the class and section screens now request these server-side year lists with separate query keys, so an unknown year fails visibly. With the switch off, they keep their prior active-year client filter; explicit all-years consumers retain the unfiltered list. The class form defaults new records to the viewed year, and normal class creation and section creation or reassignment resolve the registered target year before writing. Moving a class to another year requires no sections; moving a section to another class requires no students. Unchanged-year edits keep their previous path.
- The normal `GET /assessments`, `GET /exams`, and `GET /grades` routes and their MCP tools accept the same optional validated `academicYear`. Once the ownership fix made ownership a composable condition, the year moved from an in-memory filter into each read's single `.where()`, next to ownership. The rule is declared once in `academicYears/academicRecordYear.ts`, with the grade variant, which dates a legacy grade through its single source, in `gradeInReportingYear` in `grades/GradeRepository.ts`; the administrator `/assessments|exams|grades/year-review/:id` reviews use the same builders:
  - A stored year is authoritative.
  - A legacy null-year row falls back to its date inside the inclusive reporting interval.
  - A legacy grade is dated only through exactly one joined source. Grades with no source, two sources, or an orphaned source stay out of every year and remain in the unassigned-source review.
  - Grade, assessment and exam years follow the one other-years rule below. Admin/principal/accounting access (subject to route permissions) and teacher source-assignment access are unchanged. Omitted year keeps each route's existing response.
  - Normal explicitly year-filtered academic lists return `contextIssue` from the same context review as the administrator endpoints, including `grade-source-year-mismatch`, conflicting assignment/target years, missing dated placement, and out-of-year dates. Date fallback remains a candidate selection rule, not proof of historical attribution. Context queries are restricted in SQL to already-authorized IDs in batches of at most 500; only the issue code is added to the original response, never the administrator projection. A row disappearing between reads gets `year-context-unavailable`. No-year responses remain unchanged. The assessment, exam and grade screens present these codes (2026-09-26) as one summary line above the table rather than a warning per row, because before a year's enrollment backfill every grade in it reports `missing-dated-placement`. The line gives the number of unverified records and a translated count per reason; choosing a reason narrows the table to those records. The grades roster carries each grade's code onto its student row; the save payload does not send it. A test pins a label in all four languages for every code the server emits.
  - The per-class/section/subject/teacher/today/upcoming variants, report cards, and screens are not yet year-scoped.
- The normal `GET /students` route and its MCP tool accept the optional validated year. The year list returns one row per enrollment in that year, newest student first, in the same shape as the unfiltered list. `classId`/`sectionId`/`class`/`section` come from the enrollment's latest placement in that year, never from the current projection, and stay null without a placement. `enrollment` and `placement` context are added. Ownership sits in the same `.where()`.
- Other school years: administrators and accounting only (2026-09-26, the owner's decision). `ACADEMIC_YEAR_HISTORY_ROLES` in `@sms/contracts/academic-years` (admin, principal, accounting) is the one list of roles that view and work in years other than the active one, with the same actions as in the active year. `AcademicYearService.resolve` refuses every other role any other year with 403 before a record is read, for every year-scoped route and MCP tool; `GET /academic-years` offers those roles the active year alone and `GET /academic-years/:id` hides the others. Draft years stay with admin and principal. With history on, the dashboard shows the year selector only to those roles and keeps every other role on the active year whatever the URL says, including in sidebar links.
  - Because teachers, parents and students never read another year, their ownership rules stay the current ones (the student's current section) for year reads too. The per-role past-year rules added earlier on 2026-09-26 (teacher reads through dated placements and taught sections, parent and student reads through the child's placements, and the active-year-only refusals `resolveStudentHistory` and `resolveAcademicSourceHistory`) were removed in favor of this rule.
  - After activation, a teacher, parent or student sees the new year only. Old-year corrections go through administrators, and old-year payments through administrators or accounting.
- The normal `GET /attendance` list (and its `POST /mcp/all` tool), plus the by-student, by-staff, and by-teacher lists, accept the optional validated year. The year is resolved before any record check and applied with the stored-year-or-date rule in the same `.where()` as ownership. The by-date and today lists already fix the year through their date. The by-section list is fixed by the section's class year, which the database trigger enforces for registered rows.
- The routine list, published-section, and teacher-schedule reads now validate `academicYear` as a school-year label and resolve it through the registry, so draft years are visible only to administrators. Schedules still filter by their stored label. Migration `0049` registers every well-formed stored routine and class label.
- The normal financial-guarded `GET /payments` route and its MCP tool accept the optional validated year. The year list returns each receipt allocated to a fee charged to that year exactly once, with the full `amount` and an exact decimal-string `yearAllocatedAmount` summed per receipt in SQL. Unallocated credit belongs to no year.
- The normal `GET /fees` route and its MCP tool now accept an optional validated `academicYear` while retaining the existing financial guard. The explicit-year overview includes students with a yearly enrollment and students with a fee charged to that year even when their enrollment remains unresolved. It sums only fees whose stored fee year matches the selected year, derives paid and due totals from completed allocations against those fees, chooses one last dated placement per enrollment before joining fees to avoid multiplying amounts after transfers, and leaves class/section unknown when no supported placement exists. `GET /fees/:id` also accepts the optional year and refuses a fee charged to another year. `GET /fees/student/:studentId` accepts the same year and keeps its existing response shape while filtering fee rows, summary totals, installment metrics, and completed-payment metrics by that fee year; the payment average sums the selected year's allocated portions per receipt and the last-payment value keeps the actual receipt date. Omitted year keeps each route's existing response. The per-fee payment objects still expose full receipt amounts and need an allocated-portion display for mixed-year receipts. Reports, other payment surfaces, and the fee screen remain unscoped; these source paths have not had authenticated API or PostgreSQL acceptance.
- `GET /fees/overdue` and `/fees/overdue/summary` accept the same optional validated year; the overdue-by-student MCP body also accepts it. The explicit-year list selects fees by stored fee year, excludes cancelled installments, derives paid amount from completed allocations, and resolves class/section only from a placement covering the fee effective date. An unresolved or undated fee remains visible with unknown class. The explicit-year summary counts those overdue fees and students and returns an exact decimal string for remaining net amount after completed allocations; it follows the existing whole-fee balance definition rather than summing only late installments. The per-student tool likewise filters by fee year and uses completed allocations. Omitted-year calls retain their earlier response and calculation. These paths have source tests but no PostgreSQL or authenticated API acceptance.
- The finance dashboard aging summary, overdue student list, and detailed aging report (REST and MCP) accept an optional registered year. Explicit-year balances are computed per installment from completed payment allocations matched to that installment and fee; cancelled installments are excluded. The detailed report names the student's latest dated class in the selected year, or leaves the class unknown for a fee-only student. With no year, all three routes retain their prior all-year response. The dashboard aging and overdue cards plus the aging and reminder pages use the viewed year when the history switch is on; reminder UI state is separate per year and a failed read is shown as an error. This is source-only work: PostgreSQL amounts and authenticated role behavior remain unverified. The finance dashboard routes now require a finance role (see dashboard audience below).
- Finance KPI, trend, expense breakdown, and collection-by-class REST/MCP reads now resolve an explicit year through the registered-year service with the caller's role before querying. The no-year active-year fallback remains. Their cash windows are the resolved year's registered reporting dates; the no-year default uses the active label's registered calendar, or the default September–August calendar while that label is unregistered.
- Dashboard audience (2026-09-26): every `/dashboard/finance/*` route (REST and MCP) now takes the fee routes' finance guard, so only accounting, principal and admin reach finance KPIs, trend, aging, overdue, recent payments and the finance reports. The gender chart and the monthly student and staff attendance charts take the staff guard (admin, principal, accounting, teacher, counselor, nurse, secretary, librarian, assistant), which leaves out parents, students and drivers. The admin widgets route already returns data to admins only, and the academic and operations KPI tools keep their earlier sign-in-only audience. The dashboard home shows its finance widgets only to the finance roles, so a teacher sees the school charts without cards the server would refuse. A test reads the roles each guard admits from the framework's guard metadata.
- The dashboard sidebar link adapter now suppresses navigation only when path, query, and hash all match. A future viewing-year change on the same route can navigate; propagating and applying that year across screens is still open.
- The URL-owned viewing-year foundation exists behind the same switch. The root layout reads `ACADEMIC_YEAR_HISTORY_ENABLED` per request for the dynamic dashboard tree and provides it above both the pages and the dialog host (`NajmClientRoot`). It first lived in the dashboard shell, which left dialogs such as the student profile opened from the students table outside it, reading history as off; it moved on 2026-09-26. A feature-owned context carries only that fixed value; it never holds the year, which the `academicYear` search parameter owns.
  - Switch off (the default): `useViewingAcademicYear()` returns no year, the selector and banner render nothing, a URL parameter is ignored, and every list keeps its existing request.
  - Switch on: the sidebar footer shows the registered years the role may view; the explicit URL year, or else the active year, becomes the viewing year; a banner shows a non-active year with a return action; and sidebar links carry an explicit year.
  - Choosing the active year removes the parameter so the page follows a later activation; changing year drops the page's other filters.
  - A malformed or unknown year is sent on so the server refuses it visibly, instead of the dashboard quietly showing the active year.
  - `useYearAwareList` switches a list between its existing request and a `[entity, 'academicYear', year]` year request, holding both back while the active year resolves.
  - Wired: students, assessments, exams, grades, payments, classes, and sections (server year lists); the routine page uses the selected year's class and section lists. New schedules take the selected class's year.
  - Fees (2026-09-26): the fee list reads the viewed year's rows (`GET /fees?academicYear=`), so other years' balances no longer enter that year's rows or totals. A separately named "Unpaid, all school years" scope reads the all-year list and keeps students with any unpaid balance; its class filter uses the classes those rows name. The student fee page reads `GET /fees/student/:id?academicYear=` for its fees, header totals and alerts, lists other years with unpaid fees as links to the same page in that year, keeps the all-year payment history, and charges fees added there or from the fee list to the viewed year (`withFeeYear`; a fee that names its own year keeps it). Opening a student from the fee list keeps an explicit viewing year. Its payment dialog offers only the viewed year's fees, so paying another year's debt means opening that year.
  - Payments (2026-09-26): the year-filtered school-wide payment table and detail card show `yearAllocatedAmount` as the selected fee year's portion, label it with the year, and show the full receipt amount separately. Amount sorting follows the displayed portion. Printing from this list keeps the full legal receipt amount and actual payment date, and names the year and its allocated portion in the details. The per-student payment history and documents remain explicitly all-year views with full receipt amounts.
  - Attendance (2026-09-26): the student register reads `GET /attendance?type=student&academicYear=`. The student and staff registers keep their date inside the viewed year's reporting interval (`dateWithinYear`): a day outside it, or a change of viewed year, moves to that year's first or last teaching day, and unsaved marks are cleared whenever the day changes. The student roster is now the roster valid on the chosen day (see dated rosters below).
  - The fee list and student fee page now show an error or forbidden state when their read fails, instead of an empty page.
  - Student profile (2026-09-26): `GET /students/:id?academicYear=` returns the student's identity with that year's class, section and enrollment from the latest placement in the year, or no class and `enrollment: null` when the student was not enrolled then; it never falls back to the current class. `GET /grades/student/:id` and `/report` accept the same optional year, resolved before any read and filtered in SQL next to ownership. The profile page and dialog show the viewed year's class, a "not enrolled" label when there is none, and that year's attendance, grade report, fees and sidebar totals; the report card on the grades page follows the same year. Links from the profile and the students table to the student fee page keep an explicit viewing year. Transport, alerts and parents stay current, not per year.
  - Parent and teacher profiles (2026-09-26): `GET /parents/:id/children?academicYear=` and its MCP tool resolve the year before any read and return every linked child with that year's class and section from the latest placement, or `enrollment: null` when the child was not enrolled then. The parent profile reads that list and each child's attendance, grades and fees for the viewed year, labels a child not enrolled that year, and keeps an explicit year in its links. Its upcoming assessments and events are today's, so they still match each child's current class. The teacher profile's timetable reads the viewed year's routine; its assignment list stays current, because teaching assignments are not dated, and says so when another year is viewed.
  - Dated rosters (2026-09-26): `GET /students?academicYear=&onDate=` (and its MCP tool) returns the students whose enrollment and placement both cover that day, in the year list's shape, each with that day's class and section (half-open ends, so a same-day transfer gives the new section). A date needs its year and must lie in its reporting interval; the year is resolved before any read, and ownership sits in the same `.where()`. The student register reads it for the chosen day and the grade sheet for its assessment or exam date, each filtering by that day's section.
  - Assessment and exam forms (2026-09-26): with history enabled they wait for the viewed year's registered calendar, refuse to show a form for an unknown year, and initialize new records to a day inside that year's teaching term. Switching the viewed year remounts an unsaved form, clearing its previous-year draft. Editing an existing source keeps its recorded date; the server still validates dates, sections and assignments at submission. With history off, the previous blank-date creation behavior remains.
  - Dashboard and reports (2026-09-26): the finance widgets read the viewed year (else the active one). `GET /dashboard/widgets`, `/students-by-gender`, `/attendance/students-monthly` and `/attendance/staff-monthly` accept an optional validated year, resolved through the registry for the caller's role before any read. With it, Total Students and the gender chart count that year's enrollments (including students who left during it), and the monthly attendance charts count the year's own reporting months by the stored-year-or-date rule; a year that does not hold today returns no today or week figures. `GET /dashboard/finance/kpis` adds the whole year's cash (`incomeYear`, `expensesYear`, `netBalanceYear`) next to the month's. For a year other than the active one, the KPI cards show those year totals and name the year, the teacher card says it counts current teachers, and chart tooltips drop today's figures. The overdue and aging cards show only the viewed fee year while history is on. The reports page reads the viewed year; its collection-by-class chart now groups by the class each student last sat in during that fee year, and only the active year falls back to the current class (still only a class of that year), so an undated student of another year counts under "No class" rather than a false class. The finance KPI, trend and expense windows use the registered calendar (see above).
  - The fee page now opens `ClassBulkFeeForm` for a viewed year. It offers that year's classes, requires a September-June charge date, counts students in the selected class or section from the roster valid on that date, and submits the year and date through `createBulkClassFeesApi` to the existing financial-guarded `POST /fees/bulk-class` endpoint. The result reports created, skipped and failed fees and refreshes the fee list. The server still chooses and validates the dated roster at submission; the displayed count is a preview.
  - Dated teaching assignments are not needed while teachers work in the active year only. There are no exports to scope (see exports above).
  - Fixed (2026-09-26): the current parent children read now joins the class and section names, so the parent profile names each child's class with the switch off too.
  - Fixed (2026-09-26), with the switch off: the fee list's filter read a `row.academicYear` the all-year rows never carried, so it showed only students with an unpaid balance and its Paid filter was always empty. The all-year rows now name each fee's year, and `showInActiveFeeList` keeps a student with an active-year fee, an unpaid balance from any year, or no fee yet; only a student whose every fee is from another year and settled drops out.
  - Labels exist in all four locales. No browser run has checked this UI.
- The normal `GET /teachers/:id/students` route and its MCP tool accept a paired `academicYear` and `onDate` for administrator/principal review. The dated query matches the assignment's class year with a registered year and uses yearly enrollment plus placement intervals for student membership; it returns enrollment and placement IDs and avoids the student's current section/status projection. The existing no-query behavior remains for current screens. Teacher accounts cannot use the dated path yet: assignment rows have no start/end dates, and a surviving same-year assignment alone cannot prove that the teacher taught on the requested date. Historical teacher ownership and assignment retention remain open.
- `GET /fees/year-review/:id` uses the existing financial guard, filters by each fee's stored year, returns exact stored amount strings and completed-payment allocation portions, and derives historical class only from a placement covering the fee effective date. Pending, bounced, and voided payment allocations do not contribute to `completedAllocatedAmount`. It reports unknown class as `null`. This separate API does not yet scope the normal fee and report screens.
- `GET /payments/year-review/:id` uses the financial guard and groups allocations by payment ID, returning each receipt once with full receipt amount, status, date, and the selected fee year's allocation amount. It is an allocation view, not a cash-received-by-date report; the normal payment/report screens remain unscoped.
- `GET /attendance/year-review/:id/students` and `/attendance/year-review/:id/staff` are administrator-only event-date reads with bounded 100-row default pages, a 500-row maximum, and a date/ID cursor. Registered rows use their stored year, including an out-of-interval row that is flagged for review; null-year legacy candidates use the date interval. Student rows use the stored section or surviving teaching-assignment section, check the section's class year and a dated student placement, and return missing/conflicting context with an issue code and unresolved count rather than silently dropping those rows. Staff rows report missing staff identity separately. Normal attendance screens, correction, and teacher access remain unscoped.
- `0055` adds a nullable attendance year reference for legacy compatibility and a year/date index. Normal student marks derive the registered year from the marked section and date; staff marks and roster upserts derive it from the date interval. Draft-year and unmatched dates are rejected. Database triggers check registered dates, section/assignment consistency, and dated student placement when an enrollment exists, freeze the context once registered, and retain the referenced class-year/section-class relationship. The demo seed's direct inserts can still produce null-year rows without a confirmed section/date history; they need review before being treated as fully attributed history. PostgreSQL execution remains open.
- `0056` changes nullable student, staff, teacher, teaching-assignment, and section attendance references from `ON DELETE SET NULL` to `ON DELETE RESTRICT`. It does not make those columns required or backfill unknown legacy links. Existing row deletion routes still need an archive/correction policy; the foreign keys prevent silent loss of recorded attendance context. No reset or live migration was run.
- New student attendance now requires a placement covering its event date when the student has any dated enrollment. An undated legacy student keeps the existing current-section check until reviewed. The existing 30-day entry limit and teacher authorization still apply, so historical entry and correction workflows remain open.
- Administrator-only `GET /assessments/year-review/:id`, `/exams/year-review/:id`, and `/grades/year-review/:id` return source-date candidates in the registered reporting interval. Each record reports missing/mismatched assignment or target-section context; grades also check dated student placement against every target section. Marks remain their stored strings, with no new aggregation. `GET /grades/unassigned-sources` (formerly `/academic-years/unassigned-grade-sources`) is a separate global review list for grades lacking exactly one usable source link; it does not guess a year from creation time. These reads do not themselves backfill legacy year IDs or scope normal screens and report cards.
- Administrator-only `GET /class-routines/year-review/:id` returns all schedules bearing the registered year label, including archived schedules, with their own periods, entries, and duties. It reports assignment, class-year, and missing-period context issues. When an old schedule has no saved periods, the endpoint leaves them empty instead of presenting current shared period times as historical evidence. The normal routine and teacher views remain separate and are not yet switched to the viewing year.
- Assessment and exam creation rejects draft years, target sections from different registered years, and dates outside the target year reporting interval. Grade creation rejects draft years too. Source date/target changes are refused while grades depend on the source, preserving the meaning of existing marks. The relative age limits on assessment and exam dates have been removed: a permitted normal form can now record a source in an old closed year when its registered calendar and target context are valid. Attendance now allows admin/principal users to mark older dates through the normal student and staff paths; the admin-only staff roster uses the same date rule. Other roles retain the 30-day limit. Future-date, registered-year, dated-placement, and duplicate checks still apply.
- New grades now verify their assessment/exam date, source assignment year, all target section years, submitted teacher/subject assignment, and submitted section. When a student has dated enrollment history, grade creation requires that section's placement on the source date instead of relying on the student's current section. Legacy students retain the existing current-section check until their dates are reviewed. The unassigned-source review query includes orphaned source links as well as absent/dual links. Source archival and normal year-scoped grade screens remain open.
- `0052` adds nullable registered-year references and year query indexes to assessments, exams, and grades. New normal writes fill these references; legacy rows remain null pending evidence review, and scoped reads use the stored year where present with date/assignment fallback only for null legacy rows. `0053` changes grade source foreign keys to restrict deletion and adds source/grade context triggers for registered rows, including target-section year checks and dated grade placement checks. `0054` restricts deletion of teaching assignments referenced by sources and protects their teacher, subject, section, class, and related class-year/section-class context, including saved routines. Direct PostgreSQL execution and concurrency rehearsal remain open. The generated `roles_name_unique` drift was removed from all three migrations and snapshots.
- `0051` adds persistent migration issue records. Administrators can list open issues and record reviewed resolution or dismissal; resolving an unknown student enrollment date requires a dated placement for the captured class and section in the stated year. Attendance issues created by the backfill can only be resolved after the attendance row has a stored year; a dismissal still requires a review note and leaves the row unattributed.
- `/academic-year-migration` now offers administrator/principal review of persisted issues, including the source entity ID, evidence, a student profile link, status tabs, cursor pagination, and a required review note. The page does not create guessed enrollments; resolution of an unknown date is still checked by the server against a confirmed dated placement. This UI needs authenticated browser acceptance after migrations are rehearsed.
- When an existing student's current class projection would be replaced by a new active-year enrollment and that old class/section has no dated placement, the service saves the old IDs and admission date as an unresolved issue in the same transaction before updating the projection.
- Financial rollover rejects `confirmSettingsUpdate` before fee writes. Year activation is a separate command.
- Activation (2026-09-26): `POST /academic-years/:id/activate` (administrators and principals, no MCP tool; the viewing selector never calls it) now switches the year instead of always refusing. With the history switch on, it needs:
  - the committed transition from the active year into the target, read under the commit's own locks (both years, Settings, their classes and sections, active students and both years' enrollments);
  - a verified draft target whose label follows the active year and whose calendar is valid, with the active year open;
  - the business date inside the target's reporting interval, so records dated today belong to it;
  - every student still enrolled at the end of the active year either enrolled in the target or given an outcome by the transition.
  In one transaction it then moves each student's current class, section and status to the new year (the target enrollment's latest placement and status; graduated for a graduate; inactive for a withdrawal or an omitted student, who keeps the last class the columns require), opens the target, moves the Settings pointer only if it still holds the active year it checked, and writes an `audit_logs` row (`academic-year.activate`: actor, role, from, to, transition run, business date, student counts). A repeated or concurrent second request returns `changed: false`; one that finds the pointer moved elsewhere is refused. The previous year stays open until it is closed separately; financial rollover stays a separate command. Settings still refuses a year change once history is on or enrollments exist, so activation is the only way to switch.
- Fixed (2026-09-26): `isValidSchoolYearCalendar` required every value of the object it was given to be a date, but year creation (`POST /academic-years`) and calendar verification pass records that also carry a label, status and note, so both always refused. It now checks the five calendar dates only. Before the fix no year could be created through the API or reach `verified`, which the transition and activation require.
- Explicitly year-targeted class bulk fees now require an effective date, validate the class and optional section against that year, and select students from dated placements on that date. Calls without an explicit year keep their current behavior; the fee page's class bulk-fee form sends the viewed year and a date (see below). This prevents an old-year bulk request from silently using today's class membership. The new path has focused source tests but no authenticated API or PostgreSQL acceptance.
- Seed reset code deletes transition runs and migration issues, then placement children before enrollment parents and students, and clears the year registry after Settings and other school data. A test pins that order. The owner-authorized reset and final demo seed completed on `localhost:5432/school`; earlier legacy demo records were backed up first.
- Read-only `bun run academic-years:audit --target=<environment-label>` reports stored labels, relation issues, routine context, fee/installment/allocation totals by stored fee year, receipt totals and unallocated amounts by payment status, mixed-year receipts, and financial rollup mismatches as aggregate data. After `0051`, it reports migration issue counts by entity, issue code, and review status; after `0052`, null-year assessment, exam, and grade counts plus registered-source date or grade-source conflicts; after `0055`, null-year attendance and stored-year date conflicts. Fields whose tables or columns do not yet exist are `null`. It passed on the local demo database before reset and on the final reseeded dataset, with the differing results recorded above.
- `bun run academic-years:enrollment-issues --target=<environment-label>` counts legacy students whose current class/section has no matching dated placement. `--apply --run-id=<unique-id>` records review issues in bounded, idempotent batches on an explicitly designated target; it creates no guessed enrollments. Dry run found 100 missing placements in the old demo data and zero after reseeding. Apply was not needed on the regenerated fixture. Reconcile concurrent student changes after the run before switching reads.
- `bun run academic-years:attendance-backfill --target=<environment-label>` is read-only by default and scans null-year attendance in bounded ID pages. It only uses reviewed (`verified`) registered calendars. It assigns a student row only when one year matches its date, class year, teacher/assignment identity if present, and exactly one confirmed dated placement; staff rows require consistent identity and employment on the event date. Zero or multiple matches remain unassigned. `--apply --run-id=<unique-id>` locks attendance rows, updates only still-null year references, and registers unresolved or ambiguous rows in the administrator migration issue queue in the same batch transaction. Both modes capture a database-local cutoff for attendance rows created/updated before the scan. Apply emits a committed ID checkpoint with updated and inserted-issue counts after each batch; resume requires both `--after-id=<checkpoint>` and `--cutoff-at="<cutoffAtDbTime>"` from the same run. The registration is idempotent by issue identity. Dry run and apply completed on the final local demo dataset with all 1,688 rows attributed and zero issues; concurrent changes to related records and rows changed after the cutoff still require a fresh audit and rerun before switching reads. Resolve or dismiss review issues explicitly after inspecting source records; an assigned year does not automatically close an existing issue.
- `bun run academic-years:source-backfill --target=<environment-label> --kind=assessment|exam` is read-only by default. It scans null-year academic sources in bounded ID pages and attributes a year only when a verified registered calendar, source date, teaching assignment, class year, and all target sections agree; conflicting registered grade years prevent assignment. `--apply --run-id=<unique-id>` requires the context and retention triggers from migrations `0053` and `0054`, locks each source batch, assigns supported years, and records unresolved source issues in the same transaction. A source issue cannot be resolved until its row has a stored year. Apply emits a committed ID checkpoint; resuming requires `--after-id=<checkpoint>` and the original database-local `--cutoff-at="<cutoffAtDbTime>"`. The isolated synthetic PostgreSQL exercise attributed its two sources; source-grade concurrency and restored-data reconciliation remain open. It does not attribute grades; those need source and dated student-placement evidence.
- `bun run academic-years:grade-backfill --target=<environment-label>` is read-only by default. Run it after source attribution: a legacy grade qualifies only with exactly one assessment or exam, a verified registered source year, consistent assignment and target sections, and exactly one dated student placement on the source date in a targeted section. `--apply --run-id=<unique-id>` requires the `0053` grade guard and `0054` assignment retention guard, locks grade batches, writes supported years, and registers unresolved grade issues in the same transaction. A grade issue cannot be resolved until its row has a stored year. It uses the same cutoff and checkpoint resume options as the source backfill. The isolated synthetic PostgreSQL exercise attributed its supported grade and retained one unresolved old row; grade/source concurrency and restored-data reconciliation remain open. Grades with no unique source remain in the administrator global review query and the issue queue after apply.
- These three year backfills change only the nullable `academic_year_id` on attributed records; they preserve the legacy row's `updated_at` value. Review issues have their own creation and review timestamps.
- Year-switch state (2026-09-26): the grade, student-attendance, fee, and routine screens remount their local selections when the viewing year changes. Grade and attendance drafts cannot carry into another year; the fee screen returns to its selected-year scope. Year-aware lists mask cached rows and errors until the active year or role resolves. This has source checks only, not browser switching acceptance.

## Verification so far

| Boundary | Result |
| --- | --- |
| Contract, enrollment, issue-review, transition, seed-order, and form-schema tests | Pass; these do not prove PostgreSQL constraints or transaction behavior |
| Dated teacher roster DTO/role/date service tests | Pass; SQL join and assignment history still need PostgreSQL and source work |
| Normal fee-list/detail/student year resolver and generated-SQL tests | Pass; PostgreSQL result and amount reconciliation remain untested |
| Aging/reminder year SQL and service tests (2026-09-26) | Pass: 3 focused cases added to the finance dashboard suite; generated SQL checks fee year, completed installment allocations, and cancellation; service checks year resolution and dated class display. PostgreSQL and authenticated API acceptance remain untested |
| Normal class/section year list and write tests (2026-09-26) | Pass: focused service tests check registered target-year resolution before writes and preserve same-year edits. The full source gate passed; authenticated route and browser acceptance remain untested |
| Closed-year assessment/exam date rule (2026-09-26) | Pass: source and validator tests accept an old date inside a closed registered year and reject a date outside its reporting interval. No authenticated route or PostgreSQL acceptance |
| Historical attendance date rule (2026-09-26) | Pass: 2 focused regressions and adjacent attendance tests; lint, typecheck, and production build pass. Admin/principal may enter older dates; teacher and unspecified roles retain the 30-day limit; future dates still fail. No authenticated route or PostgreSQL acceptance |
| Selected-year payment display and receipt (2026-09-26) | Pass: 2 focused receipt tests; lint, typecheck, i18n, and production build pass. The UI maps the server's selected-year allocation to the table, card, and receipt while retaining the full amount and payment date; no browser or PostgreSQL amount reconciliation |
| Viewed-year assessment/exam date defaults (2026-09-26) | Pass: 14 viewing-year utility tests, lint, typecheck, and production build. A new source starts inside the registered teaching term; no browser or authenticated API acceptance |
| Finance KPI/trend/report explicit-year resolver (2026-09-26) | Pass: 11 focused tests verify role-aware resolution before each finance query and no query for an unavailable year; lint, typecheck, and production build pass. No authenticated REST/MCP or PostgreSQL acceptance |
| Overdue fee year resolver, dated placement, and generated-SQL tests | Pass: 5 focused tests; PostgreSQL result and amount reconciliation remain untested |
| Normal assessment/exam/grade list year SQL and resolver tests | Pass: 8 focused tests on generated SQL; legacy attribution remains untested against PostgreSQL |
| Historical academic-list review regressions (2026-09-26) | Pass: 14 new tests covering parent/student source-history denial before reads, active-year compatibility, existing teacher grade limits, unchanged admin/finance access, legacy source/assignment warnings, authorized-ID-only SQL, empty lists and 500-row context batches; no PostgreSQL or authenticated acceptance |
| Parent children year tests (2026-09-26) | Pass: 6 focused tests on the optional year query, the unchanged no-year read and its class names, resolution before reads, refusal for teachers, and the generated SQL keeping every linked child; no PostgreSQL or authenticated acceptance |
| Year-history ownership split (2026-09-26) | Pass: the unchanged assertions of the academic-year suite now target each owning module, plus 2 new seed-reset order tests; a probe confirmed every injectable class's constructor types resolve after the move. No server boot or authenticated route check |
| Normal student, attendance, routine, and payment list year tests | Pass: 29 focused tests (10 student, 8 attendance, 6 routine, 5 payment) on the teacher student-history rule, resolution before reads, and generated SQL; no PostgreSQL or authenticated acceptance |
| Repository ownership suite (`test:ownership`) | Pass: 96 tests in the latest root test run over role policy, per-read generated SQL, unscoped uniqueness lookups, container injection, profile gates, and direct use of the published `najm-auth@4.1.0` exports; no PostgreSQL or authenticated acceptance |
| Dashboard viewing-year helper tests | Pass: 10 focused tests on reading, setting, and removing the URL year and on keeping a date inside the viewed year, plus 3 on charging new fees to it and 3 on which students the all-year fee list keeps; hooks and components have no automated or browser run |
| Dated roster and dashboard year tests (2026-09-26) | Pass: 9 student-roster tests (date needs its year, reporting-interval bounds, resolution and refusal before reads, half-open enrollment and placement predicates next to ownership), 1 ownership-suite read, 3 `datedRosterDay` and 3 `monthsBetween` helper tests, 10 dashboard tests (year-scoped enrollment counts, monthly attendance by the stored-year-or-date rule over the year's months, no today or week figures outside the year, resolution before reads, unchanged no-year reads) and 6 finance tests (year cash totals over the year window; collection-by-class taking another year's class only from its placements, and the service marking only the active label). The admin widget's year count is pinned at the SQL level only, because the widget translates its titles. No PostgreSQL, authenticated or browser acceptance |
| Enrollment history and commands UI (2026-09-26) | Pass: 3 enrollment history tests (year and placement names, refusal of an unknown student before reads, generated SQL), 6 form-schema tests (year and placement date bounds, required reason, end statuses and their labels in all four languages), 3 profile-edit schema tests, and the pinned yearly status set. No authenticated route or browser run |
| Other school years for administrators and accounting (2026-09-26) | Pass: the pinned role list, the year refusal for every other role (with and without the Settings pointer), the draft rule, the year list and year detail each role is offered, past-year assessment, exam and grade lists for the permitted roles and refusals before any read for the others, and the unchanged current-rule SQL of the year reads. The dashboard hook and selector have type checks only, no browser run |
| Activation and calendar check (2026-09-26) | Pass: 13 activation tests, including future or invalid committed enrollment dates, 4 current-class projection tests, including a missing target placement, plus calendar and role-option tests. Synthetic PostgreSQL rollback and dated 100-student demo activation are recorded above; other failure positions remain open |
| Normal routine history access (2026-09-27) | Pass: 3 focused tests show a teacher's no-year list resolving the active year and old routine ID or section-assignment reads refusing before related queries; existing routine tests, server typechecks, repo lint, and production build pass. Authenticated REST on the two-year clone confirmed teacher active-only list, active detail, and old-detail/assignment/published denial, while administrator old reads worked. Temporary routines were removed and the academic audit remained clean. Browser acceptance remains open |
| Dashboard audience and registered finance windows (2026-09-26) | Pass: 3 guard-metadata tests (every finance dashboard route admits exactly accounting, principal and admin; the three school-wide aggregates admit staff only; the controller still requires sign-in), 2 dashboard role-helper tests, and 4 finance tests (KPI, trend and expense windows follow a non-default registered calendar, trend months span the reporting interval, the no-year default uses the registered calendar and falls back only for an unregistered label). No authenticated role acceptance |
| Dashboard widget explicit-year guard (2026-09-27) | Pass: focused regression refuses a teacher's old year before current widgets; authenticated REST on the dated two-year clone returned teacher old 403, teacher active and no-year 200, and administrator old 200. Server typechecks, lint and production build pass; other dashboard role and browser checks remain open |
| Year-switch local state and cached-list masking (2026-09-26) | Pass: dashboard typecheck, repo lint, production build, and diff whitespace check. Browser switching, draft-discard interaction, and connected queries have not run |
| Class bulk-fee form and dated preview | Pass: form schema rejects a missing, impossible, or July date for an explicit September-June fee year; dashboard typecheck, i18n, lint, 225 config tests, workspace boundaries and production build pass. No authenticated bulk-fee request or browser run |
| Repo lint, typecheck, i18n, root test, production build | Pass in one `bun run check` after the class/section history guards and teacher-grade source guard: lint, all package and test typechecks, no missing i18n keys, root tests, workspace boundaries, production build, and Drizzle journal check. This is source/build evidence only |
| Drizzle migration file check | Pass in the same run; it does not prove the target database journal or schema state |
| Disposable PostgreSQL migration/backfill/reconciliation | Exact unmodified `0000`–`0057` Drizzle chain passed on fresh PostgreSQL 18 with pgvector 0.8.6 and 58 journal rows. Pending `0049`–`0057` applied both on `localhost:5432/school` and a restored pre-migration demo backup with unchanged financial fingerprints. The restored copy retained 1,533 unresolved review issues without guessing years; the regenerated single-year demo and attendance backfill audited cleanly. A dated copy of that demo then passed the reviewed two-year transition and activation. Future non-demo historical reconciliation remains conditional on actual source dates |
| Transition rollback | Partial pass on PostgreSQL 18 clones through authenticated REST: one-student placement and activation-audit failures, two-student failures on the second placement and projection, and dated demo failures on the 50th of 100 placements and projections. A further dated 100-student clone failed on activation audit insertion after all 100 projections and the Settings switch; the whole activation rolled back while its earlier committed transition survived. Clean retry activated all 100 once, repeat activation changed nothing, and one audit row remained. Fee, payment, and allocation row fingerprints were identical before and after; the read-only academic audit found zero relationship and financial mismatches. Other injected failure positions remain open |
| Authenticated API/MCP acceptance | Partial pass on synthetic and dated two-year demo fixtures: six-role old-year REST matrix, five old-year MCP list tools, dated-demo active-year parent/student ownership, closed-year transfer and class bulk fee, and a next-year receipt allocated to an old fee with idempotent replay. A teacher received 403 for old class/section detail and related reads while administrator reads and active details succeeded; the teacher's no-year lists contained only active records. A teacher could create/update their own grade but received 403 for a colleague's grade despite teaching the same section. Authenticated teacher routine reads were active-only, with old detail and assignment denial, and an administrator created, edited, and removed a closed-year assessment, exam, and grade through normal routes. Other detail, write, report, and ownership combinations remain open |
| Browser acceptance | Blocked: browser runtime reported no available browser. No UI interaction was run |
| Git/CI/image/deployment/live revision | Not run |

## Open before the viewing selector is exposed

1. On any future non-demo migration target, inventory and review assumed calendars and ambiguous placement dates. Do not infer a full-year enrollment from a fee or admission date. Reconcile writes after each cutoff before switching reads. The authorized local demo dataset was regenerated from explicit fixture dates instead.
2. Extend the authenticated REST/MCP matrix to remaining detail, mutation, dashboard, report, and ownership paths, including refused writes. The dated two-year role, transfer, bulk-fee, and cross-year payment checks above are partial acceptance only.
3. Run UI acceptance when a browser is available: selector visibility by role, navigation and query keys, year-specific lists and details, draft reset on switching, forms, receipts, and responsive layouts. Browser discovery again returned no available browser after the dated demo transition; no UI interaction was run.
4. Extend the transition rollback matrix beyond the one-, two-, and 100-student placement, projection, and audit probes to other failure points. Keep financial rollover and academic activation separate. The dashboard has no create/verify/transition/activate screen; those remain administrator API actions.

## Resolved in source: ownership predicate replaced by a later `.where()`

`najm-auth`'s `@Owned` `scope(query)` applied ownership as `query.where(condition)` for roles other than `admin`, and Drizzle's `.where()` replaces the previous condition. Twenty-four repository reads chained another filter after it (23 direct chains plus attendance `getAll(type)`, which re-filtered a stored query), so teacher, parent, and student users could read other users' records by ID or filter. `@Policy`/`@CanRead()` checks only the permission, not ownership of `:id`, so detail routes were exposed too. Twenty-three more filter reads never applied ownership, including the grade filters (by student, section, subject, teacher, assessment, exam, and the student report) that parents, students, and teachers reach with `read:grades`. The student profile tabs only require sign-in, and their fee and transport modules have no ownership rules.

Roles with no rule behaved inconsistently: their scoped lists returned nothing, yet chained reads returned every row. Internal checks such as an accounting user's fee creation (student lookup) and a secretary's student creation (class lookup) worked only because of that.

Decisions taken with the user on 2026-09-26:

- `SCHOOL_WIDE_ROLES` in `packages/server/src/auth.ts` — admin, principal, accounting, counselor, nurse, secretary, librarian, driver, assistant — read owned resources school-wide, still limited by their route permissions. Teacher, parent, and student follow each token's rules. Any other role, including one created later in the roles screen, sees no owned rows.
- A teacher reads their own staff attendance plus student attendance in sections they are assigned to, or recorded under their own assignment when older rows lack a section. Both alternatives join `students`, so a teacher never reads a colleague's staff attendance.

Source changes: `najm-auth@4.1.0` now owns `Owned` and `ownershipCondition()`, re-exported by `packages/server/src/auth.ts`. School keeps only its role configuration and a small `own` wrapper; no local ownership engine remains. The shared `ownershipCondition()` builds `id IN (<ids the rule allows>)` from the public `applyScopeSplit`, ORs alternative tokens, and is AND-ed into each read's single `.where()`. Reads outside a request (seeds, scripts) stay unscoped, as before. All 58 owned reads now use it: the 33 former `scope()` reads, the 23 filters that never had ownership, and two new parent lookups. `ParentRepository.getReadableByCin`/`getReadableByPhone` serve the CIN and phone lookup routes, while uniqueness and duplicate checks stay unscoped. Every student profile tab first loads the student through ownership and returns 404 if it is not readable. ESLint now rejects `x.where(a).where(b)` in server and seed code, and najm-auth's `own`/`Owned` outside `auth.ts`.

Verification: `bun run test:ownership` (93 tests after shared-package adoption) pins the role list and each role's rules. It checks the generated SQL of every owned read and the unscoped uniqueness lookups, and resolves a repository through a real diject container to show the request user is injected and ownership applies inside a request only. Reintroducing a second `.where()` in one read failed both that suite and lint. Lint, typecheck, root test, production build, and `db:check` pass. No PostgreSQL execution or authenticated API/MCP acceptance has been run.

Shared-package release (2026-09-26): `najm-auth@4.1.0` is published on npm; Najm source commit `789afa987108e7df3f14ddadf81f9165fde326ff` is pushed to `origin/master`. The downloaded registry tarball matches the tested artifact (SHA-256 `418cc01d1436974cb74eb7a6172eca52995d073c489e1049dcd1c91f7eecbd1a`). School pins the published version in all four manifests and `bun.lock`; ownership tests verify its helper and decorator are direct package exports. The full School `bun run check` passed against the installed package: lint, typecheck, i18n, 528 tests (including 93 ownership and 136 academic-year tests), production build, and migration consistency (`db:check`). This does not establish live PostgreSQL, authenticated API/MCP, browser, or deployment acceptance. Other apps must also migrate unsafe `scope(query).where(filter)` chains to one `where(and(ownershipCondition(), filter))`; upgrading alone does not repair those call sites.

Behaviour changes to confirm in role acceptance:

- Principal and the other school-wide staff roles now see full owned lists, which were empty before.
- Teacher, parent, and student detail, filter, profile, and parent CIN/phone lookups are now limited to their rules. Teacher student, grade, and class scope still follows the student's current section, so historical teacher ownership remains open.
- The signed-in-only `/dashboard/academic/kpis` today-attendance figure is scoped for those roles.
- Through a readable parent's profile, a teacher still sees all of that parent's children, including siblings outside the teacher's sections.
- The tokens' `.writeBy(...)` columns are not read by najm-auth; update and delete on owned resources are limited through the scoped `getById` lookup.

Drizzle generation proposed `roles_name_unique` from unrelated auth schema drift during this work. The academic-year migration SQL and snapshots omit that index so this deployment cannot unexpectedly fail on or alter role data. A later generation may propose it again; reconcile that separately in the auth workstream.
