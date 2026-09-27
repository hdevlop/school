# Academic-year scope inventory (Phase 0)

Prepared: **2026-09-27** · Plan: [SCHOOL-ACADEMIC-YEAR-HISTORY-PLAN.md](../../SCHOOL-ACADEMIC-YEAR-HISTORY-PLAN.md) §6 and §9

**Forward-plan update (2026-09-27):** the root plan now targets a dynamic
`@Year()` service property backed by the existing ALS store, with per-operation
resolution and independent MCP invocation scopes. Its Alerts-first alphabetical
implementation/review/test queue supersedes the rollout order below. The
parameter-decorator findings and package results here remain dated evidence;
they do not prove the proposed property getter. Each module must complete real
PostgreSQL acceptance using the root plan's three-year, ten-student fixture
before the next module starts. No tests were run for this documentation update.

This is the endpoint, tool and caller inventory the plan requires before the
domain rollout. It records what each surface does **today** and the year basis
it moves to. It is a working document: a row marked *verify* was classified
from its controller, service and callers without running it, and is confirmed
or corrected when its domain is migrated.

Baseline: School `main` at `5d89369` plus a large uncommitted working tree
(owner and earlier sessions). Najm pins: `najm-core 2.0.6`, `najm-mcp 2.1.2`,
`najm-guard 2.0.2`, `najm-auth 4.1.0`. Full `bun run check` passed on this tree
before this refactor started. 555 routes across 60 controllers were listed
from source; routes that do not depend on a school year are grouped.

## 1. Phase 1 gate result: `@Year()` on the installed Najm

A real-container spike against the installed packages (scratch test, not
committed) showed that no public extension point can inject a validated year:

| Finding | REST | MCP |
| --- | --- | --- |
| A `'custom'` parameter type | always `undefined`; `createParamDecorator` is not exported | always `undefined` |
| A guard returning `{ info }` | lost: guards run in a nested ALS copy | set in the message-wide store |
| Route middleware writing ALS | reaches `@Info()` | does not run for tools |
| A guard's `@Query('academicYear')` | the route query | the transport request, not the tool input: the call failed |
| Two tool calls of one message | — | each saw the other's year (cross-talk) |

Decision (owner, 2026-09-27): extend Najm first. Released as `najm-core 2.1.0`
and `najm-mcp 2.2.0` (published 2026-09-27; School pins them exactly):

- `najm-core`: public `createParamDecorator(resolve)`. The resolver runs once
  per invocation after route middlewares and guards, may be async, reads
  `header()`, `query()`, `param()` and the request container, and fails the
  request before the handler when it rejects. 9 new tests; the core, guard,
  validation and auth suites pass.
- `najm-mcp`: tool arguments resolve asynchronously; custom parameters read
  the call's validated input and run inside that call only. 6 new tests,
  including a real Streamable HTTP call and two batched calls without
  cross-talk.

School consumes the published versions (exact pins, overrides, lockfile). The
gate then passed on a real server boot
(`packages/server/tests/academicYears/YearDecorator.test.ts`): REST and
Streamable HTTP MCP inject the validated year beside a later `@User()`, after
authentication and guards; refusals (400/403/404) stop the call before the
handler; overlapping requests and batched tool calls keep their own years.

## 2. Year bases

| Code | Basis | Rule |
| --- | --- | --- |
| **S** | Selected year | `@Year()` injects the validated year; omitted means active for every role |
| **R** | Record year | The target row's own year is authoritative; the selected year never rewrites it. Year-owned details outside the selected year are scoped not-found |
| **W** | Write context | A create validates its year against class, section, enrollment and event date |
| **D** | Dated | Business date or a date inside the year's reporting interval ("today" metrics exist only in the year holding today) |
| **A** | Explicit all-year | A named, authorized route; missing year or `all` never grants it |
| **C** | Current/shared | Identity, catalogs, settings, auth; no selected-year filter |
| **L** | Lifecycle | Explicit source and target years; the selector never triggers it |

