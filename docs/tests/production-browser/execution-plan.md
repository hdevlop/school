# Real browser execution plan: myscolai.com

Prepared: **2026-10-15**. Status: **NOT RUN**. Target: **https://myscolai.com**.

Run in this order: **authentication → controlled security checks → students,
teachers and staff → remaining CRUD → finance → cleanup and acceptance report**.
This is a plan for testing the running product through its real browser UI.
Writing it does not run tests, authorize production mutations, or establish that
the local candidate is deployed.

Use the existing [feature guides](README.md), [preflight](00-preflight.md) and
[evidence ledger](evidence-ledger.md). This document orders the work and adds
concrete scenarios; it preserves the full auth/access-reset gates in the
[auth contract](reference/auth-contract.md).

## 1. Start directly with auth after a short identity check

| Step | Action | Required result |
| --- | --- | --- |
| START-01 | Open the exact HTTPS origin, `/login`, `/deployment-revision.txt` and `/api/health/status`. | Valid TLS, expected login, healthy response, full serving SHA recorded. Capture public statuses without secret-bearing bodies. |
| START-02 | Record browser/version, tester, UTC timestamp and Africa/Casablanca display time; choose the case set. | One named attempt, one immutable serving revision, credentials supplied securely. Never try credentials copied from development documentation. |
| START-03 | Check source/test revision against the serving revision. | Identify which source describes the running app. Local uncommitted features remain candidate coverage until deployed; absent live features cannot pass. |

These read-only checks and signed-in read-only navigation can precede fixture
setup. Use an existing controlled acceptance account for login. Obtain operational
evidence for image digest and healthy app/worker revisions when available; a web
revision file cannot prove every replica or the worker.

Before the first write, record the authorized fixture scope, restore-verified
database backup and uploaded-file backup, recipient routing, and a supported
cleanup/financial-retention plan. If any required item is missing, continue only
the independent read-only cases and report the mutation cases BLOCKED. Do not
recreate containers to start a browser attempt.

The separate demo/customer transition owns VPS preparation and release promotion.
Its pending local guide is `docs/deployment/demo-and-customer.md`; that guide and
the runtime transition are outside this browser-plan publication. Preparation is
not assumed complete. This plan targets the myscolai.com demo installation; customer JHL
data, credentials, host storage and deployment remain outside this run. A missing
off-server destination remains an explicit customer-launch blocker. Testing the
currently serving demo does not require deploying the pending Compose changes.

The operator should hold demo releases for the test window using the applicable
deployment controls. Never change Dokploy/GitHub configuration from the test
session. Stop if the serving revision changes.

## 2. Accounts, fixtures and browser procedure

Keep separate browser contexts for admin, accounting, teacher-A, teacher-B,
parent-A, parent-B and student-A/student-B. Reuse controlled accounts where safe.
Add principal, driver, other configured roles and a pending/roleless/inactive
account for the complete grant matrix. Determine allowed actions from effective
grants and ownership on the serving release, rather than role names alone.

If non-admin test accounts do not yet exist, complete admin login, anonymous
denial and logout first. After the write prerequisites, create the minimum
accounts through `/users` or the normal person forms; then finish the security
gate before broader CRUD. Never weaken an existing user's role for a test.

Maintain a private manifest of exact IDs, generated account/profile links,
relationships, uploads, original values, intended reversals and retention.
Committed evidence uses aliases only. Initial person budget: at most five
students, two parents, two teachers and two other staff; use separate deletion
fixtures so finance/ownership fixtures survive until their dependent cases end.
Count automatically created users/staff links separately. Expand the budget only
when a named case requires it and its scope is recorded.

- Use plausible Moroccan names, unique codes/CIN and controlled mailbox aliases.
  Use only operator-controlled phone numbers; send nothing to invented numbers.
- Reuse existing academic catalogs read-only. Create a small owned class/section
  branch only when assignment, bulk, attendance or timetable cases would otherwise
  touch unrelated people. Teacher assignments must not expose a real roster.
- UI cases use actual navigation, fields, validation, save, cancel and delete
  controls. No mocked traffic, forced clicks, hidden API creation presented as UI
  creation, arbitrary sleeps, or cookie clearing presented as logout.
- For supporting setup, cleanup and corroboration, follow Najm MCP-first/internal
  REST rules. Browser interactions here are explicitly product acceptance tests.
  API-only results stay separate and cannot pass a missing browser operation.
