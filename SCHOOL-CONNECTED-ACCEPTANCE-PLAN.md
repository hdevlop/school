# School connected acceptance plan

Status: **PLANNED — AUTH MUST PASS BEFORE FEATURE PROMOTION**

Local application: production-style Next.js on a runner-owned loopback port.

Guarded remote target: exactly `https://myscolai.com`.

This is the sole authoritative execution plan for complete School browser
acceptance. The deleted legacy auth and Najm-upgrade plans are not evidence
sources; all new auth and feature status belongs here.

## 1. Goal and evidence boundary

Prove every School product feature through the smallest honest evidence layer,
starting with authentication and promoting only after the current layer passes.

The plan separates four kinds of evidence:

1. Source/unit contracts for helpers, DTOs, guards, services and view models.
2. UI-contract Playwright tests for rendering and interaction, including the
   existing `.acceptance.spec.ts` tests that intentionally mock API reads.
3. Local connected Playwright tests against the real production build, real
   PostgreSQL, real School API and isolated browser contexts.
4. Guarded remote black-box tests against the exact healthy deployed revision.

An existing mocked acceptance pass is not connected evidence. A browser pass
does not replace server, database, build, schema or authorization gates.

Not verified by a remote black-box run without database access:

- transaction locking and rollback;
- database constraints and physical uniqueness;
- migration state or schema drift;
- password hashes, token hashes or encrypted values;
- financial audit rows not exposed through supported APIs;
- seed idempotency.

Those contracts require server or real-database tests.

## 2. Current baseline

- School currently pins a local candidate for `najm-auth@3.2.0` and uses
  `auth.proxy`, authoritative proxy sessions and `auth.routeHandlers`.
- The dedicated production-style Najm upgrade suite currently passes all four
  tests locally, including login/logout, Remember Me, credential setup and the
  role/locale/viewport matrix.
- Existing browser acceptance specs cover academic lists, students, profiles,
  people, attendance, grading, finance, conduct, announcements, navigation,
  settings, access control, appearance and transport.
- Existing acceptance helpers use `page.route()` for many reads and writes.
  Those tests remain valuable UI contracts but cannot accept real persistence,
  authorization or integration behavior.
- Production revision verification exists. The runtime-change discriminator in
  the deployment workflow must be merged and exercised once before a later
  test-only commit may rely on skipped image publication and Dokploy deployment.

No item in this baseline marks auth or any feature group complete under this
plan. Each item must pass its stated gate on the same candidate revision.

## 3. One coder, one tester

Every acceptance slice has exactly two named roles and one active owner at a
time.

### Coder

The coder may inspect and edit source, tests, runners and plans. The coder:

- reproduces a defect at the smallest source or focused-browser level;
- adds a red regression before the fix when practical;
- fixes the narrowest owning layer;
- runs focused tests, affected static checks and the required local gate;
- audits the diff and hands a fixed candidate SHA/worktree state to the tester;
- never declares their own implementation accepted from coder evidence alone.

### Tester

The tester receives an immutable candidate and a precise command. The tester:

- performs read-only preflight;
- verifies exact selected-test count, one worker and zero retries;
- runs exactly one authorized focused, group or remote attempt;
- records the native exit code and sanitized evidence;
- classifies failures as `TEST`, `PRODUCT`, `RUNNER` or `ENVIRONMENT`;
- stops after failure without editing, retrying, deploying or making manual or
  out-of-band state changes; namespaced mutations performed by the authorized
  test command remain part of the attempt;
- returns control to the coder.

The tester never fixes code during the same handoff. The coder never silently
reruns a failed tester attempt. A new tester attempt requires a changed owning
implementation or diagnostic hypothesis and a fresh handoff.

One person or agent may not act as both roles for the same acceptance attempt.
Do not run two coders or two testers concurrently against the same fixtures.

## 4. Safety and fixture contract

### Local connected tests

