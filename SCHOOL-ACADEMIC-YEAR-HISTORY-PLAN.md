# Academic-year history: repository @Year() context and simpler data access

Status: **MODULES 01-43 SOURCE IMPLEMENTED OR VERIFIED; DATABASE AND AUTHENTICATED REST/MCP CHECKS PASSED WHERE APPLICABLE; OWNER REVIEW OPEN.** Najm versions are the pins in the root `package.json` (`najm-auth@4.2.3` since 2026-09-29). Alerts (`0058`) and Announcements (`0059`) have year and ownership policies. Assessments, Attendance, Behavior Rewards, Classes, Class routines, the Dashboards, Discipline, Events, Exams, Grades, Parents, Profiles, Sections, Teachers, finance rows 13-24, shared Health, shared personal Notifications, shared identity Search, shared Settings and Staff (rows 32-33), and transport rows 38-43 have completed their source slices. Cycles and Subjects (rows 08 and 36) are verified shared catalogs. Finance row 24 is utility-only; Health has public REST routes and no MCP tools. Evidence is in [the ledger](docs/tests/academic-year-history.md). Browser results through 2026-10-01 are in [the checklist](docs/tests/academic-year-browser-checklist.md): the ordinary historical read/write and limited-role checks have evidence and the focused local assistant year/refusal checks now pass (section 0.1j). The owner dropped browser step 7 (activating the next year) on 2026-10-01 as not necessary. Migration `0058`-`0061` on the school's local `school` database is recorded below. The transport concurrency follow-up is fixture-verified and committed in the current baseline; no deployment is claimed. **A new implementer starts at section 0.**

Prepared: **2026-09-25** · Rewritten: **2026-09-27** · Handoff section added: **2026-09-27**

This is the authoritative forward plan for the existing whole-school history feature. The owner chose repository `@Year()` context to remove repeated year arguments from domain calls. This supersedes the initial service-property forwarding design. The later implementation checkpoint below supersedes the original preparation notes; the 2026-09-30 local school-database migration is recorded in the ledger; no deployment is claimed.

The earlier parameter-based plan is preserved byte-for-byte in [this reference](docs/plans/reference/academic-year-history-before-als-service-property-2026-09-27.md). Its controller-to-service year arguments and Students-first rollout are superseded here. The owner later authorized lint, build, tests and fixture seeding; record results before advancing.

The previous plan is preserved byte-for-byte as [historical reference](docs/plans/reference/academic-year-history-before-year-context-2026-09-27.md). Its URL-owned selection, feature-switch rollout, `/year-review` routes and list-time context-issue notices are superseded. Its unresolved historical-data, integrity and acceptance obligations remain in force through this plan. Existing dated results remain in the [evidence ledger](docs/tests/academic-year-history.md); they are not acceptance of the new transport or decorator.

## 0. Handoff: start here

For whoever implements the next modules. Sections 1–8 explain the design and why. This section says how to apply it to one module, what already exists, and the traps already found. Section 9 sets the order and the gates.

### 0.1 Where things stand (updated 2026-10-01)

| Area | State |
| --- | --- |
| Year flow: repository/service `@Year()` property, REST middleware, MCP hook | Done for `alerts`, `announcements`, `assessments`, `attendance`, `behaviorRewards`, `classes`, `classRoutines`, the `dashboard` module (school, academic, operations and finance dashboards), `discipline`, `events`, `exams`, `grades`, a parent's children (`parents`), the student, parent and teacher `profiles`, `sections`, `studentEnrollments`, `students`, `teachers` assignment reads and writes, `financial/allocations`, `financial/credits` apply, `financial/expenses`, `financial/fees`, `financial/installments`, fee-year payment list/analytics and `financial/payroll`. Financial audit, fee types and personal notifications remain explicitly all-year; the teacher dashboard always shows the active year. |
| Ownership flow: `@Owned` reads, `@Policy`/`@Can*` routes | Done for `alerts` and `announcements`. Reads were already owned in `assessments`, `attendance`, `behaviorRewards`, `classes`, `exams`, `grades`, `parents`, `sections`, `students` and `teachers`; `discipline` and shared identity `search` now apply the matching ownership rules, and a parent's children are read under the Student rules (row 28). Each profile route asks for its data module's read permission or role guard (row 29). Settings and Staff are admin-owned shared records with no ownership rules (rows 32-33). **Parents and students read** their own or their children's alerts, announcements, assessments, attendance, behavior rewards, discipline, exams, grades and notifications, and change none of them (owner decision 2026-09-27). |
| Controllers registered for the year (`config/yearScope.ts`) | The migrated business controllers (including `parents`, `student-enrollments`, `students` and `teachers`) plus consumers such as `operations-dashboard`, `parent-profile`, `student-profile`, `teacher-profile`, `grades`, `dashboard`, `academic-dashboard` and `finance-dashboard`, because those routes read a converted repository or apply credit in a selected year. The HTTP-only published `ChatController` is in the REST consumer list; it has no MCP group. |
| Other year-dependent controllers | None remain on the older flow: no controller or service takes a `@Year()` parameter, and `ACADEMIC_YEAR_HISTORY_ENABLED`, `useYearAwareList` and the `...ForYearApi` helpers are gone from the source (checked 2026-09-29). The remaining `...ForYear` methods are explicit cross-year operations: migration-issue counts for a transition's source year and rollover's target-year fee lookup. |
| Source control | The earlier year-flow baseline is committed on `main`; the assistant migration/transport/context work and the concurrent lane are currently uncommitted. Earlier baseline: transport fixes (`618fe35`), browser fixes (`a46c9ea`), mobile layout (`6865686`), finance year resolution (`02237c0`), Students no-match/refusal states (`041061a`) and the latest evidence (`c2482cd`). The finance files seen modified during the 0.1f closeout landed in `02237c0`. No push or deployment. |
| Open | Owner transport/driver-policy and per-module visual review. Focused local assistant provider/year/refusal acceptance passes (0.1j). Accounting credentials and fresh finance/refusal acceptance are now complete (section 0.1f). Post-seed tabs/account switches, limited-role URLs and ownership, delayed reads with sampled-frame membership, actual 390 px RTL, receipt popup/PDF, principal closed-year Edit, today's payment against an old fee and an actual empty fixture year have evidence. `/api/ai-settings` now returns 200 with configured OpenRouter / GPT-OSS. Native OS/physical printing and a real DevTools Slow 4G run were dropped by the owner on 2026-10-01; the receipt popup/PDF and the held-response switching evidence stand. |

**Finance lane 13-24, shared Health row 26 and identity Search row 30 are source complete** (section 9.3). Modules 13-23 passed source/database/transport checks; row 24 passed focused utility tests and the configured suite. Health's fixture-backed REST checks passed without a year scope or code change. Search kept identity results all-year and now applies per-entity ownership and permissions; its PostgreSQL-backed REST/MCP checks passed. Owner review remains open. The owner explicitly requested continuation through the financial lane on 2026-09-27; this allowed implementation to advance while review stayed open, without marking those slices accepted. In the academic lane, rows 06-12, 25, 27-29, 31-33 and 36 are done, with 34-35 and 37 in their own rows; owner review remains open.

### 0.1a Remaining work, in priority order (updated 2026-10-01)

Ordered by risk to real data first, then release, then review. Each item names what closes it.

| # | Item | Why this rank | Closes when | Who |
| --- | --- | --- | --- | --- |
| 1 | ~~**Rollover commit under concurrency and a mid-write failure** (row 23)~~ **Done 2026-09-30** | Writes money for a whole year in one run; two concurrent commits or a crash halfway could double-charge or leave half a year billed. The design is idempotent, but only the single-run path is proven. | `school_history_test` cases: two commits of one preview at once produce one set of fees; a failure injected after the first student leaves no fee and a retryable run. | Code |
| 2 | ~~**Fee-type name has no database unique index** (row 18)~~ **Done 2026-09-30**; `0061` is applied to the fixture and to the `school` database | The service refuses duplicates, but two creates at once both pass the check; duplicates then split reports by name. | Migration `0061` with a unique index on the normalized name, after checking the demo and production data for existing duplicates. | Code, then owner for the data check |
| 3 | ~~**Step 1 correction on the fixture**~~ **Done 2026-09-30**: the Student Edit correction, audit, stale retry, restore and dated-record refusal pass through transport; normal Chrome Student Edit and audit display also passed (section 0.1b). | The previous demo baseline had dated records blocking every correction; the fixture provides a safe case to exercise a successful write. | The correction runs on a `school_history_test` student without dated records, and the audit row and the corrected placement read back in that year. | Code |
| 4 | ~~**Uncommitted: Discipline and Behavior pages, Arabic at 390 px**~~ **Done 2026-09-30** | The pages' client redirects copied role names and raced the session check (fixed, uncommitted); Arabic phone width not re-measured after the header change. | Lint, typecheck and tests pass, Arabic 390 px shows no overlap, commit. | Code |
| 5 | ~~**Production migration of `0058`-`0061`**~~ **Done 2026-09-30 on `school`, which the owner confirmed is the school's database**: `pg_dump` backup taken and listed (84 tables with data), `0061` applied (61 to 62 migrations; `0058`-`0060` were already there), `db:check` clean, and the smoke test passed through the running app: each of 2024-2025, 2025-2026 and 2026-2027 returns its own students, fees, alerts, announcements and attendance, a request without a year returns 2026-2027's, and a fee type named after an existing one in other case and spacing is refused (409) with nothing written. `0061` also adds `roles_name_unique`, which najm-auth's schema declares | Nothing above reaches the school until it runs; the steps and rollback are in section 12. | Backup taken, migrations applied, `db:check` clean on production, smoke test of one year switch. | Owner |
| 6 | **Transport policy** (rows 41, 42) and **driver role-change rule** (row 33) | Behaviour is implemented and tested; what is open is whether it is the behaviour the school wants (interval edges, reassignment history, a driver with vehicle history keeping the role). | Owner accepts or names a change. | Owner |
| 7 | **Owner visual review of every row** | Source, database and transport checks passed; no row is accepted until seen. A reviewer pass by Claude (2026-10-01, [visual review](docs/tests/academic-year-visual-review.md)) found year behaviour correct on every page except Calendar opening outside a past year, the active-year dashboard basis and Payroll omitting teachers from an unrun month; Behavior Rewards was BLOCKED by a dev-server hang; it also lists defects (Fee Types all shown Inactif, Settings header overlap), untranslated text and phone layout issues. | Owner walks the checklist per row, using that review. | Owner |
| 8 | ~~**Browser step 7**~~ **Dropped 2026-10-01: the owner ruled it not necessary** | No browser activation check is required. The server side (one switch, two at once, rollback) passes on `school_history_test`. | Closed. | — |
| 8a | **Section 10 data audit of `school`** **Done 2026-10-01 (read-only)** | Labels, relationships, attribution, placements and money all pass; see the ledger. | Owner decides the two data choices: final-year enrollment status for the 24 graduated/inactive students, and closing 2024-2025 and 2025-2026. | Owner |
| 9 | **Step 6, the assistant — Done locally 2026-10-01** | OpenRouter / `openai/gpt-oss-120b` is configured. Admin browser tool results match selected-year REST/PostgreSQL membership; actual teacher, parent and student conversations explain the historical restriction without tools. | Focused local check closed; source gates and evidence are in 0.1j and the ledger. Production, broader model acceptance and owner review stay separate. | Closed locally |

Closed on 2026-09-30 and no longer ranked: teacher `read:assessments`/`read:exams` (row 37; granted in the seed and the demo database), refused saves' reasons and their language, the phone-width header, and findings 9-13. Transport concurrency (rows 41-42) and the Staff-create assignment bypass (row 33) are fixed and fixture-verified. The pre-reseed live interval audit passed for 60 routes and 24 assignments; the fresh post-seed counts and checks are in section 0.1b. Owner acceptance remains open.

### 0.1b Chrome MCP checkpoint and resume point (2026-09-30)

The owner reconnected Chrome MCP after the initial bridge-session failure. These checks ran with the seed administrator and existing acceptance accounts on :3102, plus an isolated :3103 server against `school_history_test`. They supplement the earlier Playwright and REST/MCP evidence; they do not mark every module visually accepted.

| Check | Recorded outcome before the new seed |
| --- | --- |
| Historical selection and navigation | **PASS:** demo Students lists contained 100 students per selected year; sidebar navigation to Teachers kept 2024-2025. Reports and Transport retained selection. Continuous transport intervals may overlap multiple years; current occupancy remains a present-day value. |
| Tabs, reload and account switch | **PASS:** two tabs retained independent years after individual reloads. Admin → parent → student → teacher → admin switched visible data and permissions; the parent's old admin tab showed Access denied. Admin's remembered 2025-2026 returned. Parent/teacher historical query links fell back to active; historical-only student IDs showed not found for all three limited roles. The student's query-link UI case was not separately completed. |
| Normal historical Student Edit | **PASS on fixture:** Ilyas (S09), 2025-2026 section A → B with a reason, then restored to A through the same form. The current 2026-2027 class/section/status projection and current dated placement stayed unchanged. Audit actor, timestamp, before/after and reason were read back; School years now displays who, when and why. |
| Dated roster and enrollment cases | **PASS on fixture:** Omar appeared in A on 2026-01-14, then B on 2026-01-15; Mariam was absent from 2026-2027; Aya had a 2025-2026 fee without enrollment/class that year. |
| Forms and pending writes | **PASS on fixture:** changing attendance year reset incompatible class/section/date and unsaved absence state without an attendance write. A historical multipart avatar save carried 2025-2026 and returned 200. A separate cleanup PUT response was held for 12 seconds while a second tab selected 2026-2027; both tabs retained their own year after completion. The modal blocks same-tab selector interaction. |
| Keyboard, RTL and empty results | **PASS for observed cases:** keyboard selection closed the menu and returned focus; Arabic menu/page direction was RTL. At the actual Chrome minimum width of 500 px, the selector was visible and Students/Transport had no horizontal overflow. Earlier Playwright 390 px evidence remains separate; no new Chrome 390 px result. Fees no-match search retained its toolbar and clearing it restored results. |
| Receipt | **PASS for generated HTML:** the existing historical-fee receipt rendered its 2026-09-30 payment date, student and 100 MAD amount through the actual Print handler into a temporary capture frame. **Native popup/print preview NOT RUN**; no physical print or student report export is claimed. |
| Principal closed-year form | **BLOCKED on fixture permissions:** principal sign-in succeeded, but Students showed Access denied because its fixture role lacks Student grants. This is not a finding that closed years deny permitted edits. No grants or passwords were changed. Earlier principal API and demo grade checks remain separate. |
| Assistant and activation | **Assistant BLOCKED:** last settings response was 204, no provider/model. No active-year change was made; browser activation was later dropped (2026-10-01). |

**Browser fixes, uncommitted:** optional blank phone/date-of-birth values normalize to null while invalid nonempty values still fail validation; Fees keeps its search toolbar when filtering yields zero results; enrollment history exposes and translates audit actor/time next to the reason. Verification after these fixes: 26 focused student-form tests and 4 connected enrollment tests passed; lint, full workspace typecheck, `i18n:check` and a separate-output production build passed. The connected suite's initial five-second cold-start timeout was resolved by rerunning with a 30-second budget. The earlier 926-test gate belongs to the transport follow-up, not a new full-suite run for these UI fixes.

**Fixture cleanup limits:** the old section and avatar were restored through normal forms; both correction audit rows and cleanup reason remain. Normal Edit defaulted the fixture's null gender to M. No database reset/reseed was performed by this browser run, and a pristine fixture is not claimed.

**Resume after the owner's new seed:** recheck live registered years, active settings, overlapping student enrollments and available role accounts before reusing any old IDs/counts. Refresh stale tabs. Then finish principal closed-year normal-form acceptance with an account that has the normal grants, the remaining limited-role URL case and native receipt preview. Recheck the assistant prerequisite; owner policy/visual acceptance remains open. Preserve the seed changes and do not reset the database to recover the old demo baseline. Detailed evidence and outstanding cases are in [the ledger](docs/tests/academic-year-history.md) and [the checklist](docs/tests/academic-year-browser-checklist.md).

**Post-seed transport verification:** `school` has 100 / 103 / 106 enrollments, 103 students enrolled in multiple years, and active 2026-2027; all three registered years are open. Admin MCP/REST membership matches PostgreSQL for each year and no-year reads match active. Sample Rim Qadiri (`Pt-5r`) progresses CM2 B → CE6 B → 1AC B. Existing teacher/parent/student seed-default logins pass; active lists contain 72 / 1 / 1 students, historical header/query/MCP lists are refused and only the active year is offered. A historically taught identity is shared: the teacher's detail returns 200 with null year-owned context; the sampled unowned parent/student detail returns 404. This follows section 4.3 and is not a blanket historical-ID refusal rule. Transport REST/MCP agrees per year: student routes 20 / 20 / 20, vehicle assignments 8 / 6 / 6, with zero overlapping pairs or reversed intervals in the exposed union. Main principal/accounting accounts do not use the configured seed-default password; no password reset was attempted. The initial new-seed Chrome connection block was **subsequently bypassed with Playwright**, whose separate UI evidence follows.

### 0.1c Playwright continuation after reseed (2026-10-01)

At the owner's suggestion, Playwright launched a separate headless Chrome using the installed package. No Chrome extension reconnect is required for this workflow. The main :3102 server and concurrent seed/mobile-layout source changes were preserved.

