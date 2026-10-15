# Whole-school academic-year history and viewing plan

Status: **IMPLEMENTATION IN PROGRESS — WHOLE-SCHOOL VIEWING NOT ENABLED**

Current implementation note (2026-09-27): The administrator `/year-review` endpoints, `reviewYear` methods, and list-time context-issue notices described later in this plan were removed at the owner's request. Those passages record the earlier design, not the current API or acceptance contract. Year-aware reads, create/edit validation, and the academic-year migration issue workflow remain in scope.

Prepared: **2026-09-25** · Last updated: **2026-09-26**

Scope: historical viewing across students, classes/sections, fees/payments, attendance, grades, related academic records, dashboard summaries, reports, and exports.

Requirement clarification: **Admins and finance-responsible users can work in a selected past year using the same permitted actions and forms as the current year. No separate archive-edit mode, year reopening, or additional approval is required just because a record is old.** Finance users retain their existing financial scope; this does not grant academic editing permissions.

This is an implementation handoff. Source inspection supports the findings below; no live database audit, migration, implementation, deployment, or connected acceptance was performed while writing it. Proposed files, tables, routes, and commands are explicitly described as new work.

Implementation has since started. The current source changes, verification boundaries, and open gates are tracked in [`docs/tests/academic-year-history.md`](docs/tests/academic-year-history.md). Section 13 compares the evidence at plan creation with the current state, and section 14 records progress slice by slice.

## 1. User requirement and expected result

The user observed that changing the year in Settings leaves much of the same data visible. They want users to view past years across the whole school, including students, classes, fees, attendance, and grades.

Provide one school-year selector in the authenticated application shell. Example:

> Active school year: 2026–2027 · Viewing: 2025–2026

Changing the viewing year must change all applicable lists, detail tabs, totals, dropdowns, reports, and exports for that user. Selection alone must not change the school's active year, move students, generate fees, or alter another user's view. Authorized admins and finance users can then use normal actions in that selected year, with the same permissions and record-integrity rules as the current year.

Keep permanent identities such as student profiles, parent accounts, staff profiles, and subject catalogs. Preserve their year-specific relationships separately. A student may appear in multiple years, with different enrollment status, class, section, attendance, grades, and fees.

## 2. Existing source findings

Recheck these files at implementation time; unrelated work was already present during planning. Rows describe the code as found before implementation, except the two fee-screen rows, which describe current behavior; section 14 records what has changed since.

| Source | Observed behavior / implementation consequence |
| --- | --- |
| `packages/server/src/modules/settings/SettingsService.ts` | `update()` saves the settings record. It does not create enrollments, promote students, or perform a school-wide rollover. |
| `apps/dashboard/src/features/Settings/hooks/useSettings.tsx` | `useActiveAcademicYear()` reads `currentAcademicYear`; saving settings invalidates queries. The principal gap is inconsistent year semantics, not merely missing cache invalidation. |
| `packages/server/src/modules/students/studentSchema.ts` | Student has one `classId`, `sectionId`, `status`, and initial `enrollmentDate`. No yearly enrollment table exists here. |
| `packages/server/src/modules/students/StudentService.ts` | Creation and update write class/section on the permanent student record. Historical membership cannot be reconstructed from this row alone. |
| `packages/server/src/modules/students/StudentRepository.ts` | `getAll()` applies ownership scope but no year filter; joins the student's current class and section. |
| `packages/server/src/modules/students/StudentGuards.ts` | Teacher ownership currently traverses the student's current section. Historical access needs an explicit year-aware policy. |
| `packages/server/src/modules/classes/classSchema.ts` | Classes already have an `academicYear` label and a name/year uniqueness rule. |
| `apps/dashboard/src/features/Classes/hooks/useClasses.tsx` | Most class lists filter by the active year in the client; `allYears` bypasses that filter. |
| `packages/server/src/modules/sections/sectionSchema.ts` | Sections belong to classes, so their year is inherited. |
| `packages/server/src/modules/teachers/teacherSchema.ts` | Teaching assignments connect teachers, classes, sections, and subjects. Preserve these historical relationships. |
| `packages/server/src/modules/financial/fees/feeSchema.ts` | Fees already have `academicYear`; uniqueness is student + fee type + year. Installments belong to fees. |
| `apps/dashboard/src/features/Financial/Fees/components/FeesTable.tsx` | With history off it reads the all-year rows, which now name each fee's year, and shows students with an active-year fee, an unpaid balance from any year, or no fee yet (fixed 2026-09-26; the Paid filter was always empty before). With history on it reads the viewed year's rows and offers a separate unpaid-all-years scope. |
| `apps/dashboard/src/features/Financial/Fees/components/StudentFeesView/index.tsx` | With history off, keeps fees from other years when a balance remains. With history on, shows the viewed fee year from the server and links other years' unpaid fees. |
| `packages/server/src/modules/financial/payments/paymentSchema.ts` and `allocations/allocationSchema.ts` | Payments have dates; allocations connect payment amounts to fees/installments. One payment can need attribution to several fee years. |
| `packages/server/src/modules/financial/rollover/RolloverService.ts` | Existing rollover creates target-year fees. Do not describe it as complete academic enrollment promotion. |
| `packages/server/src/modules/attendance/attendanceSchema.ts` | Attendance has a date, student/staff/teacher references, and section/teaching-assignment context. Some historical links are nullable. |
| `packages/server/src/modules/grades/gradeSchema.ts` | Grades link students to assessments/exams; those sources link to teaching assignments and dates. Source links may be nulled on deletion. |
| `packages/server/src/modules/dashboard/academic/AcademicDashboardService.ts` | Mixes unscoped counts, today's attendance, and all grades. A past-year header alone would give misleading summaries. |
| `apps/dashboard/src/features/Dashboard/hooks/useDashboardHooks.tsx` | Several financial queries already include an academic year. Extend a consistent contract across the remaining widgets. |
| `packages/server/src/modules/classRoutines/ClassRoutineSchema.ts` | Timetables already carry an academic year and section. Integrate their viewing context without changing nested lesson content. |
| `packages/server/src/shared/businessDate.ts` | Business date is system/environment controlled. It is separate from the viewing year. |

## 3. Product decisions and boundaries

### 3.1 Three distinct concepts

1. **Active academic year:** school-wide operational default, changed by an authorized administrator through a validated transition.
2. **Viewing academic year:** selected working context for reads and authorized user actions; defaults to the active year.
3. **Business date:** the actual operational date used by existing payment/attendance rules. Selecting a past year never rewinds it.

Historical viewing means records belonging to a year, with their currently known results and balances. It is **not** an arbitrary historical snapshot of what the database looked like on a past day. For example, a later settlement can change the remaining balance of an old fee. Label reports accordingly; historical “balance as of date” requires separate ledger/audit work and is outside this plan.

### 3.2 Viewing behavior

- Default to the active year when no explicit selection is supplied.
- Offer registered years that the user is allowed to discover; never invent years from a fixed last-five-years list.
- Show an empty state for a valid year with no relevant records. Never silently fall back to current-year data.
- Keep the year visible on desktop/mobile, detail views, printable reports, and exports.
- Admins and finance-responsible users see the same permitted actions in past years as in the current year. No extra edit toggle, correction-only form, reopening step, or year-specific approval is introduced. Existing permissions and financial integrity checks still apply.
- Other roles retain their existing access policy; this clarification does not expand teacher, parent, or student write permissions. Historical academic writes for those roles remain unavailable unless explicitly permitted by the defined policy.
- A future/draft year is also read-only in ordinary screens; preparing it is an administrative workflow.
- Permanent catalogs show “Shared across school years” where necessary. Avoid implying that changing a catalog switches history.
- The active year can remain 2026–2027 while two users independently view 2025–2026 and 2024–2025.

### 3.3 Calendar rules

- Preserve School's September–June instructional/billing defaults and the July 1–14 payment-closeout requirement recorded in previous work.
- Store boundaries per year. A future Settings edit must not reinterpret old attendance, grades, fee schedules, or payment attribution.
- Distinguish instructional/billing dates, a full reporting interval, and the payment-closeout date. July payments must not disappear merely because instruction ends in June.
- Proposed standard reporting interval: September 1 through the following August 31; default instructional/billing interval: September 1 through June 30; normal closeout through July 14 inclusive. Store explicit dates and use half-open ranges internally where appropriate.
- Audit actual payment eligibility rules before changing them: planning inspection did not establish current enforcement of July closeout. July 14 remains the normal closeout milestone, not a blanket prohibition on an authorized admin/finance user resolving old debt later. If a current cutoff blocks that required action, update the rule and its tests explicitly. A late payment uses its actual receipt date and stays allocated to the old fee year.
- Compare date-only values as dates; retain the application's business-date/time-zone contract. Viewing does not introduce a second clock.

