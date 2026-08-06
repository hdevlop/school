# Discipline Core Feature Plan

## 1. Purpose

Build the first complete, usable discipline feature around a single table of student violations.

This release is deliberately small:

- violations only
- one student per discipline record
- one table-first dashboard page
- simple create, view, edit, resolve, reopen, and delete operations
- fixed category, severity, status, and disciplinary-action tags
- no notifications
- no reports or analytics
- no positive behavior or rewards inside the discipline module; those belong to the separate [Behavior Rewards Core Plan](./BEHAVIOR_REWARDS_CORE_PLAN.md)
- no attachments, appeals, or printable documents

The goal is to finish a reliable core workflow before adding secondary features.

## 2. Product Decisions

These decisions are fixed for the core release:

| Area | Core decision |
|---|---|
| Record model | One violation record belongs to one student |
| Workflow | `open` -> `resolved`; an administrator may reopen a resolved record |
| Categories | Fixed list; no category-management screen yet |
| Discipline action | Selected when resolving the violation |
| Notifications | Not implemented and must not be triggered |
| Reports | Not implemented |
| Positive behavior/rewards | Separate backend module, table, API, and `/behavior-rewards` view |
| Student profile integration | Deferred; use the main discipline table first |
| Files/evidence | Deferred |
| Bulk operations | Deferred |
| Data loading | Load the authorized record set and filter in the existing `NTable`; server pagination comes later |

## 3. User Roles And Access

### Administrator

- See all discipline records.
- Create a violation for any active student.
- View and edit any record.
- Resolve and reopen records.
- Delete an incorrect record after confirmation.

### Teacher

- See records they reported.
- Create a violation only for a student they are allowed to access through their teaching assignments.
- View and edit their own open records.
- Cannot resolve, reopen, or delete records in the first release.

### Student And Parent

- No discipline page or API access in this release.

### Permissions

Use the existing permission system instead of relying only on frontend role checks.

- `read:discipline`
- `create:discipline`
- `update:discipline`
- `delete:discipline`
- `resolve:discipline`

Default assignments:

- Admin: all discipline permissions.
- Teacher: `read`, `create`, and `update`.
- Student/parent: none.

The server remains the source of truth. Hiding a button in the dashboard is not authorization.

## 4. Core Data Model

Create one table: `discipline_incidents`.

### Columns

| Column | Type/behavior | Purpose |
|---|---|---|
| `id` | standard Najm text ID | Primary key |
| `studentId` | required student reference, restrict delete | Student receiving the violation |
| `classId` | required class reference | Snapshot of the student's class when reported |
| `sectionId` | required section reference | Snapshot of the student's section when reported |
| `reportedBy` | required user reference | Authenticated user who created the record |
| `incidentAt` | required timestamp | When the violation happened |
| `category` | required enum | Violation category |
| `severity` | required enum | Low-to-critical severity |
| `location` | optional text, max 150 | Where it happened |
| `description` | required text, max 2000 | Clear factual description |
| `status` | required enum, default `open` | Current workflow state |
| `actionType` | nullable enum | Disciplinary action chosen during resolution |
| `actionNote` | optional text, max 1000 | Details about the action |
| `resolutionNote` | nullable text, max 2000 | Required explanation when resolving |
| `resolvedBy` | nullable user reference | Administrator who resolved it |
| `resolvedAt` | nullable timestamp | Resolution time |
| `createdAt` | standard timestamp | Created time |
| `updatedAt` | standard timestamp | Last update time |

`classId`, `sectionId`, and `reportedBy` must be derived by the service. The client must not be trusted to provide those values.

When a student is selected, the service loads the student and copies their current class and section into the violation. This keeps the table historically understandable if the student later moves.

### Enum Values

#### Category

- `classroom_disruption`
- `disrespect`
- `bullying`
- `fighting`
- `cheating`
- `vandalism`
- `uniform_violation`
- `device_misuse`
- `prohibited_item`
- `other`

#### Severity

- `low`
- `medium`
- `high`
- `critical`

#### Status

- `open`
- `resolved`

#### Disciplinary action

- `verbal_warning`
- `written_warning`
- `detention`
- `counseling`
- `parent_meeting`
- `suspension`
- `other`

