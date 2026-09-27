# Production browser feature tests

Status: **NOT RUN**. Prepared from the repository on 2026-09-25 for `https://myscolai.com`; the deployed revision and feature availability have not been inspected in this documentation change.

This folder replaces the root School connected acceptance plan. Each feature has a browser checklist with an entry point, fixtures, expected results and stable case IDs. These are execution guides, not implemented automated tests or evidence of a production pass.

## Start here

1. Read [production preflight and fixture rules](00-preflight.md).
2. Record the serving revision and a new attempt in [the evidence ledger](evidence-ledger.md).
3. Run [authentication](authentication.md), [registration](registration.md) and [administrative access reset](access-reset.md) as applicable. Full feature promotion still requires the retained Gate A and A-R contracts; an incomplete auth smoke does not satisfy those gates.
4. Test the relevant feature below. Read-only smoke and fixture mutations have separate outcomes. Use the same revision and dependent fixtures: academic structure, people, teaching/conduct, finance, then transport/communications. Follow each guide's dependencies.
5. Run the [shared responsive, locale and accessibility matrix](responsive-accessibility.md) over the selected features.
6. Record cleanup and remaining [API/database obligations](api-database-boundaries.md). Use [automation and release status](automation-and-release.md) before attempting any old command.

For a single production inspection, record exactly what was checked even if a full local gate is unavailable. Mark the result as **smoke only; promotion blocked** until the preserved prerequisites pass. Never turn a partial observation into whole-feature acceptance.

## Feature index

Every guide starts as NOT RUN. The unit column maps the old acceptance matrix to its new owner; extensions cover current routes missing from that matrix.

| Guide | Entry point | Original units |
| --- | --- | --- |
| [Authentication and sessions](authentication.md) | `/login`, `/forgot-password`, `/reset-password`, `/change-password` | A |
| [Registration](registration.md) | `/register` | A extension |
| [Users: reset access](access-reset.md) | `/users` row/card action | A-R |
| [Dashboard](dashboard.md) | `/` | B01, I02 |
| [Navigation and global search](navigation-search.md) | Dashboard shell and any exposed search control | B02, D09 |
| [Appearance and localization](appearance-localization.md) | Dashboard shell, appearance/language controls | B03, B04 |
| [School settings](settings.md) | `/settings` | B05 |
| [Users](users.md) | `/users` | B06 |
| [Roles](roles.md) | `/roles` | B07 |
| [Permissions](permissions.md) | `/permissions` | B08 |
| [Cycles](cycles.md) | `/cycles` | C01 |
| [Classes](classes.md) | `/classes` | C02 |
| [Sections](sections.md) | `/sections` | C03 |
| [Subjects](subjects.md) | `/subjects` | C04 |
| [Class routines and timetable](class-routines.md) | `/class-routines` | C05 |
| [Calendar](calendar.md) | `/calendar` | C06 |
| [Events](events.md) | `/calendar` event controls; no standalone `/events` page | C07 |
| [Students](students.md) | `/students` | D01 |
| [Student profile](student-profile.md) | `/students/[id]` | D02, D10 |
| [Parents](parents.md) | `/parents` | D03 |
| [Parent profile](parent-profile.md) | `/parents/[id]` | D04, D10 |
| [Teachers](teachers.md) | `/teachers` | D05 |
| [Teacher profile](teacher-profile.md) | `/teachers/[id]` | D06, D10 |
| [Staff](staff.md) | `/staff` | D07 |
| [Staff roles and zones](staff-roles-zones.md) | Selectors in `/staff` forms; management controls only if exposed | D08 |
| [Student attendance](student-attendance.md) | `/attendance/students` | E01 |
| [Staff attendance](staff-attendance.md) | `/attendance/staff` | E02 |
| [Teacher attendance](teacher-attendance.md) | `/attendance/teachers` | E03 |
| [Assessments](assessments.md) | `/assessments` | E04 |
| [Exams](exams.md) | `/exams` | E05 |
| [Grades](grades.md) | `/grades` | E06 |
| [Discipline](discipline.md) | `/discipline` | F01 |
| [Behavior rewards](behavior-rewards.md) | `/behavior-rewards` | F02 |
| [Announcements](announcements.md) | `/announcements` | F03 |
| [Notifications and alerts](notifications.md) | `/notifications` and notification bell; legacy alert controls only if exposed | F04, G12 |
| [Push notification preferences](push-preferences.md) | `/preferences` | Notification extension |
| [Fee types](fee-types.md) | `/fee-types` | G01 |
| [Fees](fees.md) | `/fees` | G02 |
| [Student fee detail](student-fees.md) | `/students/[id]/fees` | G03 |
| [Payments and allocations](payments.md) | Student fee payment controls and `/financial-operations` check controls | G04, G06 |
| [Installments](installments.md) | Student fee detail and fee schedule preview | G05 |
| [Student credits](student-credits.md) | `/financial-operations` student credit panel | G07 |
| [Expenses](expenses.md) | `/expenses` | G08 |
| [Payroll](payroll.md) | `/payroll` | G09 |
| [Academic-year rollover](rollover.md) | `/financial-operations` rollover panel | G10 |
| [Financial operations](financial-operations.md) | `/financial-operations` | G11, G13 |
| [Aging report](aging.md) | `/aging` | G14 |
| [Financial reminders](reminders.md) | `/reminders` | G15 |
| [Reports](reports.md) | `/reports` | G16 |
| [Vehicles](vehicles.md) | `/vehicles` | H01 |
| [Drivers](drivers.md) | `/drivers` | H02 |
| [Vehicle assignments](vehicle-assignments.md) | Driver assignment controls in `/drivers` and transport surfaces | H03 |
| [Student transport routes](student-routes.md) | `/transport` and student transport controls | H04 |
| [Refuels and maintenance](refuels-maintenance.md) | Vehicle-related controls if exposed; no standalone route in this checkout | H05, H06 |
| [Transport workspace](transport.md) | `/transport` | H07 |

Shared non-browser units B09 and I01-I05 live in [API/database boundaries](api-database-boundaries.md). Financial notifications and alerts are covered by Notifications and Financial operations; profile API projections are covered by the three profile guides with separate API proof. Refuels, maintenance, staff-role management and search must report missing browser surfaces explicitly.

## Preserved contracts and history

The original content is split without discarding its obligations or historical evidence:

- [Overview and historical baseline](reference/overview-history.md)
- [Execution, fixtures and coder/tester contract](reference/execution-contract.md)
- [Full auth and administrative access-reset gates](reference/auth-contract.md)
- [Original complete feature matrix](reference/feature-matrix.md)
- [Runner, release and verification contracts](reference/runner-and-release-contract.md)
- [Original evidence and completion definition](reference/evidence-and-completion.md)

The historical package pins, test counts and command examples are not current claims. This folder adds current browser guides while retaining the original source/UI/local-connected/remote evidence boundaries. Full acceptance requires every applicable assertion and separate server/database proof; absent features and blocked fixtures remain open.

Related records: [Routine timetable evidence](../routine-timetable.md), [seed-reset incident](../seed-reset-routine.md), [access-reset implementation plan](../../plans/USER-ACCESS-RESET-PLAN.md).
