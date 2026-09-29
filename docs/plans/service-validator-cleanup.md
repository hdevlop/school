# Service error guards: validator cleanup

Completed on 2026-09-28. The scan covers `packages/server/src/**/*Service.ts`, including helpers declared in those files. **No service file contains an `Err` import, reference, or direct call.** All 26 files in the initial inventory below now delegate those 189 error sites to module validators, in addition to the earlier Attendance, Cycle, and Grade cleanup.

## Completed in this conversation

- AttendanceService delegates its error guards to AttendanceValidator.
- CycleService delegates existence, name uniqueness, and deletion guards to the new CycleValidator, exported by the cycles module.
- GradeService delegates teacher access, source existence and assignment, target section, year consistency, dated placement, and demo-source year guards to GradeValidator. Existing codes, messages, check ordering, and repository/service constructor dependencies are preserved. Its existing regression tests use real validator guards with only unrelated lookups stubbed.
- Academic sources, migration issue review, transitions, academic-year lifecycle, access reset, and timetable services delegate their guards to module validators. Activation locks, idempotent replay, cooldown claims, and optimistic version checks stay at their existing boundaries.
- Finance services delegate existence, allocation capacity, credit balance, payment transitions, fee calendars, payroll eligibility, and rollover guards to validators. Services retain money calculations, row locking, transactions, audit writes, events, and bulk-result aggregation.
- Notification, settings, staff, role, zone, enrollment, teacher, and transport services use validators for their existing guards. The financial cron-secret assertion lives in `financial/notifications/NotificationValidator.ts`; its module-level export remains available.
- New validators are exported from their module barrels, and affected manual seed dependencies and unit-test constructors are updated.

## Initial inventory (all completed)

This preserves the audit before the continuation. Paths are relative to `packages/server/src/modules`; counts and validator availability describe the initial snapshot. Every service in this table now has zero direct calls and a module validator owning the guards.

| Service | Direct Err calls | Dedicated validator exists |
| --- | ---: | --- |
| [academicSources/AcademicSourceService.ts](../../packages/server/src/modules/academicSources/AcademicSourceService.ts) | 5 | No |
| [academicYearMigrationIssues/AcademicYearMigrationIssueService.ts](../../packages/server/src/modules/academicYearMigrationIssues/AcademicYearMigrationIssueService.ts) | 7 | No |
| [academicYearTransitions/AcademicYearTransitionService.ts](../../packages/server/src/modules/academicYearTransitions/AcademicYearTransitionService.ts) | 10 | No |
| [academicYears/AcademicYearService.ts](../../packages/server/src/modules/academicYears/AcademicYearService.ts) | 12 | Yes |
| [accessReset/AccessResetService.ts](../../packages/server/src/modules/accessReset/AccessResetService.ts) | 2 | Yes |
| [classRoutines/ClassRoutineService.ts](../../packages/server/src/modules/classRoutines/ClassRoutineService.ts) | 8 | Yes |
| [dashboard/teacher/TeacherDashboardService.ts](../../packages/server/src/modules/dashboard/teacher/TeacherDashboardService.ts) | 1 | No |
| [financial/allocations/AllocationService.ts](../../packages/server/src/modules/financial/allocations/AllocationService.ts) | 7 | Yes |
| [financial/auditLog/FinancialAuditService.ts](../../packages/server/src/modules/financial/auditLog/FinancialAuditService.ts) | 1 | No |
| [financial/credits/CreditService.ts](../../packages/server/src/modules/financial/credits/CreditService.ts) | 3 | No |
| [financial/fees/FeeService.ts](../../packages/server/src/modules/financial/fees/FeeService.ts) | 16 | Yes |
| [financial/installments/InstallmentService.ts](../../packages/server/src/modules/financial/installments/InstallmentService.ts) | 4 | Yes |
| [financial/notifications/NotificationService.ts](../../packages/server/src/modules/financial/notifications/NotificationService.ts) | 1 | No |
| [financial/payments/PaymentService.ts](../../packages/server/src/modules/financial/payments/PaymentService.ts) | 14 | Yes |
| [financial/payroll/PayrollService.ts](../../packages/server/src/modules/financial/payroll/PayrollService.ts) | 3 | Yes |
| [financial/rollover/RolloverService.ts](../../packages/server/src/modules/financial/rollover/RolloverService.ts) | 10 | No |
| [notifications/NotificationService.ts](../../packages/server/src/modules/notifications/NotificationService.ts) | 2 | No |
| [settings/SettingsService.ts](../../packages/server/src/modules/settings/SettingsService.ts) | 5 | Yes |
| [staff/roles/StaffRoleService.ts](../../packages/server/src/modules/staff/roles/StaffRoleService.ts) | 7 | No |
| [staff/StaffService.ts](../../packages/server/src/modules/staff/StaffService.ts) | 13 | Yes |
| [staff/zones/ZoneService.ts](../../packages/server/src/modules/staff/zones/ZoneService.ts) | 3 | No |
| [studentEnrollments/StudentEnrollmentService.ts](../../packages/server/src/modules/studentEnrollments/StudentEnrollmentService.ts) | 31 | No |
| [teachers/TeacherService.ts](../../packages/server/src/modules/teachers/TeacherService.ts) | 5 | Yes |
| [transport/maintenance/MaintenanceService.ts](../../packages/server/src/modules/transport/maintenance/MaintenanceService.ts) | 1 | Yes |
| [transport/studentRoutes/StudentRouteService.ts](../../packages/server/src/modules/transport/studentRoutes/StudentRouteService.ts) | 8 | Yes |
| [transport/vehicleAssignments/VehicleAssignmentService.ts](../../packages/server/src/modules/transport/vehicleAssignments/VehicleAssignmentService.ts) | 10 | Yes |

