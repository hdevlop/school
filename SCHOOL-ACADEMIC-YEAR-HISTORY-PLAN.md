# Academic-year history: shared @Year() context and simpler data access

Status: **REVISED PLAN — SERVICE PROPERTY INTEGRATION NOT YET VERIFIED**. The existing [inventory](docs/plans/academic-year-scope-inventory.md) records the earlier controller-parameter integration and published package adoption. Those results do not prove the new ALS-backed service property. Application rollout starts with **Alerts**, then proceeds alphabetically, completing implementation and acceptance for each module before starting the next. No new test result is claimed by this edit.

Prepared: **2026-09-25** · Rewritten: **2026-09-27**

This is the authoritative forward plan for the existing whole-school history feature. The owner requested this rewrite after choosing the `@Year()` design. This documentation edit implements no application behavior and runs no migration or deployment.

The immediately preceding parameter-based plan is preserved byte-for-byte in [this reference](docs/plans/reference/academic-year-history-before-als-service-property-2026-09-27.md). Its controller-to-service year arguments and Students-first rollout are superseded here. **Do not run lint, build, tests or seed operations for this documentation change.** During implementation, prepare each module and its tests for the owner's visual review before executing that module's verification; then record results before advancing.

The previous plan is preserved byte-for-byte as [historical reference](docs/plans/reference/academic-year-history-before-year-context-2026-09-27.md). Its URL-owned selection, feature-switch rollout, `/year-review` routes and list-time context-issue notices are superseded. Its unresolved historical-data, integrity and acceptance obligations remain in force through this plan. Existing dated results remain in the [evidence ledger](docs/tests/academic-year-history.md); they are not acceptance of the new transport or decorator.

## 1. Accepted target

Use one selector, one remembered viewing preference, one shared request mechanism, one `@Year()` decorator, and ordinary repository methods with year filters.

- Remove `ACADEMIC_YEAR_HISTORY_ENABLED` and runtime branches when the complete refactor is ready. Keep the year selector; remove the enable/disable feature switch.
- Every normal year-dependent read uses a validated year. Missing selection means active year for all roles, including administrators; it never means all years.
- The shared HTTP layer automatically supplies `X-Academic-Year`. Features stop repeating `?academicYear=` and duplicate `get...ForYearApi` helpers.
- `@Year()` on a service property reads the validated year from Najm's existing request ALS store through a dynamic getter. Resolve asynchronously once per authenticated operation before entering the service. `AcademicYearValidator` owns resolution/validation; `AcademicYearService` keeps lifecycle operations.
- Controllers call ordinary service methods without repeated year arguments. Services read their year property at operation entry; repositories receive explicit required year filters. Consolidate `getAll()` and `getAllForYear()` where they represent the same list. Explicit source/target years remain for cross-year operations.
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
| Existing `requestYear.ts` uses `createParamDecorator(resolveRequestYear)` | This resolves controller parameters today. A service property requires a separately proved dynamic getter and pre-handler resolver; do not assume the current decorator supports properties. |
| Record-year helpers and remaining flag-dependent callers are being refactored | Re-inventory current helpers, including `academicRecordYear.ts`, before changing/removing them; earlier filenames and progress are not current proof. |
| `StudentRepository.ts` has annual/daily enrollment-placement reads alongside current-student reads | Reuse historical SQL; consolidate equivalent methods without substituting current class joins. |
| `features/AcademicYears/store/yearSelectionStore.ts` already owns browser selection and shared HTTP defaults | Extend this single owner where needed; audit remaining URL/provider/dual-path callers rather than creating a second store. |
| `services/http.ts` has JSON methods plus multipart fetch and authentication retry | All paths must capture and retain the same request year, including retry. |
| Remaining flag/layout/dialog integration must be checked in the current tree | Remove obsolete branches when covered; retain one context reaching pages and dialogs. |
| Installed Najm/DI has an existing `AlsStore`; normal property injection assigns a resolved value during construction | Reuse the store with a dynamic property getter. Ordinary token injection into a singleton would capture a request value and is insufficient. |
| Installed MCP `invokeTool` inherits its caller's ALS scope rather than creating one | Establish a fresh child scope per tool invocation, including batches/direct calls, before resolving a year. |
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
| Shared request/tool adapter | After authentication and policy, normalize input, await validator, put an immutable resolved year in this operation's existing ALS scope |
| Service property `@Year()` | Synchronously read that operation's resolved year through a read-only dynamic getter |
| `AcademicYearValidator` | Resolve selection/default/record year; validate Settings, registry and existing access policy |
| `AcademicYearService` | Create, verify, activate, close and lifecycle orchestration |
| Domain service | Read `this.year` at operation entry; business rules, record/date consistency, writes; no container/store handling |
| Domain repository | Required year/domain filters and ownership SQL; no headers/storage/preferences |

