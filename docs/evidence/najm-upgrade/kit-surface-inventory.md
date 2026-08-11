# Najm Kit 2.1 → 2.11 — surface inventory

Phase 5 of `NAJM-UPGRADE-PLAN.md`, static half.

This is the inventory the plan asks for before the browser matrix: what every
`NTable` and `NPageHeader` surface actually is, so the visual pass has a list to
work from and a stated expectation per surface. It is derived from source and
from the installed `najm-kit@2.11.2` declarations, not from a running app.
The companion `acceptance-ledger.md` records the runtime and browser gates.

Generated 2026-08-11 against `najm-kit@2.11.2`.

---

## Summary

| | Count |
| --- | --- |
| `NTable` surfaces | 39 |
| …using `manualPagination` | **0** |
| …with a card renderer | 24 |
| …table-only or table-first | 9 |
| `NPageHeader` instances (35 files) | 36 |
| …using the `card` / `bordered` variant | **0** |

Two numbers decide most of the phase:

**No surface uses `manualPagination`.** Every table receives a fully loaded
array and paginates client-side, so `pageCount` is derived by the table from a
real row count. The plan's rule "never show numbered pages for untrustworthy
manual pagination totals" is satisfied because School has no manual-pagination
totals at all — trustworthy or otherwise. The new numbered bar is therefore
accepted as the default everywhere, and no `paginationVariant="compact"`
override is warranted on correctness grounds. If a list is later moved to
server pagination, it must pass a `pageCount` from a real total, or
`hasNextPage` with no `pageCount` — never `pageIndex + 2`, which najm-kit warns
about in development.

For the same reason `najm-kit/pagination` and `najm-kit/query` are **not**
adopted here. They exist for real server-backed lists; School currently has
none, and the plan explicitly forbids mechanically rewriting tables during this
phase.

**No header uses the `card` variant.** All 36 instances render full-bleed, so
every one of them is affected by the 2.6 layout change and its taller mobile
height. There is no subset that the change cannot reach — the browser pass has
to look at all of them.

## Verified statically

- **Pagination labels localize globally.** `NajmAppProvider` builds them with
  `buildPaginationLabels(t, "common.pagination")`, so no table passes
  `paginationLabels` itself. The 11 keys exist in all four locales
  (`bun run i18n:check`: 1559 keys, none missing). Card pagination reads the
  same prefix.
- **Header sidebar triggers resolve from context.** `NPageHeader` computes its
  breakpoint as `mobileBreakpointProp ?? sidebar?.mobileBreakpoint ?? "md"`, and
  `DashboardShell` mounts `NSidebarProvider mobileBreakpoint="lg"`. Every header
  inside the shell inherits `lg` and matches the sidebar, so no header needs an
  explicit `mobileBreakpoint`. This was worth checking: had they fallen back to
  `md`, tablets between `md` and `lg` would have had a mobile sidebar with no
  way to open it.
- **Tables without a card renderer do not silently break on mobile.** NTable
  sets `responsiveCards: props.responsiveCards ?? Boolean(props.renderCard)`, so
  the 15 surfaces with no `renderCard` stay tables at every viewport rather than
  switching to an empty card list. They scroll horizontally on a phone. That is
  a product judgement to confirm in the browser pass, not a defect.