## 3. Domain matrix

### Students and enrollments (vertical slice)

| Route | Tool | Today | Target | Notes |
| --- | --- | --- | --- | --- |
| `GET /students` | `students_get_students` | year → `getAllForYear`; year+`onDate` → roster; none → current projection | **S**; `onDate` **D** inside the year | Consolidate `getAll`/`getAllForYear` into one filtered read; latest placement annually, dated placement for rosters |
| `GET /students/:id` | `students_get_student` | year → `getByIdForYear`; none → identity + current class | **S** detail | No enrollment → identity with `enrollment: null`, unknown class |
| `GET /students/:id/parents` | yes | links | **C** | Current parent links |
| `GET /students/:id/enrollments` | no | admin history | **A** | Administrator enrollment-history tab |
| `POST /students` | yes | class/section year, `yearEnrolledOn` | **W** | Enrollment service owns projections |
| `PUT/DELETE /students…` | yes | identity | **C** | Class moves go through enrollments |
| `POST /student-enrollments`, `/:id/transfer`, `/:id/end` | no | explicit `academicYearId` | **W/R** | Preserve dated placements and audit |
| `GET /student-enrollments/:id` | no | row | **R** | |

### Classes, sections, routines

| Route | Tool | Today | Target | Notes |
| --- | --- | --- | --- | --- |
| `GET /classes`, `GET /sections` | yes | one query, label optional; none → all years (admin) | **S** | Twin queries already merged |
| `GET /classes/:id`, `/sections/:id` | yes | label access check | **R** | |
| `…/:id/sections`, `/subjects`, `/teachers`, `/classes` | yes | structure | **R** | |
| `…/:id/students`, `/parents`, `/analytics` | yes | **current projection** (`students.classId`) | **R** via placements in the class's year | Gap: a past class lists today's pupils. Fix in the domain rollout |
| `POST/PUT /classes`, `/sections` | yes | year label resolved | **W** | |
| `GET /class-routines`, `/sections/:id/published`, `/teachers/:teacherId` | teacher tool | viewing label | **S** | |
| `GET /class-routines/:id`, `/assignments/:id` | no | label check | **R** | |
| `GET /class-routines/periods`, `/duty-candidates` | periods tool | shared | **C** | |
| Routine writes, publish, archive | create tool | section year | **W/R** | Keep version/publication rules |

### Attendance, assessments, exams, grades