Reuse existing resolution and record-year access checks in the validator without losing `findWithActivePointer()` behavior. It performs no lifecycle writes. Preserve errors: malformed year 400; missing Settings 409; unknown year 404; hidden draft 404; disallowed other year 403. Pin actual HTTP/MCP status mapping, including DTO validation failures.

Store the resolved value only within an authenticated request/tool invocation, bound to its actor and normalized selection. The singleton property must never hold a mutable selected year. Mixed-year allocations require checking each target year; one selected year does not authorize every target. Jobs/seeds receive explicit validated context through trusted entry points.

### 5.2 Prove supported decorator integration first

The service-property form of `@Year()` is a proposed School integration. The current parameter decorator is not proof of it. The small infrastructure prerequisite must prove all of the following before the Alerts slice:

- Reuse the actual server container's existing `AlsStore` and a dedicated academic-year key. Infrastructure may bind to that store through supported injection; domain services do not call `Container`, store accessors or static default containers. Do not construct another `AsyncLocalStorage`.
- Auth/route policy and request validation complete before domain execution. Asynchronous year resolution completes before scoped reads or writes. The wrapper surrounds the **awaited handler and nested calls**; a guard that exits its child scope before invoking the handler is insufficient.
- Install a read-only getter that reads the current ALS scope on every access. Do not use ordinary `@Inject(ALS_TOKEN)`, a constructor argument, or an initializer that snapshots the first request. Verify TypeScript property emit does not shadow the getter with an own `undefined` field.
- A missing context fails with an explicit internal/context error. The getter never silently resolves active year, performs asynchronous work, or accepts a client-supplied trusted object. Active fallback happens only at the validated transport boundary.
- Shared/auth/health/settings/catalog routes do not acquire compulsory year resolution. Declare scoped route groups through one supported integration and inventory exceptions; do not replace repeated parameters with repeated manual resolver calls.
- On the same singleton instance, concurrent admin 2025–2026 and principal 2026–2027 operations retain their own years through delayed awaits and nested service/repository calls. Also prove parallel requests from the same account with different headers.
- Each MCP invocation runs in its own child ALS scope, inherits the authenticated actor/permissions, clears inherited selected-year state and resolves its own input. Cover batched, nested and direct invocations; the outer HTTP request/session is not the cache boundary. Preserve scope until invocation completion, including failure.
- Use real boot/container and authenticated REST/MCP paths. Preserve existing parameter decorators such as `@User()`, handler arity, tool schemas and error mapping while removing year parameters.
- Use public supported DI/metadata/context extension points. Do not monkey-patch private injection/resolver internals or manufacture undocumented metadata.

A `@Headers()` alias only extracts text. If the installed public hooks cannot support the getter or scoped execution, record the missing Najm extension as a blocking prerequisite. School consumes only a published exact version with overrides/lockfile; the sibling Najm checkout remains read-only here. Package changes/publication require a separate workstream. Do not quietly substitute constructor injection or claim parameter-decorator results prove this design.

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
  @Year()
  private readonly year!: ResolvedAcademicYear;

  async getAll() {
    const year = this.year;
    return this.studentRepository.getAll({ academicYearId: year.id });
  }
}

// StudentRepository
async getAll(filters: StudentListFilters) {
  // Existing enrollment/placement SQL; latest placement for annual reads.
  // One WHERE combines year, other filters and ownershipCondition().
  // No fallback to students.classId for historical class.
}