| Case | Latest browser outcome |
| --- | --- |
| Students and profile history | **PASS:** counts 100 / 103 / 106; Rim Qadiri's selected-year profile shows CM2 B then CE6 B. School years lists 1AC B for 2026-2027, with translated actor/time/reason. |
| Tabs and account switch | **PASS:** a new tab remembers 2025-2026; separate 2025-2026 / 2024-2025 tabs retain selection after individual reloads. Admin → parent → student → teacher → student → admin replaces menus/data; the old admin tab becomes the parent's one-child list. Admin's remembered 2025-2026 returns. |
| Limited-role links | **PASS for all three URL cases:** parent/student/teacher historical query links normalize to active and show 1 / 1 / 72 students with no selector. Parent/student unowned past identity shows not found; the teacher's recorded shared identity shows not enrolled in 2026-2027 without old placement. This closes the previously uncompleted student query-link case. Assistant conversation remains separate. |
| Delayed response | **PASS:** a 2025-2026 Students response held three seconds completed after switching to 2026-2027; the final page retained 106 active students. |
| Arabic/mobile/keyboard | **PASS at actual 390 × 844:** loaded Students/Fees cards have no horizontal overflow. Concurrent edits now place the selector in the drawer below 640 px. After drawer animation, selector x=211, width=163 is fully reachable; keyboard selection closes its RTL menu and returns focus. Main language restored to French. Earlier header-based measurements do not describe this new drawer layout. |
| Filter recovery | **PASS:** Fees keeps search controls for no matches; clearing restores the selected year's 100 rows. |
| Receipt | **PASS through real Print button:** popup and browser PDF display Rim Qadiri, receipt `RCP-20260930-M5AMKGCE8F`, payment date 2026-06-01 and 1,600 MAD while viewing 2024-2025. Documents is explicitly all-year. No native OS print-dialog or physical-print result is claimed. |
| Principal closed-year normal Edit | **PASS on marked fixture:** Ilyas S09, 2025-2026 A → B with reason, then B → A cleanup, both ordinary Student PUTs 200 with 2025-2026. SQL and School years verify actor `history-principal`, role principal, before/after/reason, unchanged current projection and a still-closed year. The final Playwright CLI suite passes **1/1**. |

**Fixture preparation and cleanup:** temporarily added five normal Student/lookup grants to the existing fixture principal, then restored exactly its original four announcement grants and removed unused permission rows created for this check. No main-database grants, users or passwords changed. Old section restored; correction/cleanup audit rows and cleanup reason remain. The old isolated server was hanging/returning 500; only that server was restarted with fresh output, then stopped after acceptance. Main :3102 remains running. Initial harness retries corrected environment forwarding, English fixture labels and hidden duplicate controls; no new application fix was needed.

**Evidence and next work:** detailed results are in [the ledger](docs/tests/academic-year-history.md); local screenshots, receipt PDF and principal proof/report are under ignored `.cache/history-playwright/`. No new lint/build/full-suite result is claimed for this documentation/browser pass; the previous source gates remain dated evidence. Continue with the configured assistant when available, a fresh accounting-role run once its existing credentials are supplied, and owner per-module visual/policy review.

### 0.1d Further Playwright checks (2026-10-01)

Continued from `33683f1`. The main dev server had stopped; restarted it normally on :3102 and left it running. Read-only PostgreSQL/REST checks reconfirmed the `school` database, open registered years, 100 / 103 / 106 enrollments, and assistant settings still returning 204. No reseed, domain write, account/password change or application source edit was needed.

| Case | Result |
| --- | --- |
| Historical navigation | **PASS across 16 pages:** student profile, Fees, student Attendance, Grades, Exams, Payroll, Expenses, Reports, Teachers, Assessments, Alerts, Announcements, Discipline, Behavior Rewards, Dashboard and student fee record retain 2024-2025 with no year query parameter. The observed primary scoped GETs return 200 with that header; Reports has UI-context evidence only. Actual sidebar clicks through Teachers → Grades → Students retain selection. Payroll opens June 2025. Shared parent identities and explicitly all-year fee documents are separate reads. |
| Historical profile dialog | **PASS:** normal Students → View shows Rim Qadiri's CM2 B placement for 2024-2025. Closed the dialog normally; no save. |
| Keyboard | **PASS:** after reload, 24 Tab presses reach the selector; Enter opens, Escape cancels without changing year, Home/arrow/Enter selects 2025-2026 and returns focus. Counts 100 → 103 → 100 after returning to 2024-2025. |
| Dated filters and dirty attendance | **PASS:** changed the date to 2025-06-20, selected 3AC and made an unsaved mark. Selecting 2025-2026 resets to CP/A and 2026-06-30, disables Save, and sends zero attendance writes. The new dated roster GET returns 200 with 2025-2026. |
| Failed/empty reads and recovery | **PASS for UI branches:** intercepted Students GET with 403 shows Access denied, without an empty-state message or zero count; intercepted 200 `[]` shows the empty state. Removing interception restores the real 100 historical students. This is simulated-response browser evidence, not a newly registered empty year's database acceptance. |

Final command `bun --env-file=apps/dashboard/.env.local .cache/history-navigation-run.ts`: **4 passed, 0 failed**, 74.5 seconds. The harness now reuses one authenticated browser context; an earlier combined run hit the normal login rate limit after repeated fresh logins. Initial harness retries corrected hidden duplicate links, shared-read assertions, complete header capture and the date-picker controls. No rate-limit configuration was changed. Screenshots, proofs and the final report are local under `.cache/history-playwright/`; the ledger records scope and remaining work. Owner visual/policy acceptance, existing accounting credentials and assistant provider configuration remain separate.

### 0.1e Fixture history and real empty-module checks (2026-10-01)

Continued the remaining read-only cases with Playwright and the existing fixture admin. A separate :3103 server used guarded local `school_history_test`, its marker and ten students, without editing `.env.local`. The fixture has 7 / 8 / 8 enrollments; 2024-2025 and 2025-2026 remain closed. Existing correction/audit history was preserved.

| Case | Result |
| --- | --- |
| Adam's promotion | **PASS:** the profile shows History 2025-2026 · A with the past year selected, then History 2026-2027 · A after switching to active; the other placement is absent from Overview. |
| Omar's dated transfer | **PASS:** January 14, 2026 shows Omar in A; January 15 removes him from A and shows him in B. Zero attendance writes. |
| Mariam and Aya | **PASS:** Mariam is absent from the current list and present in 2025-2026. Aya is absent from the 2025-2026 enrollment list; her profile says Not enrolled in 2025-2026, while her fee page shows the existing 1,000.00 fee. Its actual GET returns 200 with the selected-year header and expected fee ID. |
| Real empty module | **PASS:** Behavior Rewards in 2024-2025 returns a real 200 with empty data and displays No behavior records yet, without Access denied. That year still has seven students; an entirely empty school year remains unrun. |
| No-match Students display | **OPEN visual finding:** filtering the nonempty Students list to no matches keeps search and pagination, but shows no no-results message (Page 1 of 0). This does not invalidate the membership checks; no source fix was made. |

Final command `bun --env-file=apps/dashboard/.env.local .cache/history-fixture-read-run.ts`: **4 passed, 0 failed**, 26.4 seconds. Setup retries corrected the API-envelope assertion and waited for the initial attendance roster to settle before changing its date. Selected screenshots were visually inspected. Read-only before/after checks confirm unchanged placements, enrollment counts, Aya's fee and empty-module baseline. Browser contexts closed and the temporary :3103 server stopped; :3102 remains running. Evidence is under ignored `.cache/history-playwright/` and recorded in the ledger. This pass changes documentation and local helpers only; no new grants, accounts, passwords, payment, seed or application source change.

**Resume:** the owner confirmed on 2026-10-01 that main-school accounting credentials are not available yet; keep that check open without resetting access. Assistant provider configuration, owner visual/transport-policy review and the remaining combined checklist scenarios remain separate.

### 0.1f Authorized browser fixes, credentials and remaining acceptance (2026-10-01)

The owner authorized fixes and credential setup after confirming the existing accounting password was unavailable. This supersedes section 0.1e's open credential and Students no-match findings; earlier dated evidence remains intact.

| Check | Latest outcome |
| --- | --- |
| Students filtering | **FIXED / PASS:** controlled School filters show the existing translated no-results state, retain controls, accept trimmed name search and recover when cleared. Stable student IDs bind row selection to the record while filtered data changes. |
| Accounting actions and refusal | **FIXED / PASS:** Students create/edit/delete/select actions follow normal grants. The existing accounting account reads 2024-2025 Fees and Expenses, sees View without Edit/Delete, and Grades shows Access denied after the real 403. Authorization failure now hides independently loaded or cached rows; transient failures may retain usable rows. A valid same-value Student PUT is refused with 403 and the before/after record is identical. |
| Credentials | Existing `accounting.test@demo.local` password set through admin REST; identity, role, grants and status unchanged. Generated credentials are in ignored `.cache/history-accounting-credential.json`, never in tracked files. The fixture has a retained accounting account with the ordinary three read grants for students/classes/sections and its separate ignored credential file. No main-school account was created. |
| Rapid switching | **PASS:** actual 2025-2026 Students reply held until 2026-2027 rows are visible; each sampled animation frame has counts and rendered student IDs belonging to its heading year, with no authorization error. Final active count 106. This is automated delayed-response evidence, not a DevTools Slow 4G measurement. |
| Owned lists | **PASS:** parent/student/teacher real Students responses exactly match PostgreSQL-owned active records, **1 / 1 / 72**. Owned-name search works; an excluded-name search shows no results; clearing recovers. None has a year selector. |
| Today's payment on an old fee | **PASS on fixture:** accounting normal form paid 100 cash against a prepared 2025-2026 installment, with payment/settlement date 2026-10-01. October/current-year cash increased by 100; allocation and collection belong to 2025-2026, whose cash income stayed zero. Payment `AEKoHdqfRR` then voided once through MCP; cash and paid balances restored to zero. Prepared fee, installment, receipt and audit history remain. No main-school payment or fee write. |
| Entirely empty year | **PASS on fixture:** admin REST registered empty **2023-2024 as draft**; zero enrollments, fees and classes. Real Students GET 200 returns `[]`, displays No students yet and returns to eight active students. The active 2026-2027 pointer is unchanged. The retained draft is acceptance setup, not activation. |
| Arabic year UI | **PASS for observed shared states:** selector label, active option, limited-role reset banner and Aya's not-enrolled notice match Arabic catalog text; menu, rows/banner and profile use RTL. Language preferences restored. Earlier actual 390 px Students/Fees evidence remains separate; full owner visual review is still open. |

**Browser gates:** main harness **5 passed, 0 failed** (43.2 seconds); fixture payment **1 passed** (7.4 seconds); final fixture empty-year/Arabic harness **2 passed** (25.5 seconds). Selected screenshots were visually inspected. Main-school academic-write refusal, finance totals and cleanup also have separate internal REST/MCP and read-only PostgreSQL proof. See the latest [ledger entry](docs/tests/academic-year-history.md) for commands, artifacts and final source gates.

**Source gates for this browser continuation: PASS.** Lint, full workspace typecheck, configured frontend/contracts tests (**293 pass, 2,226 assertions**), production build after the final dashboard edits and diff whitespace check. Build evidence retained under ignored `.cache/history-build-final-20261001`; dev output preserved. Final main login HTTP 200 and PostgreSQL ready; only :3102 listening. At closeout, additional changes were observed in `AllocationRepository.ts`, `PaymentService.ts`, `PaymentsHistoryDatabase.test.ts`, `FeeService.ts` and `FeeValidator.ts`; those concurrent edits were preserved, and these gates do not claim their final acceptance. No new full 926-test or deployment claim.

**Environment and cleanup:** a local PostgreSQL interruption briefly returned recovery-mode errors; readiness recovered without reset, reseed or database repair. Main :3102 was restarted normally. The fixture :3103 process is stopped; main :3102 remains running. Fixture account/grants, empty draft year, unpaid prepared fee and audit metadata are retained for repeat checks. No environment, dependency, schema or migration change.

**Resume:** the assistant needs a real provider/model and usable credentials or a running local model. Authenticated settings still return 204 and the usual provider-key environment variables are absent. Provider details were requested; no placeholder key or conversation result is claimed. Owner transport/driver-policy and full visual acceptance remain open. Do not reset either database to remove acceptance history.

### 0.1g Assistant provider save repair (2026-10-01)

The owner supplied OpenRouter credentials through the assistant's Settings form, but Save failed because local `school.ai_settings.provider` still used migration 0009's enum without `openrouter`. Custom migration `0062_ai_settings_provider_text` aligns the column with pinned `najm-chatbot@2.0.3`'s text schema, preserving values and the default. A verified full `school` backup precedes the migration; the database now has 63 journal entries. Temporary-table PostgreSQL regression (1 test / 7 assertions), lint and `db:check` pass. See the latest [ledger entry](docs/tests/academic-year-history.md).

**Resume:** retry Save in the existing Settings form with the owner's key and desired model (`openai/gpt-oss-120b` was discussed). GET still returns 204 until that save succeeds. No paid-provider or assistant-conversation acceptance is claimed. The current chat client supplies authorization but no selected-year header; examine and prove that transport along with limited-role refusals before closing step 6. Chrome MCP's current invalid-session 400 prevented using the owner's existing form; no key was extracted or replaced.

### 0.1h Assistant embedding service restored (2026-10-01)

The first greeting reached chat preparation but failed because local Qwen at port 18081 was stopped and its model file was missing. Restored the exact documented model with verified SHA-256 and started the existing hidden loopback-only launcher. Health, a real embedding and School's authenticated routing preview pass. C: was full; reversible NTFS compression of two completed history builds' generated caches freed space while retaining all contents after automatic approval review rejected cache deletion. See the latest [ledger entry](docs/tests/academic-year-history.md).

**Current prerequisite:** AI Settings returns 200, enabled OpenRouter / `openrouter/auto`, but `hasKey:false`; both database key columns are null. Owner must paste the key in the Settings field again and Save, selecting `openai/gpt-oss-120b` if desired. No paid-provider conversation ran. Qwen stays running as a manually started process, not a startup service. Selected-year chat transport and limited-role assistant conversations remain open.

**Connection follow-up:** after the owner's `Failed to fetch` screenshot, :3102 is reachable again with a new server process and a fresh-start/Turbopack-cache-recovery log. Health and authenticated notification reads return 200. The actual chat stream opens (200), then OpenRouter rejects the synthetic greeting with **401 `Missing Authentication header`**, matching `hasKey:false`. No successful LLM response or domain-tool call. Reload the page and save the key before retrying; detailed boundary evidence is in the latest ledger entry.

### 0.1i GPT-OSS model selected (2026-10-01)

At the owner's request, authenticated internal REST selected **`openai/gpt-oss-120b`** for OpenRouter and added it to the saved custom model options, so it appears in the suggestions after page reload. GET verifies both values and unchanged other settings/credential flags. The Model field also accepts direct typing; the built-in dropdown is a suggestion list. No package or application source edit. **Current blocker remains `hasKey:false`:** the owner must paste their key into API Key and Save. No successful LLM conversation or year/role acceptance yet. See the latest [ledger entry](docs/tests/academic-year-history.md).

### 0.1j Configured assistant, selected-year transport and refusals (2026-10-01)

The owner saved the OpenRouter key and confirmed a successful greeting with `openai/gpt-oss-120b`; settings now reports `hasKey:true`. This supersedes the prerequisite checkpoints in 0.1g-0.1i.

School connects the published widget to the existing account/year selection. Its supported API URL supplies the year, and the Next boundary forwards it to internal MCP through the normal header. The HTTP-only `ChatController` is a REST year consumer in `config/yearScope.ts`; business MCP registrations are unchanged. The shared validator rejects unauthorized, malformed, conflicting or unregistered selections before provider work. The widget resets its conversation on account/year changes, with the year reset proven in Chrome.

A School context provider adds the validated year and the shared role rule to the model's prompt, preserving knowledge context and traces. This corrected a real teacher response that mislabelled permitted active-year students as historical. Actual teacher, parent and student conversations now explain the past-year restriction and execute no tools. Admin browser tool results for 2024-2025 and 2026-2027 exactly match REST and read-only PostgreSQL membership (100 / 106). The final browser case passes; lint, full typecheck, focused tests, the academic-year suite, security and import boundaries pass. The isolated production build passes. Details and precise evidence boundaries are in the latest [ledger entry](docs/tests/academic-year-history.md).

**Resume:** the focused local step 6 assistant check is complete. Owner per-module visual/transport-policy review and release/deployment remain separate. Source changes are uncommitted alongside the other lane's existing work; preserve that work. No production, multilingual, latency/billing or write-action acceptance is claimed.

### 0.2 Ground rules