### 3.4 Scope limits

This feature does not duplicate users each year, reset demo data, replace the auth framework, change the Najm UI provider, rebuild accounting, or implement a complete version history of names/contact details. Historical academic relationships are preserved; identity/contact fields remain current unless an existing issued document already stores a snapshot.

Transport, payroll, expenses, events, and other adjacent screens must be classified during the inventory: either apply the selected reporting interval using an explicit domain rule, or label the screen as current/shared and avoid misleading archive controls. No promise of archived transport assignments or payroll reconstruction without a supporting data model.

## 4. Proposed data model and single-owner rules

Use additive PostgreSQL/Drizzle migrations. Names below are proposed; follow current repository naming when implementing.

### 4.1 Academic years

New `academic_years` table and `academicYears` server module:

- `id`, unique validated `label` such as `2025-2026` (consecutive years).
- `instructionStartsOn`, `instructionEndsOn`, `reportingStartsOn`, `reportingEndsOn`, `paymentCloseoutOn`.
- `status`: draft, open, or closed; timestamps and audit metadata. Closed marks completed school-year operations; it does not independently block an admin/finance user's otherwise permitted historical actions.
- Calendar provenance for imported years: verified historical configuration or an explicitly recorded assumption requiring review.
- Validate date ordering, label consistency, and nonoverlapping reporting intervals under the standard school calendar.

Use one active-year pointer on Settings, ultimately `activeAcademicYearId`. Keep `currentAcademicYear` as a derived compatibility response field. During expansion, legacy label and pointer updates must occur in the same service transaction; remove independent writable ownership once all consumers migrate. Do not add a second independent `isActive` flag to every year.

Once a year contains records, ordinary Settings updates cannot rewrite its boundaries. An authorized calendar correction needs impact preview, audit, and explicit migration rules.

### 4.2 Enrollment identity and dated placements

New `student_enrollments` table:

- `id`, `studentId`, `academicYearId`, yearly status, `enrolledOn`, optional `leftOn`.
- Unique `(studentId, academicYearId)` for the supported single-school model.
- Preserve the permanent student's initial admission date separately from that year's enrollment start.

New `student_enrollment_placements` table:

- `id`, `enrollmentId`, `classId`, `sectionId`, `validFrom`, nullable `validTo` (exclusive), reason, actor, audit timestamps.
- Multiple nonoverlapping placements allow a midyear section/class transfer without rewriting prior attendance or grades.
- Enforce section belongs to class, class belongs to the enrollment year, valid interval, and at most one open placement per enrollment.
- Prevent overlapping placement intervals with a database constraint where supported, or serialized writes that lock the enrollment and recheck overlap. Concurrent transfers must be tested against real PostgreSQL.
- New enrollment start is required. Imported placement start may only be set from reliable evidence or an explicitly reviewed assumption; otherwise keep an unresolved migration issue.

For year lists, show the latest placement in that year, labeled appropriately for ended enrollments. For dated records/rosters, select the placement valid on the event date. Responses should expose enrollment/placement context instead of pretending the permanent `students.classId` is historical.

Keep legacy student class/section/status columns temporarily for compatibility. A single enrollment service owns any projection updates, transactionally. Ordinary student profile updates must not bypass it. Editing an old enrollment must not overwrite the active year's compatibility projection or enrollment. Permanent identity edits remain shared across years and must be labeled accordingly. Remove or make legacy writes inaccessible after all callers, seeds, MCP paths, and guards migrate.

### 4.3 Domain year links

| Domain | Authoritative year and historical context |
| --- | --- |
| Classes | Add `academicYearId`, derived legacy label; retain unique class name per year. |
| Sections | Inherit year through immutable class association. |
| Teaching assignments | Inherit year through class/section; validate both belong together. Preserve old rows and reference them from historical academic records. |
| Timetables | Reference the registered year, consistent with section's class year. Preserve current schedule/version behavior. |
| Fees | Add registered year reference while preserving existing fee IDs and student/type/year uniqueness. Optional enrollment link may remain unresolved for genuine legacy fees. Never fabricate enrollment from a fee alone. |
| Attendance | Persist an authoritative year for new records and, for student attendance, enrollment/placement context valid on the date. Staff/teacher attendance uses a documented reporting interval and applicable assignment. |
| Assessments/exams | Persist year consistent with teaching assignment and target sections. Validate every `sectionIds` entry, not just the primary assignment. |
| Grades | Resolve through assessment/exam and student enrollment valid for the assessment date; persist sufficient year/context so later source archival cannot erase history. Require exactly one supported source for new grades. |
| Payments/allocations | Year attribution follows the allocated fee. Receipt date remains distinct. Never force a mixed-year receipt into one year. |

Use composite foreign keys or equivalent database constraints where practical for duplicated year references; service validation alone must not allow concurrent contradictory links. Keep IDs stable. Once referenced, moving a class/section/assignment to another year is prohibited; create a new record instead.

### 4.4 Retention and indexes

- Replace destructive historical relationship edits with archive/status transitions where records are referenced. Audit current cascade and `set null` behavior before applying restrictions.
- Referenced years, enrollments, placements, classes, sections, assignments, and grade sources must not be silently deleted by normal UI/API operations.
- Handle user deletion/anonymization through existing policy; year history is not an excuse to retain unauthorized personal data indefinitely.
- Index enrollment `(academicYearId, studentId)`, placement `(enrollmentId, validFrom, validTo)`, class year, event `(academicYearId, date)`, grade year/student, and allocation joins as justified by query plans.
- Update seeds and child-before-parent cleanup ordering locally; do not run a reset to implement or verify production migration.

## 5. Backend and authorization contract

### 5.1 Shared types and resolver

Add a browser-safe `packages/contracts/src/academicYears.ts` with a declared package export, shared label validation, DTO types, and year-context response types. It must import no server package. Keep domain persistence and permissions in `packages/server`.

Add `AcademicYearService` / `AcademicYearRepository` / `AcademicYearValidator` / `AcademicYearController` / DTO/schema/barrel under `packages/server/src/modules/academicYears/`. Add enrollment module equivalents under `studentEnrollments/`. Register modules and schemas through current public barrels and `.load(moduleObject)` integration.

Each module owns its own year logic. `academicYears/` owns only the year registry, its lifecycle (create, verify, activate, close), year resolution (`resolve`), and the generic stored-year-or-date membership rule (`academicRecordYear.ts`). Every other year-scoped query, rule, and administrator year review lives in the module that owns the records: school-wide year reads in the module's main repository, in a section marked as never applying `ownershipCondition()` and used only by year rules and administrator reviews; the year rules in the module's main service; and a `GET /<resource>/year-review/:id` route on the module's main controller, in assessments, exams, grades, attendance, fees, payments, class routines, classes, sections, and student enrollments. No module adds a separate year repository, year service, or second controller. The rules assessments and exams share about their target sections and teaching-assignment context have one owner, `academicSources/`. The year transition lives in `academicYearTransitions/` and the migration-issue review in `academicYearMigrationIssues/`; each deletes and writes only its own table, and asks the owning module when a resolution depends on another record.

Implement one server resolver that validates the requested year, applies access policy, and returns immutable boundaries/status. Proposed query contract: `academicYear=2025-2026` for existing and new read endpoints; database references use IDs internally. Omitted year resolves to active year. Malformed values are validation errors; unknown/inaccessible years use the repository's consistent not-found/access convention. Do not silently accept `all`.

Every scoped response must make the resolved year available, following existing response-envelope conventions. Cache keys include user/permission scope plus year and filters. Year resolution must not be stored in mutable process-global service state.

### 5.2 Proposed API surface

| Route or operation | Contract |
| --- | --- |
| `GET /api/academic-years` | Authorized selector options, active year, lifecycle state; no school-wide record counts leaked to limited roles. |
| `GET /api/academic-years/:id` | Validated year metadata within policy. |
| `POST /api/academic-years` | Authorized creation of a draft year; no student/fee generation. |
| Activation/closure operations under `/api/academic-years/:id/...` | Explicit, audited, concurrency-safe lifecycle actions; never triggered by selector navigation. |
| Existing lists/details/reports/exports | Accept/resolve viewing year consistently, including nested profile endpoints. |
| Enrollment create/transfer/end operations | Authorized explicit commands; validate year, placement, dates, and history retention. |
| Academic-transition preview/commit | Idempotent preparation of target enrollments and optional mapped structure; separate from fee rollover. |
| Administrator year reviews `GET /api/<resource>/year-review/:id` | Served by the main controller of the module that owns the resource (routines, assessments, exams, grades, student and staff attendance, fees, receipts, classes, sections, student enrollments and their dated roster). Grades without a usable source date are reviewed at `GET /api/grades/unassigned-sources`. |