type StudentListFilters = {
  academicYearId: string;
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
  -> Controller -> Service.this.year getter -> Repository({ academicYearId })
  -> response + resolved-year metadata -> original captured cache key

Admin request:     scope A -> 2025–2026 -> same singleton service -> 2025–2026 rows
Principal request: scope B -> 2026–2027 -> same singleton service -> 2026–2027 rows
```

The principal example applies only to routes the principal can already access. A selected year never changes route permissions.

Consolidate equivalent `getAllForYear`, `getByIdForYear` and old no-year methods into normal filtered methods. Audit internal callers, jobs, seeds and uniqueness lookups: identity uniqueness must not become year-scoped accidentally. Keep real all-year operations explicitly named. Each domain owns its SQL; do not create a generic repository that guesses all domain year rules.

### 5.4 Writes

`@Year()` provides context, not permission or an instruction to rewrite the target's year. Creates validate year against class/section, enrollment and event date. Updates derive authoritative context from the target and validate actor/context compatibility. Cover bulk, nested student/fee creation, imports and MCP.

Capture form year on opening. Switching uses the existing dirty-form convention and resets incompatible drafts. Submitted mutations and retries retain original year, payload and idempotency key; invalidate that year's affected caches after completion even if the user has switched. Activation alone must not forbid an otherwise authorized old-year edit.

Payments keep their actual validated date; selection does not backdate them. Validate each fee/allocation. Completed cash totals use settlement date when present, otherwise payment date; preserve pending/bounced/voided/refund/credit rules and exact decimal arithmetic.

### 5.5 Correcting a student's previous year

Keep the existing Student Edit workflow. Shared identity/contact changes remain shared across years. Year-specific class, section, enrollment status and placement corrections target the selected year's enrollment through `StudentEnrollmentService` and its validator; the student service must not update projection fields directly.

For multiple placements, require the actual enrollment/placement being corrected and validated effective dates. Do not turn a correction into an invented transfer. Enforce non-overlap, class/section/year agreement, one enrollment per student/year, concurrent-edit protection and transactional actor/before/after/reason audit. Check impacts on linked attendance, grades and other dated records. Missing historical enrollment stays unresolved until an explicit justified repair.

Authorized admin/principal corrections in 2024–2025 or 2025–2026 use normal permissions, including closed-year rules, without reopening or an age-only approval. Editing old enrollment must leave the current 2026–2027 projection unchanged. Corrections to the current year maintain the projection through its existing single owner. The Students slice must explicitly remove any blanket DTO/validator rejection that prevents these legitimate edits while preserving shared-field and enrollment integrity.

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

**Finish one module, including its tests and real database checks, before starting the next. Alerts is first.** Do not implement several business modules and postpone tests to the end. Preserve dirty work and show a small reviewable diff for each slice. This plan does not authorize executing tests before the owner's requested visual review.

### 9.1 Limited prerequisites before Alerts

1. Refresh endpoint/tool/internal-caller inventory, installed package versions, existing failures and scope classifications. Keep the prior inventory as dated evidence; the order below supersedes its Students-first rollout.
2. Implement only the shared infrastructure required by Alerts: supported service property, authenticated REST/tool scope wrapper, existing validator integration and minimal shared transport/query binding. Write its focused tests. Complete visual review, then prove section 5.2 with real container/transport execution.
3. Prepare the dedicated PostgreSQL fixture and module test harness in section 9.4; review seed code/target, then run migrations and seed only on that explicitly designated disposable database. Record idempotency, migration head and manifest checks.

Academic registry/resolution, auth context and seed infrastructure are necessary dependencies, not an excuse to migrate other business modules first. Existing Students/other-module changes remain preserved and unaccepted for the new design until their turn. If public framework support is missing, report that gate as BLOCKED and resolve the published dependency before rollout.

### 9.2 Mandatory cycle for every module

1. **Inspect:** enumerate every endpoint/tool, internal caller, list/detail/count, export, bulk/nested mutation and current/shared/all-year exception. Decide its year basis from actual schema and business rules.
2. **Implement this module:** thin controller; `@Year()` property only where needed; business orchestration in service; reusable domain assertions/errors in validator; DTO validation in `*Dto.ts`; explicit year/ownership predicates in repository. Preserve response contracts and permissions.
3. **Write its tests in the same slice:** targeted unit/contract tests plus real PostgreSQL fixtures and authenticated REST/MCP cases. Add only this module's fixture records to the ten existing students. A genuinely shared module gets tests proving its shared semantics remain unchanged.
4. **Owner visual review:** present implementation, test code, schema changes if any and expected fixture results. Until visual approval, mark execution NOT RUN; do not lint, build, test or run new seed changes. Fix requested changes within this module.
5. **Execute after approval:** focused tests first, then that module's real PostgreSQL and authenticated transport cases. Verify actual rows/amounts and nonselected-year data before/after. Run the smallest applicable lint/type/build/locale gates permitted by that review and needed for the change. Never substitute mocks for the database gate.
6. **Review UI where affected:** record manual owner/browser acceptance separately. Missing browser infrastructure is BLOCKED/NOT RUN; missing database or transport access blocks that gate. An applicable blocked gate prevents moving on, unless the owner explicitly changes the acceptance scope and the deferred obligation is recorded.
7. **Record and advance:** append commands, revision/diff identity, fixture manifest, expected/actual results, cleanup and outstanding issues to the evidence ledger; update this plan's row. Advance only when the current module's required gates pass and the review checkpoint is satisfied.

Use this evidence checklist for each module (link its completed entry from the table):

```text
Module:
Scope and endpoint/tool inventory:
Implementation + test files:
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
| 01 | `alerts` | First complete slice; type/scope decision, reads, counts, status and bulk writes | PENDING |
| 02 | `announcements` | Audience, dates/year basis, visibility and mutations | PENDING |
| 03 | `assessments` | Source/year, assignments, sections and graded-source restrictions | PENDING |
| 04 | `attendance` | Dated roster, stored year, corrections and transfer boundaries | PENDING |
| 05 | `behaviorRewards` | Event/student context and history | PENDING |
| 06 | `classes` | Registered year, references and safe historical edits | PENDING |
| 07 | `classRoutines` | Schedule year, assignments and publication | PENDING |
| 08 | `cycles` | Establish shared catalog semantics and consumers | PENDING |
| 09 | `dashboard` | Every submodule/metric with documented academic or financial basis | PENDING |
| 10 | `discipline` | Event dates, student context and corrections | PENDING |
| 11 | `events` | Calendar/reporting scope and shared exceptions | PENDING |
| 12 | `exams` | Registered year, sections and grade source integrity | PENDING |
| 13 | `financial/allocations` | Target fee years, partial amounts and atomic writes | PENDING |
| 14 | `financial/auditLog` | Audit access/retention; no history hidden by accidental filtering | PENDING |
| 15 | `financial/credits` | Unallocated balances and explicit cross-year use | PENDING |
| 16 | `financial/expenses` | Business-date reporting and corrections | PENDING |
| 17 | `financial/fees` | Charged year, fee-only students and closed-year debt | PENDING |
| 18 | `financial/feeTypes` | Shared catalog and global constraints | PENDING |
| 19 | `financial/installments` | Fee year, cancellation and schedule integrity | PENDING |
| 20 | `financial/notifications` | Debt scope and notification behavior | PENDING |
| 21 | `financial/payments` | Mixed receipts, cash basis, status and exact decimals | PENDING |
| 22 | `financial/payroll` | Period/assignment reporting and shared exceptions | PENDING |
| 23 | `financial/rollover` | Explicit source/target, preview, idempotency and rollback | PENDING |
| 24 | `financial/utils` | Supporting calculations/callers; no invented CRUD endpoints | PENDING |
| 25 | `grades` | Valid source year, teacher ownership and historical correction | PENDING |
| 26 | `health` | Verify actual route/model scope; shared infrastructure stays shared | PENDING |
| 27 | `notifications` | Recipient/ownership, history and current/shared delivery state | PENDING |
| 28 | `parents` | Shared identity, current links and selected-year child context | PENDING |
| 29 | `profiles` | Shared identity plus explicitly scoped related data | PENDING |
| 30 | `search` | Year/ownership consistency across result types | PENDING |
| 31 | `sections` | Parent class year, references and placement integrity | PENDING |
| 32 | `settings` | Shared settings; active pointer only through lifecycle | PENDING |
| 33 | `staff` | Shared identity; classify dated relationships | PENDING |
| 34 | `studentEnrollments` | Dated placement, corrections, audit and projection ownership | PENDING |
| 35 | `students` | Shared identity and same-form historical corrections, section 5.5 | PENDING |
| 36 | `subjects` | Shared catalog/assignment distinction and grade references | PENDING |
| 37 | `teachers` | Shared identity, assignment years and ownership | PENDING |
| 38 | `transport/drivers` | Shared identity and assignment history | PENDING |
| 39 | `transport/maintenance` | Dated reporting and vehicle references | PENDING |
| 40 | `transport/refuels` | Dated reporting, amounts and vehicle references | PENDING |
| 41 | `transport/studentRoutes` | Enrollment/route year and historical corrections | PENDING |
| 42 | `transport/vehicleAssignments` | Dated assignment intervals and ownership | PENDING |
| 43 | `transport/vehicles` | Shared vehicle identity and historical references | PENDING |

Audit every folder against this queue before coding. Supporting modules `academicSources`, `academicYearMigrationIssues`, `academicYears`, `academicYearTransitions`, `accessReset`, `auth-tools` and `seed-data` belong to the prerequisite/support inventory and final lifecycle/security/reconciliation acceptance; their relevant tests accompany any dependency change. They are not silently excluded or permission to start several business slices. Audit module-root handlers as well as listed children. Add newly discovered business modules in their alphabetical position.

Earlier slices may use existing later-module APIs and baseline fixtures. If a dependency must change to finish the current slice, keep that change minimal, test the affected contract now and record it; leave the dependent module's broader migration for its own turn. A dependency cannot justify postponing the current module's database gate.

#### Alerts first: exact acceptance scope

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

Proposed artifacts **to create, not existing runnable commands**: a dedicated acceptance seed under `packages/seed/src/scripts/academicYears/`, a shared fixture manifest, a PostgreSQL/transport harness and per-module suites beginning with Alerts. Add documented Bun root scripts for seeding this fixture and running one named module after verifying the repository's actual runner conventions. The first application suite executed is Alerts; infrastructure/fixture checks are prerequisites.

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
- Decorator: dynamic service getter with real boot/container/auth/tool execution, async failure before query, field-emission compatibility, preserved non-year parameter arity, missing-context failure, singleton reuse and parallel users/years with no leakage. Prove independent nested/batched/direct tool scopes and restored parent scope after success/failure.
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
7. Activate a prepared year on a fixture: active mode updates on context refresh; explicit old-year selection stays. Only lifecycle operations change Settings/current projections.
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

No gate below is closed by this rewrite:

- [ ] Endpoint/tool/internal-caller inventory covers all scoped, adjacent, shared and all-year surfaces.
- [ ] Supported `@Year()` service property uses the existing ALS store, dynamic getter and pre-handler resolution; no singleton snapshot or domain container access.
- [ ] Concurrent users/tabs and nested/batched/direct MCP calls have isolated years under the same singleton services.
- [ ] Dedicated real PostgreSQL seed is reviewed and idempotent: exactly ten students, three years and 7/8/8 baseline enrollment membership.
- [ ] Alerts completes implementation, test writing, visual approval and real database/transport acceptance before Announcements begins.
- [ ] Every subsequent module completes section 9's cycle alphabetically; no required test deferred until after a multi-module implementation batch.
- [ ] One validator owns resolution/access; lifecycle and repository responsibilities stay separate.
- [ ] Normal scoped reads require a validated year; omitted selection means active for all roles.
- [ ] Equivalent methods and duplicate frontend year wrappers are consolidated; authorized all-year operations remain explicit.
- [ ] Remembered selection and shared infrastructure keep key/header/form/retry aligned across users/tabs.
- [ ] Flag and old unscoped-default branches are gone without removing lifecycle or permission checks.
- [ ] Enrollment/placement/source history, migration issues and exact financial invariants are preserved.
- [ ] Normal permitted closed-year actions retain existing permissions and business-date semantics.
- [ ] Normal Student Edit supports authorized past-year enrollment/placement corrections without changing active projections or inventing history.
- [ ] Remaining target-data, role/mutation, retention and rollback obligations have explicit outcomes.
- [ ] Automated, PostgreSQL, authenticated REST/MCP and browser acceptance are recorded separately for this refactor.
- [ ] Release/rollback compatibility and exact live revision/readiness are verified when deployment is undertaken.

The historical reference preserves earlier progress and detailed obligations. This file defines the target; the evidence ledger records what has actually been proved. A working decorator or selector alone does not complete the feature.