- Use `bun`, never npm/yarn/pnpm, and run commands from the repository root.
- The Najm source at `C:\Users\hdevlop\Desktop\najm` is **read-only reference**. School uses only the published versions pinned in the root `package.json`. Never link, copy or publish Najm.
- Do not commit, push, reset, stash, restore or clean unless the owner asks. The tree contains work that is not yours; change only what the current module needs.
- `apps/dashboard/.env.local` holds secrets, including the fixture database URL and passwords. Never print, log or commit its values.
- Database tests and fixture seeds run only against the local `school_history_test` database, and the scripts refuse any other. Never use `seed:full`, `reset:demo`, `db:push` or `db:drop` for acceptance.
- `bun run db:migrate` targets the **application** database named in `.env.local`. To migrate the fixture, run `drizzle-kit migrate` with `DB_URL` set to the fixture URL, and confirm the target is `school_history_test` before and after.
- Many files have CRLF line endings. Use an editor or patch tool. A script that replaces `\n`-based strings silently skips CRLF files, and Git Bash `grep`/`sed` hide the `\r`.
- Finish one module (code, tests, real database and transport checks, ledger entry) before starting the next. Do not batch modules and test at the end.

### 0.3 Year flow: convert one module

What happens on each request:

```text
X-Academic-Year header, or academicYear query / MCP tool input (missing = active year)
  -> auth guards (order 40) -> DTO validation (45)
  -> year middleware (50): AcademicYearValidator.resolveSelection(), then runWithResolvedYear(...)
  -> controller -> service -> repository reads this.year
```

1. **Repository.** Declare the property and use it in every read, write and create:

   ```ts
   @Repository()
   export class ThingRepository {
     @Year() private readonly year!: ResolvedAcademicYear;
     declare db: DB;
     @Owned(Thing) // only if the module has ownership (section 0.4)
     private ownedWhere!: OwnedWhere; // imported from School's auth entry

     async getAll() {
       return this.baseQuery()
         .where(and(this.ownedWhere(), thingInYear(this.year.id)))
         .orderBy(desc(things.createdAt));
     }

     async create(data: NewThing) {
       const [row] = await this.db.insert(things)
         .values({ ...data, academicYearId: this.year.id }).returning();
       return this.getById(row.id);
     }

     async update(id: string, data: Partial<NewThing>) {
       const [row] = await this.db.update(things).set(data)
         .where(and(eq(things.id, id), thingInYear(this.year.id))).returning();
       return row;
     }
   }
   ```

   The year predicate is each module's own rule; do not invent a generic one:
   - A row that stores its year: `eq(table.academicYearId, yearId)`, as in `announcementInYear` in `AnnouncementRepository.ts`.
   - Year rows plus rows shared across years: `alertVisibleInYear` in `AlertRepository.ts`.
   - A stored year, or the date when the year is missing: `inReportingYear(table.academicYearId, table.date, this.year)` from `academicYears/academicRecordYear.ts`. Assessments and Exams use this.
   - A dated event with no year column (a timestamp): `occurredInReportingInterval(table.at, this.year)` from the same file. It compares the school-local day (`settings.time_zone`) with the year's reporting interval. Behavior rewards and Discipline use this.
   - Students, enrollments and placements: the rules in section 3.3.

   A dated record that concerns a student takes its class and section from where the student was **on that day**, never from the current `students.class_id`/`section_id` projection. Use the shared helpers instead of writing another placement query:
   - `studentPlacementOn(db, studentId, at, year)` in `studentEnrollments/placementOnDay.ts`: the placement on the school-local day of `at`, and whether that day is in `year`. See Behavior rewards and Discipline.
   - `placedOnSourceDate(source, userId, parent)` and `studentPlacedOnSourceDate(source, studentId)` in `academicSources/placedOnSourceDate.ts`: an assessment or exam belongs to a student who sat in one of its target sections on its date. The first is the family ownership rule, the second one student's list. See `ExamGuards.ts` and `ExamRepository.getForStudent`.

   Outside a scope, `this.year` throws `Resolved academic year is missing from the current operation`. This is intended. Never turn it into an empty result.

2. **Service and validator.** Remove ordinary year-forwarding parameters and call repository methods plainly. A service or validator declares `@Year()` when its own business rule needs the resolved year: `CreditService` uses it to select the target fee year on apply, and `AlertValidator` uses it to decide between shared and year-owned alerts. Trusted cross-year work keeps explicitly named methods with explicit years, such as `createFromSourceYear`, `checkDuplicateAlertInScope` and `clearForSeedReset`.

3. **Controller.** Remove the `@Year() year` parameters. Remove `academicYear` from the route's `@Validate` params, query and body schemas: the hook declares it for MCP, and REST middleware still reads `?academicYear=` directly. Keep `@User()`, `@Params()` and the other parameters.

4. **Register the controller** in `packages/server/src/config/yearScope.ts`, keyed by its `@ToolGroup` name. That one line puts every route of the controller in REST year scope, and adds the optional `academicYear` input to every MCP tool of the group.

5. **Register every consumer.** Search for callers: `grep -rn "ThingService\|ThingRepository" packages/server/src/modules`. Every controller whose route reaches the converted repository must also be in `yearScope.ts`, and its own `academicYear` declarations must go (step 3). It may keep its `@Year()` parameters until its own turn; they resolve the same year. For Assessments, check `GradeController`, `StudentProfileController` and `TeacherProfileController`. `GradeService` calls `getSourceContext` and `getAssessmentByParams`; it needs registering only if those methods end up reading `this.year`. The student profile reads `assessmentService.getForStudent` and `examService.getForStudent` (the student's own sources, not everything the reader may see); the teacher profile reads `assessmentService.getAll({ teacherId })`. Remove any `.catch(() => [])` around a scoped read, the pattern that hid the 2026-09-27 bug. Jobs and seeds do not go through `yearScope.ts`. They enter a scope through a trusted runner (`runWithResolvedYear` after validation, or the seed's `runSeedTask`, which runs as admin), or call an explicitly named explicit-year method.

6. **Schema, only if the table has no year column.** Add a minimal migration like `0058`/`0059`: a nullable `academic_year_id` referencing `academic_years.id` with `ON DELETE restrict`, plus an index. Generate it with `bun run db:generate`. Then delete unrelated generated statements from both the SQL and the snapshot; the generator keeps adding a `roles_name_unique` index. Leave legacy rows with no provable year null, and hidden from year views. Never infer a year from `createdAt`.

### 0.4 Ownership flow: every owned module

1. **Guards file `<Module>Guards.ts`.** Define the rule as `own(table).for(role, join(...), ..., where(<column holding the user id>))`.
   - Import `own`, `join`, `where`, `when`, `Policy` and `Can*` from `packages/server/src/auth.ts`, never from `najm-auth`. ESLint enforces this.
   - A najm rule is one join chain. Alternatives are extra tokens, OR-ed by `@Owned(A, B, C)`; see `AlertGuards.ts` and `AttendanceGuards.ts`.
   - `when(condition)` after a chain narrows it by a condition on the row, such as the alert's audience. On its own, it is the whole rule for rows that belong to an audience rather than one person, such as every live announcement for parents. See `AnnouncementGuards.ts`.
   - `ownedIds(Token, role, userId)` returns the ids a user owns as a subquery; class announcements use it.
2. **Repository.** Import `Owned` and `type OwnedWhere` from School's auth entry. Inside `@Repository()`, declare `@Owned(...) private ownedWhere!: OwnedWhere;` and give every owned read one `.where(and(this.ownedWhere(), yearPredicate, ...filters))`. Najm installs the function during context injection; resolve repositories through the container. A second `.where()` replaces the first and silently drops ownership; ESLint rejects `x.where(a).where(b)`. Duplicate and uniqueness lookups stay unscoped. The legacy class decorator remains supported by Najm for other consumers.
3. **Who sees what.**
   - `SCHOOL_WIDE_ROLES` (admin, principal, accounting, counselor, nurse, secretary, librarian, driver, assistant) read every row, still limited by their route permissions.
   - teacher, parent and student follow the token's rules.
   - Any other role sees no owned rows.
   - A scope with no signed-in user sees nothing (`1 = 0`).
4. **Controller.**
   - Put `@Policy(Token)` on the class. `@CanList()`, `@CanRead()`, `@CanCreate()`, `@CanUpdate()` and `@CanDelete()` require `read`, `create`, `update` or `delete:<table name>`.
   - School-wide bulk operations keep `@isAdmin()`.
   - A refused permission returns **401**, the same as the old role guards.
5. **Writes.** The service first loads the target through the owned read, which returns 404 when the actor cannot see it. It then applies the write rule with the actor from `@User()`; see `AlertValidator.ensureCanHandle` and `AnnouncementValidator.ensureChangeable`. Seeing a row never grants permission to change it.
6. **Grants.** Add role permissions in `packages/seed/src/scripts/admin/data/rolePermissions.json`. `bun run seed:admin` adds any missing grants to an existing database.
7. **Screens.** Hide actions a role cannot perform (see `canManage` in `AnnouncementsTable.tsx`), and add every new text to all four locale catalogs. Parents and students are read-only everywhere: give their roles only `read:` grants, and check `useViewerRole().isFamily` (`apps/dashboard/src/shared/useViewerRole.ts`) to hide create, edit and delete. A module whose records concern a student needs `.for('parent', ...)` and `.for('student', ...)` rules so they see only their own or their children's; see `BehaviorRewardGuards.ts` and `DisciplineGuards.ts`. When the record belongs to a section on a date (assessments, exams), the rule is placement on that date through `placedOnSourceDate`, not the current section; see `ExamGuards.ts`. The same holds for teachers: `GradeGuards.ts` gives a teacher the grades of their own sources and of students placed in a section they teach on the source date.

### 0.5 Traps already hit

1. **A duplicate `academicYear` input stops the server from starting.** najm-mcp refuses to boot if a tool's params, query or body already declares an input that the year hook adds. `tests/academicYears/YearScopedModules.test.ts` checks every registered controller without booting, so run it after each registration. Section 0.6 lists the current declarations.
2. **Unregistered consumers.** A route outside the scope that reaches a converted repository throws. `/profiles/parents/:id/unread-alerts` and `/dashboard/operations/kpis` did this until 2026-09-27; see section 0.3, step 5.
3. **Swallowed errors.** `.catch(() => [])` around a scoped read turns a failure into "0 results". Remove it when you touch the call.
4. **A chained `.where()`** drops ownership or the year predicate.
5. **Repository tests need a signed-in actor.** `scopedHistoryRepository(Repo, db)` returns `{ repo, inYear }`. `inYear(yearId, run, actor?)` runs as the fixture admin unless you pass `{ id, role }`. The helper already registers `ScopeContext`, which `@Owned` repositories need.
6. **Fixture parents need a user row.** `parents.user_id` is NOT NULL in the database. Create a `users` row first and delete it in `finally`.
7. **`createZodEnum` infers `string`.** Type service parameters from the DTO instead, for example `UpdateAlertStatusDto['status']`.
8. **najm-guard metadata:** `AuthGuard` params are `undefined`, not `null`.
9. **Transport suites.** Run them one at a time against the shared fixture; their test servers use separate local ports. Ports 5496-5530 are taken; pick the next free one (`grep -h "const port" packages/server/tests/acceptance/*.ts`).
10. **The current section is not history.** `students.section_id` is today's projection. A read or check for a past date through it hides a transferred student's records and shows them another section's. Exams' family rule did this until 2026-09-28. Use the placement helpers in section 0.3.
11. **Academic sources must target their assignment's section.** The database trigger `school_validate_academic_source_year` rejects an assessment or exam whose `section_ids` omit its teacher assignment's section. Fixture rows must include it; the fixture has one assignment per year, for section A.
12. **Error catalogs can be missing.** A validator's `@I18n('<module>.errors')` shows raw keys such as `exams.errors.notFound` when the catalog has no such block; `i18n:check` does not catch it. Check the block exists in all four locales when you touch a module. `exams.errors` and `assessments.errors` were added on 2026-09-28.
13. **A route with no guard asks only for sign-in.** School registers `guards({ default: [isAuth()] })` since 2026-09-29. Before that such a route was public: Events answered ten read routes, and matching MCP tools, without sign-in until 2026-09-28. Sign-in alone still lets any account in, which rarely fits the data (trap 19). Give every route the guard its data needs, and mark a deliberately public one `@Public()` from `najm-guard`. `RouteSecurityTransport.test.ts` fails on a route that relies on the default.
14. **`Err` does not translate.** `Err(409, 'module.errors.key')` sends the key itself to the user. Translate it with `t('module.errors.key')` from `../../najm`, or a validator's `@I18n('module.errors')`. Class routines sent all 32 of their errors as keys until 2026-09-28.
15. **A catalog delete reaches every year.** Subjects, cycles and other shared rows are referenced by many years' records, often through `cascade` or `set null` foreign keys. Deleting one can silently erase or unlink past years' history. Refuse the delete while anything references the row, and offer deactivation where the catalog has it.
16. **Today's figures under another year's name.** "Today", "this week" and "this month" belong only to the year whose reporting interval holds the business day. For any other year, return `null`, never today's figures and never a `0` that reads as real. Check with `holdsDay(year, getBusinessDateOnly())` from `academicYears/academicRecordYear.ts`; the dashboards do.
17. **`fee_installments.paid_amount` is a cache.** It stops updating once an installment is cancelled. Year figures read completed `payment_allocations` and leave cancelled installments out, as the finance dashboard's `yearInstallments()` does.
18. **Related rows are another module's owned rows.** Being able to read a parent, a teacher or a class does not grant its related students. A list of them returns student records, so read it in a repository `@Owned` by that module's token, as `ParentChildrenRepository` is by `Student`. Until row 28, a teacher who reached a parent through one pupil saw the pupil's siblings, addresses and medical notes included.
19. **A route that gathers other modules' data needs their permissions.** School-wide roles read every owned row, so a route with only `@isAuth()` gives a librarian or a driver everything ownership allows. The MCP tool list shows every tool to every signed-in user, and the in-app assistant calls them; only a route's guards refuse. Until row 29 the profile routes did this with grades, attendance and fees. Give such a route what the data's own module asks for on its routes (`@Can('read:grades')`, `@isFinancial()`, `@isAdmin()`), as the profile controllers now do.
20. **`.partial()` keeps Zod defaults.** An update DTO built as `createDto.partial()` fills every default the request leaves out, and `@Body()` receives the parsed result. A `PUT` naming one field then resets the others: Settings reset the time zone, currency and switches, and refused every save of a school whose year starts in another month; Staff set a departed member back to `active` and an hourly one to `monthly`. Give the update schema no defaults (`.extend({ field: enum.optional() })`), and let the service fill a create's defaults. A form schema has the same fault when it has a default and no input for a field: it submits the default on every save.
21. **Replacing a relationship erases its history.** A "delete them all and insert the request" update wipes every year's rows and recreates them as current. Keep ended rows; match the request against current ones; end the rest on the business day. Staff assignments and a driver's vehicle do this since row 33.
22. **Check what a plugin mounts, not what its options say.** Before najm-core 3.0 the router mounted every `@Controller` class that had been imported, whatever the plugin's options said: najm-storage's studio answered with no guard although School sets `studio: false`. The storage plugin also gave all its routes one set of `guards`, so deleting any stored file asked only for sign-in, and its MCP tools had none. Since 2026-09-29 only controllers that `.load()` or a plugin declares are mounted, and School gives storage management `manageGuards: [isAdmin()]` with `mcp: false`. After any Najm upgrade, run `test:security:transport`: it sorts every mounted route by the guards that actually run, and fails on one that is open or behind sign-in alone and not on its reviewed lists. When you add such a route on purpose, review it and add it there.
23. **`toISOString()` into `timestamp without time zone` loses the zone.** PostgreSQL drops the `Z` and keeps UTC wall time, and `new Date('2026-09-29 17:46:05')` reads it back as the server's local time, while `defaultNow()` columns hold local wall time. In Morocco (UTC+1) such a deadline lands an hour early. najm-auth 4.2.1 does this with the refresh grace deadline (`tokens.previous_valid_until`), so its 120-second window never opens: two refreshes presenting the same token revoke the session. Two tabs reloading together did this on 2026-09-29, and so can Chrome's session restore; the login lockout ended early the same way. najm-auth 4.2.2 reads such values as UTC. In School code, compare such times in SQL or store `timestamptz`. The same afternoon three tabs whose refreshes fired together still revoked the session: 4.2.2 allowed one reuse, and the client answered a lost race with `/auth/logout` carrying the winner's cookie. najm-auth 4.2.3, pinned here, serves every reuse inside the window with the same successor token; `ConcurrentRefreshTransport.test.ts` in `test:security:transport` pins it over PostgreSQL.
24. **A session that dies on an open page must reach sign-in.** Only a server navigation checks the session. Until 2026-09-29 a failed refresh left the shell up with the teacher's sidebar, no year selector and every read answering 401, and the dashboard cards said "No data available". `shared/useSessionExpiryRedirect.ts` now sends the user to sign in on najm-auth's `sessionExpired`; keep it in the shell, and show failed reads as errors.
25. **Keep one database pool per process.** Next's dev server evaluates `packages/server/src/database/db.ts` again on hot reload and in each module graph. A pool made per evaluation is never closed, and on 2026-09-29 the dev server held 99 of PostgreSQL's 100 connections, so every test and script got `too many clients`. `db.ts` keeps its pool on `globalThis`; any other long-lived client in server code must do the same.

### 0.6 `academicYear` declared by MCP tools today