- Run serially with zero automatic retries. Register passive page, console and
  request diagnostics before navigation. Allow expected negative responses only
  for the exact action/method/path/status being tested.
- After each write, reload and reopen the exact fixture; verify stored values,
  related views and intended side effects. A success toast alone is insufficient.
- Desktop baseline: 1440×900. Repeat essential login, student creation, payment
  and delete confirmation at 390×844, French and Arabic RTL, with keyboard access.
  Extend using the [shared matrix](responsive-accessibility.md).

Default raw HAR, traces, screenshots and video to off. If visual evidence is
needed, agree on redaction before capture; never commit sessions, credentials,
mail links, CIN, personal details or raw financial documents.

## 3. Phase A — authentication and session gate

Use [authentication](authentication.md), [registration](registration.md) and
[reset access](access-reset.md), including their retained exact gate cases.
Entry points: `/login`, `/register`, `/forgot-password`, `/reset-password` and
`/change-password`, plus the account action in `/users`.

| Case | Browser action | Pass condition |
| --- | --- | --- |
| AUTH-01 | Signed out, open `/`, `/students`, `/users`, `/fees` and one owned detail URL. | Protected content is not disclosed; login/denial is consistent. The corresponding protected request is unauthenticated, not a successful data response. |
| AUTH-02 | Submit missing/invalid fields, then one wrong password for an owned account. | Useful validation, no session, no credential leakage. Use a total cap of three wrong-password attempts per account for this run. |
| AUTH-03 | Sign in as admin, reload, open a new tab, navigate, log out through UI, use Back and reload both tabs. | Session persists while valid; logout removes protected access in both tabs and no late request restores it. |
| AUTH-04 | Compare Remember Me on/off in fresh contexts; exercise refresh during normal navigation. | Expected persistence policy and safe cookie attributes; no refresh loop or auth flash. Record attributes only, never values. |
| AUTH-05 | Sign in separately with every in-scope role; use both menu navigation and direct denied URLs. | Allowed views work, denied screens never disclose restricted content, and list/detail results follow ownership. |
| AUTH-06 | Use an owned pending/roleless, inactive and revoked-session account. | Pending/inactive users cannot gain usable access; roleless users cannot access privileged resources. Revocation takes effect on the next protected operation. |
| AUTH-07 | Recover/change a disposable password and complete temporary-credential setup. | Controlled recipient receives the real message; weak/mismatched input fails, replacement succeeds, old password fails, and used/expired links cannot be reused. Never alter the sole admin account. |
| AUTH-08 | Try an external return target and inspect registration plus the Users reset action. | Redirect stays within allowed app routes; self-registration cannot grant roles or bypass pending status; reset behavior matches the target account and preserves other sessions according to policy. |

Mail-dependent cases remain BLOCKED if no controlled working delivery route is
available. Console email is not real mailbox delivery. Do not exhaust recovery
or rate limits to manufacture a pass; rate-limit saturation belongs in isolation.

**Exit:** core login/logout, anonymous denial and required role/ownership checks
pass before broad mutations. Record incomplete recovery/full-gate evidence
explicitly; partial auth smoke cannot accept the full application.

## 4. Phase B — controlled vulnerability checks

Run [the security checklist](security.md). Test anonymous, lower-privilege and
cross-owner access with two owned identities. Cover broken object/function
authorization, escalation, session behavior, reset leakage, CSRF/CORS, unsafe
redirects, input/output handling, uploads and error disclosure.

Do the anonymous/session/privilege checks first. Finish object-ownership and
upload checks once the minimum fixtures exist. Every later CRUD/finance wave
also repeats its own allowed/denied checks.

**Exit:** no unresolved authentication bypass, unauthorized data disclosure or
write, privilege escalation, or session compromise. Stop the attempt if one is
observed; preserve a sanitized reproduction and arrange a new tested release.
A passing bounded checklist is not a claim that the app has no vulnerabilities.

## 5. Phase C — students, teachers and staff CRUD

Use one common CRUD contract for each entity:

1. **Create:** cancel once with no effect; submit invalid/duplicate input; create
   one valid owned record and verify it appears exactly once after reload.
2. **Read:** search, filter, sort, page, open detail/profile and reload a direct
   URL. List/detail counts, names and relationships agree within the selected year.
