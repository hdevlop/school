# Positive Behavior And Rewards Core Plan

## 1. Purpose

Build a separate, table-first feature for recording positive student behavior and the recognition or reward given for it.

This is not part of the discipline/violation module. It has its own:

- database table
- Najm backend module
- permissions
- REST and MCP operations
- React Query cache
- frontend feature folder
- `/behavior-rewards` page
- table, filters, dialogs, and translations

The feature may be implemented after the violation core is stable. It must not expand or delay the discipline table release.

Related violation plan: [Discipline Core Feature Plan](./DISCIPLINE_CORE_PLAN.md).

## 2. Core Scope

### Included

- positive behavior only
- one student per behavior/reward record
- one table-first dashboard view
- create, view, edit, and delete
- fixed positive-behavior category tags
- fixed recognition-level tags
- fixed reward-type tags
- optional awarded points stored on each record
- admin and teacher access
- responsive table/card presentation
- REST and MCP backed by the same service

### Excluded

- violations or disciplinary actions
- parent/student notifications
- reports, charts, leaderboards, or dashboard KPIs
- points redemption or a rewards store
- student point balances
- automatic rewards based on attendance or grades
- badges displayed on student profiles
- certificates or printable documents
- attachments
- group rewards
- approval workflow
- configurable categories/reward types
- student/parent access

## 3. Boundary With Discipline

The separation is intentional:

| Violations | Positive behavior/rewards |
|---|---|
| `/discipline` | `/behavior-rewards` |
| `discipline_incidents` | `behavior_rewards` |
| `packages/server/src/modules/discipline` | `packages/server/src/modules/behaviorRewards` |
| Severity and resolution status | Recognition level and reward type |
| Disciplinary action | Positive recognition/reward |
| `*:discipline` permissions | `*:behavior-rewards` permissions |
| `discipline_*` MCP tools | `behavior_rewards_*` MCP tools |

Do not add a generic signed behavior-points table and do not put positive and negative records into one schema. The separate models keep permissions, workflows, language, colors, and future changes clear.

The only reusable pieces should be presentation helpers such as a student identity cell or class/section formatting when an existing shared component already fits.

## 4. Users And Permissions

### Administrator

- See all positive behavior/reward records.
- Create a record for any active student.
- View and edit any record.
- Delete an incorrect record after confirmation.

### Teacher

- See records they awarded.
- Create a record only for students allowed through their teaching assignments.
- View and edit their own records.
- Cannot delete in the core release.

### Student And Parent

- No page or API access in the core release.

### Permission Names

- `read:behavior-rewards`
- `create:behavior-rewards`
- `update:behavior-rewards`
- `delete:behavior-rewards`

Default assignments:

- Admin: all permissions.
- Teacher: read, create, and update.
- Student/parent: none.

The backend enforces ownership and student assignment. Frontend button visibility is only a usability layer.

## 5. Data Model

Create one table: `behavior_rewards`.

| Column | Type/behavior | Purpose |
|---|---|---|
| `id` | standard Najm text ID | Primary key |
| `studentId` | required student reference, restrict delete | Recognized student |
| `classId` | required class reference | Class snapshot when awarded |
| `sectionId` | required section reference | Section snapshot when awarded |
| `awardedBy` | required user reference | Authenticated creator |
| `behaviorAt` | required timestamp | When the positive behavior happened |
| `category` | required enum | Kind of positive behavior |
| `recognitionLevel` | required enum | Importance of the recognition |
| `description` | required text, max 2000 | Factual explanation of the behavior |
| `rewardType` | required enum | Recognition or reward given |
| `points` | integer, default 0, range 0-100 | Optional points attached to this record |
| `rewardNote` | optional text, max 1000 | Details about the reward |
| `createdAt` | standard timestamp | Creation time |
| `updatedAt` | standard timestamp | Last update time |

The service derives `classId`, `sectionId`, and `awardedBy`. The client sends only the student and behavior/reward details.

Class and section are snapshots so old reward records remain understandable if a student later changes class.

### Positive Behavior Categories

- `academic_effort`
- `improvement`
- `respect`
- `helpfulness`
- `leadership`
- `teamwork`
- `responsibility`
- `community_service`
- `excellent_attendance`
- `other`

### Recognition Levels

- `appreciation`
- `achievement`
- `excellence`

These labels describe recognition importance without using violation-style severity language.

### Reward Types

- `verbal_praise`
- `written_praise`
- `merit`
- `badge`
- `certificate`
- `privilege`
- `prize`
- `other`

Points are optional metadata, not a balance system. The core feature does not total, spend, transfer, expire, or redeem points.

## 6. Business Rules

### Create

- Student must exist and be active.
- Student must have a class and section.
- Teacher must be assigned to the student's section; admins are unrestricted.
- `awardedBy` comes from the authenticated user.
- Class and section snapshots come from the student record.
- `behaviorAt` cannot be unreasonably far in the future.
- Description is required.
- Reward type and recognition level are required.
- Points default to zero and must be an integer from 0 to 100.
- Creating a record never sends a notification and never creates a behavioral alert.

### Edit