- Use a positively identified disposable PostgreSQL database.
- Fail closed if the target could be production or a shared developer database.
- Namespace every user and domain record with one run label.
- Create fixtures through supported APIs or test-owned seed helpers.
- Direct SQL is allowed only for local fixture setup, database assertions and
  exact teardown; it is never browser evidence.
- Keep one worker and zero Playwright retries.
- The runner owns the Next.js process, port, browser contexts and cleanup.

The local runner must fail during read-only preflight unless all of these are
true:

- `SCHOOL_E2E_ALLOW_DISPOSABLE_DB=1` is explicitly set;
- the parsed PostgreSQL host is loopback and the database name starts with
  `school_acceptance_`;
- PostgreSQL accepts a connection and the required migration state is present;
- live email delivery is disabled and password recovery uses a runner-owned
  loopback capture service or test adapter whose messages are never committed;
- `127.0.0.1:3210` is free before startup;
- no production, shared-development or externally hosted database is selected;
- required secrets are present without printing their values.

If School's console email provider cannot expose a reset link safely, auth unit
06 remains blocked until the coder adds a narrow test-only capture transport.
The test may inspect only the captured message for its own namespaced recipient
and must redact the token and address from every artifact.

### Guarded remote tests

- Target exactly `https://myscolai.com` with verified TLS.
- Confirm the intended full Git SHA is the sole healthy School app revision.
- Use no PostgreSQL, SQL, migrations, seeds, resets, Docker mutation or Dokploy
  mutation during the tester attempt.
- Create and remove disposable data only through deployed UI or supported APIs.
- Keep credentials, cookies, tokens, identities and sensitive bodies in memory.
- Disable screenshots, traces and video unless a separately approved redaction
  policy exists.
- Use isolated browser contexts for different roles.
- Never use `page.route()`, mocks, `clearCookies()`, forced clicks or arbitrary
  state mutation.

Remote fixture cleanup must be idempotent, scoped to the exact run namespace and
completed through supported product surfaces. Database-only cleanup is
forbidden in remote acceptance.

## 5. Promotion ladder

Every feature follows this order:

1. Focused source/unit test.
2. Existing or new UI-contract browser test.
3. Focused local connected work unit with passive diagnostics.
4. Smallest dependent feature range.
5. Complete feature-group connected spec.
6. Full local connected suite.
7. Guarded remote feature smoke when runtime behavior changed.
8. Final repository and schema gate.

Do not skip auth. No feature test may promote beyond UI-contract evidence until
the complete auth gate in section 6 passes on the same candidate.

After a connected or remote failure, the same range may not run again until the
focused failing unit passes after a real code, test or diagnostic change.
Retries, longer sleeps and larger timeouts are not fixes.

## 6. Gate A — dedicated auth lifecycle

Auth is a separate serial suite. It must not select any feature spec.

Planned exact titles:

```text
school auth 01 - anonymous routing and safe redirect contract
school auth 02 - Admin session login logout and relogin
school auth 03 - Remember Me session and persistent lifetimes
school auth 04 - credential setup completion and fresh login
school auth 05 - credential setup cancellation expiry and replay denial
school auth 06 - password recovery and account invite token lifecycle
school auth 07 - role isolation across all seeded login roles
school auth 08 - cross-tab logout propagation
school auth 09 - protected-request and logout overlap has no late session writer
school auth diagnostics - final cookie writer and network assertions
```

Discovery-only listing must report exactly **10 tests in one file**.

Each applicable lifecycle must prove:

- no recognized auth cookie before login;
- one exact hydrated `POST /api/auth/login` result;
- the correct role surface and one protected read succeed;
- wrong-password and inactive/locked/revoked boundaries return exact statuses;
- unsafe `from` values cannot target auth, API, Next.js or static routes;
- one real UI logout produces one exact successful `POST /api/auth/logout`;
- navigation reaches `/login`;
- access, refresh, signed-session and remember cookies follow the selected
  lifetime and are absent after logout;
- the role's protected endpoint is denied after logout;
- different contexts do not share auth state;
- no response writes a signed session after the logout deletion.