## Verification

- `bun run test` passed all configured suites, including seed dependency wiring, year scope, ownership, access reset, routines, and workspace boundaries.
- The added `FinancialWriteGuards.test.ts` and `TransportWriteGuards.test.ts` passed all 15 cases. They exercise real validator guards through services, checking locked balances, reservations, check settlement, transport dates, rejection before writes, and successful boundary/idempotent cases.
- `bun run typecheck` passed contracts, server source and tests, seed, and dashboard before further concurrent parent-module changes. The latest server test typecheck fails only in `ParentChildrenYearScope.test.ts`: its removed `parentChildrenQuery` import (line 5), outdated five-argument service constructor (line 13), and outdated two-argument call (line 37). Those unrelated edits are being preserved; the latest full workspace typecheck is not green.
- `bun run lint` passed with the existing unused `activeLabel` warning in `VehicleStudentsPanel.tsx`.
- `bun run build` passed production compilation, TypeScript, page generation, and route collection.
- Connected database/API/browser acceptance was not run for this refactor.

## Approach used for each service

1. Extend its module validator, or add a focused validator when none owns the checks. Keep persistence in repositories and write orchestration, events, and transactions in services.
2. Preserve exact HTTP status, message or translation key, validation order, ownership predicates, selected-year rules, and dated placement behavior. Keep post-write guards inside the existing transaction boundary.
3. Reuse existing guard methods when they preserve the same error contract. Avoid a shared generic error-dispatch service or one validator spanning unrelated modules.
4. Export new validators in the module barrel. Update manual seed dependency registration and test constructors if constructor dependencies change.
5. Run the smallest relevant existing tests, typecheck, lint, and a production build as appropriate. Record failures caused by concurrent unrelated edits separately.

Reproduce the direct-call inventory from the repository root:

```powershell
rg -n '\bErr\s*\(' packages/server/src -g '*Service.ts'
```

ExamService, AssessmentService, ClassService, BehaviorRewardService, and DisciplineService currently have no direct `Err(...)` calls in this scan.