3. **Update:** change one editable field, reload, and prove unrelated fields and
   relationships retain their values. Then exercise the supported relationship
   action and an explicit field clear where offered.
4. **Delete:** cancel first; confirm deletion of the disposable fixture; reload,
   check the detail URL and related views. A documented dependency restriction
   must show an actionable error and leave the record intact.
5. **Denied/invalid actions:** use the lower-privilege context against that exact
   owned fixture, record the server denial, and verify no side effect. If the UI
   hides the action, record that UI result plus separate transport enforcement.

| Case set | Required scenarios | Detail guide |
| --- | --- | --- |
| PEOPLE-01 | Create parent-A separately; create student-A with a new nested parent and authorized fee; create student-B using an existing owned parent. Check unique identities and links, multi-step back/forward behavior, birth/enrollment/year dates and avatar persistence. Invalid nested input must leave no visible partial person/fee/link. | [Students](students.md), [parents](parents.md), [student profile](student-profile.md), [parent profile](parent-profile.md) |
| PEOPLE-02 | Edit identity/contact fields, explicit clears and nonsensitive avatar. Exercise supported enrollment correction/transfer/end controls on owned enrollment history; verify class/section and dated roster. A profile edit must not silently create/reset yearly placement or change another year's enrollment. | [Students](students.md), [academic-year checklist](../academic-year-browser-checklist.md) |
| PEOPLE-03 | Create teacher-A and teacher-B; check linked user/staff identity; assign/unassign owned subjects/classes through exposed controls. Partial edits retain assignments and compensation fields. Teacher-A cannot browse teacher-B's unassigned owned students. | [Teachers](teachers.md), [teacher profile](teacher-profile.md) |
| PEOPLE-04 | Create salaried staff and an hourly/role-dependent fixture; edit hours/rates/contact/status and reload. Staff role/zone options behave correctly; account permissions cannot increase through a profile field. Retain eligible fixtures for payroll. | [Staff](staff.md), [staff roles/zones](staff-roles-zones.md) |
| PEOPLE-05 | Delete dedicated disposable parent/student/teacher/staff fixtures after removing only their owned dependencies. Verify linked account behavior, file removal/retention policy and unrelated fixtures remain intact. | Corresponding entity guides |

Run parent/student ownership checks with parent-A/parent-B and student-A/student-B
after these relationships exist. Inspect list, detail, nested profile, fees and
document surfaces; a filtered list alone does not prove detail-route protection.

**Exit:** each selected entity has recorded create/read/update/delete outcomes,
invalid-input outcomes and role/ownership proof. Keep finance fixtures alive.

## 6. Phase D — remaining application CRUD and route coverage

Apply the common CRUD contract to every mutable browser surface. Record
create/read/update/delete and domain actions separately; do not treat opening a
page as full CRUD. Backend-only or deliberately unsupported operations require
an explained scope exclusion and separate API obligations, never a browser PASS.