Credential setup must additionally prove:

- setup login issues no authenticated session;
- only the standard setup status/change/cancel endpoints are used;
- weak, mismatched, expired, cancelled, consumed and replayed setup is denied;
- a valid replacement consumes setup once and requires a fresh login;
- the temporary credential is rejected after completion.

Password recovery and account invitation must additionally prove:

- the forgot-password response does not disclose whether an identity exists;
- exactly one message for the namespaced identity is captured without live
  delivery, and its link uses the expected loopback origin;
- missing, malformed, expired, cancelled, consumed and replayed tokens fail;
- weak and mismatched replacement passwords fail before token consumption;
- a valid token is consumed once, the old password is rejected and the new
  password requires a fresh login;
- the account-invite path uses the same supported reset endpoint without
  creating an authenticated session before completion.

Role isolation must cover every seeded login role: `admin`, `principal`,
`accounting`, `teacher`, `student`, `parent`, `counselor`, `nurse`, `secretary`,
`librarian`, `driver` and `assistant`. For each role, derive the expected
landing route and allowed/denied protected reads from the committed seed grants;
do not guess permissions from a role name or accept a hidden navigation item as
authorization evidence.

Cleanup is not a selectable Playwright test. Runner `finally` cleanup and
`globalTeardown` must execute after pass, failure, timeout or interruption, close
every owned context/process and delete only the exact local run namespace. The
passive diagnostics test is the tenth discovered test and never mutates state.

Gate A passes only when all ten tests, runner-owned teardown, supported cleanup,
artifact audit and local repository gates pass together. Only then may feature
groups start.

## 7. Complete feature matrix

Every row is mandatory. A group passes only when every named feature in it has
source/server evidence, UI-contract evidence and real connected evidence where
the product exposes a browser surface.

### B. Platform shell and administration

| Unit | Feature surfaces | Minimum connected proof |
| --- | --- | --- |
| B01 | Dashboard | Role-specific dashboard loads correct aggregates; failed aggregate is an error, not zero data |
| B02 | Navigation | All twelve seeded login roles see only authorized routes; typed forbidden routes are refused by the API and expectations are derived from committed grants |
| B03 | Appearance | Light/dark preference survives reload; first paint matches server snapshot; factory branding images decode |
| B04 | Localization | `en`, `fr`, `ar`, `es` render translated feedback; Arabic sets RTL; formatting and time zone survive reload |
| B05 | Settings | Admin reads and saves settings; unauthorized roles remain signed in but cannot read or mutate settings |
| B06 | Users | List, create, edit, status transition and safe deletion; validation and duplicate identity errors; role denial |
| B07 | Roles | List and role lifecycle; protected bootstrap roles cannot be damaged; grants persist |
| B08 | Permissions | Permission catalog and role assignment; denied role cannot read or write grants |
| B09 | Auth tools | MCP/tool discovery for users, roles, permissions and auth matches server authorization; no browser-only security claim |

### C. Academic structure and scheduling

| Unit | Feature surfaces | Minimum connected proof |
| --- | --- | --- |
| C01 | Cycles | Create, list, edit and guarded deletion; duplicate and referenced-cycle conflict |
| C02 | Classes | Create/list/edit/delete with academic year and level; phone cards preserve identity |
| C03 | Sections | Section lifecycle, class relationship and capacity/duplicate validation |
| C04 | Subjects | Subject lifecycle, unique code and class/teacher relationships |
| C05 | Class routines | Period creation/editing, end-after-start, overlap rejection and persisted schedule |
| C06 | Calendar | Month/navigation rendering and event visibility by role and locale |
| C07 | Events | Event lifecycle, audience/visibility rules and calendar synchronization |

### D. People, profiles and search