Finalize exact lifecycle route names in Phase 1. Existing MCP tools must use the same DTO/service validation and year defaults as REST. Do not expose new MCP mutation capabilities just to implement a UI selector. Live data verification uses internal Najm MCP first where exposed, otherwise internal REST.

### 5.3 Authorization

- Keep controller/policy layers authoritative; repositories apply policy-derived scope plus year predicates. A year parameter cannot widen ownership.
- Administrator: permitted school-wide records, subject to existing capabilities; normal permitted actions remain available in past/closed years.
- Other school years (decided 2026-09-26): only administrators (admin, principal) and accounting view and work in years other than the active one, listed once as `ACADEMIC_YEAR_HISTORY_ROLES` in `@sms/contracts/academic-years`. Teachers, parents, students and every other role work in the active year only: the server refuses them another year before any read and the dashboard shows them no selector. Their ownership rules stay the current ones.
- Parent: currently authorized linked children only; revoked parent links stay revoked.
- Student: own authorized records only.
- Financial roles: retain current financial permission checks, including any existing admin restrictions. Their normal financial actions remain available in past/closed years without a new historical-edit permission. Finance permission does not grant attendance, grade, or enrollment editing. Do not infer rights from navigation visibility.
- Enforce scope on detail-by-ID routes, counters, selector lookups, exports, MCP, and report-card endpoints as well as lists.
- Teachers keep the path through `students.sectionId`: they work in the active year only, so the current section is the right scope. Read installed `najm-auth` contracts before changing policy composition; never drop ownership filtering to make a join work.
- Current source (2026-09-26): repositories combine ownership and filters in one `.where()` through `najm-auth@4.1.0`'s shared `Owned`/`ownershipCondition`, re-exported by `packages/server/src/auth.ts`; School's `own` wrapper supplies its role configuration.
  - `SCHOOL_WIDE_ROLES` (admin, principal, accounting, counselor, nurse, secretary, librarian, driver, assistant) read owned resources school-wide, limited by their route permissions.
  - Teacher, parent, and student follow each resource's ownership rules; any other role sees no owned rows.
  - `AcademicYearService.resolve` applies the other-years rule for every year-scoped route and MCP tool; draft years stay with admin and principal.
  - Dashboard reads: finance dashboard routes require the finance guard (accounting, principal, admin); school-wide counts and attendance charts require the staff guard. The academic and operations KPI tools remain sign-in only.

### 5.4 Write enforcement

The selected year is context, not permission. For admins and finance-responsible users, ordinary operations allowed in the current year are also allowed in a selected past/closed year, within the same domain permissions and record-state rules. Do not reject an otherwise valid operation solely because its year is inactive or closed.

Updates derive the authoritative year from the target record and check it against the submitted context. Creates from a year-scoped screen explicitly target the selected year; absent a selected year, use the active-year default. Explicit draft-year academic setup retains its preparation workflow. Validate enrollment, class/section, dates, ownership, and applicable record-state rules on the server. A payment against an old fee records the actual receipt date rather than a fabricated date inside that school year.

Reuse normal forms and endpoints for payments, fee edits, discounts, and permitted academic edits. Keep audit logging, concurrency protection, payment idempotency, allocation consistency, and any reason/confirmation already required for that action in the current year. Do not add a special historical approval or mandatory reason solely because the year is old. Existing reversal/settlement rules still govern financially constrained records equally in every year.

Apply the same authorization and context checks to bulk writes, nested student creation, imports, and MCP. Jobs/seeds must carry an explicit target year or documented active-year default and never inherit a browser's selected year. A stale form retains its captured year; a conflicting submitted context fails safely rather than redirecting the write into another year. A simple active-year change must not reject an otherwise authorized edit to the previously active year.

## 6. Domain behavior

### 6.1 Students, classes, and promotion

- Student lists count enrollments in the selected year; profiles show permanent identity plus that year's enrollment and dated placements.
- Class/section rosters resolve from enrollments, not current student foreign keys. Deduplicate students in year totals after midyear transfers.
- End-of-year promotion creates a target-year enrollment and placement. It never rewrites last year's placement.
- Support promotion, repeat, graduation, withdrawal, and omission from the target year. Never infer automatic promotion from class names alone; preview an explicit source-to-target class/section mapping.
- Copying class structure or teaching assignments creates new IDs and preserves old records. Copying a timetable is explicit, with target-year teacher/section validation.
- Transition preview reports duplicates, missing mappings, capacity issues, conflicts, and counts. Commit records an idempotency key/payload hash and per-item outcomes; retries must not duplicate enrollments or placements.
- Activate the new year only after required preparation succeeds. Academic transition and financial rollover have separate outcomes and recovery; fee failure cannot delete successfully preserved history.

### 6.2 Fees and payments

- Exact-year fee views filter on the fee's authoritative year; remove the implicit inclusion of other-year balances from archive totals.
- In a selected past year, admins and finance users use the usual Add Fee, Edit, Discount, and Record Payment actions wherever their current-year permissions and record-state rules allow them. New or edited fees remain in the selected year; receiving payment today does not move the fee into today's school year.
- Provide a clearly named cross-year outstanding-debt action/view so debts remain discoverable without contaminating selected-year totals.
- Show historical fee class context from verified enrollment/placement, not the student's current class. If unavailable, show unknown historical class without hiding the fee or assigning a false class.
- A payment allocated 600 to 2025–2026 and 400 to 2026–2027 contributes 600 and 400 respectively to fee-year collection totals, not 1,000 to both.
- Deduplicate receipt lists; show the selected-year portion separately from full receipt total. Preserve full receipt identity and allocation details within authorization.
- Unallocated credit is not attributed to a fee year. Show it separately; receipt-date cash reports can include it under their documented basis.
- Keep collection-by-fee-year and cash-received-by-date report definitions explicit. July receipts allocated to old fees remain associated with those fees, while receipt-date charts use reporting dates.
- Preserve status rules for pending/bounced/voided payments, settlement dates, refunds/credits where supported, and current reconciliation logic. Do not recompute money with floating-point arithmetic.
- Financial rollover must use target-year boundaries and eligible target enrollments. Support an explicitly documented administrative exception if existing fee rules legitimately allow a fee without enrollment.

### 6.3 Attendance

- Selected-year history filters server-side by authoritative year and allowed dates; class/section filtering uses event-time context.
- Marking attendance uses the roster valid on the chosen date, excluding students not yet enrolled or already departed on that date.
- Preserve the existing daily/session distinction, duplicate detection, teacher permissions, and attendance correction history.
- A September record must not appear in another year because the student later changes class. A transfer must not retrospectively move prior attendance.
- Historical dashboards replace today's attendance with a clearly labeled selected-period metric; define denominator as eligible attendance opportunities under the existing mode, not simply today's roster count.
- Staff and teacher attendance must explicitly use their reporting/assignment context; do not require a student enrollment for these records.

### 6.4 Grades, assessments, and exams

- Lists, entry grids, report cards, subject summaries, and exports use the same selected year.
- Exam/assessment class context and student eligibility come from that year's assignments and placements on the assessment date.
- Preserve exam/assessment date, subject, class/section, marks scale, and source identity used to explain historical results. Archive referenced sources rather than deleting their meaning.
- A missing legacy assessment/exam link becomes a visible unresolved data-quality issue, never a current-year guess based on `createdAt`.
- Avoid mixing raw marks across incompatible scales in year summaries. Preserve existing grading rules and document aggregation semantics rather than silently changing them during filtering.

### 6.5 Dashboards, reports, and adjacent views

- Inventory every widget: student count, gender chart, attendance, grades, financial KPIs/trends, class collection, recent payments, overdue balances, teacher counts, events, and operational panels.
- Classify each as selected-year, selected reporting interval, cross-year debt, or current/shared. Labels and backend predicates must agree.
- Apply the same scope to parent/student/teacher dashboards, profile tabs, report-card downloads, print dialogs, and exports.
- Separate historical-year error states from empty results; do not turn failed scoped queries into believable zero totals.
- Exports are generated from server-authorized queries, carry year and report basis, and remain consistent with UI totals.

## 7. Frontend architecture and interaction

Proposed feature: `apps/dashboard/src/features/AcademicYears/` with selector, API/query hooks, parsing utilities, and tests. Integrate in `apps/dashboard/src/shared/DashboardShell/index.tsx` using existing Najm controls and layout.

Use the URL `academicYear` search parameter as the single owner of explicit viewing selection. Missing parameter means active year. Preserve it in internal navigation, profile links, breadcrumbs, back/forward navigation, and export actions. Avoid a second cookie/Zustand source that can disagree with the URL. If a feature-owned store is needed for transient selector UI, it must not own the selected year.