- **Three routes render no `NPageHeader` and needed an explicit trigger.**
  Walking each route's import graph found `/financial-operations` (a plain
  `<header>`), `/students/[id]/fees` (`StudentHeader`, only on the standalone
  route — the embedded copy sits under the student profile's header), and
  `/teachers/[id]` (`TeacherProfile`, a bare grid; the student profile has a
  header, the teacher one never did). Each now carries an `lg:hidden` button
  wired to `useNSidebar()?.openMobile()`, labelled `"Open sidebar"` to match
  najm-kit's own default.

  This was a live regression, not a latent gap: Phase 2 dropped `NSidebar`'s
  `showHamburgerButton`, which had been covering these three. On a phone they
  had a drawer sidebar and no way to open it.
  `apps/dashboard/src/lib/sidebarReachability.test.ts` now walks every route's
  imports and fails on the next headerless page. Two routes are exempt with
  stated reasons: `/drivers` only redirects to `/staff`, and `/test` is a
  developer NBadge preview.

## Browser follow-up

The repository now carries a production-build Playwright matrix for the
highest-risk role, locale, viewport, auth, preference, and sidebar paths. Its
GitHub run and artifacts are recorded in the companion ledger. Against this
inventory, the specific things the suite and any manual follow-up inspect are:

- All 36 full-bleed headers at phone width, for the taller mobile height and
  for `NPageLayout` spacing against School's existing `gap-2` shell styles. Do
  not compensate with unverified CSS.
- The numbered pagination bar at exact page-size boundaries, in RTL, and in card
  mode on the 24 surfaces that have a card renderer.
- Horizontal scrolling on the 15 table-only surfaces at phone width.
- Select item icons, remote comboboxes, touch-visible row actions, image inputs,
  and dialogs.
- `najm-theme@0.2.1` branding: no client flash, one snapshot per render, retry
  on the next request, and nothing entering the client bundle.

Screenshots and the acceptance ledger belong in this folder.

---

## `NTable` surfaces

All 39 are client-paginated over a fully loaded array; none passes
`manualPagination`, `pageCount`, `rowCount`, or `hasNextPage`.

"Modes" is `auto` when the table switches between table and cards on its own,
`defaults to table` when it starts as a table but can still be switched, and
`table only` when `availableModes` pins it.

| Surface | Card renderer | Modes | Page size |
| --- | --- | --- | --- |
| `features/Announcements/components/AnnouncementsTable.tsx` | yes | auto | default |
| `features/Assessments/components/AssessmentsTable.tsx` | yes | auto | default |
| `features/Attendance/components/StaffAttendanceTable.tsx` | no | defaults to table | default |
| `features/Attendance/components/StudentAttendanceTable.tsx` | no | auto | default |
| `features/BehaviorRewards/components/BehaviorRewardsTable.tsx` | yes | defaults to table | default |
| `features/Classes/components/ClassesTable.tsx` | yes | auto | default |
| `features/Cycles/components/CyclesTable.tsx` | yes | defaults to table | default |
| `features/Discipline/components/DisciplineTable.tsx` | yes | defaults to table | default |
| `features/Drivers/components/DriversTable.tsx` | yes | auto | default |
| `features/Exams/components/ExamsTable.tsx` | yes | auto | default |
| `features/Financial/Expenses/components/ExpensesTable.tsx` | yes | auto | default |
| `features/Financial/FeeTypes/components/FeeTypesTable.tsx` | yes | auto | default |
| `features/Financial/Fees/components/FeesTable.tsx` | yes | auto | default |
| `features/Financial/Fees/components/StudentFeesView/feeOverview/index.tsx` | yes | auto | default |
| `features/Financial/Fees/components/StudentFeesView/paymentHistory/index.tsx` | no | auto | default |
| `features/Financial/Installment/components/InstallmentsTable.tsx` | yes | auto | 10 |
| `features/Financial/Payment/components/MultiFeesPayment/InstallmentList.tsx` | no | defaults to table | 10 |
| `features/Financial/Payment/components/PaymentsTable.tsx` | yes | auto | default |
| `features/Financial/Payroll/components/PayrollTable.tsx` | no | auto | default |
| `features/Grades/components/GradesTable.tsx` | no | auto | default |
| `features/Parents/components/ParentsTable.tsx` | yes | auto | default |
| `features/Permissions/components/PermissionsTable.tsx` | yes | auto | default |
| `features/Reports/RemindersPage.tsx` | no | table only | default |
| `features/Roles/components/RolesTable.tsx` | yes | auto | default |
| `features/Sections/components/SectionsTable.tsx` | yes | auto | default |
| `features/Staff/components/StaffTable.tsx` | yes | auto | default |
| `features/Students/components/StudentProfile/Attendance/index.tsx` | no | table only | default |
| `features/Students/components/StudentProfile/Fees/index.tsx` | no | table only | default |
| `features/Students/components/StudentProfile/Grades/index.tsx` | no | table only | default |
| `features/Students/components/StudentsTable.tsx` | yes | auto | default |
| `features/Subjects/components/SubjectsTable.tsx` | yes | auto | default |
| `features/Teachers/components/TeachersTable.tsx` | yes | auto | default |
| `features/Teachers/components/profile/tabs/AcademicInfoTab.tsx` | no | auto | default |
| `features/Teachers/components/profile/tabs/ClassesTab.tsx` | no | auto | default |
| `features/Teachers/components/profile/tabs/DocumentsTab.tsx` | no | auto | default |
| `features/Teachers/components/profile/tabs/PaymentsTab.tsx` | no | auto | default |
| `features/Teachers/components/profile/tabs/SubjectsTab.tsx` | no | auto | default |
| `features/Users/components/UsersTable.tsx` | yes | auto | default |
| `features/Vehicles/components/VehiclesTable.tsx` | yes | auto | default |

## `NPageHeader` surfaces

Every instance is full-bleed. All inherit `mobileBreakpoint="lg"` and the mobile
sidebar trigger from `NSidebarProvider`.

| Surface | Instances |
| --- | --- |
| `features/Announcements/components/AnnouncementsTable.tsx` | 1 |
| `features/Assessments/components/AssessmentsTable.tsx` | 1 |
| `features/Attendance/components/StaffAttendanceTable.tsx` | 1 |
| `features/Attendance/components/StudentAttendanceTable.tsx` | 1 |
| `features/BehaviorRewards/components/BehaviorRewardsTable.tsx` | 1 |
| `features/Calendar/CalendarPage.tsx` | 1 |
| `features/ClassRoutines/components/ClassRoutinePage.tsx` | 1 |
| `features/Classes/components/ClassesTable.tsx` | 1 |
| `features/Cycles/components/CyclesTable.tsx` | 1 |
| `features/Dashboard/index.tsx` | 1 |
| `features/Discipline/components/DisciplineTable.tsx` | 1 |
| `features/Drivers/components/DriversTable.tsx` | 1 |
| `features/Exams/components/ExamsTable.tsx` | 1 |
| `features/Financial/Expenses/components/ExpensesTable.tsx` | 1 |
| `features/Financial/FeeTypes/components/FeeTypesTable.tsx` | 1 |
| `features/Financial/Fees/components/FeesTable.tsx` | 1 |
| `features/Financial/Payroll/components/PayrollTable.tsx` | 1 |
| `features/Grades/components/GradesTable.tsx` | 1 |
| `features/Parents/components/ParentsTable.tsx` | 1 |
| `features/Parents/components/profile/ParentProfile.tsx` | 1 |
| `features/Permissions/components/PermissionsTable.tsx` | 1 |
| `features/Reports/AgingReport.tsx` | 1 |
| `features/Reports/RemindersPage.tsx` | 1 |
| `features/Reports/index.tsx` | 1 |
| `features/Roles/components/RolesTable.tsx` | 1 |
| `features/Sections/components/SectionsTable.tsx` | 1 |
| `features/Settings/components/SettingsForm.tsx` | 2 |
| `features/Staff/components/StaffTable.tsx` | 1 |
| `features/Students/components/StudentProfile/index.tsx` | 1 |
| `features/Students/components/StudentsTable.tsx` | 1 |
| `features/Subjects/components/SubjectsTable.tsx` | 1 |
| `features/Teachers/components/TeachersTable.tsx` | 1 |
| `features/Transport/index.tsx` | 1 |
| `features/Users/components/UsersTable.tsx` | 1 |
| `features/Vehicles/components/VehiclesTable.tsx` | 1 |

Routes with no `NPageHeader`: `features/Financial/Operations/FinancialOperationsPage.tsx`,
which carries its own `lg:hidden` sidebar trigger.