A scan of every MCP tool on 2026-09-27, updated 2026-09-28: `classes`, `class-routines`, `sections`, `exams`, `fees`, `payments`, `finance-dashboard` and `parents` are now registered, and `YearScopedModules.test.ts` confirms none of their tools declares `academicYear`. `students` is registered too; its `getStudent` and `getStudents` keep their query `academicYear`, which the hook reuses as the MCP selection, as it does for fee write bodies (`schoolMcpYearHooks`). Before a controller is registered, remove its **query** declarations. Rows marked **body** are record data, not a year selection. Decide each with the owner before registering: either the record takes the selected year, as Alerts and Announcements creates do, or the field is kept under another name. Do not rename a public field without the owner.

Still declared by unregistered groups: none. `teachers` is registered, and its `getStudents` no longer declares `academicYear` (checked 2026-09-29).

REST-only routes are not in this scan. They cannot stop the server, but they should still lose their `year` parameters when their module is converted.

### 0.7 Tests for one module

- **Safe suite (`bun run test`).**
  - Update `tests/ownership/OwnershipPolicy.test.ts` for new or changed rules, and add an entry to `OwnedRepositoryReads.test.ts` for each owned read.
  - Put the module's year tests in `tests/academicYears/`.
  - `YearScopedModules.test.ts` must pass.
- **Fixture.**
  - Add the module's cases to `tests/academicYears/fixtures/alertsHistoryManifest.ts`. Despite its name, it is the shared manifest. Keep exactly ten students.
  - Add a guarded, idempotent seed stage `seed<Module>HistoryCases.ts`, modelled on `seedAnnouncementsHistoryCases.ts`: it checks the database name, marker and student count, and grants the permissions it needs.
  - Add root scripts `seed:history:<module>`, `test:history:<module>:db` and `test:history:<module>:transport`.
- **Database suite** (`tests/acceptance/<Module>HistoryDatabase.test.ts`).
  - Assert exact ids per year for list, detail, counts and filters; other years' ids are absent.
  - Cover restricted roles through `inYear(..., actor)`, including an unknown role that sees nothing.
  - Run writes inside a transaction that is rolled back.
- **Transport suite** (`tests/acceptance/<Module>HistoryTransport.test.ts`).
  - Boot the real server, then cover:
    - the admin in a past year and in the default year;
    - a role without the permission;
    - an invalid year, and a header/query conflict (400);
    - cross-year ids (404);
    - one MCP call with the year in the header and one with it as tool input.
  - Delete anything created, in `finally`.
- **Prove the test catches the bug.** Temporarily undo the fix, watch the assertion fail, then restore the fix.
- **Commands** (fixture commands need the env file):

  ```text
  bun run test:academic-years && bun run test:ownership
  bun --env-file=apps/dashboard/.env.local run seed:history:<module>     # run twice; must be idempotent
  bun --env-file=apps/dashboard/.env.local test packages/server/tests/acceptance/<Module>HistoryDatabase.test.ts
  bun --env-file=apps/dashboard/.env.local test packages/server/tests/acceptance/<Module>HistoryTransport.test.ts
  bun run lint && bun run typecheck && bun run test && bun run build
  bun run i18n:check        # when locales changed
  bun run db:check          # when the schema changed
  ```

  When a shared piece changes (`auth.ts`, `requestYear.ts`, `yearScope.ts`, fixtures), re-run the Alerts and Announcements acceptance suites too.

### 0.8 Finishing a module

Fill in the evidence checklist in section 9.2, update the module's row in section 9.3, and add an entry at the top of `docs/tests/academic-year-history.md` with commands and pass counts, no secrets. Then stop for the owner's review, unless the owner has said to continue.

## 1. Accepted target

Use one selector, one remembered viewing preference, one shared request mechanism, one `@Year()` decorator, and ordinary repository methods with year filters.

- Remove `ACADEMIC_YEAR_HISTORY_ENABLED` and runtime branches when the complete refactor is ready. Keep the year selector; remove the enable/disable feature switch.
- Every normal year-dependent read uses a validated year. Missing selection means active year for all roles, including administrators; it never means all years.
- The shared HTTP layer automatically supplies `X-Academic-Year`. Features stop repeating `?academicYear=` and duplicate `get...ForYearApi` helpers.
- `@Year()` on a repository property reads the validated year from Najm's existing request ALS store through a dynamic getter. A validator or service may also read it when a business rule needs the calendar or status. The decorator only installs a getter; it never wraps methods or resolves request input. `AcademicYearValidator` owns resolution/access checks; `AcademicYearService` keeps lifecycle operations.
- Controllers, services and validators call ordinary repository methods without forwarding `this.year.id`. Each scoped repository uses its own `@Year()` getter in explicit SQL predicates and stamps the selected year on ordinary creates. Consolidate `getAll()` and `getAllForYear()` where they represent the same list. Explicit source/target years remain for trusted source operations and cross-year workflows.
- Register each migrated controller/tool group once in `config/yearScope.ts`, along with every controller that reaches a migrated repository through another module's service. REST middleware resolves the year after guards and DTO validation and holds the ALS scope through the awaited controller. Najm's MCP invocation hook applies the same rules per tool call. No extra year argument or decorator is needed on each handler or service method.
- Reuse the existing ALS store; do not introduce another store, a global selected year, constructor-captured year, or container lookups in domain services.
- Implement, visually review and test one module at a time, starting with Alerts. Each module includes real PostgreSQL and authenticated acceptance against the three-year, ten-student fixture in section 9.
- Centralize year-aware cache keys and request binding. Remembering selection is separate from caching response data.
- Apply this to all year-dependent modules while retaining explicit all-year reports and current/shared resources.
- Preserve the same pages, forms, actions, permissions and design language. No archive app, historical-edit toggle, reopening requirement, or age-only approval.

## 2. Current baseline and evidence

Reinspect the working tree before implementation: substantial uncommitted work exists. Preserve unrelated and overlapping edits; do not reset, restore or stage broadly.

| Current source | Refactor consequence |
| --- | --- |
| `AcademicYearValidator.ts` owns selection/access resolution; `AcademicYearService.ts` retains lifecycle operations | Reuse the validator and preserve the combined registry/active-pointer lookup. The registered active ID is authoritative; label fallback applies only when that pointer is absent. |
| `requestYear.ts` supports a getter-only `@Year()` property and the legacy parameter form | Migrated modules use a separate REST scope middleware and MCP invocation hook. Remaining parameter consumers migrate in their own module turn. |
| Record-year helpers and remaining flag-dependent callers are being refactored | Re-inventory current helpers, including `academicRecordYear.ts`, before changing/removing them; earlier filenames and progress are not current proof. |
| `StudentRepository.ts` has annual/daily enrollment-placement reads alongside current-student reads | Reuse historical SQL; consolidate equivalent methods without substituting current class joins. |
| `features/AcademicYears/store/yearSelectionStore.ts` already owns browser selection and shared HTTP defaults | Extend this single owner where needed; audit remaining URL/provider/dual-path callers rather than creating a second store. |
| `services/http.ts` has JSON methods plus multipart fetch and authentication retry | All paths must capture and retain the same request year, including retry. |
| Remaining flag/layout/dialog integration must be checked in the current tree | Remove obsolete branches when covered; retain one context reaching pages and dialogs. |
| Installed Najm/DI has an existing `AlsStore`; normal property injection assigns a resolved value during construction | Reuse the store with a dynamic property getter. Ordinary token injection into a singleton would capture a request value and is insufficient. |
| Published MCP `invokeTool` creates a child scope and supports `invocationScope`/`aroundInvoke` | School clears inherited year state and resolves each migrated tool's own selection after its guards, including batches/direct calls. |
| Administrator `/year-review` endpoints and list-time context-issue notices were removed | Keep them removed. Migration-issue review remains the reconciliation workflow. |

The evidence ledger reports local PostgreSQL migrations/reconciliation, synthetic and dated-demo transitions, partial authenticated REST/MCP checks and source/build checks. Browser acceptance was blocked by unavailable infrastructure; other role/mutation and rollback cases remain open. Those are dated reports, not freshly rerun results or production proof. This rewrite does not claim live revision, database or deployment verification.

## 3. Product and data invariants

### 3.1 Three separate concepts

- **Active year:** Settings owns the school-wide pointer, changed through explicit validated lifecycle operations.
- **Viewing year:** the user's working context; selecting it never moves students, generates fees or changes another user's view.
- **Business date:** existing server clock/time-zone semantics. Viewing the past never changes today's payment date.

Historical views show records belonging to a year with currently known balances/results. They are not arbitrary past database snapshots or accounting balance-as-of-date reports.

Preserve September–June teaching/billing defaults, July 1–14 normal closeout, and per-year explicit reporting intervals, normally September 1–August 31. Authorized later debt settlement remains possible under existing financial rules. Date-only values must not drift through timezone conversion.

### 3.2 Roles and state

Reuse `ACADEMIC_YEAR_HISTORY_ROLES`: admin, principal and accounting may use other years, subject to existing route capabilities. Draft discovery remains admin/principal only; ordinary academic writes in drafts retain preparation restrictions. Closed years allow normal permitted actions without reopening.

Teachers, parents, students and other roles work in the active year only. Explicit other-year requests are refused on the server. Preserve ownership, revoked-link handling and finance/academic permission separation; a selector or header grants no new rights.

Unknown/inaccessible years fail visibly. Valid empty years return scoped empty states, never current-year fallback rows. Permanent identity/contact/catalog fields remain current and shared; label them appropriately.

### 3.3 Historical relationships

- Preserve one enrollment per student/year and dated placements with exclusive `validTo`. Prevent overlapping intervals and class/section/year contradictions with transactional/database protections.
- Annual lists use the latest placement in the year. Dated rosters use both enrollment and placement covering the day; transfers do not double-count annual students.
- Initial admission and yearly enrollment start remain distinct. The enrollment service remains the sole owner of current class/section/status projections. Editing an old enrollment must not alter the active projection.
- Preserve stable IDs and referenced classes, sections, assignments, exams/assessments and grade sources. Audit cascade/null-on-delete behavior; archive or restrict changes that erase history.
- Fee year, payment allocation year and cash date remain distinct. Mixed-year receipts are never wholly counted in each fee year's collections.
- Legacy date fallback selects candidates; it does not prove continuous enrollment or verified attribution. Keep unresolved data in migration review without invented dates.

## 4. Remembered selection and automatic transport

### 4.1 One feature-owned selection

Use the existing feature-owned `yearSelectionStore.ts` as the single browser selection owner. Preserve `useViewingAcademicYear()` as a public facade where useful. State includes initialization, mode (`active` or explicit label), and resolved calendar. It is not another Najm UI/theme/auth provider.

Persistence contract:

1. Scope versioned keys by authenticated user ID and school/tenant identity if applicable.
2. In-memory selection is tab-local. `sessionStorage` restores that tab on reload; `localStorage` remembers the last choice for new tabs/later visits.
3. Restore precedence: authorized explicit entry link, tab preference, remembered preference, active mode. Storage is untrusted; server policy remains authoritative.
4. Choosing the active year stores active mode, not a pinned label. Persist selection metadata only, not protected rows or grants.
5. Do not automatically apply another tab's storage-event selection to an already open tab. Two tabs may display different years safely.
6. Logout/account change clears transient selection, tab state and protected query data before the next account loads. Remembered preferences remain isolated under their own user keys.
7. Hold scoped requests until auth and selection initialization finish. Storage failure falls back to in-memory operation.
8. Discard unauthorized remembered selections on role bootstrap with a visible context reset. Malformed/unknown explicit links fail visibly, without substituting active data.

Remove automatic year decoration from every navigation link. Intentional cross-year links, such as another year's unpaid fees, use one navigation action. Legacy `?academicYear=` links may initialize the owner and then be normalized away; handle back/forward entry links through the same owner. The URL must not remain a competing live source.

### 4.2 Request binding

Canonical scoped HTTP request: `X-Academic-Year: YYYY-YYYY`. The header carries a label; database filters use the registered ID where supported. Normal feature APIs remain `api.get('/students')`, `api.get('/fees')`, etc.

The shared query/HTTP adapter captures an immutable resolved year when an operation is created and uses it for both the cache key and header. A query must not form its key for A and later read mutable selection B when it sends. Refetching an old cached query requests that query's year, not the visible page's year.

Cover JSON GET/POST/PUT/PATCH/DELETE, multipart, token-refresh retries, direct fetches, print/download/export paths and delayed requests. Other filters (`onDate`, class, search, pagination) remain explicit as needed. An internal request-scope argument between shared query and transport helpers is acceptable; feature components do not repeat headers.

Active mode first resolves the active calendar, then sends its concrete label. Activation/refocus/context refresh updates active mode and its keys. A request already in flight retains its captured label. API clients without a header resolve active year on the server. Expose resolved year ID/label through consistent shared response metadata or response headers without changing each controller's payload shape independently.

Year registry, auth, Settings and genuinely shared routes need no selected-year resolution. Do not forward school headers/credentials to arbitrary external URLs. Protected HTTP caching must be private/non-shared; an existing server cache needs authenticated scope, resolved year and filters in its key, or must be disabled on affected routes until verified. URL-only caching is insufficient.

### 4.3 Compatibility and all-year exceptions

- During migration accept the legacy `academicYear` query on routes that already have it. Equal header/query values are allowed; conflict is a validation error before any read/write. Neither silently wins.
- Inventory omitted-year callers. New normal default is active even for admin/accounting; migrate intentional all-year consumers before changing that default.
- Keep explicitly named all-year list/report methods or existing authorized explicit scopes. Missing year and `X-Academic-Year: all` must never grant all-year access.
- Year-owned details validate the ID's membership in the requested year; mismatches use scoped not-found semantics. Permanent identity profiles expose only the requested year's related context.
- Full receipts, per-student explicitly all-year payment history, cross-year debt and shared catalogs retain their scope; a selected-year header must not truncate a legal receipt.
- Remove duplicate frontend year wrappers after migration. Retire legacy query compatibility only after all callers/tools are migrated or intentionally documented as external compatibility clients.

## 5. Backend: @Year(), validator, service and repository

### 5.1 Responsibilities

| Owner | Responsibility |
| --- | --- |
| Controller and existing guards | Route permissions and authenticated actor |
| `config/yearScope.ts` | One registration, keyed by MCP tool group, per migrated controller and per controller that consumes one; used by both REST and MCP |
| Shared request/tool adapter | After authentication, policy and DTO validation, normalize input, await validator, put an immutable resolved year in this operation's existing ALS scope |
| Repository property `@Year()` | Synchronously read that operation's resolved year through a read-only dynamic getter; no resolution or method wrapping |
| `AcademicYearValidator` | Resolve selection/default/record year; validate Settings, registry and existing access policy |
| `AcademicYearService` | Create, verify, activate, close and lifecycle orchestration |
| Domain service/validator | Business rules, record/date consistency and orchestration; use `@Year()` only when the rule itself needs the year; no container/store handling or routine year forwarding |
| Domain repository | Read `this.year` for required year/domain predicates, selected-year create attribution and existing ownership SQL; no headers/storage/preferences or access-policy resolution |

Reuse existing resolution and record-year access checks in the validator without losing `findWithActivePointer()` behavior. It performs no lifecycle writes. Preserve errors: malformed year 400; missing Settings 409; unknown year 404; hidden draft 404; disallowed other year 403. Pin actual HTTP/MCP status mapping, including DTO validation failures.

Store the resolved value only within an authenticated request/tool invocation, bound to its actor and normalized selection. The singleton property must never hold a mutable selected year. Mixed-year allocations require checking each target year; one selected year does not authorize every target. Jobs/seeds receive explicit validated context through trusted entry points.

### 5.2 Prove supported decorator integration first

The getter was first proved on services. The owner subsequently chose repository context to remove repeated service-to-repository year arguments. Alerts and Announcements now use a getter-only injector plus separate REST/MCP boundaries. The earlier parameter decorator alone was insufficient; these are the retained proof requirements:

- Reuse the actual server container's existing `AlsStore` and a dedicated academic-year key. Infrastructure may bind to that store through supported injection; domain services, validators and repositories do not call `Container`, store accessors or static default containers. Do not construct another `AsyncLocalStorage`.
- Auth/route policy and request validation complete before domain execution. Asynchronous year resolution completes before scoped reads or writes. The wrapper surrounds the **awaited handler and nested calls**; a guard that exits its child scope before invoking the handler is insufficient.
- Install a read-only getter that reads the current ALS scope on every access. Do not use ordinary `@Inject(ALS_TOKEN)`, a constructor argument, or an initializer that snapshots the first request. Verify TypeScript property emit does not shadow the getter with an own `undefined` field.
- Keep injection separate from transport resolution. In the installed Najm, guards run at order 40 and validation at 45; the registered REST year middleware runs at 50. It awaits `next()` inside `runWithResolvedYear`. Test this ordering and one resolution per request. MCP uses the published `invocationScope` and `aroundInvoke` hooks; it does not rely on REST middleware.
- The property injector must not replace any method, change synchronous helper returns, or impose a selected year on explicitly shared/source/reset operations. Preserve handler metadata and arity by leaving handlers untouched.
- A missing context fails with an explicit internal/context error. The getter never silently resolves active year, performs asynchronous work, or accepts a client-supplied trusted object. Active fallback happens only at the validated transport boundary.
- Shared/auth/health/settings/catalog routes do not acquire compulsory year resolution. Declare scoped route groups through one supported integration and inventory exceptions; do not replace repeated parameters with repeated manual resolver calls.
- On the same singleton instance, concurrent admin 2025–2026 and principal 2026–2027 operations retain their own years through delayed awaits and nested service/repository calls. Also prove parallel requests from the same account with different headers.
- Each MCP invocation runs in its own child ALS scope, inherits the authenticated actor/permissions, clears inherited selected-year state and resolves its own input. Cover batched, nested and direct invocations; the outer HTTP request/session is not the cache boundary. Preserve scope until invocation completion, including failure.
- Use real boot/container and authenticated REST/MCP paths. Preserve existing parameter decorators such as `@User()`, handler arity, tool schemas and error mapping while removing year parameters.
- Use public supported DI/metadata/context extension points. Do not monkey-patch private injection/resolver internals or manufacture undocumented metadata.