| Unit | Feature surfaces | Minimum connected proof |
| --- | --- | --- |
| D01 | Students | Three-step create, list/search, edit/delete confirmation, relationships and phone/RTL layout |
| D02 | Student profile | Identity, class, status, attendance counts, record tabs, transport and fee navigation |
| D03 | Parents | Create/list/search/edit/delete; child relationship and explicit no-child state |
| D04 | Parent profile | Parent identity, linked children and authorized profile projection |
| D05 | Teachers | Create/list/search/edit/delete; subject and class assignment |
| D06 | Teacher profile | Identity, assignments, timetable/profile tabs and authorized projection |
| D07 | Staff | Staff lifecycle with role-specific validation for hourly, driver and assignment fields |
| D08 | Staff roles and zones | Role/zone lifecycle, uniqueness and reference conflicts |
| D09 | Search | Global search returns only authorized entity types and never leaks forbidden records |
| D10 | Profiles API | Student, parent and teacher projections expose required fields and exclude private/internal fields |

### E. Attendance, assessment and grading

| Unit | Feature surfaces | Minimum connected proof |
| --- | --- | --- |
| E01 | Student attendance | Section roster, draft/reset, one persisted mark per student and phone-card parity |
| E02 | Staff attendance | Staff register, allowed transitions, persistence and role denial |
| E03 | Teacher attendance | Teacher register, persistence and separation from other staff attendance |
| E04 | Assessments | Assessment lifecycle with subject, teacher, class/section and scoring validation |
| E05 | Exams | Exam lifecycle, type/subject/teacher/sections and responsive list |
| E06 | Grades | Assessment selection, roster, existing mark, create/update and percentage calculation |

### F. Conduct and communication

| Unit | Feature surfaces | Minimum connected proof |
| --- | --- | --- |
| F01 | Discipline | Violation lifecycle, category/severity/student relationships and authorization |
| F02 | Behavior rewards | Recognition lifecycle, level/reward/points and authorization |
| F03 | Announcements | Draft/publish lifecycle, audience, author, translated status and role visibility |
| F04 | Alerts | Alert lifecycle, target audience, read/status transition and protected health-alert command |

### G. Financial system and reports

All financial values must be asserted as integers in minor units at API/server
boundaries and as correctly formatted values in the UI.

| Unit | Feature surfaces | Minimum connected proof |
| --- | --- | --- |
| G01 | Fee types | Lifecycle, recurrence/configuration validation and referenced-delete conflict |
| G02 | Fees | Student charge lifecycle, effective date, discount/net amount, status and responsive list |
| G03 | Student fee detail | Student-scoped fee projection, installment/payment history and cross-student denial |
| G04 | Payments | Single/multi-fee payment, method-specific validation, allocation totals and replay safety |
| G05 | Installments | Schedule creation/update, due status and total reconciliation |
| G06 | Payment allocations | Allocation persistence, total invariants and no over-allocation |
| G07 | Student credits | Credit creation/application and non-negative remaining balance |
| G08 | Expenses | Lifecycle, amount/date/code formatting, admin navigation and phone layout |
| G09 | Payroll | Payroll lifecycle, staff linkage, calculation and protected transitions |
| G10 | Rollover | Explicit rollover command, idempotency and period boundary behavior |
| G11 | Financial operations | Operations dashboard totals match underlying supported API values |
| G12 | Financial notifications | Due/overdue notification generation and status handling without duplicate delivery |
| G13 | Financial audit | Append-only visible audit projection and role denial; physical append-only guarantee stays a DB test |
| G14 | Aging report | Aging buckets and totals reconcile to fee/payment fixtures |
| G15 | Reminders | Due reminder list, filtering and navigation to the owning financial record |
| G16 | Reports | Report navigation, filters, empty/error states and export/download contract when exposed |

Financial database tests must additionally cover transaction rollback,
concurrency, unique/idempotency constraints and exact reconciliation. Browser
formatting alone cannot accept these units.

### H. Transport