- Teacher can edit only a record they awarded.
- Admin can edit any record.
- Generic update uses an explicit allowlist.
- Client cannot change `awardedBy`, class, or section directly.
- Changing the student recalculates snapshots and repeats access validation.

### Delete

- Admin only.
- Requires confirmation.
- Used only for an incorrectly entered record.
- No bulk delete or delete-all route.

There is no publish, approve, resolve, revoke, or redemption state in the first release.

## 7. Backend Module

Create:

```text
packages/server/src/modules/behaviorRewards/
  behaviorRewardSchema.ts
  BehaviorRewardDto.ts
  BehaviorRewardRepository.ts
  BehaviorRewardValidator.ts
  BehaviorRewardService.ts
  BehaviorRewardGuards.ts
  BehaviorRewardController.ts
  index.ts
```

### Schema

- Define the three feature enums and `behavior_rewards` table.
- Reuse the standard ID, reference, and timestamp helpers.
- Add indexes for student, awarded-by user, category, recognition level, reward type, and behavior date.

### DTO

Create MCP-compatible plain Zod objects:

- `createBehaviorRewardDto`
- `updateBehaviorRewardDto`
- `behaviorRewardIdParam`

Avoid top-level arrays and preprocessors for MCP-exposed inputs.

### Repository

- joined list with student, class, section, and awarding user
- scoped list for caller
- get by ID
- create
- update
- delete one
- focused teacher/student assignment lookup if no existing validator covers it

Order by newest `behaviorAt`, then newest `createdAt`.

### Validator

- ensure reward record exists
- ensure student exists and is active
- ensure student has class and section
- ensure teacher can access the student
- ensure teacher owns the record for teacher updates
- validate behavior date
- validate points bounds through DTO and service guardrails

### Service

- derive the awarding user and academic snapshots
- enforce create/update allowlists
- coordinate ownership and student validation
- return joined records after writes
- never call alert, notification, email, or WhatsApp services

### Guards

- use the existing permission system
- admin sees all authorized records
- teacher read scope is `awardedBy`
- teacher create/update receives service-level student/ownership checks

### Controller

- `@Controller('/behavior-rewards')`
- `@ToolGroup('behavior_rewards')`
- thin REST/MCP transport methods
- `@Validate(...)` on every input
- authenticated user passed into create/update service operations

## 8. API And MCP

### REST Routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/behavior-rewards` | List authorized records |
| `GET` | `/api/behavior-rewards/:id` | View one authorized record |
| `POST` | `/api/behavior-rewards` | Create positive behavior/reward |
| `PUT` | `/api/behavior-rewards/:id` | Edit an authorized record |
| `DELETE` | `/api/behavior-rewards/:id` | Admin-only delete |

### MCP Tools

- `behavior_rewards_list`
- `behavior_rewards_get_by_id`
- `behavior_rewards_create`
- `behavior_rewards_update`
- `behavior_rewards_delete`

Read tools are read-only. Create/update require warning confirmation; delete requires danger confirmation.

## 9. UI Route And Navigation

### Route

```text
apps/dashboard/src/app/(dashboard)/behavior-rewards/page.tsx
```

This page is independent from `/discipline` and does not use tabs to mix positive and negative records.

### Sidebar

Once both features exist, use one parent group:

```text
Student Conduct
  Violations                    /discipline
  Positive Behavior & Rewards   /behavior-rewards
```

Use distinct icons and labels:

- `ShieldAlert` for violations
- `Award` or `Star` for positive behavior/rewards

Do not show the behavior/rewards item before its route is implemented.

### Visual Direction

Preserve the existing operational dashboard layout. Make the positive view clearly different through restrained emerald, teal, blue, and gold tags, while keeping the same typography, spacing, tables, dialogs, and form components.

Avoid celebration effects, gradients, confetti, or game-like animation in the core administrative view.

## 10. Positive Behavior And Rewards Table

### Header

- translated Positive Behavior & Rewards title
- total authorized record count
- existing global actions
- `Add recognition` table action
- no KPI cards

### Columns

| Column | Display |
|---|---|
| Student | Avatar, name, and student code |
| Class / section | Snapshot names |
| Positive behavior | Category tag and description preview |
| Recognition | Appreciation/achievement/excellence badge |
| Reward | Reward type badge |
| Points | Numeric badge; show `—` when zero |
| Behavior date | Localized date/time |
| Awarded by | User name/email fallback |

Default sort: newest behavior date first.

### Tag Colors

#### Recognition

- Appreciation: teal
- Achievement: blue
- Excellence: gold/amber

#### Reward

- Praise: teal
- Merit/badge: blue
- Certificate/privilege: amber
- Prize: emerald
- Other: slate

Raw enum values must never appear in the UI.

### Filters

- search student name, student code, or description
- category
- recognition level
- reward type
- class/section when joined-value filtering fits `NTable`

Date range, point range, and server pagination are deferred.

### Actions

- View
- Edit when authorized
- Delete for admin only

There are no workflow actions in this release.

## 11. Forms And Details

### Create/Edit Form

Use one compact `NForm` with:

- student, required searchable select
- behavior date/time, required, default now
- positive behavior category, required
- recognition level, required, default `appreciation`
- description, required
- reward type, required, default `verbal_praise`
- points, optional, default 0
- reward note, optional