A `@Headers()` alias only extracts text. Najm's published public hooks now support the getter and scoped execution. School consumes exact published versions with overrides/lockfile; the authorized sibling Najm publication was a separate workstream. Do not substitute constructor injection or claim parameter-decorator results alone prove this design.

### 5.3 Target Student flow

Illustrative target, subject to the integration gate; this explains the design, **not the first rollout module**. Retain existing response/MCP decorators and query validation:

```ts
// StudentController
@Get()
@CanList()
async getStudents() {
  return this.studentService.getAll();
}

// StudentService
export class StudentService {
  async getAll(filters: StudentListFilters = {}) {
    return this.studentRepository.getAll(filters);
  }
}

// StudentRepository
export class StudentRepository {
  @Year()
  private readonly year!: ResolvedAcademicYear;

  async getAll(filters: StudentListFilters = {}) {
    const year = this.year;
    // Existing enrollment/placement SQL; latest placement for annual reads.
    // One WHERE combines year.id, filters and the existing ownership condition.
    // No fallback to students.classId for historical class.
  }
}

type StudentListFilters = {
  studentId?: string;
  classId?: string;
  sectionId?: string;
  onDate?: string;
};
```

The illustrated field syntax must be verified with the project's actual compiler/decorator emit before adoption. The getter returns the complete immutable resolved object, including ID, label, calendar and status. Capture it once at operation entry. `onDate` requires a valid date inside its reporting interval. Share query construction while preserving the distinct annual versus dated placement rule. Do not merge genuinely different report queries just to reduce method count.

```text
Client captures selected year + cache key
  -> HTTP header / MCP academicYear input
  -> authentication + existing permissions + request validation
  -> operation ALS scope -> AcademicYearValidator -> store resolved year
  -> Controller -> Service -> Repository @Year() getter -> explicit year SQL
  -> response + resolved-year metadata -> original captured cache key

Admin request:     scope A -> 2025–2026 -> same singleton service -> 2025–2026 rows
Principal request: scope B -> 2026–2027 -> same singleton service -> 2026–2027 rows
```

The principal example applies only to routes the principal can already access. A selected year never changes route permissions.

Consolidate equivalent `getAllForYear`, `getByIdForYear` and old no-year methods into normal filtered methods. Audit internal callers, jobs, seeds and uniqueness lookups: identity uniqueness must not become year-scoped accidentally. Keep real all-year operations explicitly named. Each domain owns its SQL; do not create a generic repository that guesses all domain year rules.

The migrated examples are `AlertRepository` and `AnnouncementRepository`: normal methods are `getAll()`, `getById(id)`, `update(id, data)` and `deleteAll()`. Services no longer declare a year property just to forward it. `AlertValidator` reads the context to determine shared versus year-owned attribution. `checkDuplicateAlertInScope` deliberately accepts a nullable scope because shared notices and fee-source reminders use it. `createFromFeeSource` validates the fee's persisted year and calls `createFromSourceYear`; trusted seed cleanup uses `clearForSeedReset`. These named exceptions neither infer a year from missing context nor weaken ordinary CRUD filters.

### 5.4 Writes

`@Year()` provides context, not permission or an instruction to rewrite the target's year. Creates validate year against class/section, enrollment and event date. Updates derive authoritative context from the target and validate actor/context compatibility. Cover bulk, nested student/fee creation, imports and MCP.

Capture form year on opening. Switching uses the existing dirty-form convention and resets incompatible drafts. Submitted mutations and retries retain original year, payload and idempotency key; invalidate that year's affected caches after completion even if the user has switched. Activation alone must not forbid an otherwise authorized old-year edit.

Payments keep their actual validated date; selection does not backdate them. Validate each fee/allocation. Completed cash totals use settlement date when present, otherwise payment date; preserve pending/bounced/voided/refund/credit rules and exact decimal arithmetic.

### 5.5 Correcting a student's previous year

Keep the existing Student Edit workflow. Shared identity/contact changes remain shared across years. Year-specific class, section, enrollment status and placement corrections target the selected year's enrollment through `StudentEnrollmentService` and its validator; the student service must not update projection fields directly.

For multiple placements, require the actual enrollment/placement being corrected and validated effective dates. Do not turn a correction into an invented transfer. Enforce non-overlap, class/section/year agreement, one enrollment per student/year, concurrent-edit protection and transactional actor/before/after/reason audit. Check impacts on linked attendance, grades and other dated records. Missing historical enrollment stays unresolved until an explicit justified repair.

Authorized admin/principal corrections in 2024–2025 or 2025–2026 use normal permissions, including closed-year rules, without reopening or an age-only approval. Editing old enrollment must leave the current 2026–2027 projection unchanged. Corrections to the current year maintain the projection through its existing single owner. The Students slice must explicitly remove any blanket DTO/validator rejection that prevents these legitimate edits while preserving shared-field and enrollment integrity.

### 5.6 Shared read builders within each module

**Forward requirement; implementation and verification pending.** Apply this pattern during each module's migration, including a focused follow-up for Alerts and Announcements before advancing to Assessments. Earlier passing evidence remains evidence for its reviewed implementation; it does not prove this refactor.

Centralize a module's ordinary read visibility conditions in its existing query builder. Accept additional method filters as arguments, and compose ownership, the domain's year predicate and those filters in exactly one `.where(and(...))`. List/detail methods supply their business filters, ordering and pagination without repeating ownership/year expressions. Keep policy definitions in guards and Najm's `@Owned(...)`; the repository only applies their SQL condition.

Illustrative target for Alerts, retaining its existing selection and joins:

```ts
private readCondition(...filters: (SQL | undefined)[]) {
  return and(
    this.ownedWhere(),
    alertVisibleInYear(this.year.id),
    ...filters,
  );
}

private baseQuery(...filters: (SQL | undefined)[]) {
  return this.db
    .select(this.alertSelect)
    .from(alerts)
    // Retain all existing display joins here.
    .where(this.readCondition(...filters));
}

async getAll() {
  return this.baseQuery().orderBy(desc(alerts.createdAt));
}

async getById(id: string) {
  const [alert] = await this.baseQuery(eq(alerts.id, id)).limit(1);
  return alert;
}

async getCount() {
  const [result] = await this.db.select({ count: count() }).from(alerts)
    .where(this.readCondition());
  return result;
}
```

- Extract `readCondition(...)` when aggregates or other read shapes need the same predicates. Otherwise compose them directly inside the existing builder. Counts, statistics, search, dropdowns and exports use the same visibility rules for equivalent scopes; preserve distinct counting and domain-specific report semantics. A helper that depends on outer joins requires those joins in every consuming query.
- Modules using ownership and year include both. Ownership-only modules include ownership; year-only modules include year. Shared catalogs keep their existing business filters and do not gain compulsory `@Owned(...)` or `@Year()`. Historical predicates must retain enrollment/placement and source-year rules; a universal table-year equality is insufficient.
- Never chain another `.where(...)` after the filtered builder; it can replace the visibility predicate. Pass every extra filter into the builder/helper. Evaluate request-dependent conditions per call, never in singleton field initializers or shared caches.
- Installed Najm `findMany({ where })` / `findOne({ where })` may serve simple owned reads when their projection and return contracts fit; include the relevant year condition in their options. Joined queries keep their module-local builders. Do not introduce a universal base repository, database proxy, automatic query interception or new ownership engine for this refactor.
- Writes retain their own permission, target-year, attribution and bulk-operation rules. Read visibility does not grant write access. In particular, Alerts bulk deletion must continue to exclude shared system rows even though ordinary reads include them.
- Preserve explicitly named all-year, source-year, identity-uniqueness and trusted seed/job operations. Inventory their callers and retain validated context/actor requirements; do not turn missing request context into an ordinary read bypass.

Acceptance for each migrated module: use distinguishable records across actors and years to assert exact list/detail IDs and aggregate counts, including extra business filters. Cover school-wide and restricted roles, unknown-role denial for owned reads, shared-row exceptions, out-of-scope IDs, and concurrent actor/year calls on the same singleton. Verify an extra filter narrows results without losing ownership/year restrictions. Keep authenticated REST/MCP and real PostgreSQL gates from section 9; confirm write and named-exception behavior remains correct. The expected benefit is less repeated code and fewer omitted predicates; claim a SQL performance improvement only with measured evidence.

## 6. Cross-module scope matrix

Expand this into an endpoint/caller inventory covering list/detail variants, counters, profiles, dropdowns, writes, tools, reports and print/export. Record year basis, ownership, all-year exceptions and tests.

| Domain | Required rule |
| --- | --- |
| Students/profile | Enrollment year; latest placement annually, dated placement for rosters. No enrollment returns identity with unknown year-specific class and `enrollment: null`. |
| Classes/Sections | Registered class year; section inherits it. Preserve setup/reference/move constraints. |
| Enrollments | Explicit year and dated placements; transfer/end preserves current projection and audit. Administrator enrollment-history tab can intentionally span years. |
| Attendance | Stored year authoritative, legacy null-year date fallback. Student marking uses dated roster; staff/teacher attendance uses appropriate reporting/assignment context. Preserve mode/correction rules. |
| Assessments/Exams | Stored year or supported date fallback; every target section and assignment must agree. Preserve draft/graded-source restrictions. |
| Grades/report cards | Stored year or date of exactly one valid source. Missing/dual/orphan sources remain unresolved. Preserve source ownership and grading-scale semantics. |
| Fees/Installments | Fee's charged year; retain legitimate fee-only students with unknown historical class. Correct completed allocations/cancellations; explicit unpaid-all-years discovery. |
| Payments/Allocations | Each receipt once per selected fee year, showing `yearAllocatedAmount` alongside full amount. Unallocated credit belongs to no fee year; legal receipts remain full. |
| Routines | Registered schedule year consistent with class/section; preserve assignment/version/publication rules. |
| Parent/Teacher profiles | Child academic/fee tabs follow year under current parent-link access. Timetables follow year; undated assignments remain clearly current. |
| Dashboard/Reports | Enrollment counts, reporting-month attendance, fee-year balances or actual cash-date totals according to metric. Label current teacher/parent counts and calendar; no false today/week metrics in a year not holding today. |
| Print/Exports | Inventory actual surfaces, do not invent routes. Same authorized captured scope and visible year/report basis; full receipts preserved. |
| Transport/Payroll/Expenses/Events/Alerts/BehaviorRewards and adjacent modules | Classify as dated-reporting, explicit all-year or current/shared before modifying. Do not promise historical relationships the model cannot support. |
| Users/Roles/Permissions/Settings/shared catalogs | No automatic selected-year filtering; normal auth/global semantics. |
| Registry/Transitions/Activation/Rollover | Explicit source/target lifecycle context; selector never commands activation, promotion or fee generation. |

Every owned read combines year and ownership in one `.where(and(...))`. A later `.where()` must not replace either predicate. Preserve published Najm ownership integration, profile access gates and teacher-specific write restrictions.

## 7. Frontend caching and interaction

Build one feature-owned scope adapter around supported installed Najm query helpers. Reuse the existing QueryClient and single `NajmAppProvider`; no second global UI/query provider. Inspect `najm-kit/query/crud` public behavior before extending it.

- Keys contain authenticated scope, resource, resolved year, ID and other filters; example `['students', accountScope, 'academicYear', label, filters]`.
- Key and request share the same immutable captured year. Cancellation alone is insufficient: late responses stay under their original keys even if abort is ignored.
- Hold scoped queries during initialization and suppress previous-year placeholder rows/errors beneath a changed heading.
- Reset incompatible class/section/student selections, paging, dates and roster drafts using existing conventions; retain calendar helpers.
- Bind mutations to form scope. Invalidate every affected resource/year, including mixed-year receipts and permanent identity edits; audit existing broad invalidation assumptions.
- Handle activation, role changes, account switch and stale options without leaking cached protected data.
- Replace `useYearAwareList`'s dual request path with one normal scoped path. Remove per-feature flag conditions and year API helper duplication.

Selector/banner, dialogs, prints and forms use one context. Preserve Arabic RTL, mobile and keyboard accessibility; update all four locale catalogs when adding keys.

SSR cannot read browser storage. Initial HTML can render shell/loading; scoped data waits for initialization. Server-rendered scoped calls require explicit validated request context and matching hydration scope, never mutable module-global state or guessed browser preferences. Do not add a cookie selection owner to bypass this constraint.

## 8. REST, MCP, jobs and framework boundaries

- REST/MCP share domain services and validators; preserve tool names, confirmations, permissions and response conventions.
- MCP clients may have no browser header. Keep optional `academicYear` tool input via shared schema/transport handling; normalize into the operation's ALS year with the same default/conflict/access rules. The trusted resolved object is never supplied directly by the model.
- An MCP HTTP request/session can execute multiple tools. Installed `invokeTool` inherits its caller's ALS scope; add a supported invocation wrapper providing a fresh child scope per call. Resolve/cache there, never on the enclosing request/session. Test batching and direct tool invocation against the same singleton services.
- Verify schema generation and decorated parameter indexes; a custom decorator does not automatically create a usable tool argument.
- Jobs/seeds use explicit target years through a trusted scoped runner that validates context and enters the existing ALS store under the proper actor. Intentional active defaults are resolved there, never in the property getter. Cross-year lifecycle methods retain explicit source/target arguments. Update registrations after dependency moves. Repositories never require browser headers.
- Keep browser imports limited to contracts; use declared exports. Preserve `.load(moduleObject)`, the existing auth/session adapters, sidebar state owner, one UI provider and current Next config.

## 9. Sequential implementation and module checklist

**Finish one module, including its tests and real database checks, before starting the next. Alerts is first.** Do not implement several business modules and postpone tests to the end. Preserve dirty work and show a reviewable diff for each slice. The owner's later instruction authorized verification before the final visual review.

### 9.1 Limited prerequisites before Alerts

1. Refresh endpoint/tool/internal-caller inventory, installed package versions, existing failures and scope classifications. Keep the prior inventory as dated evidence; the order below supersedes its Students-first rollout.
2. Implement only the shared infrastructure required by Alerts: supported repository getter, authenticated REST/tool scope boundary, existing validator integration and minimal shared transport/query binding. Write its focused tests. Complete visual review, then prove section 5.2 with real container/transport execution.
3. Prepare the dedicated PostgreSQL fixture and module test harness in section 9.4; review seed code/target, then run migrations and seed only on that explicitly designated disposable database. Record idempotency, migration head and manifest checks.

Academic registry/resolution, auth context and seed infrastructure are necessary dependencies, not an excuse to migrate other business modules first. Existing Students/other-module changes remain preserved and unaccepted for the new design until their turn. If public framework support is missing, report that gate as BLOCKED and resolve the published dependency before rollout.

**Current checkpoint (2026-09-27):** School pins published `najm-mcp@2.2.1` and `najm-api@2.0.6`. Alerts and Announcements now read `@Year()` in repositories, with separate REST middleware and the published MCP hook supplying their operation context. The marked `school_history_test` database is at `0059`, with three years, ten students, seven Alerts and five Announcements. The latest commands and results are in the evidence ledger. School source remains uncommitted; production migration, deployment, owner visual and browser acceptance are open.

**Later the same day:** Alerts and Announcements gained ownership, so each person reads only their own alerts and announcements reach only their audience. The two controllers that read them through other modules (`operations-dashboard`, `parent-profile`) were registered for the year after their routes were found returning empty results. Section 0 is the handoff for the remaining modules.

The former `najm-mcp@2.2.0` hook gap is closed by the published release above. The implementation uses its public `toolInput`, `invocationScope` and `aroundInvoke` options; no private framework patch was needed.

A controller method wrapper was inspected as a School-only alternative before Najm publication. That historical design note explains why the published hook was required; it is no longer a blocked gate.

Najm's published contract: `toolInput(tool)` declares optional selected-year tool input; `invocationScope(tool)` clears the application year in a child ALS scope; `aroundInvoke(context, next)` receives validated input and transport headers **after** guards, then awaits the handler. School's callback calls `AcademicYearValidator.resolveSelection()` with the same conflict rules as REST. `config/yearScope.ts` is the authoritative, growing list of controller tool groups, including academic records, their profile/dashboard consumers and the selected-year finance routes. The Najm direct/HTTP tests and School's real REST/MCP tests passed, including concurrent actor/year isolation; expand registration by module as its turn arrives.

### 9.2 Mandatory cycle for every module