| Unit | Feature surfaces | Minimum connected proof |
| --- | --- | --- |
| H01 | Vehicles | Lifecycle, plate uniqueness, mileage and responsive fleet list |
| H02 | Drivers | Lifecycle, license validation and assignment availability |
| H03 | Vehicle assignments | Driver/vehicle assignment, active-period conflict and unassignment |
| H04 | Student routes | Student pickup/route assignment, active history and exact unassignment |
| H05 | Refuels | Refuel lifecycle, odometer/fuel validation and vehicle linkage |
| H06 | Maintenance | Maintenance lifecycle, cost/date/status and vehicle linkage |
| H07 | Transport workspace | Vehicles, drivers, routes and assigned students reconcile in the aggregate UI |

### I. API-only, operational and seed boundaries

| Unit | Feature surfaces | Required proof |
| --- | --- | --- |
| I01 | Health | Public/authorized health response is stable and does not disclose secrets |
| I02 | Dashboard APIs | Academic, finance and operations dashboard projections are role-correct |
| I03 | Seed data | Seed definitions, role grants and idempotency pass seed and real-database tests; never a production browser mutation |
| I04 | Catch-all API | Every supported HTTP verb reaches Najm through one route-handler composition |
| I05 | Error envelopes | Validation, unauthorized, forbidden, not-found, conflict and server errors render distinct localized states |

### J. Cross-cutting browser matrix

Run once after B-I pass; do not repeat every financial or CRUD journey at every
viewport.

- Desktop `1440x900`, tablet `1024x768` and phone `390x844`.
- Touch mode at narrow viewports.
- Arabic RTL and one LTR locale per group.
- Light and dark modes.
- Keyboard-only navigation, dialogs, menus, forms and focus restoration.
- No horizontal overflow.
- Table/card parity and pagination/continuation behavior.
- Lazy/protected image decode where used.
- Loading, empty, error, forbidden and not-found feedback.
- No unexpected page errors, console errors, failed requests or unexplained
  HTTP errors.

## 8. Spec and runner organization

Keep the fast UI-contract suite and connected suites visibly separate:

```text
apps/dashboard/tests/e2e/
  *.acceptance.spec.ts                 # UI contracts; mocks allowed and declared
  connected/
    auth-lifecycle.connected.spec.ts   # Gate A only
    platform.connected.spec.ts         # B
    academic.connected.spec.ts         # C
    people.connected.spec.ts           # D
    teaching.connected.spec.ts         # E
    conduct.connected.spec.ts          # F
    financial.connected.spec.ts        # G
    transport.connected.spec.ts        # H
    operational.connected.spec.ts      # I
    responsive.connected.spec.ts       # J
    diagnostics.ts
    fixtures.ts
    preflight.ts
    globalSetup.ts
    globalTeardown.ts
  remote/
    auth-lifecycle.remote.spec.ts
    feature-smoke.remote.spec.ts
    diagnostics.ts
    preflight.ts
```

Runner wrappers live at:

```text
apps/dashboard/scripts/run-connected-e2e.mjs
apps/dashboard/scripts/run-remote-e2e.mjs
```

Planned configs and commands:

```text
playwright.acceptance.config.ts        # existing UI-contract suite
playwright.connected.config.ts         # real local production/database suite
playwright.remote.config.ts            # guarded black-box suite
test:e2e:acceptance
test:e2e:connected
test:e2e:auth:connected
test:e2e:remote
test:e2e:auth:remote
```

The connected and remote runners must fail if their test match also selects an
`.acceptance.spec.ts` mock-based spec. Discovery-only listing must record the
exact selected count before the first real attempt.

These commands are contracts, not current pass evidence. No command may be
reported as runnable until its config, package script, preflight and source
contract exist and discovery proves the intended selection.

### 8.1 Connected runner provenance

The connected wrapper, not Playwright's permissive `webServer` reuse, owns the
production lifecycle:

1. Compute a candidate fingerprint from the full Git SHA, the current tracked
   diff and `bun.lock`; record only the SHA and a non-reversible diff hash.
