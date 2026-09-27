> Preserved reference from the retired root acceptance plan. This text is retained verbatim below for traceability, including its old status, section numbers, paths and commands. It is not a current execution result. Use the [production browser index](../README.md), [preflight](../00-preflight.md) and [current runner status](../automation-and-release.md) before execution. Local/database obligations remain open; production smoke does not satisfy them.

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