1. **Inspect:** enumerate every endpoint/tool, internal caller, list/detail/count, export, bulk/nested mutation and current/shared/all-year exception. Decide its year basis from actual schema and business rules.
2. **Implement this module:** thin controller; `@Year()` property only where needed; business orchestration in service; reusable domain assertions/errors in validator; DTO validation in `*Dto.ts`; module-local read builders applying year/ownership predicates once, with shared conditions for equivalent aggregate reads (section 5.6). Preserve response contracts, permissions, write rules and named scope exceptions.
3. **Write its tests in the same slice:** targeted unit/contract tests plus real PostgreSQL fixtures and authenticated REST/MCP cases. Add only this module's fixture records to the ten existing students. A genuinely shared module gets tests proving its shared semantics remain unchanged.
4. **Owner visual review:** present implementation, test code, schema changes if any and expected fixture results. Record review as OPEN until the owner approves the specific slice. The owner's 2026-09-27 continuation request allowed work to advance through the finance lane with earlier reviews still open; it did not approve them.
5. **Execute verification:** focused tests first, then that module's real PostgreSQL and authenticated transport cases. Verify actual rows/amounts and nonselected-year data before/after. Run the smallest applicable lint/type/build/locale gates needed for the change. Never substitute mocks for the database gate.
6. **Review UI where affected:** record manual owner/browser acceptance separately. Missing browser infrastructure is BLOCKED/NOT RUN; missing database or transport access blocks that gate. An applicable blocked gate prevents moving on, unless the owner explicitly changes the acceptance scope and the deferred obligation is recorded.
7. **Record and advance:** append commands, revision/diff identity, fixture manifest, expected/actual results, cleanup and outstanding issues to the evidence ledger; update this plan's row. Advance when the current module's required automated/database/transport gates pass and the review checkpoint is satisfied, or when the owner explicitly directs continuation with the open review recorded. Continuation is not acceptance or permission to deploy.

Use this evidence checklist for each module (link its completed entry from the table):

```text
Module:
Scope and endpoint/tool inventory:
Implementation + test files:
Read builder/condition coverage: list, detail, aggregates, other read shapes and named exceptions
Visual review: PENDING / APPROVED (owner, date, reviewed diff)
Focused tests: NOT RUN / PASS / FAIL / BLOCKED
PostgreSQL: database fixture ID, migration head, selected/nonselected assertions
REST / MCP: separate outcomes, role cases, errors, actual writes
UI/manual review: outcome, or justified N/A when no affected surface
Applicable lint/type/build gates: outcome, or justification
Remaining issues / explicit owner-approved deferrals:
Decision: HOLD / READY FOR NEXT MODULE
```

`PASS` means executed successfully. Writing tests, inspecting source or reusing an older evidence entry does not mark a gate passed. Use N/A only for genuinely absent surfaces, with a reason. An implementation-only commit is not completion.

### 9.3 Alphabetical application queue

Order is case-insensitive by module folder, beginning at `alerts`; financial and transport children are expanded alphabetically. **All rows begin PENDING.** Shared modules require inspection/acceptance, not automatic year filtering. Update status and evidence one row at a time.

| # | Module | Focus | Status / evidence |
| --- | --- | --- | --- |
| 01 | `alerts` | First complete slice; type/scope decision, reads, counts, status and bulk writes | IMPLEMENTED (year + ownership + section 5.6 read condition); year/ownership database/REST/MCP and source gates PASS; signed-in alerts inbox page now exists, with teacher/parent/student actions shaped by role; page-specific browser review and owner visual review OPEN |
| 02 | `announcements` | Audience, dates/year basis, visibility and mutations | IMPLEMENTED (year + audience ownership + section 5.6 read condition; dashboard list keyed by year); real database/REST/MCP suites PASS; lint/typecheck/test/build/db:check PASS; owner visual/browser review OPEN |
| 03 | `assessments` | Source/year, assignments, sections and graded-source restrictions | IMPLEMENTED; PostgreSQL 4/4 and REST/MCP 4/4 PASS; dated student/parent and multi-section ownership plus profile consumers PASS; owner visual/browser review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 04 | `attendance` | Dated roster, stored year, corrections and transfer boundaries | IMPLEMENTED; PostgreSQL 2/2 and REST/MCP 5/5 PASS; transfer/correction and dashboard/profile consumers PASS; owner visual/browser review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 05 | `behaviorRewards` | Event/student context and history | IMPLEMENTED (dated: the school-local day of `behaviorAt` in the year's reporting interval, no migration; class/section from that day's placement); PostgreSQL 3/3 and REST/MCP 3/3 PASS; owner visual/browser review OPEN; students read their own rewards and parents their children's (owner decision 2026-09-27). [Evidence](docs/tests/academic-year-history.md) |
| 06 | `classes` | Registered year, references and safe historical edits | IMPLEMENTED: a class belongs to the year label stored on it; repository `@Year()` with one read condition (ownership and year) for list, detail and related reads; students, parents and analytics from the selected year's placements. A new class takes the selected year: the body field is gone and a class never moves between years (owner decision 2026-09-28). Changes stay in the year; trusted seeds name each class's year. Other modules keep the any-year reference lookup. French, Arabic and Spanish error messages added. PostgreSQL 4/4 and REST/MCP 6/6 PASS (shared with 07 and 31); owner visual/browser review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 07 | `classRoutines` | Schedule year, assignments and publication | IMPLEMENTED: a timetable belongs to its stored year label, its section's class year. List, detail, the section's published timetable, the teacher's week and every change are limited to the selected year (404 otherwise). Create takes the selected year and refuses another year's section (409); so does the lesson-assignment list. The teacher dashboard still names the active year for its week. Routine errors reached users as raw keys; they are now translated. Registered as `class-routines`. PostgreSQL and REST/MCP PASS; owner visual/browser review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 08 | `cycles` | Establish shared catalog semantics and consumers | VERIFIED SHARED CATALOG: every year reads the same cycles; no year scope or registration, and no MCP year input. Deleting a cycle that any year's class or an accountant assignment uses is now refused (409, deactivate instead); it used to unlink every year's classes, or fail with a 500 on the assignment. Errors were hard-coded English; now translated in four locales. REST/MCP 4/4 PASS (shared with 36); owner review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 09 | `dashboard` | Every submodule/metric with documented academic or financial basis | IMPLEMENTED: every metric has a documented basis (ledger inventory). Student counts are the selected year's enrollments; teacher and parent counts are current. Fee figures use the selected fee year and completed allocations, with cancelled installments left out; cash uses the year's reporting dates. "Today", "this week" and "this month" figures come only for the year that holds the business day, and are `null` for any other year. The four school dashboards read `@Year()` with no year parameters; `finance-dashboard` is newly registered and its `academicYear` query declarations are gone. The teacher dashboard stays on the active year. Fixes: principal and accounting finance cards showed 0 students and 0 teachers; the collection rate counted cancelled installments; finance cash-out counted rejected and cancelled expenses; academic KPIs were open to any signed-in user (now staff); failures read as zero; Events "today" used the UTC date. PostgreSQL 3/3 and REST/MCP 3/3 PASS; owner visual/browser review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 10 | `discipline` | Event dates, student context and corrections | IMPLEMENTED (dated like Behavior rewards: the school-local day of `incidentAt` in the year's reporting interval, no migration; class/section from that day's placement through the shared `studentPlacementOn`); ownership 2026-09-27 (teachers what they reported, students their own, parents their children's); PostgreSQL 3/3 + ownership 1/1 and REST/MCP 3/3 PASS; owner visual/browser review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 11 | `events` | Calendar/reporting scope and shared exceptions | IMPLEMENTED: an event belongs to every year whose reporting interval its dates overlap (the shared exception: one spanning the boundary shows in both), no migration; repository `@Year()` with one read condition, writes inside the year, creates and date changes must overlap the selected year (409). Security fix: ten read routes answered without sign-in; every route now needs sign-in and a permission, participant reads need `manage:participants`. New audience ownership from `visibility`; teacher, parent and student gained `read:events`. PostgreSQL 3/3 and REST/MCP 4/4 PASS; owner visual/browser review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 12 | `exams` | Registered year, sections and grade source integrity | IMPLEMENTED (stored year, else the date in the reporting interval, as Assessments; repository `@Year()` and one read condition; create stamps the selected year and refuses other years' sections with 409; students and parents by placement on the exam date through the shared `placedOnSourceDate`); PostgreSQL 3/3 and REST/MCP 4/4 PASS, including the student profile's own assessments and upcoming exams (2026-09-28); owner visual/browser review OPEN; grading already checks placement on the source date. [Evidence](docs/tests/academic-year-history.md) |
| 13 | `financial/allocations` | Target fee years, partial amounts and atomic writes | IMPLEMENTED: allocation API reads and deletes use the selected target-fee year; payment/credit internals retain all-year receipt access; direct credit-backed allocation deletion returns 409. PostgreSQL 1/1 and authenticated REST/MCP 3/3 PASS, including normal mixed-year payment write; owner source review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 14 | `financial/auditLog` | Audit access/retention; no history hidden by accidental filtering | VERIFIED SHARED ALL-YEAR: admin-only, append-only list/detail stay independent of selected year; PostgreSQL 1/1 and authenticated REST/MCP 2/2 PASS; owner UI review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 15 | `financial/credits` | Unallocated balances and explicit cross-year use | IMPLEMENTED: credit lots remain shared; applying credit targets only installments charged to the selected year, while source receipt keeps its date; direct deletion of credit-backed allocations is refused. PostgreSQL 1/1 and authenticated REST/MCP 1/1 PASS; owner UI review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 16 | `financial/expenses` | Business-date reporting and corrections | IMPLEMENTED: the selected year's reporting interval filters expense lists/details, pending reads, counts and summaries by `expenseDate`; create/date corrections must stay in that interval, while `paymentDate` retains the actual cash date. Invoice/receipt/check uniqueness and seed reset stay all-year. The expense UI keys reads by year and captures the opened form's year for writes; demo seeding enters its seed year. PostgreSQL 1/1 and authenticated REST/MCP 1/1 PASS; source/type/lint/build gates PASS; owner UI/browser review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 17 | `financial/fees` | Charged year, fee-only students and closed-year debt | IMPLEMENTED: repository/service normal reads and writes use the selected charged year; fee-only students remain visible with unknown historical class; explicit all-year debt and internal source-fee paths remain. Completed allocations drive annual and all-year balances even when the receipt date is later. Fees nested in student creation use the resolved enrollment year. Fee write bodies retain `academicYear`; in MCP that field also selects the year, while REST rejects a body/header mismatch. PostgreSQL 1/1 and authenticated REST/MCP 1/1 PASS; source/type/lint/build gates PASS; owner UI/browser review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 18 | `financial/feeTypes` | Shared catalog and global constraints | VERIFIED SHARED ALL-YEAR: the catalog has no `@Year()` scope; identity, count, status/category reads and mutations are global, and the service rejects duplicate names across selected years. PostgreSQL 1/1 and authenticated REST/MCP 1/1 PASS; test typecheck/lint PASS. Names are unique ignoring case and surrounding spaces, in the service and in migration `0061` (`fee_types_name_normalized_unique`, 2026-09-30); racing creates of one name give one row and 409s, proven on the fixture. Owner UI review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 19 | `financial/installments` | Fee year, cancellation and schedule integrity | IMPLEMENTED: ordinary list/detail/status/stats and writes use the fee's selected charged year; trusted payment/allocation/recalculation paths retain explicit all-year access. Public writes cannot change payment state or edit/delete an allocated installment, and a recalculation retains cancelled status. The dashboard hook keys reads by year and captures mutation year. PostgreSQL 1/1 and authenticated REST/MCP 1/1 PASS; type/lint checks PASS; owner UI/browser review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 20 | `financial/notifications` | Debt scope and notification behavior | VERIFIED OPERATIONAL ALL-YEAR: overdue cron groups debt by the fee's charged year and emits a source-year alert; cancelled installments are excluded. Check groups with no single source year retain personal delivery but have no academic alert. Admin delivery history is shared; cron jobs remain all-year so old debt can be reminded. PostgreSQL 1/1 and authenticated admin/cron REST 1/1 PASS; test typecheck PASS; owner review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 21 | `financial/payments` | Mixed receipts, cash basis, status and exact decimals | IMPLEMENTED: the normal receipt list uses repository year context and returns each mixed receipt once with its exact allocated portion for selected fee year. Fee-specific receipt history now has a matching route and year guard. Revenue uses selected fee year; monthly cash reporting retains actual settlement/payment date. Receipt detail, student history and check/status/void/refund operations remain shared across years. PostgreSQL 1/1 and authenticated REST/MCP 1/1 PASS; academic-year 258/258, type/lint checks PASS; owner UI/browser review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 22 | `financial/payroll` | Period/assignment reporting and shared exceptions | IMPLEMENTED: payslips belong to the registered year containing the first day of `period`; list/detail/staff/period/summary and SQL mutations use that year, while payment date stays the actual cash date. Create, run and unpay reject an out-of-year period. The payroll view offers that year's periods, keys data by year plus period, and keeps historical payslip snapshots visible when staff are no longer active. PostgreSQL 1/1 and authenticated REST/MCP 1/1 PASS; academic-year 258/258 and server/dashboard typechecks PASS; owner UI/browser review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 23 | `financial/rollover` | Explicit source/target, preview, idempotency and rollback | IMPLEMENTED: source roster/class filter uses source-year enrollment and placement; target must be the selected registered year and students need active target enrollment. Target enrollment date drives proposed fee effective date. Preview/commit remain explicit, idempotent and separate from year activation; the UI sends target-year context. A committed fee can be retried without duplication; a post-preview duplicate yields a failed item/run and stable retry. PostgreSQL 1/1 and authenticated REST/MCP 2/2 PASS; test typecheck/lint PASS. Commit is one transaction under a per-target-year advisory lock, each fee in its own savepoint (2026-09-30): two racing commits of one preview write it once, and a mid-write database failure rolls the whole run back to previewed and a retry bills it once; both proven on the fixture and shown to fail on the previous code. [Evidence](docs/tests/academic-year-history.md) |
| 24 | `financial/utils` | Supporting calculations/callers; no invented CRUD endpoints | VERIFIED/IMPLEMENTED: fee, installment and rollover callers pass explicit charged/target years into September-June calculations. An invalid explicit year now fails rather than falling back to the current year; consecutive labels are required. Utility tests pin two historical ranges, ten monthly installments, exact minor-unit totals, July closeout outside the billable interval and invalid labels. No API or schema change. Focused tests 3/3, configured test suite, workspace typechecks, lint and production build PASS; owner review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 25 | `grades` | Valid source year, teacher ownership and historical correction | IMPLEMENTED (stored year, else the source's date: repository `@Year()` and one read condition for lists, filters, detail, by-source reads and count; update, delete, bulk and admin delete-all inside the year, `clearForSeedReset` for resets; a new grade's source year must be the selected one, 409 `outsideSelectedYear`). Teachers now read the grades of their own sources and of students placed in a section they teach on the source date, not by the current `students.section_id`. PostgreSQL 3/3 and REST/MCP 3/3 PASS; owner visual/browser review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 26 | `health` | Verify actual route/model scope; shared infrastructure stays shared | VERIFIED SHARED INFRASTRUCTURE: public `/health`, `/health/ping` and `/health/status` contain no academic data, stay outside `yearScopedModules`, and return the same results with omitted, historical, invalid and conflicting year selections. Readiness checks actual fixture PostgreSQL and cache; its independent failure outcomes are covered. No MCP tools, schema or production code changes. Fixture-backed REST 2/2 PASS, test typecheck and lint PASS; owner review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 27 | `notifications` | Recipient/ownership, history and current/shared delivery state | VERIFIED SHARED ALL-YEAR: a personal inbox keyed by recipient, with no year of its own; the source (a financial reminder, row 20) carries the year. REST-only, no MCP tools, not registered for the year; the dashboard keys it without a year. REST 2/2 PASS (same inbox and count under every year; only the recipient marks read); no code change. Owner UI review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 28 | `parents` | Shared identity, current links and selected-year child context | IMPLEMENTED: a parent's record, list, search, CIN/phone lookups and count are shared identity, the same in every year; links are current (no dated history). `/parents/:id/children` lists each linked child with the selected year's latest placement and enrollment, or none when not enrolled that year, through the new `ParentChildrenRepository` (`@Year()`). `parents` is registered and the `academicYear` query is gone. Ownership fix: the children lists are student records under the Student rules, so a teacher who reaches a parent through one pupil no longer sees the pupil's siblings (the open item from the 2026-09-26 ownership review). `DELETE /parents` now refuses while any parent is linked (409 `someLinked`); it used to cascade away every year's links, and the seed and demo resets use `clearForSeedReset`. French, Arabic and Spanish lacked every `parents.errors` and `students.errors` message, and English lacked three; all four locales now have them. PostgreSQL 3/3 and REST/MCP 4/4 PASS; owner visual/browser review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 29 | `profiles` | Shared identity plus explicitly scoped related data | IMPLEMENTED: the student, parent and teacher profiles show shared identity with the selected year's related data. A parent's fees due are the one named all-year tab (cross-year debt). No profile route takes a year parameter; the student and teacher profile services read `@Year()` and pass it to Students and Teachers until rows 35 and 37. Access fix: every profile route answered any signed-in user, and school-wide roles read every row, so a librarian or a driver could read any student's grades, attendance and fees, also through the assistant. Each route now asks for what its data's own module asks for: `read:students`, `read:grades`, `read:attendance`, `read:alerts`, `read:events` or `read:teachers`, the finance roles for fees, and admin for transport. Families and teachers no longer read fees or routes there, which their dashboard never showed. Other fixes: the teacher's classes and today's schedule listed every year's assignments; "today" used the UTC date and gave an empty list in other years (now `null`); a parent's upcoming events let in other classes' events and staff or private ones (now the events' own parent rule, through the new `EventRepository.getUpcomingForParent`); fee, route and event errors read as empty; no attendance marks read as 0%. Exams' upcoming list for a student now counts from the business date. PostgreSQL 2/2 and REST/MCP 6/6 PASS; undoing the fixes to watch the tests fail was NOT RUN (the session's permission check refused the edit); owner review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 30 | `search` | Year/ownership consistency across result types | IMPLEMENTED SHARED IDENTITY SEARCH: student, teacher and parent queries return shared identity results across years, with each entity's existing ownership condition in the same WHERE as its term. Typed routes require the matching read permission; global search requires all three read permissions. Search stays outside `yearScopedModules`. SQL ownership 3/3 and fixture-backed authenticated REST/MCP 2/2 PASS, including a disposable limited actor, admin historical/invalid/conflicting year requests and cleanup. Configured tests, typechecks, lint and production build PASS; owner review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 31 | `sections` | Parent class year, references and placement integrity | IMPLEMENTED: a section belongs to its class's year; list, detail, students, parents and analytics in the selected year from that year's placements. Create or move only into a class of the selected year (409). Delete refuses a section that ever held a placement; a past section used to fail with a 500 on the placement foreign key. Other modules keep the any-year reference lookup. PostgreSQL and REST/MCP PASS; owner visual/browser review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 32 | `settings` | Shared settings; active pointer only through lifecycle | VERIFIED SHARED, FIXED: one settings row, the same under every selected year, not in `yearScope`. The active year is the newest row's pointer, so `POST /settings` (admin or principal, MCP `settings_create`) switched the active year and registered an open one without activation; it now answers 409 once settings exist. The update DTO was `create.partial()` with defaults, so an update naming one field reset time zone, currency, language and every switch; it now changes only named fields. The dashboard showed the active year as a choice the server always refused, and its schema submitted `startMonth`/`endMonth` and maintenance fields it never shows; the year is now read-only with a note, and those fields are not sent. `settings.errors` added to `ar`/`es`; unused reads and validators removed. Unit 6, PostgreSQL 3/3 and REST/MCP 4/4 PASS; owner visual review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 33 | `staff` | Shared identity; classify dated relationships | IMPLEMENTED: staff identity and employment dates are shared (not in `yearScope`); every year's role assignments come with their dates and a `current` flag for the business day; payslips, attendance and duties stay with their modules. An update deleted every year's assignments and inserted the request again; a driver's save deleted every year's vehicle assignments and re-created them active from today. Now ended rows are kept, current ones are matched or ended on the business day, and a driver's new vehicle goes through `VehicleAssignmentService.assignDriverFromToday`. A role change ends the old role's assignments; a driver with vehicle history keeps the role (409). Partial updates no longer reset status or compensation mode; an assignment-only update no longer fails with 500. Deleting staff with payslips, attendance or duties, or a zone that any assignment names, answers 409 instead of a foreign-key 500. The attendance roster uses the business date. Unit 7, PostgreSQL 3/3 and REST/MCP 7/7 PASS; Follow-up 2026-09-30: Staff creation now uses the locked vehicle-assignment validator instead of a raw insert, refuses an occupied vehicle and rolls back the new identity (REST/MCP 8/8 PASS, 55 assertions). Owner review OPEN, including the driver role-change rule. [Evidence](docs/tests/academic-year-history.md) |
| 34 | `studentEnrollments` | Dated placement, corrections, audit and projection ownership | IMPLEMENTED: ordinary detail and mutations use the selected year; trusted transition/seed/financial lookups retain explicit years. Identified placement corrections validate the complete original state under a row lock, write actor/before/after/reason audit in the same transaction, and reject attendance/grade conflicts. Only active-year changes update the projection. Migration `0060` validates final enrollment/placement intervals transactionally while retaining identity, year, non-overlap and reference protections. Fixture PostgreSQL 4/4 and authenticated REST 4/4 PASS; owner visual/browser review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 35 | `students` | Shared identity and same-form historical corrections, section 5.5 | IMPLEMENTED: annual/daily lists and aggregates read repository `@Year()` with no forwarded year; identity remains shared, with null year context when unenrolled. Enrollment status and the actual latest/dated placement come from the selected year; teacher ownership follows that placement. Student Edit submits a chosen placement, validated dates/status, immutable original state and reason to StudentEnrollmentService through the normal student update transaction. Shared identity fields stay shared; historic corrections preserve the active projection. Forms retain their opening year and reads use year-specific cache keys. Fixture PostgreSQL 5/5 and authenticated REST/MCP 5/5 PASS; owner visual/browser review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 36 | `subjects` | Shared catalog/assignment distinction and grade references | VERIFIED SHARED CATALOG: every year reads the same subjects; year history lives in teacher assignments, not the catalog. Deleting a subject that any year's teacher assignment or alert uses is now refused (409); it used to cascade away every year's assignments, or fail with a 500 on their lessons, exams and attendance. Delete-all is refused while any is in use; the seed reset has a named method. French, Arabic and Spanish errors added. REST/MCP 4/4 PASS; owner review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 37 | `teachers` | Shared identity, assignment years and ownership | SOURCE/LOCAL FIXTURE PASS; OWNER REVIEW OPEN. Teacher identity stays shared; assignment summaries, classes and placed students now use repository `@Year()` from the assignment class, and the profile uses that same read. Normal assignment changes refuse another year's class or row. Normal teacher deletion refuses any assignment history; the trusted seed reset has a named cleanup method. Teacher lists, detail and profile classes use year-specific client reads. Fixture PostgreSQL 2/2 and authenticated REST/MCP 4/4 PASS; source tests, lint, typechecks, i18n and build PASS. Teachers hold `read:assessments` and `read:exams` since 2026-09-30 (seed and demo database). [Evidence](docs/tests/academic-year-history.md) |
| 38 | `transport/drivers` | Shared identity and assignment history | VERIFIED SHARED IDENTITY: driver license and Staff identity remain accessible across selected years; status and license-expiry views retain present-time meaning. Driver mutations through this controller remain retired with 410; Staff owns writes. Dated vehicle assignments are row 42. No year scope, schema or production change. Fixture PostgreSQL and authenticated admin REST/MCP 2/2 PASS with two temporary staff/drivers, historic/invalid year headers, retired delete refusal and cleanup; test typecheck and focused lint PASS; owner review OPEN. [Evidence](docs/tests/academic-year-history.md) |
| 39 | `transport/maintenance` | Dated reporting and vehicle references | SOURCE/LOCAL TRANSPORT PASS; OWNER REVIEW OPEN. Planned jobs use `scheduledDate`; completed jobs use school-local `completedAt` (legacy completed rows without it fall back to scheduled date). Undated mileage-only open jobs are shared operational work. Normal list/detail/count/analytics and mutations use the selected year; live mileage alerts, duplicate checks, and mark-overdue inspect all years. Seed reset has a named all-year method. Past-year scheduling corrections are allowed within the selected interval. Fixture PostgreSQL plus authenticated REST/MCP 2/2 PASS, 37 assertions; test typecheck and focused lint PASS. [Evidence](docs/tests/academic-year-history.md) |
| 40 | `transport/refuels` | Dated reporting, amounts and vehicle references | SOURCE/LOCAL TRANSPORT PASS; OWNER REVIEW OPEN. `datetime` belongs to the selected reporting year by school-local day. List/detail/filter/count/aggregates/reports and normal mutations are scoped; create and datetime edit reject another year. Voucher uniqueness checks all years. The 90-day fuel-needs prediction remains an explicit live operational calculation. Seed reset has a named all-year method and demo seed resolves its year. PostgreSQL and authenticated REST/MCP 2/2 PASS, 30 assertions; server test typecheck PASS. [Evidence](docs/tests/academic-year-history.md) |
| 41 | `transport/studentRoutes` | Enrollment/route year and historical corrections | SOURCE/LOCAL TRANSPORT PASS; OWNER POLICY AND BROWSER REVIEW OPEN. Continuous dated intervals overlap each selected reporting year; `unassignmentDate` is exclusive. List/detail/student history/count and ordinary writes use the interval. Global live capacity and active-route checks use the business day; all-year overlap validation prevents double assignment. Reassignment closes the old row and inserts a new row without replacing history. Create checks selected-year date plus student enrollment and placement. Selected-year transport fee create/end/resume cannot change another year's fee; explicit dated unassignment supports correction. Seed reset has a named all-year method; the UI keys routes and write context by year. Initial fixture PostgreSQL and authenticated REST/MCP 2/2 PASS, 37 assertions; follow-up 2026-09-30: 6/6 PASS, 52 assertions. A transaction locks the student before interval checks; replacement/end reread the route after waiting. Concurrent completed/active assignments, replacements, ends, once-only billing resumption, billing-failure rollback and the last live seat are covered; full test, typecheck, lint and isolated production build PASS. No schema migration. [Evidence](docs/tests/academic-year-history.md) |
| 42 | `transport/vehicleAssignments` | Dated assignment intervals and ownership | SOURCE/LOCAL TRANSPORT PASS; OWNER POLICY AND BROWSER REVIEW OPEN. Continuous dated intervals overlap each selected reporting year for normal list/detail/vehicle/driver/count and writes. Present-day active lookup and shared vehicle driver stay business-day based; reassignment closes the old row and inserts a new row. Create/edit check interval, status and vehicle overlap. Vehicle creation derives an optional assignment's year from its date, leaving vehicle identity shared. Staff driver deletion and seed reset use named all-year paths. Assignment routes now require admin. Initial fixture PostgreSQL and authenticated REST/MCP 2/2 PASS, 30 assertions; follow-up 2026-09-30: 6/6 PASS, 38 assertions. A transaction advisory lock serializes creates, edits, ends and replacements across vehicles, including Staff writes; racing creates/edits/replacements and replacement-failure rollback are covered; full test, typecheck, lint and isolated production build PASS. No schema migration. The live registered-year API audit passes: 24 unique driver intervals, no overlaps, invalid intervals or status/date mismatches, with REST/MCP agreement and active-year defaults verified. Concurrent overlap checks are fixture-proven; rows outside every registered reporting interval were not audited. [Evidence](docs/tests/academic-year-history.md) |
| 43 | `transport/vehicles` | Shared vehicle identity and historical references | VERIFIED SHARED IDENTITY: vehicle identifiers, plates, purchase date, status and current mileage remain shared across selected years; current driver assignment is a present-time computed field. Row 42 now makes that computed driver date-aware and resolves a vehicle-create driver assignment from its own date. No vehicle year scope or schema migration. Original shared-identity fixture PostgreSQL and authenticated admin REST/MCP 2/2 PASS, 29 assertions; row 42's transport test covers the current-driver and create side effects. Owner/browser review remains OPEN. [Evidence](docs/tests/academic-year-history.md) |