| Work package | Routes/surfaces and required behavior | Guides |
| --- | --- | --- |
| Navigation and dashboards | `/`, `/dashboard`, `/home`; role-specific landing, search, preferences, language, theme, responsive cards, totals and safe direct navigation. | [Dashboard](dashboard.md), [navigation](navigation-search.md), [appearance](appearance-localization.md), [mobile home](../mobile-home.md) |
| Academic catalogs | `/cycles`, `/classes`, `/sections`, `/subjects`; owned create/edit/delete, duplicates, parent/child consistency and reference conflicts. Use a separate empty catalog fixture for delete. | [Cycles](cycles.md), [classes](classes.md), [sections](sections.md), [subjects](subjects.md) |
| Scheduling | `/class-routines`, `/calendar`; CRUD on owned timetable/events, teacher/room conflicts, dates and visibility. | [Class routines](class-routines.md), [calendar](calendar.md), [events](events.md) |
| Attendance | `/attendance/students`, `/attendance/teachers`, `/attendance/staff`; mark/correct/clear owned attendance, dated roster, duplicate handling and retained history. | [Student](student-attendance.md), [teacher](teacher-attendance.md), [staff](staff-attendance.md) |
| Learning | `/assessments`, `/exams`, `/grades`; owned assessment/exam CRUD, valid/invalid grades, inline save/blur/reload and teacher scope. | [Assessments](assessments.md), [exams](exams.md), [grades](grades.md) |
| Conduct | `/discipline`, `/behavior-rewards`; owned CRUD, correct student/year and role restrictions. | [Discipline](discipline.md), [rewards](behavior-rewards.md) |
| Communications | `/announcements`, `/notifications`, `/alerts`, `/preferences`; owned CRUD/actions where exposed, read/unread/delete, intended audience, bell consistency and opt-in preferences. No school-wide broadcast. | [Announcements](announcements.md), [notifications](notifications.md), [push preferences](push-preferences.md) |
| Transport | `/vehicles`, `/drivers`, `/transport`; owned vehicle/driver CRUD, assignment/unassignment, capacity/conflict checks and historical route intervals. Refuel/maintenance CRUD only where a browser surface exists. | [Vehicles](vehicles.md), [drivers](drivers.md), [assignments](vehicle-assignments.md), [routes](student-routes.md), [refuel/maintenance](refuels-maintenance.md), [transport](transport.md) |
| Administration | `/users`, `/roles`, `/permissions`, `/settings`; owned user CRUD/status/role changes, disposable role tests, denied escalation and settings read/edit validation. Preserve system roles and effective shared settings. | [Users](users.md), [roles](roles.md), [permissions](permissions.md), [settings](settings.md), [reset access](access-reset.md) |
| People details | `/students`, `/students/[id]`, `/parents`, `/parents/[id]`, `/teachers`, `/teachers/[id]`, `/staff`; Phase C outcomes, relationship changes and lower-privilege visibility. | Phase C and linked person guides |
| Finance | `/fee-types`, `/fees`, `/students/[id]/fees`, `/financial-operations`, `/expenses`, `/payroll`, `/aging`, `/reminders`, `/reports`; execute Phase E. | Finance guides below |

Additional current-source surfaces need explicit cases alongside the older guides:

| Case | Surface | Planned browser acceptance |
| --- | --- | --- |
| EXTRA-01 | `/public-page` and `/welcome` | Admin editor loads, sections validate, preview renders, uploads persist; anonymous landing exposes only published content and permitted actions. Saved edits/publication changes affect a global page: use read/preview/cancel on production unless an exact restoration scope is authorized. Check metadata links use the serving installation origin. |
| EXTRA-02 | `/visit-requests` and the landing request form | Create one controlled visitor request, verify admin list/detail and supported status/edit/delete actions; validate duplicate/invalid input and deny non-admin access to visitor details. Verify mail only to controlled recipients. Missing actions are recorded explicitly. |
| EXTRA-03 | `/academic-year-migration` and global year selector | Review owned issues if available; preview/cancel repair actions only. Switch between registered years, then back: URL/state, list/detail, cache, ownership and totals follow selection; active-year settings remain unchanged. Production migration/repair commits are outside this run. |
| EXTRA-04 | Chat/global assistant, if mounted | Read-only question for each role, correct selected-year scope and no private cross-owner results; tool writes restricted to explicitly owned fixtures. Missing live surface/provider is BLOCKED for that case. |

The local route inventory is a planning input, not proof every page is deployed.
At execution reconcile it against the serving source and visible navigation;
record each missing/added surface. Shared settings changes, global roles,
bulk-delete-all, academic-year activation and migrations cannot be folded into a
general CRUD approval. Exercise safe previews or use isolation for those cases.

For multi-select CRUD, select two exact owned IDs and prove only those records
change. Never use an unbounded delete-all or a whole-class action on a mixed roster.

## 7. Phase E — finance with independent expected amounts

Use accounting-capable and denied identities. These are internal test ledger
entries only: no external bank/card transaction, real cheque, payroll transfer,
real-family debt or collection message. Before posting, confirm the installation
has no automatic external settlement for these actions and approve fixture
retention/reversal. Financial history may intentionally survive cleanup.

Calculate expected values independently in integer centimes. Record business
date, selected year, calendar and currency from supported settings reads; use
MAD examples only when MAD is the configured currency. Preserve September–June
billing and July 1–14 payment closeout. Historical selection does not change the
active year or freeze ordinary permitted corrections. Never change the server
clock to simulate a boundary.

Start the exact arithmetic scenario with charge-free student-A/student-B: remove
any Phase C unpaid nested-fee fixture through supported cleanup first, or use
separate owned people within the recorded budget. Run FIN-01, FIN-03–05 and
FIN-08–10 as one checkpoint. Run the independent schedule/lifecycle/duplicate
scenarios afterward, so their receipts cannot contaminate the expected totals.