- Keep `useActiveAcademicYear()` for operational defaults; add a distinct `useViewingAcademicYear()` for reads.
- Adapt the shell's `LinkAdapter`: its current same-path short-circuit must not suppress a navigation where only the year query changes.
- Pass validated year through API helpers and all affected React Query keys. Include record IDs, role scope, and date filters where relevant.
- On switching, clear incompatible class/section/record selections, pagination, payment selections, dialogs, and date ranges. Preserve unrelated filters only if valid in the target year.
- Do not render old-year placeholder data beneath a new-year header. Cancel/ignore stale requests and show a scoped loading state.
- A year switch with unsaved edits uses the existing dirty-form convention. A mutation already in flight stays bound to its captured resource/year and invalidates the correct caches.
- Resolve no-explicit-year navigation again after an administrator activates a new year; explicitly selected archives stay on their chosen year.
- Show a simple selected-year label/banner. Keep the normal permitted actions enabled for admins and finance users in past/closed years; no archive-unlock button or special historical workflow. Disable actions only for existing permission/record-state restrictions or the defined draft-year setup rules, backed by server enforcement.
- Handle direct links to a record in a different year: show a scoped not-found state or an authorized explicit “View this record's year” action; do not silently mix contexts.
- Keep exactly one `NajmAppProvider`, current auth/session adapters, sidebar owner, and the one-line Najm Next config. This domain feature does not need another global UI/preference provider.
- Add English, French, Arabic, and Spanish translations under `packages/contracts/src/locales/`; test Arabic RTL, narrow screens, keyboard navigation, and accessible selector labels.

Current source (2026-09-26):