Audit every folder against this queue before coding. Supporting modules `academicSources`, `academicYearMigrationIssues`, `academicYears`, `academicYearTransitions`, `accessReset`, `auth-tools` and `seed-data` belong to the prerequisite/support inventory and final lifecycle/security/reconciliation acceptance; their relevant tests accompany any dependency change. They are not silently excluded or permission to start several business slices. Audit module-root handlers as well as listed children. Add newly discovered business modules in their alphabetical position.

Earlier slices may use existing later-module APIs and baseline fixtures. If a dependency must change to finish the current slice, keep that change minimal, test the affected contract now and record it; leave the dependent module's broader migration for its own turn. A dependency cannot justify postponing the current module's database gate.

#### Alerts first: exact acceptance scope

**Superseded on 2026-09-27 by ownership:** Alert routes are no longer admin-only. `AlertController` uses `@Policy(Alert)` with `@Can*` permissions, and `AlertGuards.ts` limits reads per person. Teachers set any status on alerts about their students or addressed to them; parents and students may only acknowledge alerts about themselves or their child. Class-wide and school-wide notices, content edits and bulk operations stay with staff. The paragraph and bullets below record the original slice.

**Original year-only implementation checkpoint, superseded by the ownership update above:** `AlertController` originally retained admin-only REST/MCP routes and unchanged permissions. The transport boundary resolves the year; `AlertRepository` reads `@Year()` for list/detail/count/write predicates. `AlertService` forwards ordinary arguments, and the validator handles shared/source attribution. The new nullable `alerts.academic_year_id` has a foreign key and index in `0058`; unresolved legacy year-owned rows remain hidden. Shared system and untargeted emergency rows appear in each selected-year list/count. Selected-year `deleteAll` and `deleteResolved` affect only year-owned rows; a separately named repository reset clears all years for trusted seed cleanup. Two generator endpoints remain no-op placeholders, as before.

**Attribution policy:** academic, attendance, behavioral, health, announcement and ordinary reminder Alerts belong to the selected registered year, even when audience is `all`. A system notice is shared and cannot carry academic references (400); an emergency is shared only without academic targets. Student enrollment, class year and student placement are checked before a targeted write. A trusted financial reminder uses its fee's charged year through `createFromFeeSource`, including fee-only students. Overdue financial queries group by charged year. A check notification with no unique fee source keeps its personal notification but creates no academic-year Alert. On edit, stored scope stays fixed; content/status corrections work for historical fee-only reminders. Changing scope requires matching selected-year targets; an explicit cross-year correction API remains future work. Legacy rows with no provable source year are hidden, with no date/current-class inference.

**Fixture:** `alertsHistoryManifest.ts` pins three calendars, one class and two sections per year, exactly ten student identities, 23 enrollments, 24 placements, S05's transfer, S07's withdrawal and S04's graduation. The marked local `school_history_test` database contains Aya's 2025-2026 fee without an enrollment and five year-owned plus two shared Alert cases. The guarded base and Alert seed stages are idempotent. Migration `0058` ran only on this fixture, then ten base/Alert PostgreSQL and authenticated REST/MCP cases passed. The normal `db:migrate` command uses the app environment and was not used for this fixture migration.

- Inspect all Alert routes/tools: list/detail, active/critical/recent, counters/groupings/dashboard, entity filters, typed creation, edit/status, delete and bulk/delete-all. Preserve `@isAdmin()`; principal access currently denied must remain denied. Test admin/principal parallel year isolation through a route/probe both may legitimately use, separately from Alerts permission checks.
- Current Alert schema has no `academicYearId`. Decide per type whether it belongs to an academic year, a documented business-date interval, or current/shared system state. Do not infer historical academic attribution from row creation time or pretend a year column already exists. If year-owned Alerts need a column, include a minimal reviewed migration, attribution rule and unresolved-legacy behavior in this slice.
- Create distinguishable Alerts linked to the fixture students in each applicable year plus a shared/system example. Assert exact IDs/counts for list/detail/filter/grouping paths. Test omitted year, invalid/conflicting input, a valid empty result and out-of-scope IDs.
- Authenticated create/update/status/delete and bulk mutations must change only authorized records in the resolved scope. Check other years and shared/system rows remain correct. Explicitly define delete-all semantics before enabling it with a selected year. Enforce linked student/class/assignment consistency and preserve duplicate rules at their correct scope.
- Exercise actual exposed REST and MCP paths, failed writes, concurrent requests and absence of context. Existing placeholder generator endpoints do not prove generated records; record their actual behavior and do not count them as functional generation acceptance.
- **Do not start Announcements until Alerts implementation, visual review, focused tests and real database/transport acceptance are complete.**

### 9.4 Real PostgreSQL fixture: three years, ten students

Use **exactly ten student identities total**, reused across years. The requested historical years are interpreted as **2024–2025 and 2025–2026**; the current fixture year is **2026–2027**. Do not seed ten new students per year.

| Year | Fixture state | Calendar |
| --- | --- | --- |
| 2024–2025 | Closed; authorized historical corrections allowed | Reporting September 1–August 31; teaching/billing September–June; normal closeout through July 14 |
| 2025–2026 | Closed; authorized historical corrections allowed | Same calendar convention with explicit registered dates |
| 2026–2027 | Open and active | Settings active ID and label agree; explicit registered dates |

Use deterministic fixture IDs and realistic names. An illustrative manifest to make concrete in seed code:

| ID | Student | Enrolled 2024–2025 | Enrolled 2025–2026 | Enrolled 2026–2027 | Scenario |
| --- | --- | --- | --- | --- | --- |
| S01 | Adam El Amrani | Yes | Yes | Yes | Normal promotion; shared identity across years |
| S02 | Salma Bennani | Yes | Yes | Yes | Normal promotion and parent/teacher ownership |
| S03 | Youssef Alaoui | Yes | Yes | Yes | Repeated class in 2025–2026 |
| S04 | Mariam Idrissi | Yes | Yes | No | Graduated after 2025–2026 |
| S05 | Omar Bennis | Yes | Yes | Yes | Midyear transfer in 2025–2026; exclusive placement boundary |
| S06 | Lina El Fassi | Yes | Yes | Yes | Withdrawal in 2025–2026 and re-entry in current year |
| S07 | Hamza Tahiri | Yes | Yes | No | Transferred out after historical enrollment |
| S08 | Aya Chraibi | No | No | Yes | Legitimate 2025–2026 fee-only history, unknown historical placement |
| S09 | Ilyas Mansouri | No | Yes | Yes | Entered in 2025–2026 |
| S10 | Nour Ait Ali | No | No | Yes | Current-year entrant |

