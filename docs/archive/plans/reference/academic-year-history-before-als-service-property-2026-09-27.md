# Academic-year history: shared @Year() context and simpler data access

Status: **REVISED IMPLEMENTATION PLAN — REFACTOR IN PROGRESS**: Phase 0 [inventory](docs/plans/academic-year-scope-inventory.md) written; the Phase 1 gate failed on the installed Najm and waits on the prepared, unpublished Najm release; controller-independent groundwork is recorded in the [evidence ledger](docs/tests/academic-year-history.md) (2026-09-27). No checklist item below is closed yet.

Prepared: **2026-09-25** · Rewritten: **2026-09-27**

This is the authoritative forward plan for the existing whole-school history feature. The owner requested this rewrite after choosing the `@Year()` design. This documentation edit implements no application behavior and runs no migration or deployment.

The previous plan is preserved byte-for-byte as [historical reference](docs/plans/reference/academic-year-history-before-year-context-2026-09-27.md). Its URL-owned selection, feature-switch rollout, `/year-review` routes and list-time context-issue notices are superseded. Its unresolved historical-data, integrity and acceptance obligations remain in force through this plan. Existing dated results remain in the [evidence ledger](docs/tests/academic-year-history.md); they are not acceptance of the new transport or decorator.

## 1. Accepted target

Use one selector, one remembered viewing preference, one shared request mechanism, one `@Year()` decorator, and ordinary repository methods with year filters.

- Remove `ACADEMIC_YEAR_HISTORY_ENABLED` and runtime branches when the complete refactor is ready. Keep the year selector; remove the enable/disable feature switch.
- Every normal year-dependent read uses a validated year. Missing selection means active year for all roles, including administrators; it never means all years.
- The shared HTTP layer automatically supplies `X-Academic-Year`. Features stop repeating `?academicYear=` and duplicate `get...ForYearApi` helpers.
- `@Year()` injects a resolved year after authentication and year-access validation. `AcademicYearValidator.resolve()` owns resolution/validation; `AcademicYearService` keeps lifecycle operations.
- Services receive explicit arguments; repositories receive required year filters. Consolidate `getAll()` and `getAllForYear()` where they represent the same list.
- Centralize year-aware cache keys and request binding. Remembering selection is separate from caching response data.
- Apply this to all year-dependent modules while retaining explicit all-year reports and current/shared resources.
- Preserve the same pages, forms, actions, permissions and design language. No archive app, historical-edit toggle, reopening requirement, or age-only approval.

## 2. Current baseline and evidence

Reinspect the working tree before implementation: substantial uncommitted work exists. Preserve unrelated and overlapping edits; do not reset, restore or stage broadly.

| Current source | Refactor consequence |
| --- | --- |
| `academicYears/AcademicYearService.ts` resolves labels/record years through `AcademicYearRepository.findWithActivePointer()` and private access checks | Move that behavior into the existing validator; preserve the combined registry/active-pointer lookup and avoid circular dependencies. |
| `academicYears/academicYearAccess.ts` contains flag-dependent `resolveViewingYear`, `ensureRecordYearAllowed` and label checks | Replace branching with required year context and unconditional access checks. Audit every caller before removing helpers. |
| `AcademicYearValidator.ts` already owns existence/calendar assertions | Extend it; do not add a competing validator or role catalog. |
| `StudentRepository.ts` has annual/daily enrollment-placement reads alongside current-student reads | Reuse historical SQL; consolidate equivalent methods without substituting current class joins. |
| `features/AcademicYears/` uses URL ownership, `AcademicYearHistoryProvider` and `useYearAwareList` | Replace selection ownership and dual request paths; preserve useful calendar and form behavior. |
| `services/http.ts` has JSON methods plus multipart fetch and authentication retry | All paths must capture and retain the same request year, including retry. |
| Root `app/layout.tsx` provides the flag above pages and dialog host | Remove the flag provider; ensure the replacement domain state also reaches dialogs. |
| Installed `najm-core` has request context, DI and parameter metadata, but no `@Year()` | Prove supported injection with a real-container spike before migrating controllers. |
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