- `ACADEMIC_YEAR_HISTORY_ENABLED` (off by default) is read per request in the root `app/layout.tsx` and provided by `AcademicYearHistoryProvider`, so dialogs rendered by `NajmClientRoot` outside the dashboard layout see the same switch.
- `ViewingYearSelector` sits in the sidebar footer and `ViewingYearBanner` marks a non-active year; the URL `academicYear` parameter owns the explicit selection.
- `useViewingAcademicYear` returns the viewing year, the active year, and whether the year is explicit. `useYearAwareList` switches a list to its year request and query key. `useViewingYearLink` keeps an explicit year in in-page links. `useViewingYearDate` keeps a date-driven screen inside the viewed year's reporting interval.
- `ContextIssueNotice` and `useContextIssueFilter` summarize the server's context-issue codes above the assessment, exam, and grade tables and can narrow them to one reason.
- Following the viewing year: students (with a School years tab for enrollment commands), classes, sections, routines, assessments, exams, grades, payments, the fee list and student fee page, the class bulk-fee form, the student and staff attendance registers, the student, parent, and teacher profiles, the main dashboard and reports, and the aging and reminder reports (the teacher's assignment list stays current until assignments are dated). The student attendance and grade rosters use dated placements. No export routes exist to scope.
- Grade, student-attendance, fee, and routine screens now remount their local selection and unsaved roster state when the viewing year changes. The fee screen returns to the selected-year scope. Year-aware list hooks hide cached rows and errors while active-year or role resolution is pending; the routine page holds its loading skeleton during that interval. This is source behavior only; browser switching still needs acceptance.

## 8. Migration and reconciliation

### 8.1 Read-only inventory before backfill

Build a dry-run audit against the designated database that reports aggregate counts and limited authorized issue references:

- Distinct year labels from settings, classes, fees, and routines; malformed/nonconsecutive labels.
- Existing class/section/assignment contradictions and orphaned references.
- Students with class year differing from the configured active year; duplicate/missing relationships.
- Attendance date/section/assignment conflicts, grades lacking sources, and cross-year exam target sections.
- Fee totals, installment totals, payment/allocation totals, unallocated amounts, and status breakdowns by stored year.
- Evidence available to establish historical enrollment/placement intervals, including any existing audit/import records or approved backups.

No live audit was executed for this document. Do not assume old seed years prove actual enrollment history.

### 8.2 Evidence rules

1. Preserve explicit stored class/fee/routine year labels as evidence of those records' years.
2. An assessment/exam plus a consistent assignment/class year can establish the academic record's year; verify its date and target sections.
3. Attendance's date and section/assignment can establish an event context when consistent. Isolated events do not prove continuous full-year enrollment or transfer dates.
4. A student's current class can support a placement in that class's year, not all prior years. Initial admission date alone cannot prove every intervening year's enrollment.
5. Payment date and row `createdAt` alone are not reliable fee-year/academic-year evidence.
6. Historical calendars must come from recorded configuration or reviewed assumptions; never silently apply today's changed settings to every year.

Persist migration issues with entity ID, issue code, evidence source, proposed resolution, review status, and audit metadata. Unresolved rows remain preserved and visible to authorized review; do not fabricate dates or enrollments to satisfy a new non-null constraint.

### 8.3 Expand, backfill, validate, switch, contract

1. **Expand:** new tables, nullable references, indexes, compatibility fields and write support. Use the next migration after the journal at execution time (planning observed `0048_aberrant_steve_rogers`; do not hardcode the next number).
2. **Protect concurrent changes:** establish a maintenance window or deploy compatibility writes before the audit/backfill snapshot. Record a cutoff and reconcile changes since that cutoff before switching reads.
3. **Backfill registry and links:** deterministic, resumable batches with run IDs, checkpoints, idempotent upserts, and transactional units. Calendar assumptions and ambiguous relationships enter review.
4. **Reconcile:** verify all existing row IDs and financial amounts/statuses are unchanged; compare before/after counts, joins, orphan counts, per-year reports, and reference consistency.
5. **Resolve or expose gaps:** unresolved history must have a visible limitation/review path. Do not silently drop records from all screens. No fabricated enrollment for records that can only establish an event year.
6. **Switch:** enable selected-year reads after all domain integrations and policy tests pass. Keep a feature switch so partially migrated interfaces are not exposed as whole-school support.
7. **Contract later:** enforce required references for reconciled domains, remove legacy direct writers, then retire redundant fields only after the rollback window. Preserve migration issue records and audit history.

### 8.4 Seed and fixture work

Add deterministic two-year fixtures with one promoted student, one repeating student, one graduate, a midyear transfer, a new entrant, a withdrawal, different teachers per year, fees in both years, mixed-year allocations, and unresolved legacy examples. Update School seed creation to use year/enrollment services and explicit dates. Inspect `SeedResetOrder.test.ts` and ensure new restrictive relations have safe cleanup order in isolated tests; production reset is not a migration strategy.

Current source (2026-09-26): `SeedResetOrder.test.ts` pins that each module clears only its own tables and that the seed reset clears transition runs and migration issues before enrollments, and the year registry last. A dated two-year copy of the regenerated demo was subsequently exercised through authenticated REST; its evidence is recorded below.

## 9. Implementation phases and completion gates

Each phase should be a reviewable change. Read `AGENTS.md` and the Najm skill; preserve unrelated dirty work. The plan author saw changes to routine components and test documentation, including deletion of `SCHOOL-CONNECTED-ACCEPTANCE-PLAN.md`; do not restore or overwrite them as part of this feature.

| Phase | Deliverables | Gate |
| --- | --- | --- |
| 0. Inventory | Endpoint/widget/import/job/guard matrix, schema audit tool, financial/calendar rule audit, baseline results | Every scoped surface has an owner and year rule; no runtime claim inferred from source. |
| 1. Contracts and registry | Shared exported types, year module, calendar validation, Settings active pointer compatibility, lifecycle DTOs | One active-year owner; malformed/unknown/year-boundary and concurrency tests pass. |
| 2. Enrollment history | Enrollment/placement schema and module, profile write integration, historical teacher policies, class retention | Transfer/promotion preserves old records; overlap and authorization tests pass. |
| 3. Migration tooling | Additive migrations, dry-run/backfill/reconciliation, issue handling, two-year fixtures | Rehearsal on approved disposable/restored DB is repeatable with financial invariants unchanged. |
| 4. Read APIs | Year filters for students/classes/sections, attendance, grades/exams/assessments, fees/allocations, routines, summaries/exports/MCP | Real PostgreSQL cross-year isolation and ownership pass for lists and detail paths. |
| 5. Shared viewing UI | Shell selector, URL propagation, scoped query keys, profile tabs, normal past-year actions and translations | All listed domains switch together; permitted past-year actions match current-year actions; no stale flashes or false fallback data. |
| 6. Year operations | Enrollment transition preview/commit, explicit fee-rollover integration, activation/closure metadata, ordinary historical edits | Idempotency, concurrent requests, failed partial operations, stale form, and retention checks pass; no reopening needed for permitted historical edits. |
| 7. Acceptance | Focused/unit/DB/API/browser suites and evidence documents | Two-year end-to-end scenario passes for each authorized role; all unresolved gaps reported. |
| 8. Release | Approved migration run, reconciliation, release/deployment, exact revision and live readiness, feature enablement | Separate database, Git/CI, deployment, API, browser outcomes recorded. |

Do not mark the full feature complete after a selector-only release or fee-only filtering. Registry/enrollment/backend support precede user-visible whole-school switching.

## 10. File and module work map

| Area | Existing files/directories to extend | Additions (implemented or planned) |
| --- | --- | --- |
| Shared contract | `packages/contracts/package.json`, `src/index.ts`, `src/locales/` | `src/academicYears.ts`, focused contract tests |
| Domain registry | `packages/server/src/modules/index.ts`, database schema barrel, `modules/settings/` | `modules/academicYears/` (registry, lifecycle, resolution only), `modules/academicYearTransitions/`, `modules/academicYearMigrationIssues/` |
| Enrollment | `modules/students/`, `modules/classes/`, `modules/sections/`, `modules/teachers/` | `modules/studentEnrollments/` (enrollments, placements, annual roster routes); classes and sections serve their own year lists |
| Academic history | `modules/attendance/`, `modules/grades/`, `modules/assessments/`, `modules/exams/`, `modules/classRoutines/` | school-wide year reads in the main repository, year rules in the main service, and a `/year-review/:id` route on the main controller; shared source rules in `modules/academicSources/`; focused query/validator tests and year references |
| Financial history | `modules/financial/fees/`, `payments/`, `allocations/`, `rollover/`, `utils/`, `modules/dashboard/finance/` | `FeeYear*` and `PaymentYear*` year reviews; scoped report and mixed-year allocation tests |
| UI | `shared/DashboardShell/`, `features/Settings/`, `Students/`, `Classes/`, `Sections/`, `Teachers/`, `Parents/`, `Attendance/`, `Grades/`, `Assessments/`, `Exams/`, `ClassRoutines/`, `Financial/`, `Dashboard/`, `Reports/`, related `services/*Api.ts` | `features/AcademicYears/` (viewing-year selector, banner, switch context, URL, link and date helpers, year-aware list hook, context-issue notice) and `services/academicYearApi.ts` exist; fees, attendance (with dated marking and grading rosters), the student, parent, and teacher profiles, the dashboard and reports, and the bulk-fee, assessment and exam forms follow the year; export and most other form integration remain planned |
| Data operations | `packages/server/src/database/migrations/`, `packages/seed/src/` | Dry-run/backfill/reconciliation scripts with explicit target options |
| Verification/docs | Root scripts, `packages/server/tests/`, `packages/contracts/tests/`, `docs/tests/` | `docs/tests/academic-year-history.md`, `test:academic-years`, and `test:ownership` exist; connected evidence directory remains planned |

Inspect server-rendered routes and role-specific entry points under `apps/dashboard/src/app/` too; frontend hook changes alone do not cover server calls. Follow declared workspace exports and keep server code out of browser imports.

## 11. Verification contract

### 11.1 Focused automated cases

- Year label validation, consecutive years, immutable used-year boundaries, one active pointer, unknown/inaccessible years.
- Date-only September 1, June 30, July 1/14/15, August 31, leap-day and custom calendar boundaries; July closeout and historical-view selection remain separate.
- One enrollment per student/year; repeated grade level across different years allowed; overlapping placements rejected; same-day transfer resolves one placement using half-open intervals.
- Promotion, repeat, graduate, withdrawal, return/new enrollment, duplicate commit, partial retry, and concurrent transition scenarios.
- Exact-year list/detail/count consistency across all domains, empty registered year, and unresolved legacy rows.
- Teacher A in old year versus Teacher B in new year; parent/child and student/self isolation; revoked accounts/links; unauthorized ID guessing and invalid target-year writes.
- Grades and attendance remain attached to event-time placement after a later transfer/promotion.
- Multi-section exams/assessments reject mixed-year targets; referenced class/assignment/source deletion is blocked or archived safely.
- Fees retain amounts, schedules, statuses and identifiers through migration. Mixed-year payment portions, unallocated credit, July receipts, bounced/voided/settled status rules remain correct.
- Admin/finance users can perform the same permitted operations in current and past/closed years through normal REST/MCP/bulk paths; unauthorized roles and invalid record-state changes are still rejected. Draft-year setup restrictions remain separate.
- Historical creates target the selected year, historical enrollment edits leave active-year placement unchanged, permanent-profile edits are clearly shared, and payments on old debt keep actual receipt dates. July closeout must not prevent the required authorized late-debt resolution.
- Query cache separation, fast year changes with reversed response order, same-path query navigation, unsaved forms, stale active year, logout/login scope cleanup.
- Fresh schema migration, upgrade from representative legacy schema, repeat backfill, interrupted batch recovery, and writes occurring around the migration cutoff.

### 11.2 Database and API integration

Use an explicitly designated disposable test database or approved restored copy for mutation tests. Validate actual constraints, transaction rollback, idempotency races, overlap prevention, indexes/query plans, and ownership joins. Mocked repository tests do not prove PostgreSQL behavior.

Test APIs through real authentication for supported roles, using internal MCP/REST. Read-only audit of an authorized environment is distinct from mutation acceptance. Record target environment and revision without exposing secrets or unnecessary student data.

### 11.3 Browser acceptance scenario

Use browser automation only for UI acceptance, not as the transport for creating or repairing live data. Prepare test records through internal MCP/REST or authorized isolated fixtures.

1. Active year is 2026–2027. Verify current-year student/class/fee/attendance/grade totals.
2. Select 2025–2026; verify header, sidebar navigation, lists, profile tabs, class/section dropdowns, report cards, dashboard and exports agree.
3. Confirm a promoted student's old class and historical teacher, old attendance/grades, paid fees and outstanding fees remain visible in that year.
4. Verify a midyear transfer against dates before and after the transfer; no duplicate student in annual counts.
5. Inspect a mixed-year receipt: each year's amount is attributed once and full receipt remains intelligible.
6. Select a valid empty year; every relevant screen shows empty data without fallback.
7. Switch back/forward, reload a deep link, switch quickly, open another tab/user, and sign out/in; contexts remain independent and authorized.
8. Repeat relevant checks as teacher, parent, student, and financial role; verify no cross-role/year data leak.
9. As admin and finance user, select a past/closed year and use the normal permitted financial forms to add/edit a fee, apply a permitted discount, and record a payment received today. Verify the fee stays in the old year, the receipt date is today, totals refresh, and no reopening/extra approval is required. As admin, verify a permitted old attendance/grade edit through its normal form. Confirm finance users cannot edit academic records without the corresponding permissions, draft setup restrictions still apply, and invalid financial changes are rejected equally in old and current years.
10. Verify mobile/desktop, keyboard navigation, Arabic RTL, translations, printing, and clear error/loading states.

### 11.4 Commands and reporting

Use Bun only. The root `test:academic-years` script runs the contract and server academic-year suites, and `test:ownership` pins repository ownership (role list, per-role rules, and the SQL of every owned read). Both are in the root `test` chain. Keep new server tests in those selections as coverage grows.

Run the smallest relevant suite after each code phase, then the existing required gates:

```text
bun run lint
bun run typecheck
bun run i18n:check
bun run test
bun run build
bun run db:check
```

`bun run check` combines those gates. `db:check` runs Drizzle migration checking; it does not replace direct verification of the target database's schema, journal, constraints, or backfill. Build success does not prove connected acceptance. Required environment values belong only in the existing env file and must not appear in committed evidence.

Record unit/source, real PostgreSQL, API/MCP, browser, migration, Git/CI/image, and deployment results separately, with pass/fail/not-run, revision, environment, and unresolved issues.

## 12. Release and rollback

### 12.1 Release sequence

1. Review intended diff and required tests; preserve unrelated changes and do not stage them.
2. Rehearse additive migration/backfill and recovery on an approved restored/disposable database; verify backup restore procedure.
3. Prepare a concrete release report: schema diff, migration/backfill commands and explicit target, dry-run counts, unresolved issues, feature-switch behavior, rollout order, and rollback limits.
4. Under the deployment authorization in force, apply additive schema, deploy compatibility writes, perform reviewed backfill/reconciliation, then deploy/enable historical reads. Account for older running workers/instances during the transition.
5. Verify exact live revision, migration journal/constraints, readiness/login endpoints, and authenticated year-filter APIs. Then perform the separate browser acceptance set.
6. Observe year-query performance, validation failures, unresolved-history counts, and reconciliation metrics before contracting old columns/paths.

### 12.2 Rollback behavior

- Keep additive schema/data during rollback; do not delete newly captured history.
- Before read switch: disable feature exposure; fix/retry a failed backfill by run/checkpoint. Never rerun destructive reset as recovery.
- After read switch: revert to the last compatible application release or disable historical UI/reads while retaining compatibility writes. An old binary that directly overwrites student class fields is unsafe after new placements exist.
- After activation of a new year or historical corrections: application rollback cannot undo the business operation. Use an audited compensating procedure after reviewing new records and payments.
- Do not roll back financial allocations by restoring a whole database over newer payments. Reconcile and use domain-supported compensation where required.
- Drop legacy columns only in a later release after all consumers and rollback targets are compatible; destructive down migrations require explicit authorization.

## 13. Authorization and current evidence

At plan creation, the request authorized **writing this plan** only. The subsequent request to implement it authorized the source changes tracked in `docs/tests/academic-year-history.md`. It did not authorize a live academic-year change, database migration/backfill, destructive reset, commit/push, deployment, or sending messages.

During implementation, routine local edits and relevant checks can proceed within the authorized task. Read-only discovery can establish concrete migration/deployment details. Obtain any missing authorization only for the actual external/destructive step after producing its reviewable diff, target, dry-run evidence, and rollback procedure. Never run `reset:demo`, `seed:full`, forced schema pushes, or production cleanup as a shortcut.

| Evidence boundary | At plan creation | Now (2026-09-26) |
| --- | --- | --- |
| Source inspection | Completed for the main settings, student, class, finance, attendance, grade, dashboard, and shell paths described above | Repeated for each slice in section 14 |
| Implementation | Not started | In progress in source; whole-school viewing stays behind `ACADEMIC_YEAR_HISTORY_ENABLED`, off by default |
| Live data audit / migration rehearsal | Not run | Local demo and disposable PostgreSQL 18 clones applied the exact `0000`–`0057` migration chain; dated demo backfills, read-only audit, two-year transition, and rollback rehearsals are recorded below and in `docs/tests/academic-year-history.md` |
| Automated feature checks | Not run; no implementation exists | Full `bun run check` passed after the class/section and teacher-grade edits: lint, typechecks, i18n, tests, workspace boundaries, production build, and Drizzle journal check. The subsequent routine guard passed focused tests, server typechecks, lint, and production build. These checks do not prove connected behavior |
| API/MCP / browser acceptance | Not run | Partial authenticated REST/MCP acceptance on disposable fixtures is recorded in `docs/tests/academic-year-history.md`; browser runtime had no available browser, so UI acceptance remains unrun |
| Commit / push / deployment | Not requested or performed | Not performed; the feature, including this plan, is uncommitted |

## 14. Completion checklist

Source progress as of **2026-09-26**. Implementation remains in progress; this is not yet the browser-test phase. A checked source item means the source exists and the checks named for that slice passed. It does not mean every repository gate was rerun after every later slice, that migrations ran, or that connected behavior was accepted.

- [x] Add the browser-safe year/calendar contract, registered-year module, and Settings active-year pointer compatibility. Keep viewing selection separate from active settings.
- [x] Add dated student enrollment and placement schema plus create, transfer, end, and administrator roster source paths. Preserve the active-year compatibility projection during past-year edits.
- [x] Add migrations `0049`–`0056`, migration issue review API/UI, a read-only audit script, and a dry-run-by-default issue-registration script. Leave uncertain legacy dates unresolved.
- [x] Add separate year-scoped administrator reads for students, classes, sections, attendance, assessments, exams, grades, and routines, plus financial-guarded fee and allocated-receipt reads.
- [x] Attach registered years to new normal assessment, exam, grade, and attendance writes, and add source-level retention and context checks.
- [x] Run focused academic-year tests, repository lint/typecheck/root test, production build, and Drizzle migration-file check at the recorded source stages. The latest full `bun run check` (lint, typecheck, i18n, root tests, production build, and migration-file check) passed on 2026-09-26 after the final controller parameter and finance SQL fixes. Record these as source checks only; the check does not prove the target database journal.
- [x] Add a dry-run-by-default attendance backfill script that requires dated placement evidence for student rows, keeps ambiguous rows unattributed, and registers unresolved/ambiguous attendance review issues on apply. Its SQL and concurrency behavior still require PostgreSQL rehearsal.
- [x] Add a dry-run-by-default assessment/exam source backfill script with verified calendar, assignment, target-section, and registered-grade checks. It registers unresolved sources for review on apply; PostgreSQL rehearsal and grade attribution remain open.
- [x] Add a dry-run-by-default grade backfill script requiring a registered source and one dated student placement on the source date. It registers unresolved grades for review on apply; PostgreSQL rehearsal remains open.
- [x] Add an administrator-only, read-only academic-transition preview for explicit section mappings and student decisions. It reports roster, conflict, and capacity issues while keeping activation gated.
- [x] Add an administrator-only academic-transition commit source path with a stale-preview hash, transactional target enrollment preparation, unique idempotency/target-run records, and per-student outcomes in migration `0057`. PostgreSQL concurrency and rollback rehearsal remain open; activation stays gated.
- [x] Make explicitly year-targeted class bulk fee creation use a validated date and dated roster instead of current class membership. The normal fee screens and connected acceptance remain open.
- [x] Add optional registered-year queries to the normal classes and sections lists without bypassing their existing ownership scopes. Their screens now follow the viewing year behind the history switch; parent/student historical ownership and other routes remain open.
- [x] Allow the sidebar link adapter to navigate when only the query or hash changes. Sidebar links now carry an explicit viewing year. The fee list, student fee page, and student and parent profiles later kept it in their links through `useViewingYearLink`; other detail and in-page links remain open.
- [x] Add an explicitly dated, year-scoped teacher roster review query backed by enrollments and placements. Restrict this review path to administrators/principals until teacher assignment start/end dates are modeled and verified; normal teacher ownership remains open.
- [x] Add an optional validated year query to the normal financial-guarded fee overview/detail routes and their MCP tools. Include fee-only students with unresolved enrollments, aggregate only fees charged to the selected year, use one last dated placement for class display, and reject a detail from another year.
- [x] Add the same optional year query to the normal per-student fee route and MCP tool. Keep its response shape and scope fee rows, totals, installment metrics, and completed allocated-payment metrics to the fee year. Mixed-year receipt display, other payment/report, and screen paths remain open.
- [x] Add optional year scope to the financial-guarded overdue list and summary plus the overdue-by-student MCP tool. Use fee year, completed allocations, and dated placement for historical class context; leave unknown placement unknown. PostgreSQL and authenticated API acceptance remain open.
- [x] Add the optional validated year query to the normal assessment, exam, and grade list routes and MCP tools. Filter by stored year in SQL next to ownership, falling back for legacy null-year rows to the source date within the reporting interval; leave sourceless grades unattributed. The filtered variants, report cards, and PostgreSQL acceptance remain open. The `scope().where()` ownership finding this slice uncovered is resolved in the next item.
- [x] Fix repository ownership: shared `najm-auth@4.1.0` `Owned` and School's role-configured `own` compose `ownershipCondition()` into each read's single `.where()` for 58 owned reads; staff roles in `SCHOOL_WIDE_ROLES` read school-wide within their permissions; teachers also read student attendance in taught sections; student profile tabs require a readable student; ESLint blocks chained `.where()`. Source tests only; role-based API acceptance remains open.
- [x] Add the optional validated year to the normal students, attendance (all, student, staff, teacher), routine, and payment lists. The student list reads enrollments and year placements; teachers may read student and grade history only for the active year until assignments carry dates. The assessment, exam, grade, and attendance year rules share SQL builders with the administrator reads; payments show each receipt once with its fee-year portion. PostgreSQL and authenticated acceptance remain open.
- [x] Add the URL-owned viewing-year foundation behind `ACADEMIC_YEAR_HISTORY_ENABLED` (default off): switch read per request by the root layout (first the shell; moved so dialogs see it), sidebar selector, non-active-year banner, link preservation, `useViewingAcademicYear`/`useYearAwareList`, four-language labels. Students, assessments, exams, grades, payments, classes, sections, and the routine page follow the viewing year; fees, attendance, the profiles, dashboards and reports, the class bulk-fee form, and the assessment and exam forms followed in the slices below; exports and most other forms do not yet. No browser run.
- [x] Address the academic-list review findings in source: preserve the teacher grade-history restriction, refuse explicit non-active assessment/exam years for parents/students until dated source ownership exists, and attach administrator-equivalent context issue codes to authorized normal year-list rows. Admin/finance route permissions and no-year compatibility remain unchanged. Add 14 focused regression tests. The assessment, exam and grade screens now summarize these codes in one translated line above the table that can narrow it to one reason (2026-09-26); connected acceptance remains open.
- [x] Make the fee and attendance screens follow the viewing year behind the switch. The fee list shows the viewed year's rows (exact fee year, dated class) with a separately named "Unpaid, all school years" scope. The student fee page reads that fee year's fees and totals from the server, links other years' unpaid fees, keeps its all-year payment history, and charges new fees to the viewed year; its payment dialog offers only the viewed year's fees. Student attendance reads the viewed year's records, and both attendance registers keep their date inside the viewed year's reporting interval. The fee list and student fee page now show an error state instead of an empty one when a read fails. With the switch off, the fee list again keeps students with an active-year fee, including paid-up ones, whose absence had left its Paid filter always empty (a pre-existing bug, fixed 2026-09-26). Source checks only; per-day dated rosters for marking and the class bulk-fee form followed in later items; the profile fee tabs and parent views followed in the profile slices below.
- [x] Make the student profile follow the viewing year: the student read, the per-student grade list and report (REST and MCP) accept an optional validated year, resolved through the teacher student-history rule before any read. The profile shows that year's class from its latest placement (or "not enrolled"), attendance, grade report, fees and totals. Provide the history switch from the root layout so dialogs, such as the profile opened from the students table, see it too. Source checks only; transport and alerts remain current-only.
- [x] Make the parent and teacher profiles follow the viewing year: the parent children read (REST and MCP) accepts an optional validated year, resolved through the student-history rule before any read, and returns every linked child with that year's class from its latest placement or "not enrolled". The parent profile reads each child's attendance, grades and fees for that year and keeps the year in its links; upcoming assessments and events stay matched to today's classes. The teacher profile's timetable follows the year; its assignment list stays current, and says so, until teaching assignments are dated (2026-09-26). The current children read also returns class and section names, which it previously omitted. Source checks only.
- [x] Give every piece of year-history server code one owner (2026-09-26): `academicYears/` keeps the registry, lifecycle and year resolution; each domain module serves its own year review route, queries and rules; transitions, migration-issue review and the shared academic-source rules each have their own module. Routes and behavior are unchanged, except that the unassigned grade-source review moved from `GET /academic-years/unassigned-grade-sources` to `GET /grades/unassigned-sources`, which no client called. `SeedResetOrder.test.ts` pins the reset order across the modules. Source checks only.
- [x] Wire the class bulk-fee form into the fee page behind the history switch. It uses the viewed year's classes, requires a charge date in the September-June term, previews that day's dated roster by class and section, and submits the selected year and date to the existing financial-guarded bulk endpoint. The fee list refreshes after the response and reports created, skipped, and failed counts. Form validation, dashboard typecheck, lint, i18n, 225 config tests, workspace boundaries, and production build pass; authenticated API and browser acceptance remain open.
- [x] Scope aging summary, aging detail, and overdue reminders to an optional registered viewing year in REST and MCP while preserving their no-year responses. The explicit-year amounts use completed installment allocations against fees charged to that year, exclude cancelled installments, and show the latest dated class or an unknown class. Dashboard cards and report pages pass the viewing year through API calls and query keys; the reminder page separates its local UI state by year and shows load failures. Generated-SQL and service tests pass; PostgreSQL and authenticated API acceptance remain open. The finance dashboard audience was later limited to finance roles (see the dashboard audience item).
- [x] Make the normal class and section screens request their optional server-side year lists behind the history switch instead of filtering all-year responses in the browser. Their no-year screens keep the active-year filter, and all-years consumers keep the unfiltered list. A new class form defaults to the viewed year. Normal class creation and section creation or reassignment resolve the registered target year before writing, including draft-year role rules; changing a class year requires no sections and moving a section requires no students. Unchanged-year edits keep their existing path. Focused service tests and source gates pass; authenticated API and browser acceptance remain open.
- [x] Remove present-day age cutoffs from normal assessment and exam validation so a permitted correction in a closed year uses the same form and workflow. New or moved sources still require one non-draft registered year, target sections in that year, a date inside its reporting interval, valid assignments, and no dependent grades before context changes. A focused closed-year regression passes; authenticated acceptance remains open.
- [x] Allow admin/principal attendance entry on older dates through normal student and staff writes; the existing admin-only staff-roster route uses the same date rule. Keep the 30-day limit for other roles and retain future-date, registered-year, dated-placement, and duplicate checks. Focused tests, lint, typecheck, and production build pass; authenticated API and PostgreSQL acceptance remain open.
- [x] Show the selected fee year's allocated portion in the normal payment table and detail card, with the full receipt separately visible. A receipt printed from that list keeps its actual payment date and full amount and names the selected year and allocated portion; per-student payment history/documents remain all-year. Focused print tests and source gates pass; browser and PostgreSQL amount reconciliation remain open.
- [x] Make new assessment and exam forms wait for the viewed registered calendar and start with a date inside its teaching term. A viewing-year change resets the unsaved form; an edit retains its recorded date. The switch-off form behavior is unchanged. Focused date-helper tests, lint, typecheck, and production build pass; browser and authenticated acceptance remain open.
- [x] Resolve explicit years for finance KPI, trend, expense breakdown, and collection-by-class REST/MCP reads through the registered-year service with the caller's role before querying. Keep their no-year default and the existing finance dashboard audience. Focused service checks, lint, typecheck, and production build pass; authenticated role and PostgreSQL acceptance remain open.
- [x] Mark and grade from the roster valid on the day (2026-09-26). The normal student list (REST and MCP) accepts `onDate` with its `academicYear`, inside that year's reporting interval, and returns the students whose enrollment and placement both cover the day, with that day's class and section; the year goes through the teacher student-history rule before any read and ownership stays in the same `.where()`. With history on, the student register reads it for the chosen day and the grade roster for the chosen assessment or exam date, which is the placement the server checks on save. Focused service, SQL, ownership and helper tests pass; PostgreSQL and authenticated acceptance remain open.
- [x] Make the main dashboard follow the viewing year (2026-09-26). The widget student count, gender chart and monthly student and staff attendance accept an optional year resolved for the caller's role: counts come from that year's enrollments, attendance months from the stored-year-or-date rule over the year's own reporting months, and a year that does not hold today reports no today or week figures. Finance KPIs add the year's cash totals; for a non-active year the cards show them under the year's name, the teacher card says it counts current teachers, and tooltips drop today's figures. Collection by class groups by the class each student last sat in that fee year, with only the active year falling back to the current class. Focused tests and source gates pass.
- [x] Limit the dashboard audience and count finance on registered calendars (2026-09-26). Finance dashboard routes (REST and MCP) take the fee routes' finance guard (accounting, principal, admin); the gender and monthly attendance charts take the staff guard, leaving out parents, students and drivers; the dashboard home shows finance widgets only to finance roles. Finance KPI, trend and expense windows use the resolved year's registered reporting dates, with the default calendar only for an unregistered active label. Guard-metadata, helper and window tests pass; role acceptance remains open.
- [x] Reset local grade, student-attendance, fee, and routine selections when the viewing year changes (2026-09-26). Hide cached list data and errors during year resolution so an earlier year's rows cannot appear under the next year's heading. Dashboard typecheck, repo lint, and production build pass; browser switching remains unrun.
- [x] Refuse activation before the committed transition's enrollment date or when a target-year enrollment lacks a placement. This keeps future or missing placements out of today's active class projection; focused lifecycle tests cover both refusals before writes. Connected transaction and rollback rehearsal remain open.
- [x] Rehearse two partial-write rollbacks through authenticated REST on a cloned synthetic PostgreSQL 18 fixture (2026-09-26): a failing placement insert rolls back the transition enrollment and run; a failing activation audit insert rolls back the student projection, target status, and Settings pointer while retaining the earlier committed transition. Removal of each failure probe permits a clean retry. Financial fingerprints remain unchanged. A dated demo clone subsequently passed a 100-student transition; other injected failure positions remain open.
- [x] Extend the isolated rollback rehearsal to two source students (2026-09-26). A probe on the second target placement recorded two insert attempts, then failed; PostgreSQL retained zero target enrollments, placements, or runs. A clean commit created two outcomes, and a same-key retry returned the same run. A probe on the second active-student projection recorded two update attempts, then failed; both students, Settings, and target status reverted while the committed transition survived. Removing the probe let activation place both students once. Financial fingerprints remained unchanged. Other failure points and a designated restored target remain open.
- [x] Prove the unmodified migration chain with pgvector 0.8.6: a fresh local PostgreSQL 18 database applied `0000`–`0057` through Drizzle and held 58 journal entries. On the owner-authorized disposable `localhost:5432/school` demo database, pending `0049`–`0057` applied through Drizzle with unchanged fee, installment, payment, and allocation fingerprints before the demo reset. `db:check` passed. See `docs/tests/academic-year-history.md`.
- [x] Rebuild the local demo from explicit yearly fixture dates and backfill attendance: 100 students/enrollments/placements, 30 assessments, 18 exams, 64 grades, and 1,688 attendance rows attributed to the verified 2026-2027 year. The final audit and enrollment issue scan found zero relationship, year-attribution, financial rollup, and missing-placement issues. The prior legacy demo was backed up before reset. Seed dependency wiring and source/grade generation were repaired and checked.
- [x] Restore the original 48-journal demo backup into a separate PostgreSQL 18 database and apply the exact pending migrations to 58 journal entries. Fee, installment, payment, and allocation fingerprints stayed identical. Read-only scans found 100 students lacking confirmed dates and 1,433 unattributed attendance/source/grade rows; bounded apply runs retained all 1,533 uncertainties as open review issues without fabricating years. Financial reconciliation still reported zero mismatches.
- [x] Rehearse a reviewed two-year transition on a dated copy of the regenerated demo (2026-09-26). Administrator REST created and verified the adjacent draft, mapped nine classes and 27 sections, previewed and committed 100 enrollments, activated once, and closed the source separately. Premature activation, stale hash, duplicate target commit, and replays behaved as specified; PostgreSQL and selected-year REST reads confirmed both 100-student years, unchanged financial row fingerprints, and zero academic audit issues. The owner-authorized old pre-reset backup remains separate with 1,533 unresolved date/year issues; its history was not guessed or promoted into active data. The selector stays off pending the remaining acceptance gates.
- [x] Extend transaction rollback to a separate dated 100-student demo clone (2026-09-26). Injected failure on the 50th target placement left zero target enrollments, placements, or runs. Removing the probe let the same idempotency key commit 100 outcomes and replay the same run. Injected failure on the 50th active-student projection left all 100 prepared enrollments but zero changed projections, a draft target, and the old Settings pointer. Removing the probe let activation place all 100 once. Post-retry audit and all four financial row fingerprints remained clean. Other failure positions are still open.
- [x] Put the enrollment commands in the dashboard (2026-09-26). A School years tab in the student profile (administrators and principals) lists each year's enrollment and dated placements, now named by the server, and offers enrol, change class or section, and end for the viewed or active year, with year-bounded forms and the server's refusal shown. Profile edits show class and section read-only and no longer send them; Add student always offers the active year's classes. The yearly statuses moved to `@sms/contracts` and are pinned. Parent links keep the viewed year; no export routes exist to scope. Focused tests and source gates pass; browser and authenticated acceptance remain open.
- [x] Limit other school years to administrators and accounting (2026-09-26, the owner's decision): one contract role list; `resolve` refuses every other role another year before any read; the year list and detail offer them the active year alone; the dashboard selector and year links follow the same list. The teacher and parent/student past-year ownership rules added earlier the same day were removed in favor of this rule, so those roles keep their current ownership rules. Focused tests and source gates pass; role acceptance remains open.
- [x] Enforce the active-year boundary on ordinary class and section detail and related reads for other roles (2026-09-26). With history enabled, their no-year lists also use the active year. Authenticated teacher requests to an old class, its sections, an old section, and its students returned 403; active-year details and administrator old-year reads succeeded. Ten focused class/section tests passed; browser acceptance remains open.
- [x] Bind normal teacher grade create and update to the signed-in teacher's assessment or exam source (2026-09-26). A teacher with a second assignment in the same section could create and correct their own grade but received 403 for a colleague's grade. The temporary records were removed; focused tests, lint and production build passed.
- [x] Rehearse a late activation failure on a separate 100-student dated demo clone (2026-09-26). After a clean 100-enrollment transition commit, an intentional failure inserting the activation audit row returned 500. PostgreSQL retained the committed enrollments and placements but rolled back all 100 student projections, the target's open status, and the Settings pointer. Removing the trigger allowed one successful activation and an idempotent second call; one activation audit row remained. Fee, payment and allocation row fingerprints were unchanged, and the read-only academic audit found zero relationship and financial mismatches.
- [x] Apply the same active-year boundary to normal class-routine reads (2026-09-27). With history enabled, non-privileged no-year lists, teacher schedules and section-published reads resolve the active year; routine ID and section-assignment reads resolve their record's year before related data. Administrator year selection stays available. Focused routine tests, server typechecks, lint, and production build passed. On the disposable two-year clone, authenticated teacher REST returned only the active routine in the no-year list, 403 for old routine detail, old section assignments, and an explicit old-year published read; active detail returned 200 and administrator old detail and assignments returned 200. Both temporary routines and their periods were removed; the academic audit remained clean. Browser acceptance remains open.
- [x] Verify the ordinary closed-year academic workflow on the dated two-year clone (2026-09-27). Authenticated administrator REST created an assessment and exam dated in closed 2026-2027 and a grade from that assessment; all three stored the old registered year. Their normal edit routes succeeded, and the grade detail returned the correction. Normal delete routes removed all three records. PostgreSQL returned to 30 assessments, 18 exams, and 64 grades, with zero academic and financial audit mismatches. This proves that permitted historical academic edits do not require reopening the year; other role/action combinations and browser behavior remain open.
- [x] Resolve an explicit dashboard widget year for non-administrators before showing current-only widgets (2026-09-27). An old-year teacher query previously returned 200 with current data; it now returns 403. The same teacher's active-year and no-year requests return 200, and an administrator's old-year query still returns 200 on the disposable two-year clone. The focused regression, server typechecks, lint, and production build pass. Other dashboard role and browser checks remain open.
- [ ] Complete the remaining transition rollback matrix, then enable the viewing selector only after all acceptance gates pass. On isolated PostgreSQL an authenticated transition succeeded with stale-hash rejection, idempotent commit/activation, a separate prior-year close, and unchanged financial fingerprints. Two simultaneous commits for a second target yielded one success and one conflict; early activation was refused without moving Settings. Synthetic clones passed first-student and second-student partial-write probes for commit and activation with rollback and clean retries. Dated 100-student demo clones passed a full transition and failures on the 50th placement and projection, with clean retries, audit, selected-year reads, and unchanged financial fingerprints. Other injected failure positions remain open; the default switch remains off.
- [ ] Complete authenticated role-based API/MCP acceptance before enabling whole-school history. A six-role old-year REST list matrix, five old-year MCP list tools, all twelve administrator year reviews, selected details and reports, finance dashboards, payment statistics, and closed-year attendance, fee, and enrollment writes passed on the synthetic fixture. Dated two-year demo acceptance now covers six-role old-year lists and details, active-year parent/student ownership, principal closed-year transfer without moving the active projection, accounting closed-year class bulk fee with cleanup, and a next-year receipt allocated to an old fee with matching selected-year lists, cash KPI, idempotent replay, and a clean audit. Teacher follow-up confirmed old-year grade ID read/update and attendance date/mark denial, active-year teacher marking and correction after a normal new-year assignment, and active-only unscoped attendance. The missing explicit teacher attendance grants and missing `teacherId` in login context were repaired; the grants were seeded into the disposable clone and main demo. Active-year grade acceptance confirmed a teacher may create and correct their own grade but cannot create or edit a colleague's grade even when they teach the same section; the temporary records were removed and the audit remained clean. A principal changed and restored a closed-year grade and attendance record through their ordinary edit routes; accounting received 401 for both academic edits. Further mutation and ownership combinations remain open. Administrators here include admin and principal, as in the contract.
- [ ] Complete browser acceptance before enabling whole-school history. Attempted on 2026-09-26; the browser runtime returned no available browser, so no UI acceptance ran.

Whole-feature completion gates remain open until the corresponding behavior and evidence exist:

- [ ] Registered academic years have stable boundaries and one active-year owner.
- [ ] Yearly enrollment and dated placement history preserve promotions and transfers.
- [ ] Migration keeps original records and money unchanged; unresolved history is visible and reviewed.
- [ ] Every scoped read, detail, report, export, dropdown, dashboard and MCP path resolves the same authorized year.
- [ ] Students, classes, fees, attendance and grades all switch through the shared selector.
- [ ] Teacher/parent/student/financial permissions remain enforced across years.
- [ ] Admin/finance users work in past/closed years through the normal permitted actions, with no additional historical-edit approval or reopening; server-side permissions, draft setup rules, and financial integrity remain enforced.
- [ ] Academic preparation/activation and financial rollover are separate, audited, retry-safe operations.
- [ ] Date boundaries and fee-year versus receipt-date reporting are verified.
- [ ] Real PostgreSQL, authenticated API and UI acceptance have distinct recorded outcomes.
- [ ] Release and rollback preserve newly written history and payments.
- [ ] Final delivery clearly states remaining migration, historical-data, or acceptance limitations.