| Route | Tool | Today | Target | Notes |
| --- | --- | --- | --- | --- |
| `GET /attendance`, `POST /attendance/mcp/all` | yes | viewing year (flag) | **S** | |
| `GET /attendance/student/:id`, `/staff/:id`, `/teacher/:id` | yes | viewing year (flag) | **S** | |
| `GET /attendance/section/:id` | yes | active (flag) or all | **S** | |
| `GET /attendance/date/:date`, `POST …/mcp/date` | date tool | record year from date | **D/R** | |
| `GET /attendance/today`, `…/mcp/today*` | yes | today | **D** | Active year only |
| `GET /attendance/:id`, `/:id/history` | get tool | record check | **R** | |
| `POST /attendance`, `PUT …`, `/staff/bulk`, `/status` | yes | stored/date year check | **W/R** | Dated roster for students |
| `GET /assessments`, `GET /exams` | yes | viewing year (flag) | **S** | |
| `GET /assessments|exams /section|subject|teacher|class/:id` | yes | **unscoped** (*verify*) | **S** | |
| `GET /assessments|exams /today|upcoming|overdue|due-this-week` | yes | business date | **D** | |
| `GET /assessments/:id`, `/exams/:id` | yes | row | **R** | |
| Assessment/exam writes | yes | source/section year | **W/R** | Draft and graded-source rules stay |
| `GET /grades`, `/student/:id`, `/student/:id/report` | yes | viewing year (flag) | **S** | |
| `GET /grades/section|subject|teacher/:id` | yes | active (flag) or all | **S** | |
| `GET /grades/assessment/:id`, `/exam/:id` | yes | active (flag) or all | **R** (the source's year) | |
| `GET /grades/unassigned-sources` | no | review list | **A** | Migration-issue review |
| Grade writes | yes | eligibility year | **W/R** | One valid source; orphans stay unresolved |

### Finance

| Route | Tool | Today | Target | Notes |
| --- | --- | --- | --- | --- |
| `GET /fees` | yes | year → fee year; none → all years | **S** | |
| `GET /fees` with the table's "outstanding" scope | — | `useFees({ allYears })` all-year list | **A** | Needs an explicitly named unpaid-all-years route before the default changes |
| `GET /fees/:id` | yes | optional year check | **R** | |
| `GET /fees/overdue`, `/overdue/summary`, `POST …/mcp/overdue/student` | yes | year or all | **S** | Reminders job needs an explicit all-year read |
| `GET /fees/student/:id` | yes | year or all | **S**, plus **A** unpaid-across-years | Parent financial tab calls it without a year today |
| Fee writes, bulk, bulk-class, recalculate | yes | writable year check | **W/R** | Fee year ≠ cash date |
| `GET /installments…` | yes | **unscoped** (*verify*) | **R** via fee, list **S** | |
| `GET /payments` | yes | year → allocation year; none → all | **S** (`yearAllocatedAmount` beside the full amount) | |
| `GET /payments/:id`, `/receipt/:n` | yes | full receipt | **R**, full | Never truncated by the header |
| `GET /payments/student/:id` | yes | all receipts | **A** | Per-student payment history |
| `GET /payments/today|this-week|this-month` | yes | cash date | **D** | |
| `GET /payments/pending-checks|overdue-checks` | yes | open checks | **C** operational | |
| `POST /payments/stats/*` | yes | body `academicYear` optional | **S** | Currently a body field; normalize to the header/tool input |
| `POST /payments`, refund, void, check-status | yes | per-allocation validation | **W/R** | Each target fee year checked |
| `/payment-allocations…` | yes | unscoped (*verify*) | **R**/**S** | |
| `/student-credits…` | yes | credit | **C** | Unallocated credit belongs to no fee year |
| `/rollover/preview|commit`, `GET /rollover/:id` | yes | explicit years | **L** | |
| `/financial-audit-logs…` | yes | audit | **A** | |
| `/financial-notifications/cron/*` | no | jobs | **D** + explicit all-year debt | Trusted entry point, explicit years |

### Profiles, people, dashboards

| Route | Tool | Today | Target | Notes |
| --- | --- | --- | --- | --- |
| `GET /parents…`, search, links | yes | identity | **C** | |
| `GET /parents/:id/children` | yes | year → placements; none → current | **S** | Current parent-link access |
| `GET /teachers…`, assign/unassign | yes | identity, undated assignments | **C** (labelled current) | Assignments carry no history |
| `GET /teachers/:id/students` | yes | year (+`onDate`) or current | **S** | |
| `/profiles/students/:id/academic|attendance|financial|overview` | yes | unscoped (*verify*) | **S** | |
| `/profiles/students/:id/transport` | yes | current | **C** | |
| `/profiles/parents/:id/children` | yes | current (*verify*) | **S** | |
| `/profiles/parents/:id/fees-due` | yes | all unpaid (*verify*) | **A** | Cross-year debt discovery |
| `/profiles/parents/:id/unread-alerts|upcoming-events` | yes | current/dated | **C/D** | |
| `/profiles/teachers/:id/classes|students|pending-grading|schedule-today` | yes | current (*verify*) | **C**/**S**/**D** | |
| `GET /dashboard/widgets`, `/students-by-gender`, attendance monthly | no | year or all/current | **S** | |
| `GET /dashboard/today`, `/operations/kpis` | yes | today | **D** | No today metric in a year not holding today |
| `GET /dashboard/academic/kpis` | yes | *verify* | **S** | |
| `GET /dashboard/teacher/overview|attendance-trend` | yes | active year | **S** (limited role: active) | |
| `GET /dashboard/finance/kpis|trend|expense-breakdown|collection-by-class` | yes | year or active/current | **S** | |
| `GET /dashboard/finance/aging|overdue|reports/aging-detail` | yes | year or **all** | **S**; all-year aging only as a named report | |
| `GET /dashboard/finance/recent-payments` | yes | cash | **D** | |

### Adjacent and shared modules

| Module | Basis | Notes |
| --- | --- | --- |
| Transport (routes, vehicles, drivers, refuels, maintenance, assignments) | **C/D** | No historical relationship model; not filtered |
| Payroll, expenses | **D** | Pay period / expense date; finance dashboards use reporting intervals |
| Events, alerts, announcements, notifications | **C/D** | |
| Behavior rewards, discipline | **D** | Incident date; no selected-year filter in this refactor |
| Subjects, cycles, staff, zones, staff roles | **C** | Catalogs and staff identity |
| Settings, auth tools, users, roles, permissions, access reset, health, search | **C** | Never year-filtered |
| Academic years, transitions, migration issues | **L** / review | Registry needs no selected year |
| Seed controllers and scripts | trusted entry | Explicit years; never browser headers |

## 4. Callers that relied on an omitted year meaning "all years"

Omitted now means the active year for every role. Each former all-year caller
was given an explicitly named all-year read or follows the selected year on
purpose:

1. Fees table "outstanding" scope → `GET /fees/outstanding` (**A**).
2. Students table and teacher cards → the active year's classes, named with a
   year override (`useClasses({ academicYear: activeYear })`).
3. Parent financial tab → follows the selected year (**S**).
4. Student fee view: other years' unpaid fees and the payment history →
   `GET /fees/student/:studentId/all-years` (**A**, with an MCP tool).
5. Student payment history `GET /payments/student/:id` stays **A**.
6. Finance dashboard aging, overdue and aging detail → selected year (**S**);
   the unscoped repository variants were removed.
7. MCP tools called without `academicYear` read the active year; tool inputs
   still advertise `academicYear`, and the body-borne year of
   `POST /fees/mcp/overdue/student`, `/attendance/mcp/*` and
   `/payments/stats/*` moved to the query value `@Year()` reads.
8. Financial reminder jobs use their own repository and explicit dates
   (unchanged). Seeds pass the explicit seed year.

## 4a. Record-year (R) behaviour as implemented

Class, section, routine, grade-source and attendance details check the role
against the record's own year, always (the switch is gone). A fee detail
outside the selected year stays a scoped 404, as it was when a year was sent.
Class and section subresources (students, parents, analytics) read placements
in the class's own year instead of the current projection.

## 5. Frontend surfaces

- Removed: every `get*ForYearApi` helper and every `academicYear` request
  parameter in `services/*Api.ts`; `useYearAwareList`; the
  `AcademicYearHistoryProvider` and its switch. Lists use
  `useYearScopedList`/`useYearScopedDetail`; other reads key on the year and
  send it with `withAcademicYear`.
- Viewing-year consumers (≈35 files) read `useViewingAcademicYear`, links
  (`useViewingYearLink`), calendars and dates; the facade is kept.
- Transport paths: `services/http.ts` JSON methods (via `auth.api`, which
  reuses request options on 401-refresh and 5xx retries), multipart
  `fetchWithAuth` (its own 401 retry), receipt print (`printReceipt.ts`).

## 6. Data readiness and open obligations

Carried from the plan (§10) and the evidence ledger; unchanged by this
inventory: target registry/calendar/enrollment readiness, unresolved
migration issues, non-demo reconciliation, rollback beyond earlier probes,
browser acceptance (previously blocked). Always-on year reads must not be
released against data that is not ready.