Evolve `features/AcademicYears/` into the single browser selection owner using the established feature-owned state pattern. Preserve `useViewingAcademicYear()` as a public facade where useful. State includes initialization, mode (`active` or explicit label), and resolved calendar. It is not another Najm UI/theme/auth provider.

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
| `@Year()` integration | Normalize input, invoke validator after auth, inject immutable resolved year |
| `AcademicYearValidator` | Resolve selection/default/record year; validate Settings, registry and existing access policy |
| `AcademicYearService` | Create, verify, activate, close and lifecycle orchestration |
| Domain service | Business rules, explicit arguments, record/date consistency, writes |
| Domain repository | Required year/domain filters and ownership SQL; no headers/storage/preferences |

Move existing resolution and record-year access checks into the validator without losing `findWithActivePointer()` behavior. It performs no lifecycle writes. Preserve errors: malformed year 400; missing Settings 409; unknown year 404; hidden draft 404; disallowed other year 403. Pin actual HTTP/MCP status mapping, including DTO validation failures.

Memoize only within an authenticated request/tool invocation, keyed by actor and normalized selection. No mutable selected year on singleton services, global variables or shared containers. Mixed-year allocations require checking each target year; one selected year does not authorize every target. Jobs/seeds receive explicit validated context through trusted entry points.

### 5.2 Prove supported decorator integration first

`@Year()` is a proposed School decorator, not an installed Najm feature. The initial spike must prove:

- Auth and route policy precede year resolution; asynchronous validation completes before controller invocation and before repository reads.
- Decorated indexes/handler arity work with the installed parameter resolver, including a later `@User()` argument.
- Real REST and MCP requests inject the validated year, not just direct test calls supplying fake arguments.
- Parallel requests and multiple tool calls cannot exchange request state.
- The adapter uses public supported DI/metadata/context extension points. Do not monkey-patch private resolver code or manufacture undocumented metadata.

A `@Headers()` alias only extracts text. Do not assume `@Ctx('year')` extracts a context field; inspect the installed runtime. If public integration cannot support validated injection, document the missing public Najm extension as a prerequisite before mass edits. School consumes only a published exact version with overrides/lockfile; the sibling Najm checkout remains read-only here. Package changes/publication require a separate workstream. Do not quietly substitute a fake decorator.

### 5.3 Target Student flow

Illustrative target, subject to the integration gate; retain existing response/MCP decorators and query validation in the full implementation:

```ts
// StudentController
@Get()
@CanList()
async getStudents(@Year() year: ResolvedAcademicYear) {
  return this.studentService.getAll(year.id);
}

// StudentService
async getAll(academicYearId: string) {
  return this.studentRepository.getAll({ academicYearId });
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

Pass the resolved year object rather than only ID when a service needs calendar/status/label. `onDate` requires a valid date inside the resolved reporting interval. Share query construction while preserving the distinct annual versus dated placement rule. Do not merge genuinely different report queries just to reduce method count.

Consolidate equivalent `getAllForYear`, `getByIdForYear` and old no-year methods into normal filtered methods. Audit internal callers, jobs, seeds and uniqueness lookups: identity uniqueness must not become year-scoped accidentally. Keep real all-year operations explicitly named. Each domain owns its SQL; do not create a generic repository that guesses all domain year rules.

### 5.4 Writes

`@Year()` provides context, not permission or an instruction to rewrite the target's year. Creates validate year against class/section, enrollment and event date. Updates derive authoritative context from the target and validate actor/context compatibility. Cover bulk, nested student/fee creation, imports and MCP.

Capture form year on opening. Switching uses the existing dirty-form convention and resets incompatible drafts. Submitted mutations and retries retain original year, payload and idempotency key; invalidate that year's affected caches after completion even if the user has switched. Activation alone must not forbid an otherwise authorized old-year edit.

Payments keep their actual validated date; selection does not backdate them. Validate each fee/allocation. Completed cash totals use settlement date when present, otherwise payment date; preserve pending/bounced/voided/refund/credit rules and exact decimal arithmetic.

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
- MCP clients may have no browser header. Keep optional `academicYear` tool input via shared schema/transport handling; normalize into `@Year()` with the same default/conflict/access rules. The injected trusted object is never supplied directly by the model.
- An MCP HTTP request/session can execute multiple tools: resolve/cache per authenticated tool invocation, not once for the enclosing request or session. Test batching and direct tool invocation.
- Verify schema generation and decorated parameter indexes; a custom decorator does not automatically create a usable tool argument.
- Jobs/seeds use explicit target years or documented server active defaults under existing authorization. Update constructor/container registrations after dependency moves. Repositories never require browser headers.
- Keep browser imports limited to contracts; use declared exports. Preserve `.load(moduleObject)`, the existing auth/session adapters, sidebar state owner, one UI provider and current Next config.

## 9. Implementation phases and gates

Implement reviewable phases while preserving dirty work. Release a coherent client/server contract after acceptance; do not deploy partially converted behavior or introduce a replacement feature flag.

| Phase | Deliverable | Exit gate |
| --- | --- | --- |
| 0. Inventory/baseline | Endpoint/tool/internal-caller matrix, shared/all-year exceptions, versions, data readiness, existing failures | Every surface has an owner/year basis/migration path |
| 1. Contracts/decorator spike | Resolved-year types, normalized transports, validator resolution, real `@Year()` integration | Auth ordering, async injection, errors, argument positions and concurrent REST/MCP isolation pass; any published Najm prerequisite resolved |
| 2. Student vertical slice | Consolidated list/detail/dated roster, shared client transport/query adapter | Historical class and dated transfer work with one API helper and matching key/header; omitted year defaults active |
| 3. Domain rollout | Academic, finance, routines, profiles, reports/dashboard and internal callers | Domain/year/ownership consistency, mixed-year money and explicit all-year surfaces verified |
| 4. Selection/UI cleanup | Remembered tab-local state, deep-link compatibility, centralized caching, remove per-link propagation/duplicate wrappers | Reload, two users/tabs, rapid switching, forms, retries and dialogs retain correct scope |
| 5. Remove flag/legacy defaults | Remove env/layout/provider/helper branches and old Settings bypass; preserve lifecycle prerequisites | No runtime flag dependency; normal omitted year always active; no unscoped access bypass |
| 6. Acceptance/reconciliation | Automated, PostgreSQL, authenticated REST/MCP, browser, rollback and evidence | New contract independently accepted; historical data gaps reviewed and visible |
| 7. Release | Target schema/data, compatible build, deployment/revision/readiness | Separate database, Git/CI/image, deployment, API and browser statuses |

Flag removal must not remove activation safeguards: prepared transition, verified adjacent calendar, allowed dates, locks, idempotency, transactional projections/pointer/audit remain. Ordinary Settings edits must not bypass activation, even without the flag. Define one registered-pointer initialization path for bootstrap.

## 10. Migration and unfinished historical-data obligations

Reuse existing tables/migrations. This transport refactor is not a reason to regenerate or renumber them. Compare the current journal and actual target before any schema change; build success is not live-schema proof.

Carry forward:

1. Audit labels/provenance/active pointer, missing/overlapping placements, class/section/assignment contradictions, orphaned sources, event conflicts and nullable year links on the designated target.
2. Preserve IDs, money, schedules, statuses, installments, payment dates, allocations and credit. Compare before/after counts and stable fingerprints, per-year totals and completed-payment reconciliation.
3. Use recorded dates/reviewed evidence. Fees, current class, admission and row creation dates cannot invent historical continuous enrollment. Preserve unresolved rows/issues with evidence, proposed resolution, reviewer and audit.
4. Keep backfills deterministic, resumable, idempotent, checkpointed and transactional. Establish cutoffs and reconcile concurrent writes before normal reads change, using compatibility writes or a maintenance window where needed.
5. Enforce relational consistency, interval overlaps, historical retention and justified indexes after reconciliation. Contract required references after the rollback window; preserve issue/audit history.
6. Maintain deterministic two-year fixtures: promotion, repeat, graduate, withdrawal, entrant, midyear transfer, changed assignments, fee-only student, mixed-year receipt, pending/settled/bounced states and unresolved sources.
7. Separate academic transition and fee rollover. Preview mappings/capacity/conflicts; commit with idempotency hash/outcomes. Preserve prior history and committed phases through retries/failures.
8. Extend rollback beyond previously reported placement/projection/audit probes, including concurrent activation, transfer overlap and financial rollover failure. Prove PostgreSQL transaction behavior.
9. Preserve child-before-parent fixture cleanup, explicit dates, synthetic actor scope and DI wiring. Historical disposable-demo reset authorization is not permission to reset another database now.
10. Do not restore removed `/year-review` endpoints or list-time context-issue notices. Retain the migration issue workflow and honestly report unresolved attribution.

## 11. Verification contract

### 11.1 Automated cases

- Validator: active default for every role; malformed/unknown/draft/closed years; missing Settings; pointer consistency; record mismatch; unchanged role/error contracts.
- Decorator: real boot/container/auth/tool execution, async failure before query, argument arity, parallel users/years and nested/batched tools with no context leakage.
- Compatibility: header/query/tool inputs, equal/conflicting values, invalid `all`, explicit all-year routes, omitted defaults.
- Repository: annual/latest and dated placement, single ownership/year predicate, list/detail/count agreement, fee-only/unenrolled cases, global uniqueness remains global.
- Selection: per-user/tab restore, active mode, storage failure, invalid preference, entry links, role/account change, no initial wrong-year query.
- Transport/cache: rapid A→B with A resolving last, old cached refetch while B is visible, switch during token refresh, multipart retries, parallel calls, dialogs, old forms and cross-year mutation invalidation.
- Finance: portions and receipt totals, exact decimals, unallocated credit, settlement/payment cash basis, cancelled installments, July boundaries and authorized late old-debt payment.
- Existing calendar/enrollment/grade/transition/ownership tests remain required. Intentionally update legacy-default assertions instead of deleting failing coverage.

### 11.2 PostgreSQL and authenticated acceptance

Use a designated disposable/restored fixture for mutation tests. Verify result sets and amounts, not just generated SQL/mocks. Cover admin/principal/accounting and teacher/parent/student: active/old years, direct IDs, denied writes, revoked links, same-section teacher grade ownership and no-year admin active defaults.

REST/MCP must agree on lists, details, writes and explicit all-year exceptions. Preserve transfer boundaries, report basis, fee-only visibility and unresolved counts. Record fixture identity, exact revision, commands, cleanup and outcomes without secrets. Existing non-demo migration reconciliation and unfinished mutation/ownership paths remain open until exercised.

### 11.3 Browser scenario

1. Administrator switches Students from active to past year; Adam shows historical class and dated sections before/after transfer.
2. Normal navigation, profile dialogs, fees, attendance, grades, reports and print retain context without repeated URL decoration.
3. Refresh/reopen and open another tab; select different years and verify each tab's reads/writes. Switch account and verify no preference/data crossover.
4. Delay network responses and switch rapidly; no stale rows/errors under new heading. Exercise token refresh, multipart and mutations in flight.
5. Admin/principal use normal closed-year academic forms; accounting uses finance actions and remains denied academic edits. Today's old-fee payment retains actual date and cash basis.
6. Limited roles have no historical selector and cannot bypass via header, link, direct ID or MCP. Prove active-year ownership separately.
7. Activate a prepared year on a fixture: active mode updates on context refresh; explicit old-year selection stays. Only lifecycle operations change Settings/current projections.
8. Verify RTL, mobile, keyboard access, empty/error states, incompatible-filter reset and dirty-form interaction.

Unavailable browser infrastructure means BLOCKED/NOT RUN, not passed. Source/API results do not replace UI acceptance.

### 11.4 Commands and reporting

After implementation, start with focused tests and run the repository gates as appropriate, avoiding redundant reruns once final gates pass:

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
| Evidence | Append new results to `docs/tests/academic-year-history.md`; retain dated results and explain superseded transport/flag claims |

No gate below is closed by this rewrite:

- [ ] Endpoint/tool/internal-caller inventory covers all scoped, adjacent, shared and all-year surfaces.
- [ ] Supported `@Year()` injection works with real REST/MCP, async validation and request isolation.
- [ ] One validator owns resolution/access; lifecycle and repository responsibilities stay separate.
- [ ] Normal scoped reads require a validated year; omitted selection means active for all roles.
- [ ] Equivalent methods and duplicate frontend year wrappers are consolidated; authorized all-year operations remain explicit.
- [ ] Remembered selection and shared infrastructure keep key/header/form/retry aligned across users/tabs.
- [ ] Flag and old unscoped-default branches are gone without removing lifecycle or permission checks.
- [ ] Enrollment/placement/source history, migration issues and exact financial invariants are preserved.
- [ ] Normal permitted closed-year actions retain existing permissions and business-date semantics.
- [ ] Remaining target-data, role/mutation, retention and rollback obligations have explicit outcomes.
- [ ] Automated, PostgreSQL, authenticated REST/MCP and browser acceptance are recorded separately for this refactor.
- [ ] Release/rollback compatibility and exact live revision/readiness are verified when deployment is undertaken.

The historical reference preserves earlier progress and detailed obligations. This file defines the target; the evidence ledger records what has actually been proved. A working decorator or selector alone does not complete the feature.