2. Fail if the focused prerequisite has no pass for that fingerprint.
3. Confirm the disposable database and capture-email contract before building.
4. Confirm port `3210` is free; never attach to an existing listener.
5. Run `bun run build:all` after the fingerprint is computed.
6. Recheck the fingerprint after the build and abort if source changed.
7. Start exactly one fresh `next start` process on `127.0.0.1:3210`, verify its
   command line and health, and keep it for the selected serial range.
8. In `finally`, close browser contexts, run exact namespaced teardown, stop
   only the owned process tree and confirm the port is free.

`playwright.connected.config.ts` must use one worker, `retries: 0` in every
environment, `forbidOnly: true`, a connected-only `testMatch`, and no
`reuseExistingServer`. The wrapper preserves Playwright's native exit code and
sets an outer timeout longer than the selected test timeout.

### 8.2 Remote runner provenance

The remote wrapper accepts only the exact origin `https://myscolai.com`, verifies
TLS and the full serving revision before discovery, uses a remote-only
`testMatch`, one worker and zero retries, and never starts a local server. It
disables screenshot, trace and video capture, preserves the native exit code and
runs supported namespaced cleanup in `finally`. Remote preflight is readiness
evidence only, never a passed browser unit.

## 9. Deterministic browser and diagnostic rules

- Attach diagnostics immediately to every new page.
- Capture page errors, console errors, failed requests and every `4xx`/`5xx`.
- Default to deny-all for errors.
- Register an intentional negative response by exact method, pathname and
  status before one action; consume it once and restore deny-all immediately.
- Register response, dialog, download and navigation promises before actions.
- Wait for exact responses and user-visible readiness; never use arbitrary
  sleeps or `networkidle`.
- Prefer roles, labels, form names and semantic row/card boundaries.
- Never repair ambiguity with arbitrary `.first()` or actionability with
  `force: true`.
- Use real browser/API/PostgreSQL behavior in connected suites. No
  `page.route()` or response fulfillment is allowed there.
- Keep different identities in isolated contexts. Reuse an authenticated
  context within one serial dependent range to avoid refresh-token races and
  rate-limit waste.
- Assert persisted effects after every mutation.
- Record a value-free fingerprint containing only unit, pathname, selector,
  method/path, status, failure class and elapsed time.

## 10. Coder/tester execution loop

For each unit:

1. Coder records scope, dependencies and expected selected-test count.
2. Coder adds/runs the smallest red/green regression.
3. Coder passes focused UI-contract and local connected tests.
4. Coder passes affected lint/type/build/database gates.
5. Coder audits the diff and hands off one immutable candidate.
6. Tester verifies preflight and runs exactly one authorized command.
7. Tester reports command, work-unit and plan verdicts separately.
8. On failure, tester stops; coder receives the sanitized fingerprint.
9. On pass, the ledger marks only assertions actually proved.
10. Promotion moves to the smallest dependent range, then the group, then full
    connected acceptance.

No group may be marked complete because an earlier step passed or because a
test was excluded by grep.

## 11. Deployment and publication boundary

### Test-only change — no deployment

A change is test-only only when every changed file is limited to:

```text
apps/dashboard/tests/**
apps/dashboard/playwright*.config.ts
apps/dashboard/scripts/run-connected-e2e.mjs
apps/dashboard/scripts/run-remote-e2e.mjs
**/*.test.ts
**/*.test.tsx
**/*.spec.ts
**/*.spec.tsx
docs/evidence/**
docs/*.md
docs/**/*.md
SCHOOL-CONNECTED-ACCEPTANCE-PLAN.md
```

It must not change application source, server/seed source, migrations,
Dockerfile, Compose, package manifests, lockfile, runtime environment or GitHub
deployment behavior.

For a test-only change:

- run source-contract tests, test discovery, affected lint/typecheck and the
  required local browser range;
- audit the diff and secrets;
- commit and push the test/evidence slice when authorized;
- run the tester attempt against the already healthy exact deployed revision;
- **do not build/publish an application image and do not trigger Dokploy**.