The manifest has **10 student rows and 23 enrollment rows: 7 / 8 / 8 by year**. These are enrollment membership counts; dated roster/status filters have their own expected results. Pin exact placement dates, classes/sections and status transitions in the manifest. A fee-only record does not justify inventing an enrollment. Use a controlled business date for deterministic tests (initial fixture reference: 2026-09-27), independent of selected year.

Seed only required shared parents/staff/accounts, classes/sections and assignments, plus minimal financial/source records for the scenarios. Provide normal admin, principal, accounting, teacher, parent and student accounts with existing grants/ownership; extra nonstudent identities do not change the ten-student limit. Add module-specific records when that module is implemented. Preserve cases for changed assignments, mixed-year receipts, unallocated credit, pending/settled/bounced payments and unresolved sources. Future draft/activation cases may add a temporary year and roll back, without growing the student population.

Database/runner contract:

1. Use an explicitly designated **local disposable PostgreSQL database**. Never silently seed the application/production database or use an in-memory substitute. Resolve an explicit test connection, verify its database name and fixture marker, and point seed, server under test and assertions at that same target. Keep credentials out of logs/git. Preserve the repo's single tracked env template; a runner can receive a test URL through its process environment.
2. Apply the existing migration chain and any reviewed additive module migration; record migration head. Do not run broad `seed:full`, `reset:demo`, destructive resets or `db:push` as acceptance shortcuts. If the target is missing/unsafe/unavailable, report BLOCKED and hold the module.
3. Create an idempotent dedicated seed entry point and fixture manifest. Running twice preserves the same ten student IDs, 23 baseline enrollments and expected relationships, without duplicates. Check year pointer/calendar consistency before domain tests.
4. Keep a reviewable baseline for the owner. Restore only fixture-owned case changes between tests using transactions or dependency-ordered cleanup. For REST/MCP writes across connections, use explicit fixture cleanup; a test-local transaction alone does not roll back server writes. Never delete unrelated records.
5. Each module checks real authenticated CRUD against all applicable years, exact result IDs/counts/amounts, and before/after unchanged rows in other years. Include failures/rollback, conflicting context, direct-ID mismatch and ordinary ownership denials. Exercise the actual repository and server connections.
6. Prove simultaneous admin historical and principal current requests retain independent years on the same singleton, including delayed nested awaits. Repeat with the same admin making requests for two years. Preserve route permissions when choosing the concurrency endpoint.
7. Record fixture ID, nonsecret database identity, schema/migration head, source revision plus dirty-diff identity, commands, expected/actual results and cleanup. Missing PostgreSQL or MCP must never yield a skipped-but-green required gate.

The fixture and acceptance suites are under `packages/server/tests/academicYears/fixtures/` and `packages/server/tests/acceptance/`; root scripts include `seed:history:base`, `seed:history:alerts`, `seed:history:announcements`, `seed:history:academic-records` and corresponding database/transport test scripts. The dedicated local `school_history_test` database is migrated through `0059` (60 journal entries). The added Assessment and Attendance cases use the same ten-student fixture; their seed stage is idempotent. Current module status is in section 9.3.

### 9.5 Final integration and release gates

After the queue, verify cross-module navigation, remembered selection, shared cache/transport behavior, forms/dialogs, reports/exports and support/lifecycle modules. Full regression is the final integration gate, not the first time modules are tested. Remove remaining flag/legacy defaults only with covered callers, then complete reconciliation, rollback and release acceptance from sections 10–12. Do not deploy partially converted behavior or introduce a replacement feature flag.

Flag removal must preserve prepared transitions, verified adjacent calendars, allowed dates, locks, idempotency and transactional projections/pointer/audit. Ordinary Settings edits must not bypass activation. Define one registered-pointer initialization path for bootstrap. Keep database, package/source, Git/CI/image, deployment, API and browser evidence separate.

## 10. Migration and unfinished historical-data obligations

Reuse existing tables/migrations. This transport refactor is not a reason to regenerate or renumber them. Compare the current journal and actual target before any schema change; build success is not live-schema proof.

Carry forward:

1. Audit labels/provenance/active pointer, missing/overlapping placements, class/section/assignment contradictions, orphaned sources, event conflicts and nullable year links on the designated target.
2. Preserve IDs, money, schedules, statuses, installments, payment dates, allocations and credit. Compare before/after counts and stable fingerprints, per-year totals and completed-payment reconciliation.
3. Use recorded dates/reviewed evidence. Fees, current class, admission and row creation dates cannot invent historical continuous enrollment. Preserve unresolved rows/issues with evidence, proposed resolution, reviewer and audit.
4. Keep backfills deterministic, resumable, idempotent, checkpointed and transactional. Establish cutoffs and reconcile concurrent writes before normal reads change, using compatibility writes or a maintenance window where needed.
5. Enforce relational consistency, interval overlaps, historical retention and justified indexes after reconciliation. Contract required references after the rollback window; preserve issue/audit history.
6. Maintain the deterministic three-year, ten-student fixture in section 9.4: promotion, repeat, graduate, withdrawal, entrant, midyear transfer, changed assignments, fee-only student, mixed-year receipt, pending/settled/bounced states and unresolved sources. Retain earlier two-year test evidence as dated evidence only.
7. Separate academic transition and fee rollover. Preview mappings/capacity/conflicts; commit with idempotency hash/outcomes. Preserve prior history and committed phases through retries/failures.
8. Extend rollback beyond previously reported placement/projection/audit probes, including concurrent activation, transfer overlap and financial rollover failure. Prove PostgreSQL transaction behavior.
9. Preserve child-before-parent fixture cleanup, explicit dates, synthetic actor scope and DI wiring. Historical disposable-demo reset authorization is not permission to reset another database now.
10. Do not restore removed `/year-review` endpoints or list-time context-issue notices. Retain the migration issue workflow and honestly report unresolved attribution.

## 11. Verification contract

### 11.1 Automated cases

- Validator: active default for every role; malformed/unknown/draft/closed years; missing Settings; pointer consistency; record mismatch; unchanged role/error contracts.
- Decorator/boundary: dynamic repository getter with real boot/container/auth/tool execution; no automatic method wrapping; one resolution after guards/DTO validation; async failure before query; field-emission compatibility; preserved non-year parameter arity; missing-context failure; singleton reuse and parallel users/years with no leakage. Prove independent nested/batched/direct tool scopes and restored parent scope after success/failure. Test explicit source/shared/reset paths without an HTTP year.
- Compatibility: header/query/tool inputs, equal/conflicting values, invalid `all`, explicit all-year routes, omitted defaults.
- Repository: annual/latest and dated placement, single ownership/year predicate, list/detail/count agreement, fee-only/unenrolled cases, global uniqueness remains global.
- Selection: per-user/tab restore, active mode, storage failure, invalid preference, entry links, role/account change, no initial wrong-year query.
- Transport/cache: rapid A→B with A resolving last, old cached refetch while B is visible, switch during token refresh, multipart retries, parallel calls, dialogs, old forms and cross-year mutation invalidation.
- Finance: portions and receipt totals, exact decimals, unallocated credit, settlement/payment cash basis, cancelled installments, July boundaries and authorized late old-debt payment.
- Existing calendar/enrollment/grade/transition/ownership tests remain required. Intentionally update legacy-default assertions instead of deleting failing coverage.

### 11.2 PostgreSQL and authenticated acceptance

Use section 9.4's designated real PostgreSQL fixture for mutation tests, **during each module's turn**, after visual approval. Verify result sets and amounts, not just generated SQL/mocks. Cover admin/principal/accounting and teacher/parent/student: active/old years, direct IDs, denied writes, revoked links, same-section teacher grade ownership and no-year admin active defaults. Role/year eligibility does not override individual route permissions.

REST/MCP must agree on lists, details, writes and explicit all-year exceptions. Preserve transfer boundaries, report basis, fee-only visibility and unresolved counts. Record fixture identity, exact revision, commands, cleanup and outcomes without secrets. Existing non-demo migration reconciliation and unfinished mutation/ownership paths remain open until exercised.

### 11.3 Browser scenario

1. Administrator switches Students from active to past year; Adam shows historical class, and Omar shows dated sections before/after his transfer. Perform the same-form historical enrollment correction and verify the current projection stays unchanged.
2. Normal navigation, profile dialogs, fees, attendance, grades, reports and print retain context without repeated URL decoration.
3. Refresh/reopen and open another tab; select different years and verify each tab's reads/writes. Switch account and verify no preference/data crossover.
4. Delay network responses and switch rapidly; no stale rows/errors under new heading. Exercise token refresh, multipart and mutations in flight.
5. Admin/principal use normal closed-year academic forms; accounting uses finance actions and remains denied academic edits. Today's old-fee payment retains actual date and cash basis.
6. Limited roles have no historical selector and cannot bypass via header, link, direct ID or MCP. Prove active-year ownership separately.
7. *Removed 2026-10-01 by the owner as not necessary.* Activation's server behaviour (one switch, concurrent switches, rollback) remains covered on `school_history_test`; the step number is kept so existing references to step 8 stay valid.
8. Verify RTL, mobile, keyboard access, empty/error states, incompatible-filter reset and dirty-form interaction.

Unavailable browser infrastructure means BLOCKED/NOT RUN, not passed. Source/API results do not replace UI acceptance.

### 11.4 Commands and reporting

For each module, write its tests with its implementation, obtain the requested visual approval, then run focused tests and real PostgreSQL/transport acceptance **before proceeding**. No lint, build or test execution is authorized merely by editing this plan. Run applicable repository gates after approval, avoiding redundant reruns. The existing root-script gate list is:

```text
bun run test:academic-years
bun run test:ownership
bun run test:config
bun run test:boundaries
bun run lint
bun run typecheck
bun run i18n:check
bun run test
bun run build
bun run db:check
```

Use actual root scripts and Bun. Database migrations/backfills and connected suites require separate execution/evidence on the intended target; `db:check` does not prove deployed schema or data repair. This documentation-only rewrite needs reference/structure/preservation checks, not application builds.

## 12. Release and rollback without a flag

- Release the complete tested client/server together, with temporary query/header compatibility for older clients. Inspect service-worker/asset caching and old omitted-year callers; a new active default must not silently break intentional all-year flows.
- Confirm target registry/calendar/enrollment readiness and unresolved-history review before deploying always-on year reads. Defer release if data is not ready; do not ship false empty rosters or fabricate backfill.
- Verify backup/restoration before authorized production data changes. Preserve cutoff/reconciliation evidence. No destructive reset belongs to this optimization.
- Rollback uses a compatible prior application revision or corrective release, not an environment flag. Verify the candidate preserves authorization and can read newly written history; otherwise prepare a forward fix and controlled maintenance procedure.
- Keep additive schema and new enrollments, placements, payments and audit rows. Never roll back by deleting history or overwriting later payments from an old backup without separately reviewed recovery.
- Report source/package validation, live database/schema/data, remote Git SHA, CI/image, exact deployed revision/readiness, API and browser outcomes independently. A push/build is not deployment proof.

## 13. Work map and completion checklist

| Area | Files/owners |
| --- | --- |
| Contracts | `packages/contracts/src/academicYears.ts`, exports, shared role catalog, locales and tests |
| Year backend | Existing `modules/academicYears/` validator/repository/lifecycle service; new School `Year` decorator/request adapter, exact registration finalized in spike |
| Registration | `packages/server/src/index.ts`, `config/`, module barrels; supported auth/transport wiring only |
| Domains | Controllers/services/repositories from section 6, internal callers and ownership tests |
| Selection/query | `features/AcademicYears/` state, persistence, scope adapter, selector/banner/date helpers, entry links |
| HTTP | `services/http.ts`, multipart helpers, direct fetches and `services/*Api.ts` |
| Shell/forms | Root layout, DashboardShell, dialog host and affected forms/hooks; no second Najm provider |
| Configuration | `.env.local.example` history flag documentation removed with implementation; never expose/commit real values |
| Jobs/seeds | Explicit target-year call sites, DI wiring, fixture ordering and tests |
| Sequential acceptance | Section 9's alphabetical ledger, dedicated ten-student/three-year seed and per-module PostgreSQL/REST/MCP suites, beginning with Alerts |
| Evidence | Append new results to `docs/tests/academic-year-history.md`; retain dated results and explain superseded transport/flag claims |

Implementation checkpoint for the forward gates (whole-school completion is still open):

- [x] Endpoint/tool/internal-caller inventory covers all scoped, adjacent, shared and all-year surfaces for the initial classification; refresh each module when its turn arrives.
- [x] Supported repository `@Year()` property uses the existing ALS store and a dynamic getter; separate REST/MCP boundaries resolve before the handler, with no method wrapping, singleton snapshot or domain container access.
- [x] Concurrent users/tabs and nested/batched/direct MCP calls have isolated years under the same singleton services in focused infrastructure and Alerts acceptance.
- [x] Dedicated real PostgreSQL seed is idempotent: exactly ten students, three years and 7/8/8 baseline enrollment membership.
- [ ] Alerts completes implementation, test writing, visual approval and real database/transport acceptance before Announcements begins.
  - Progress 2026-09-28: implementation, tests, PostgreSQL 4/4 and REST/MCP 5/5 are done; the owner's visual approval is still open. Later modules started before it at the owner's request (2026-09-27).
- [ ] Every subsequent module completes section 9's cycle alphabetically; no required test deferred until after a multi-module implementation batch.
  - Progress 2026-09-28: rows 01-33 and 36-43 each finished their cycle, with PostgreSQL and REST/MCP suites where applicable, before the next module in their lane; rows 34-35 are recorded in their own rows. The order was not strictly alphabetical: the owner split an academic and a financial lane on 2026-09-27. Owner visual review remains open.
- [ ] One validator owns resolution/access; lifecycle and repository responsibilities stay separate.
  - Progress 2026-09-28: `AcademicYearValidator.resolveSelection` resolves and checks the year for REST and MCP in every converted module.
  - Progress 2026-09-29: no `@Year()` parameter remains in the server source, so no module resolves the year another way. Owner review open.
  - Progress 2026-10-01 (`02237c0`): the last private resolver, `FeeValidator.resolveAcademicYear` with its Settings/calendar guess, is removed; fee creation charges the selected year.
- [ ] Normal scoped reads require a validated year; omitted selection means active for all roles.
  - Progress 2026-09-28: holds for the converted modules (a read outside the scope throws; no selection means the active year).
  - Progress 2026-09-29: every row 01-43 is converted or verified shared, so no unconverted module remains.
- [ ] Equivalent methods and duplicate frontend year wrappers are consolidated; authorized all-year operations remain explicit.
  - Progress 2026-09-29: `useYearAwareList` and the `...ForYearApi` helpers are gone; the remaining `...ForYear` server methods are named cross-year operations (section 0.1).
  - Progress 2026-10-01 (`02237c0`): revenue reads take the repository's own year instead of a label the service passed, and one `useViewingYearKey()` replaces four copied remount wrappers.
- [ ] Remembered selection and shared infrastructure keep key/header/form/retry aligned across users/tabs.
  - Progress 2026-09-28: converted lists are keyed by year with `useYearScopedList`, whose request carries the key's year.
  - Progress 2026-09-29 (browser, demo database): a new tab restored the remembered year, two tabs kept different years through a reload, and every captured request carried `X-Academic-Year` with no `?academicYear=`. On najm-auth 4.2.2 two tabs reloading together stay signed in, and an older year's answer arriving last does not replace the newer year's rows. In-flight writes and account switch are not run.
- [ ] Flag and old unscoped-default branches are gone without removing lifecycle or permission checks.
  - Progress 2026-09-29: `ACADEMIC_YEAR_HISTORY_ENABLED` is gone from the source and the environment template; only this plan and the ledger name it.
  - Progress 2026-10-01 (`02237c0`): revenue reads no longer have an omitted-year branch that counted every year.
- [ ] Enrollment/placement/source history, migration issues and exact financial invariants are preserved.
  - Progress 2026-09-28: dated records take the placement of their own day (`studentPlacementOn`, `placedOnSourceDate`) instead of the current section, in Behavior rewards, Discipline, Assessments and Exams. Financial invariants are recorded per slice in the ledger.
- [ ] Normal permitted closed-year actions retain existing permissions and business-date semantics.
- [ ] Normal Student Edit supports authorized past-year enrollment/placement corrections without changing active projections or inventing history.
- [ ] Remaining target-data, role/mutation, retention and rollback obligations have explicit outcomes.
  - Progress 2026-10-01: read-only audit of `school` passes labels, relationships, year attribution, placements and exact money reconciliation, with no migration issues (ledger entry of that date). Open owner choices: mark the 24 graduated/inactive students' final-year enrollments `graduated`/`withdrawn` with a leaving date, and close 2024-2025 and 2025-2026.
- [ ] Automated, PostgreSQL, authenticated REST/MCP and browser acceptance are recorded separately for this refactor.
  - Progress 2026-09-28: automated, PostgreSQL and REST/MCP results are recorded per module in the ledger.
  - Progress 2026-09-29: browser acceptance started; results and open steps are in the [browser checklist](docs/tests/academic-year-browser-checklist.md).
- [ ] Release/rollback compatibility and exact live revision/readiness are verified when deployment is undertaken.

The historical reference preserves earlier progress and detailed obligations. This file defines the target; the evidence ledger records what has actually been proved. A working decorator or selector alone does not complete the feature.