The enum values live in the shared enum registry and are reused by Drizzle, Zod, backend responses, frontend validation, filters, badges, and translations.

## 5. Business Rules

### Create

- The student must exist and be active.
- The student must have a class and section.
- A teacher must be assigned to the selected student's section; admins are unrestricted.
- `reportedBy` always comes from the authenticated user.
- `classId` and `sectionId` always come from the current student record.
- New records always start as `open`.
- Resolution fields must be empty on creation.
- The incident date cannot be unreasonably far in the future. Allow the current time plus a small clock-skew tolerance only.

### Edit

- Incident details can be edited while the record is open.
- A teacher can edit only an open record they reported.
- Admins can edit any open record.
- The service uses an explicit allowlist and never accepts `reportedBy`, class/section snapshots, status, or resolution metadata through the generic update endpoint.
- Changing the student recalculates the class and section snapshots and repeats the teacher-access validation.

### Resolve

- Only a user with `resolve:discipline` can resolve a record.
- Only an open record can be resolved.
- `actionType` and `resolutionNote` are required.
- `actionNote` is optional.
- The service sets `status`, `resolvedBy`, and `resolvedAt` itself.
- Resolving a record does not create an alert, email, WhatsApp message, or any other notification.

### Reopen

- Only an administrator with `resolve:discipline` can reopen a resolved record.
- Reopening returns the status to `open` and clears the action and resolution fields.
- A full immutable status/action history is intentionally deferred. Until it exists, the UI must show a confirmation explaining that reopening clears the current resolution.

### Delete

- Only administrators with `delete:discipline` can delete.
- Deletion requires confirmation.
- This is for incorrectly entered records, not normal workflow completion.
- Bulk delete and delete-all endpoints are not part of the core release.

## 6. Backend Module

Create:

```text
packages/server/src/modules/discipline/
  disciplineSchema.ts
  DisciplineDto.ts
  DisciplineRepository.ts
  DisciplineValidator.ts
  DisciplineService.ts
  DisciplineGuards.ts
  DisciplineController.ts
  index.ts
```

### Responsibilities

#### `disciplineSchema.ts`

- Define the enums and `discipline_incidents` table.
- Use existing `idField`, references, and `timestamps` helpers.
- Add useful indexes for `studentId`, `reportedBy`, `status`, `severity`, and `incidentAt`.

#### `DisciplineDto.ts`

Define plain Zod object schemas that remain MCP-compatible:

- `createDisciplineDto`
- `updateDisciplineDto`
- `resolveDisciplineDto`
- `disciplineIdParam`

Do not use top-level arrays or Zod preprocessors in schemas exposed through MCP.

#### `DisciplineRepository.ts`

Raw database work only:

- build the joined select for student, class, section, reporter, and resolver
- list all records visible to the caller's scope
- get by ID
- create
- update incident details
- resolve
- reopen
- delete one record
- validate teacher/student assignment with a focused query when no existing validator provides it

Default ordering: newest `incidentAt`, then newest `createdAt`.

#### `DisciplineValidator.ts`

- ensure the record exists
- ensure student exists and is active
- ensure student has class and section
- ensure a teacher may report for the student
- ensure teacher owns the record when required
- ensure the record is open before edit/resolve
- ensure the record is resolved before reopen
- validate incident date

#### `DisciplineService.ts`

- orchestrate validators and repository calls
- derive reporter and class/section snapshots
- apply explicit create/update allowlists
- enforce status transitions
- set and clear resolution metadata
- return fully joined records after writes

#### `DisciplineGuards.ts`

- connect the module to Najm permissions
- admins receive full access through assigned permissions
- teacher reads are scoped to `reportedBy`
- teacher writes are further checked by service/validator rules

#### `DisciplineController.ts`

- keep transport logic thin
- use `@Controller('/discipline')`
- use `@ToolGroup('discipline')`
- use `@Validate(...)` on every input
- use permission guards on every operation
- pass the authenticated user into the service where ownership or metadata is needed

### Module Registration

Update:

- `packages/server/src/modules/index.ts`
- `packages/server/src/database/schema/index.ts`
- `packages/server/src/shared/enums.ts`
- `packages/server/src/modules/seed.ts` only if the current dependency-export pattern requires it

The server already loads the module export object with `.load(modulesModule)`; do not introduce `.scan()`.

## 7. REST And MCP Contract

### REST routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/discipline` | List authorized records |
| `GET` | `/api/discipline/:id` | View one authorized record |
| `POST` | `/api/discipline` | Create an open violation |
| `PUT` | `/api/discipline/:id` | Edit incident details |
| `POST` | `/api/discipline/:id/resolve` | Resolve with action and notes |
| `POST` | `/api/discipline/:id/reopen` | Admin-only reopen |
| `DELETE` | `/api/discipline/:id` | Admin-only delete |

Declare literal action routes before the dynamic `/:id` route where route ordering could matter.

### MCP tools

Expose the same service implementation through safe MCP tools:

- `discipline_list`
- `discipline_get_by_id`
- `discipline_create`
- `discipline_update`
- `discipline_resolve`
- `discipline_reopen`
- `discipline_delete`

Mutation tools require warning or danger confirmations. Read tools are marked read-only. No file handling is needed in this release.

## 8. Dashboard Page

### Route

Create:

```text
apps/dashboard/src/app/(dashboard)/discipline/page.tsx
```

The page renders the discipline feature table and contains no dashboard KPI cards or report charts.

### Navigation

Add `Discipline` to `DashboardShell` for admins and teachers, close to Attendance and other student operations. Use a suitable existing Lucide icon such as `ShieldAlert`.

When the separate behavior/rewards feature is available, place both routes under one `Student Conduct` sidebar group:

- `Violations` -> `/discipline`
- `Positive Behavior & Rewards` -> `/behavior-rewards`

Until both routes exist, keep Discipline as a standalone item so the sidebar never contains a dead link.

The navigation item must use the translation key `navigation.discipline`.

### Visual Direction

Preserve the current dashboard language: restrained, operational, and information-dense. Severity color is the main visual signal. Do not introduce a new theme, decorative gradients, or unrelated layout patterns.

Use the current:

- `NPageHeader`
- `NTable`
- `NBadge`
- `NForm`
- `FormInput`
- dialog and delete-confirmation helpers
- responsive card rendering already used by other entity features

## 9. Discipline Table

### Header

- Icon and translated `Discipline` title.
- Subtitle showing the current authorized record count.
- Existing global header actions.
- `Add violation` action through the standard `NTable` create flow.

Do not add KPI cards in the core release.

### Columns

| Column | Display |
|---|---|
| Student | Avatar if available, student name, and student code |
| Class / section | Snapshot class and section names |
| Violation | Category label plus a one-line description preview |
| Severity | Color-coded severity badge |
| Status | Open/resolved badge |
| Incident date | Localized date and time |
| Action | `—` while open; translated action badge after resolution |
| Reported by | Reporter name/email fallback |

Default sort is newest incident first.

### Tag Colors

Use a single shared map so the table, card, detail view, and forms stay consistent.

#### Severity

- Low: neutral/slate
- Medium: amber
- High: orange
- Critical: red

#### Status

- Open: amber
- Resolved: green

#### Action

- Warning actions: amber
- Detention/meeting/counseling: blue
- Suspension: red
- Other: slate

Labels must be translated. Raw enum strings must never be shown to users.

### Filters

Use client-side `NTable` filters in the first release:

- search by student name, student code, or description
- category
- severity
- status
- class/section if the existing filter API supports joined values cleanly

Date-range filtering and server-side pagination are deferred.

### Row Actions

Keep the table actions small and predictable:

- View
- Edit, only when allowed
- Delete, admin only

Workflow actions are placed in the detail dialog instead of adding a crowded custom action column:

- Resolve when open and authorized
- Reopen when resolved and authorized

If `NTable` cannot conditionally hide built-in actions, provide a feature-local action cell. Do not modify `najm-kit` solely for this feature.

## 10. Dialogs And Forms

### Create/Edit Violation Form

Use one compact `NForm`, not a multi-step wizard.

Fields:

- student, searchable select, required
- incident date/time, required, defaults to now
- category, required
- severity, required, defaults to `medium`
- location, optional
- description, required

Class, section, reporter, status, and resolution fields are not editable form inputs.

When editing, prefill the record and preserve the ID for the existing update pattern.

### Detail View

Show:

- student identity
- class and section snapshot
- category, severity, and status tags
- incident date and location
- complete description
- reporter and creation/update dates
- resolution action, action note, resolution note, resolver, and resolution time when resolved

The detail dialog contains the Resolve or Reopen primary action when authorized.

### Resolve Form

Fields:

- disciplinary action, required
- action details, optional
- resolution note, required

Submitting closes the dialog, invalidates discipline queries, and immediately refreshes table badges and action data.

### Reopen Confirmation

Explain that reopening returns the record to open and clears the current resolution fields because the history timeline is not part of the core release.

### Mobile Card

The card view prioritizes:

- student
- category
- severity
- status
- incident date
- class/section

Long descriptions remain in the detail dialog.

## 11. Frontend File Structure

```text
apps/dashboard/src/features/Discipline/
  components/
    DisciplineTable.tsx
    DisciplineForm.tsx
    DisciplineCard.tsx
    DisciplineDetails.tsx
    ResolveDisciplineForm.tsx
  hooks/
    useDiscipline.tsx
    useDisciplineTableColumns.tsx
    useDisciplineTableFilters.tsx
  disciplineConstants.ts
```

Also create/update:

```text
apps/dashboard/src/services/disciplineApi.ts
apps/dashboard/src/app/(dashboard)/discipline/page.tsx
apps/dashboard/src/lib/validations.ts
apps/dashboard/src/shared/DashboardShell/index.tsx
```

### Data Hooks

Use `useEntityCRUD('discipline', ...)` for list, get, create, update, and delete.

Register `resolve` and `reopen` as custom mutations. Every successful mutation must invalidate the shared discipline list/detail query keys.

Do not add a Zustand store; discipline records are server state and belong in React Query.

## 12. Translation Plan

Add matching keys to:

- `packages/server/src/locales/en.json`
- `packages/server/src/locales/fr.json`
- `packages/server/src/locales/ar.json`
- `packages/server/src/locales/es.json`

Required groups:

- `navigation.discipline`
- `discipline.table.*`
- `discipline.filters.*`
- `discipline.form.*`
- `discipline.categories.*`
- `discipline.severity.*`
- `discipline.status.*`
- `discipline.actions.*`
- `discipline.dialogs.*`
- `discipline.success.*`
- `discipline.errors.*`
- MCP confirmation messages under the existing confirmation namespace

Run the repository i18n key checker before completion.

## 13. Migration And Seed Approach

### Migration

- Add shared enum values and the discipline schema.
- Run `bun run db:generate` to create the next available migration; do not hand-pick a migration number because the worktree already contains pending migrations.
- Inspect the generated SQL for enum, foreign-key, and index correctness.
- Run `bun run db:check`.
- Do not apply the migration to a shared or production database without explicit approval.

### Seed Data

Demo seeding is optional for the first implementation pass. The create form is sufficient to prove the feature.

If seed data is added, keep it small and realistic:

- 6-10 Moroccan/Arabic-friendly student violations
- mixed categories and severity
- both open and resolved records
- valid existing student, class, section, reporter, and resolver IDs

Do not introduce placeholder names such as `Test Student`.

## 14. Implementation Order

### Phase 1: Schema And Contracts

- [ ] Add discipline enums to the shared registry.
- [ ] Create `disciplineSchema.ts`.
- [ ] Export the schema through the database schema index.
- [ ] Generate and inspect the migration.
- [ ] Create DTOs and shared TypeScript types.

### Phase 2: Backend Core

- [ ] Implement repository joined reads and writes.
- [ ] Implement validator existence, ownership, student-access, date, and status rules.
- [ ] Implement service orchestration and allowlists.
- [ ] Implement permission guards.
- [ ] Implement REST and MCP controller routes.
- [ ] Export the module from `modules/index.ts`.
- [ ] Add locale success/error/confirmation messages.

### Phase 3: Frontend Data Layer