Before the first test-only push to `main`, merge and exercise the GitHub
runtime-path classifier so verification still runs but image publication and
Dokploy deployment are conditional on a runtime-relevant path change. The
classifier must fail closed: any path outside the allowlist above is runtime
relevant. A documentation/test-only commit must leave the serving revision
unchanged. Workflow/package changes themselves are not test-only and use the
runtime deployment path once.

### Runtime change — deployment required before remote proof

Application, server, seed/grant, dependency, lockfile, runtime configuration,
migration, Docker or Compose changes require:

1. local focused and root gates;
2. audited commit and push;
3. successful GitHub verification and image publication;
4. Dokploy deployment;
5. exact full serving revision and Docker health confirmation;
6. one fresh tester authorization for the smallest remote range.

A successful GitHub build, image publication or webhook response does not prove
the VPS is serving that revision.

## 12. Verification commands

Fast source and UI-contract layer:

```powershell
bun run test:dashboard
bun run test:server
bun run test:seed
bun run test:e2e:acceptance
```

Connected promotion commands after their runners exist and pass discovery:

```powershell
bun run test:e2e:auth:connected
bun run test:e2e:connected
```

Final local gate:

```powershell
bun run lint
bun run test:dashboard
bun run test:server
bun run test:seed
bun run build:all
bun run db:check
bun run db:generate
git diff --check
```

`db:generate` must create no migration for browser/test/plan-only work. If it
does, stop and investigate schema drift.

Remote commands are forbidden until the guarded runner exists, its source
contracts pass and discovery reports the exact intended count. Remote retries
remain zero.

Current implementation state:

- legacy `test:e2e:najm-upgrade` and `test:e2e:acceptance` commands are not Gate
  A or connected acceptance under this plan;
- the new connected and remote configs, wrappers and commands are `NOT
  IMPLEMENTED` until their files and package scripts exist;
- the workflow classifier is not operational in production until its own
  runtime-change commit passes verification, publication, Dokploy deployment and
  exact revision confirmation once.

## 13. Evidence ledger

Maintain one row per tester attempt:

| Field | Required value |
| --- | --- |
| Candidate | Full commit SHA or explicitly recorded worktree state |
| Build provenance | Candidate fingerprint and fresh runner-owned build result |
| Role handoff | Named coder and named tester |
| Environment | Disposable local label or exact remote origin/revision |
| Selection | Exact grep/title range and expected/actual count |
| Command result | Native exit code, summary and duration |
| Unit result | `PASS`, `FAIL`, `NOT RUN` or `EXCLUDED BY GREP` |
| Diagnostics | Unexpected page/console/request/response counts |
| Cleanup | Counts only; exact namespace removed or remaining |
| Process teardown | Owned process stopped and runner port confirmed free |
| Artifacts | Redacted files retained and secret scan result |
| Classification | `TEST`, `PRODUCT`, `RUNNER` or `ENVIRONMENT` |
| Next owner | Coder, tester or blocked external environment |
| Deployment | `NOT REQUIRED`, or exact deployed healthy revision |

Do not record passwords, cookies, tokens, generated emails/phones, personal
data, raw response bodies or database connection values.

## 14. Completion definition

This plan is complete only when:

- Gate A auth passes completely before any feature promotion;
- forgot-password, reset/invite and every seeded login role pass Gate A;
- every B-I matrix row has traceable source/server, UI-contract and connected
  evidence appropriate to its surface;
- the J responsive/localization/accessibility matrix passes once across the
  accepted feature set;
- real-database financial, transaction, uniqueness and seed guarantees pass;
- all supported mutations are cleaned through exact fixture ownership;
- full connected acceptance passes with one worker, zero retries and passive
  diagnostics;
- required guarded remote smoke passes against the exact healthy revision;
- every tester attempt has a sanitized ledger entry;
- no secret or runtime identity is retained in committed evidence;
- test-only commits are verified without application deployment;
- runtime changes are deployed and revision-verified before remote proof;
- the final root gate and schema-drift check pass at the accepted candidate.