Do not expose class, section, or awarded-by inputs.

### Detail View

Show:

- student identity
- class/section snapshot
- category and recognition tags
- full behavior description
- reward type, points, and reward note
- behavior date
- awarding user
- creation/update dates

### Mobile Card

Prioritize student, positive category, recognition, reward, points, behavior date, and class/section. Keep the full description in the detail dialog.

## 12. Frontend Structure

```text
apps/dashboard/src/features/BehaviorRewards/
  components/
    BehaviorRewardsTable.tsx
    BehaviorRewardForm.tsx
    BehaviorRewardCard.tsx
    BehaviorRewardDetails.tsx
  hooks/
    useBehaviorRewards.tsx
    useBehaviorRewardsTableColumns.tsx
    useBehaviorRewardsTableFilters.tsx
  behaviorRewardConstants.ts
```

Also create/update:

```text
apps/dashboard/src/services/behaviorRewardApi.ts
apps/dashboard/src/app/(dashboard)/behavior-rewards/page.tsx
apps/dashboard/src/lib/validations.ts
apps/dashboard/src/shared/DashboardShell/index.tsx
```

Use `useEntityCRUD('behavior-rewards', ...)`. This data belongs in React Query; do not add a Zustand store.

## 13. Translations

Add matching keys to English, French, Arabic, and Spanish locales.

Required groups:

- `navigation.studentConduct`
- `navigation.behaviorRewards`
- `behaviorRewards.table.*`
- `behaviorRewards.filters.*`
- `behaviorRewards.form.*`
- `behaviorRewards.categories.*`
- `behaviorRewards.recognitionLevels.*`
- `behaviorRewards.rewardTypes.*`
- `behaviorRewards.dialogs.*`
- `behaviorRewards.success.*`
- `behaviorRewards.errors.*`
- MCP mutation confirmations

Run the existing i18n checker before completion.

## 14. Implementation Sequence

Implement only after the discipline core has passed its definition of done, unless the user explicitly changes priority.

### Phase 1: Backend Foundation

- [ ] Add behavior/reward enum values.
- [ ] Create schema and exports.
- [ ] Generate and inspect the next migration.
- [ ] Add DTOs and types.
- [ ] Implement repository, validator, service, guards, and controller.
- [ ] Register the module.
- [ ] Add backend translations and confirmations.

### Phase 2: Frontend Table

- [ ] Add API service and React Query hook.
- [ ] Add frontend validation and constants.
- [ ] Create route, table, columns, filters, and mobile card.
- [ ] Create add/edit form and detail view.
- [ ] Wire create/view/edit/delete.
- [ ] Add all four translations.

### Phase 3: Shared Navigation

- [ ] Create the Student Conduct sidebar group.
- [ ] Move Discipline under Violations.
- [ ] Add Positive Behavior & Rewards as the second child.
- [ ] Confirm active state works for both routes.

### Phase 4: Verification

- [ ] DTO tests.
- [ ] service/validator ownership and snapshot tests.
- [ ] controller/permission tests where supported.
- [ ] server type check.
- [ ] dashboard lint.
- [ ] i18n check.
- [ ] database check.
- [ ] production build.
- [ ] desktop and mobile manual verification.
- [ ] MCP `tools/list` schema inspection when the local MCP server is active.

## 15. Required Tests

- valid create/update payload passes
- missing student/category/recognition/reward/date/description fails
- points below 0 or above 100 fail
- missing/inactive student fails
- student without class/section fails
- teacher cannot award a student outside allowed assignments
- teacher sees and edits only their own records
- class, section, and awarded-by values are server-derived
- create/update never sends notifications or creates alerts
- admin delete permission is enforced
- list returns joined student/class/section/user data
- successful mutations refresh the table
- translated tags render instead of raw enum values
- mobile card shows all critical summary data

## 16. Definition Of Done

The separate behavior/rewards core is complete when:

1. `/behavior-rewards` is a real independent page.
2. The sidebar presents violations and positive behavior as separate Student Conduct views.
3. Admins see all authorized reward records; teachers see their own.
4. Authorized users can create a positive behavior/reward record for one valid student.
5. Category, recognition, reward, points, student, date, and awarding user render correctly.
6. Search and tag filters work.
7. Authorized users can view and edit; admins can delete with confirmation.
8. Desktop table and mobile cards are usable.
9. Permissions are enforced server-side.
10. REST and MCP share one service implementation.
11. No positive record is stored in the discipline table.
12. No notification, report, balance, redemption, or leaderboard behavior exists.
13. Targeted tests, type checking, lint, i18n validation, database checks, and build pass.

## 17. Future Backlog

- student/parent visibility
- notifications and parent acknowledgement
- student-profile positive behavior tab
- totals and point balances
- reward redemption catalog
- leaderboards with privacy controls
- automatic awards from attendance or grades
- configurable categories, levels, and rewards
- certificates and printable recognition letters
- approval/revocation workflow and history
- attachments
- group/class rewards
- reports and dashboard widgets

These features must remain outside the core table implementation until it is complete and reviewed.
