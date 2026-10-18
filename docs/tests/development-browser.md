# Development browser testing

Use the existing demo at **http://127.0.0.1:3102** for the first test/fix cycle.
The owner authorized using and changing its demo data on 2026-10-18. Keep the
normal dev server and database; an extra isolated server is unnecessary for
ordinary form and workflow checks.

1. Select cases from the [feature checklists](production-browser/README.md).
   Exercise the actual UI with real dev responses. Use internal Najm MCP/REST
   for supporting setup, reads and cleanup, following the repository guide.
2. Reproduce each defect, fix it locally, and rerun the affected journey through
   reload and stored-value checks. Include relevant phone, language, keyboard
   and denied-role checks. Remove the exact fixtures created for the run.
3. Keep changes local while the selected batch is in progress. Run the smallest
   relevant verification first, then the required lint, types, tests and
   production build when the batch is ready. Preserve the other coder's work.
4. Commit/push a validated batch together. A runtime push to `main` triggers
   deployment, so do not push every individual fix. Complete one release and
   verify its exact app/worker revision and health.
5. Perform the focused production recheck after that release. Keep production
   configuration, cookie/CSP, worker and real-delivery evidence separate from
   dev results. Passing dev checks alone do not tick production cases.

Store sanitized dev results under `docs/evidence/development-browser/`. Record
the origin, working-tree/source fingerprint, selected year, actual assertions,
diagnostics and cleanup. Keep credentials, sessions and raw fixture manifests
in ignored local files. The [production ledger](production-browser/evidence-ledger.md)
continues to describe production execution.

| Dev batch | Result | Evidence |
| --- | --- | --- |
| Parents, 2026-10-18 | 20 assertions PASS; one accessibility-label defect fixed locally; production recheck pending | [Parent lifecycle](../evidence/development-browser/2026-10-18-parents/README.md) |
| Users, 2026-10-18 | 53 assertions PASS, 1 FAIL in shared table empty-state feedback; four application fixes verified locally; production recheck pending | [User lifecycle, filters and access](../evidence/development-browser/2026-10-18-users/README.md) |
| Staff, 2026-10-18 | 67 assertions PASS, 1 FAIL in the same shared empty-state feedback; two status display fixes; hourly/monthly lifecycle, assignment and denied-role checks passed; production recheck pending | [Staff lifecycle and roles](../evidence/development-browser/2026-10-18-staff/README.md) |
| Students, 2026-10-18 | 75 assertions PASS, 1 FAIL in the shared class-filter accessible name; blank-code validation fixed; nested creation, identity edit, dated transfer, phone/RTL, refusals and cleanup passed; production recheck pending | [Student lifecycle and placement](../evidence/development-browser/2026-10-18-students/README.md) |
| Teachers, 2026-10-18 | 58 assertions PASS, 2 FAIL in shared wizard draft retention and no-match feedback; unintended assignment expansion fixed; creation/edit, bulk assignments, reference conflicts, phone/RTL and chain cleanup passed; production recheck pending | [Teacher lifecycle and exact assignments](../evidence/development-browser/2026-10-18-teachers/README.md) |
| Academic structure, 2026-10-18 | 165 assertions PASS, 5 FAIL in known shared empty-state/filter-label issues; class-cycle selection and section inline capacity/translation fixed; nine mutation cases passed, four read cases partial; production recheck pending | [Cycles, classes, sections and subjects](../evidence/development-browser/2026-10-18-academic-structure/README.md) |
| Exams, assessments and timetables, 2026-10-18 | 186 assertions PASS, 2 FAIL in shared no-match feedback; three fixes verified; nine cases pass, three remain partial; cleanup retains three empty archived timetables and their academic references; production recheck pending | [Learning workflows](../evidence/development-browser/2026-10-18-learning/README.md) |
| Calendar and events, 2026-10-18 | 123 assertions PASS; five fixes verified, five cases pass and one remains partial (entirely empty month not run); all new event/announcement/login fixtures removed; production recheck pending | [Calendar and event workflows](../evidence/development-browser/2026-10-18-calendar/README.md) |
| Finance (partial cases), 2026-10-18 | Fee types and payments PASS; fees PASS except the year filter (one local year) and one accessibility label; nine defects fixed locally; installments closeout, credits and rollover still open; production recheck pending | [Finance batch](../evidence/development-browser/2026-10-18-finance/README.md) |
| Finance API/database follow-up, 2026-10-18 | 218 tests PASS, including 56 integration tests; credit refusal/authorization and rollover preview assertions added; fixture audit cleanup fixed; 16 checked tables restored; browser/credit UI and payment cutoff acceptance remain open | [Finance follow-up](../evidence/development-browser/2026-10-18-finance-followup/README.md) |
| Finance reports, 2026-10-18 | Utility expense totals, collection failure/retry handling and July/August cash display fixed locally; real PostgreSQL fault verifies production-mode REST/MCP masking; browser acceptance remains open | [Report fixes and error boundaries](../evidence/development-browser/2026-10-18-finance-reports/README.md) |
| Finance reports browser, 2026-10-18 | 73 assertions PASS in isolated Chromium; actual totals/class balances, French/Arabic phone views, translated failures and real-server retry verified; no finance writes; production recheck pending | [Development browser results](../evidence/development-browser/2026-10-18-finance-browser/README.md) |
| Transport, vehicles and student attendance, 2026-10-18 | 93 assertions PASS across lifecycle segments and retests; four defects fixed; complete owned attendance roster, French/Arabic phone views, role refusals and exact cleanup verified; vehicle table/card parity partial; production recheck pending | [Transport and attendance results](../evidence/development-browser/2026-10-18-transport-attendance/README.md) |
| Vehicle table/card follow-up, 2026-10-18 | 71 assertions PASS; missing mileage column fixed; numeric sorting, four desktop languages, French/Arabic phone parity and exact cleanup verified; closes the prior partial vehicle read case in development; production recheck pending | [Vehicle parity results](../evidence/development-browser/2026-10-18-vehicle-parity/README.md) |
| Rollover browser, 2026-10-18 | 71 final assertions PASS on an owned database clone; preview option/year changes fixed; real commit, duplicate skip/retry, exact fees/installments, unchanged settings, four languages and teacher denial checked; clone removed; separate activation and payment cutoff remain open | [Rollover results](../evidence/development-browser/2026-10-18-rollover-browser/README.md) |
| Calendar boundaries API/database follow-up, 2026-10-18 | 72 tests PASS, including 11 new HTTP/PostgreSQL cases; six payment dates retain actual cash dates and fee-year allocations; early activation refusal, concurrent September 1 activation, repeat/close and no fee generation verified; owned clone removed and eight original tables unchanged; no new browser or production acceptance | [Payment dates and separate activation](../evidence/development-browser/2026-10-18-calendar-boundaries/README.md) |