- [ ] Create `disciplineApi.ts`.
- [ ] Create validation schema and frontend enum constants.
- [ ] Create `useDiscipline` using `useEntityCRUD`.
- [ ] Add custom resolve and reopen mutations.

### Phase 4: Table-First UI

- [ ] Create the `/discipline` route.
- [ ] Build the table columns and filters.
- [ ] Build the mobile card.
- [ ] Build create/edit form.
- [ ] Build detail view.
- [ ] Build resolve form and reopen confirmation.
- [ ] Wire view/edit/delete/resolve/reopen actions.
- [ ] Add navigation for admin and teacher.
- [ ] Add all four locale translations.

### Phase 5: Tests And Verification

- [ ] Add DTO tests.
- [ ] Add validator/service transition tests.
- [ ] Add authorization and controller tests where existing test helpers support them.
- [ ] Run targeted server tests.
- [ ] Run server TypeScript check.
- [ ] Run dashboard lint.
- [ ] Run i18n check.
- [ ] Run production build.
- [ ] Manually verify desktop and mobile table/card flows.
- [ ] If MCP is enabled locally, inspect `tools/list` and verify the live discipline schemas before testing calls.

## 15. Required Tests

### DTO

- valid creation payload passes
- missing student/category/severity/date/description fails
- invalid enum values fail
- overlong location/description/action/resolution notes fail
- resolve requires action type and resolution note

### Validator And Service

- inactive or missing student is rejected
- student without class/section is rejected
- class/section/reporting user are derived, not accepted from the client
- unauthorized teacher/student combination is rejected
- teacher can update their own open record
- teacher cannot update another reporter's record
- resolved record cannot be generically edited by a teacher
- open record resolves successfully and captures resolver/time
- resolved record cannot be resolved twice
- admin can reopen and resolution fields are cleared
- delete permission is enforced
- future incident date is rejected

### API/UI Acceptance

- list responses include joined student, class, section, reporter, and resolver data
- create refreshes the table
- edit refreshes the row
- resolve changes both status and action tags immediately
- reopen returns the record to open
- delete removes the row after confirmation
- table filters work with translated labels
- mobile card retains all critical information
- notifications are never created

## 16. Verification Commands

Run the smallest checks first and stop to fix failures before broader verification:

```powershell
.\node_modules\.bin\tsc -p packages/server/tsconfig.json --noEmit
bun test packages/server/tests/discipline
bun run lint
bun run i18n:check
bun run db:check
bun run build
```

Do not run reset, drop, force-push, or destructive seed commands.

## 17. Definition Of Done

The core discipline feature is complete when:

1. Admins and teachers can open `/discipline` from the sidebar.
2. The table lists only records the authenticated user may see.
3. A valid violation can be created for one student.
4. Student, class/section, violation, severity, status, incident date, action, and reporter display correctly.
5. Category, severity, and status filters work.
6. Authorized users can view and edit an open record.
7. An administrator can resolve a record with a required action and resolution note.
8. An administrator can reopen or delete with confirmation.
9. Desktop table and mobile card layouts are usable.
10. Raw enum keys never appear in the UI.
11. REST and MCP use the same service logic.
12. Permissions are enforced server-side.
13. No notification or report behavior is introduced.
14. Targeted tests, type checking, lint, i18n validation, database checks, and production build pass.

## 18. Deferred Backlog

Do not implement these until the core table workflow is finished and reviewed:

- positive behavior, merits, rewards, and points inside the discipline module; implement them only through the separate [Behavior Rewards Core Plan](./BEHAVIOR_REWARDS_CORE_PLAN.md)
- automated parent/student notifications
- parent acknowledgement
- discipline reports, KPIs, charts, trends, or repeat-offender analytics
- student-profile discipline tab
- multiple students in one incident
- witnesses and staff participants
- attachments, photos, and evidence
- configurable violation categories or action types
- status/action history timeline
- comments and internal collaboration
- appeals
- printable letters or PDFs
- bulk actions
- server pagination and advanced date filters
- attendance-triggered discipline rules
- dashboard widgets

This backlog is intentionally separate so it cannot expand the core release while it is being implemented.