| Case | Scenario | Exact expected result |
| --- | --- | --- |
| FIN-01 | Create/edit two owned one-time fee types, then assign their respective 100.00 and 200.00 charges to finance student-A; edit catalog price afterward. | Charges total 300.00; installment sum equals net charges; existing fee snapshots remain unchanged by catalog edits. Duplicate student/type/year assignment is refused without a partial write. |
| FIN-02 | On a separate owned schedule fixture, preview/create monthly 100.00 with a per-month discount of 10.00, effective September 1 of a registered September–June year. Repeat supported quarterly/semester/annual previews and mid-year dates. | Full-year net 900.00 across ten months; each schedule sums exactly to its independently calculated net, including the final rounding remainder. No July/August tuition installment; dates and proration follow the selected calendar. |
| FIN-03 | On student-A's 300.00 one-time debt, post 120.00, explicitly allocating 100.00 and 20.00. | One receipt; fee balances 0.00 and 180.00; total debt 180.00; history and receipt agree after reload. |
| FIN-04 | Post 200.00 against the remaining 180.00 and choose the supported keep-remainder-as-credit option. | Total completed receipts 320.00 = allocated 300.00 + available credit 20.00. If that option is absent in the UI, record browser coverage BLOCKED and verify separately through supported transport. |
| FIN-05 | Add a third owned fee type/charge of 50.00; apply the available 20.00 credit once. | New charge balance 30.00; credit 0.00; cash receipts remain 320.00. Applying credit must not create income a second time. Replay cannot spend the same credit twice. |
| FIN-06 | On student-B, create a separate 100.00 debt; record 40.00 and void it with reason. Use independent fixtures for refund and pending/deposited/completed/bounced cheque transitions. | Void restores debt to 100.00 and removes that receipt from completed cash totals; history retains action/reason. Other transitions affect allocations, credit and cash exactly once under the serving contract. No manual receipt deletion or amount rewrite. |
| FIN-07 | Submit zero/negative, excess-allocation, excessive discount and 0.001 precision inputs; edit safe receipt metadata. Test one deliberate duplicate submit on one owned receipt. | Validation rejects invalid values without money changes or unexpected 500s; metadata edit preserves amounts. Duplicate submission leaves one receipt/effect; a UI-disabled second click alone does not prove server idempotency. |
| FIN-08 | Create/edit an expense, approve/reject via its workflow, and record a 50.00 payment on the approved owned expense. Test invalid date/status edits on separate fixtures. | Pending/approved expense contributes no paid outflow; paid expense contributes 50.00 with actor/date/method history. Generic edit cannot bypass approval/payment invariants. |
| FIN-09 | On one owned eligible staff fixture, pay a period with expected net 100.00 using the row action; reload, then use supported unpay/re-pay on that fixture. | One payslip per staff/period; roster includes eligible teachers where applicable. Paid contributes 100.00; unpay removes that contribution while retaining history; replay never doubles it. No school-wide payroll run. |
| FIN-10 | Reconcile student detail, installments, cash history, credits, `/financial-operations`, `/aging`, `/reports` and dashboard. | For this controlled scenario, cash-income delta 320.00; paid-outflow delta 150.00; net-cash delta 170.00. Outstanding installments and applied credit reconcile separately; charges are not cash income. Compare a quiet before/after baseline or fixture-filtered totals so unrelated activity cannot mask a defect. |
| FIN-11 | Switch to another registered year and back; inspect July closeout/date boundaries through supported previews/history. | Selected-year debt/cash projections follow their respective date rules with no stale cache or cross-year leak. Boundary writes requiring another business date remain isolation/API obligations. |
| FIN-12 | Preview reminders and rollover; inspect financial notifications/audit; exercise receipt print/download locally. | Preview totals/targets correct; no unrelated recipient or school-wide change; audit read-only and scoped. No actual rollover commit, cron broadcast or global reminder generation on production. |

Guides: [fee types](fee-types.md), [fees](fees.md), [student fees](student-fees.md),
[installments](installments.md), [payments](payments.md),
[credits](student-credits.md), [expenses](expenses.md), [payroll](payroll.md),
[operations](financial-operations.md), [aging](aging.md), [reports](reports.md),
[reminders](reminders.md), [rollover](rollover.md).

### Mandatory regression targets

The [2026-10-03 finance review](../finance-review-2026-10-03.md) recorded five
defects. That historical result neither proves the serving release still has
them nor proves they are fixed. Revalidate all five against the accepted release:

1. Expense generic status edit cannot create `paid` while bypassing approval,
   actor, payment date/method and audit requirements.
2. Deductions above gross salary are refused; a negative-net payslip cannot be paid.
3. Two concurrent requests with the same payment idempotency key both resolve
   consistently to one receipt, with no 500 or duplicate allocation.
4. A payment-date-only expense edit is validated against the stored expense date.
5. 0.001 monetary precision is a client error (400/422), not a 500 or persisted money.

Where the deployed UI cannot express a regression, record separate authenticated
transport/database acceptance. Never manipulate a hidden request and label it
browser CRUD. Run concurrency/transaction fault tests against a disposable
database with production-equivalent code, not the shared live database.

Existing commands `bun run test:finance`, `bun run test:finance:integration` and
`bun run test:security:transport` provide separate local/server evidence. Inspect
their environment/fixture setup before execution; never point a local acceptance
runner at production. Browser observations cannot prove constraints, locks,
atomic rollback, credential hashing or exhaustive concurrency guarantees.

**Exit:** all selected finance case outcomes, independent arithmetic and five
regression outcomes recorded. A money/authorization discrepancy fails the
affected gate; no full finance acceptance while mandatory evidence is missing.

## 8. Cleanup, failures and delivery

Stop the current attempt on an unexpected error. Preserve its case result and
affected IDs privately; do not retry a possibly successful write after a timeout.
Re-read the exact fixture to determine whether it committed before cleanup.
Unexpected disclosures, non-owned mutations or money corruption stop all writes.
Do not fix source, deploy, seed, migrate or restore a database within an attempt.
Fixes need their own scope, relevant local checks and a fresh immutable attempt.

Cleanup runs on success and failure using the manifest, in reverse dependency
order: supported financial reversals/retention → attendance/grades/conduct →
transport/teaching/parent links → disposable people and linked accounts → empty
owned catalogs → individual owned uploads. Never delete by a name prefix or a
whole shared storage namespace. Keep a person/account when financial foreign
keys/history require it; disable or retain only according to the agreed scope.
Record exact remaining fixture counts and reasons. Never restore the shared
database as routine cleanup: it would discard other users' later writes.

For every case record PASS / FAIL / BLOCKED / NOT RUN or EXCLUDED BY SELECTION,
expected versus actual behavior, serving SHA, role, fixture alias, sanitized
request status/error counts and cleanup outcome. No silent skips. For a security
finding include severity, minimal steps, expected enforcement, observed result,
impact and retest case; never include another user's data.

Store sanitized run records in `docs/evidence/production-browser/<run-label>/`
and link them from the [ledger](evidence-ledger.md). Deliver these summaries:

- Cases selected/executed/passed/failed/blocked/excluded, grouped by phase and
  feature; explicit remaining create/read/update/delete actions.
- Authentication/security findings, money reconciliation and retained fixtures.
- Separate source checks, API/database proof, email/push delivery, image/digest,
  live revision/readiness and browser results.
- Remaining owner decisions: controlled accounts/mailboxes, test window,
  fixture/financial scope, backup/restore evidence and off-server destination.

Accept the run only when all selected mandatory cases and cleanup/retention pass,
no unresolved critical/high security or financial-integrity defects remain, and
the serving revision remains the one tested. A partial scope yields a partial
report. Customer promotion additionally requires the deployment guide's full
preparation/release evidence and manual operator action.

## 9. Manual execution now; automation is a separate implementation

The root/dashboard manifests and file inventory inspected on 2026-10-15 contain
no Playwright configuration or production browser test command. The plan can be
executed manually in a real browser with the same case IDs. When executing via
the in-app Browser, load its browser-control skill first. Historical runner
commands in reference documents are not runnable evidence.

If automation is requested later, implement a dedicated production-only suite
with explicit exact-origin/expected-SHA inputs, secure credential injection,
case/fixture allowlists, one worker, zero retries, no `webServer` or localhost
fallback, passive diagnostics and cleanup on failure. Discover the exact case
count before execution; separate read-only and write scopes and validate the
runner in isolation first. Do not add or run that automation in this planning
change.
