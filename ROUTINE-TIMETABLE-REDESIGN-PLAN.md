# Routine timetable redesign and flexible nested-subject plan

Status: **SOURCE IMPLEMENTED — LOCAL MIGRATION APPLIED; CONNECTED ACCEPTANCE OPEN**

Source review and requirements update: **2026-09-24**

Scope: School's Routine page, lesson editor, saved nested-subject content, and teacher timetable views.

## 1. Corrected requirement

**An hour is one scheduled lesson containing flexible teaching content. Nested subjects have no individual start time, end time, duration, or minute allocation.**

The teacher decides how to use the hour and can rotate alternative activities between weeks while keeping the same day and H1 slot. Only the outer period has a scheduled time.

This clarification replaces the earlier proposal for timed segments. Implementation must use the model in this revision throughout the UI, API, validation, database, and tests.

The requested timetable supports:

- One subject filling the hour, as existing lessons do today.
- Several nested subjects displayed together within the same hour, such as three activities separated visually by dotted vertical lines.
- Two alternative nested subjects separated by a diagonal: A **OR** B.
- A fixed nested subject alongside a pair of alternatives: **A + (B OR C)**.
- A recurring weekly template in which the teacher manages time allocation and rotation without entering a weekly calendar or exact timings for each nested subject.

The plan remains in the repository root. Its additive migration was applied to the loopback development database; connected app acceptance and any other environment remain separate steps. The supplied screenshots are conversation references, and their relevant behavior is captured below. `CHATBOT-LATENCY-PLAN.md` is a separate plan.

## 2. Teaching meaning and reference examples

### 2.1 Cell structures

| Structure | Example | Meaning |
| --- | --- | --- |
| Whole subject | Maths | The scheduled subject fills H1; no nested labels are needed. |
| Several fixed nested subjects | Reading + Dictation + Written exercises | All remain listed under the same H1. The teacher controls their order and time allocation. |
| Alternative pair | Orthographe OR Dictée | One alternative can be used in this hour, with the choice or rotation managed by the teacher. |
| Fixed plus alternatives | التعبير الكتابي + (مشروع الوحدة OR الاجتماعيات) | Written expression remains a regular part of the hour; the other part offers unit project or social studies. |
| French mixed example | Projet de classe + (Production écrite OR Poésie) | Class project stays present while the teacher chooses or rotates between the two alternatives. |

The Arabic mixed example reproduces the structure of Friday H1 in the user's second reference. Three fixed nested labels in a cell reproduce the structure of the first reference.

A vertical divider separates labels visually. It does not promise that each receives one third or one half of the hour. A diagonal communicates alternatives. Its two triangles do not represent timed halves.

### 2.2 Weekly rotation and teacher freedom

- The timetable is a recurring weekly template.
- A fixed activity remains part of the template each week.
- An alternative pair remains visible as A OR B. The teacher can use A this week and B next week, or adjust the choice to teaching needs.
- No mandatory Week A/Week B selector, cycle anchor, parity calculation, dates, or automatic weekly switch is required.
- No saved record claims which alternative was actually taught on a specific date. That belongs to a future lesson log if requested.
- A teacher's freedom to organize teaching inside the hour does not change who may edit the school's timetable. Retain the existing admin/principal write permissions.
- Display order organizes the labels; it does not enforce a teaching sequence.

The user's clarification resolves the earlier diagonal blocker: implement teacher-managed alternatives and rotation. Do not leave the old “awaiting diagonal meaning” gate in the implementation checklist.

### 2.3 Recommended implementation defaults

- Keep one subject/teacher assignment and room at the outer lesson level, matching the current booking model. Every nested label inherits that context.
- Treat nested subjects as timetable labels, for example French with Lecture and Grammaire, rather than creating new graded academic-subject records.
- Support zero to six content groups in a cell. Each group is either one fixed label or exactly two alternative labels. Six is a proposed display limit, centralized as a constant.
- Zero groups means “show the existing main subject normally.”
- A single fixed group can show one more specific activity label for the main subject.
- Allow several fixed groups, an alternative-only cell, and mixed fixed/alternative groups through the same model.
- Use equal visual widths by default; give a diagonal group enough minimum width to keep both labels legible. Width is presentation only and never a duration.
- Keep English, French, Arabic, and Spanish UI translations.

Independent teachers/rooms for nested labels, simultaneous student groups, and automatic dated recurrence are beyond this requirement. The current design deliberately retains one real lesson booking per cell.

## 3. Current source and what actually needs changing

The source findings below were inspected locally. They are not evidence of live database state or browser acceptance.

| File | Current behavior and planned change |
| --- | --- |
| `apps/dashboard/src/features/ClassRoutines/components/RoutineGrid.tsx` | Periods are rows and days are columns. Transpose the grid, retaining one entry map value per day/period, and render its nested content. |
| `apps/dashboard/src/features/ClassRoutines/components/RoutineEntryForm.tsx` | One assignment, room, and notes. Keep these controls and add a small content-group editor and cell preview. |
| `apps/dashboard/src/features/ClassRoutines/components/ClassRoutinePage.tsx` | Coordinates class/section selection and dialogs. Pass nested content through the existing save path. |
| `packages/server/src/modules/classRoutines/ClassRoutineSchema.ts` | One entry per schedule/day/period with one assignment. This remains the correct booking identity. Add structured content on the entry. |
| `packages/server/src/modules/classRoutines/ClassRoutineDto.ts` | Add validated fixed/alternative content groups to entry payloads. Keep period-level time validation. |
| `packages/server/src/modules/classRoutines/ClassRoutineRepository.ts` | Extend explicit entry projections to return content. Keep parent assignment joins and whole-period resource checks. |
| `packages/server/src/modules/classRoutines/ClassRoutineService.ts` | Persist content with the existing lesson and preserve it through unrelated updates and layout remapping. |
| `packages/server/src/modules/classRoutines/ClassRoutineValidator.ts` | Continue checking the lesson's teacher and room for the whole period. Nested labels create no separate bookings. |
| `packages/server/src/modules/classRoutines/ClassRoutineController.ts` | Entry mutations are administrator REST routes. Extend DTOs through these routes without adding new MCP mutation exposure. |
| `apps/dashboard/src/features/Teachers/components/profile/tabs/ScheduleTab.tsx` | Reuses the grid and counts entry rows. One entry still equals one lesson, regardless of nested label count. |
| `packages/server/src/modules/subjects/subjectSchema.ts` | Catalog is flat. Timetable labels require no subject hierarchy migration. |
| `packages/server/src/database/migrations/meta/_journal.json` | Last inspected migration was `0046_elite_leader`. Use the next available migration number when implementing. |
| `package.json` | Safe tests include config, access-reset, and boundaries. Integrate new Routine server unit tests explicitly. |

The unrelated edit in `apps/dashboard/src/features/Events/components/EventForm.tsx` was present before this planning task. Inspect status again before implementing and preserve other work.

## 4. Visual specification

### 4.1 Timetable surface

- Preserve the existing page header, class/section selectors, and Days/Periods controls.
- Put days down the side and period names/time ranges across the top.
- Use the reference's dark blue header, soft day cells, thin grid lines, and pastel subject surfaces, adapted to both app themes.
- Use the real period times already stored by School. H1/H2 are outer periods; a period need not last exactly 60 minutes.
- Use table semantics with a caption and row/column headers where practical. Internal content uses CSS grid or flex.
- Keep the day column sticky during horizontal scrolling. Give teaching columns readable minimum widths and allow narrower break columns.
- Color a cell by its main subject. Nested labels inherit that color, including both sides of an alternative pair.
- Show the main subject when no content groups exist. When groups exist, show their labels prominently and retain the main subject in accessible details.
- Keep teacher, room, and notes at the lesson level and accessible through focus/touch/details.
- Use striped break surfaces with a readable break name. Preserve each day's existing supervisor badge and duty editor.
- Empty cells show a subtle dash; editable cells reveal an add action on hover and keyboard focus.

### 4.2 Nested content layout

Render content groups next to each other across the available width:

```text
Three fixed labels in the same H1:
| Reading | Dictation | Written exercises |

Alternative-only H1:
| Orthographe OR Dictée |
  diagonal divider between the two labels

Fixed plus alternatives in the same H1:
| التعبير الكتابي | مشروع الوحدة OR الاجتماعيات |
                    diagonal only inside this group
```

The examples above describe structure. The renderer should use a dotted vertical separator between groups and a diagonal inside an alternative group, matching the supplied references.

- A cell has an ordered list of groups, not one global “split or diagonal” switch. Mixed content must work.
- A fixed label occupies its own visual panel.
- An alternative group contains two real text labels positioned on opposite sides of a diagonal. Use CSS or a small inline SVG for decorative backgrounds/lines.
- Keep text away from the diagonal. Label placement must work with Arabic and long French text.
- Include the OR meaning in accessible descriptions and a compact legend or details view. The diagonal alone must not be the only explanation.
- If an alternative group is too narrow for readable triangles, fall back to stacked A / OR / B in that view. Preserve the meaning and both labels.
- Use stable render keys while editing; persisted content-group IDs are unnecessary unless a later feature needs independent references.

### 4.3 Responsive, accessible, and printed views

- On small screens, keep a readable horizontally scrollable grid rather than compressing every label into tiny text.
- Open a focused cell in an existing Najm dialog/sheet for full details or editing.
- Use keyboard-accessible cell controls, visible focus indicators, and Enter/Space activation.
- Read-only users can open lesson details without receiving edit controls.
- Screen readers hear the day, whole-period time, main subject, fixed labels, and alternative relationships. Do not announce invented nested times.
- Follow the app's existing direction provider. In RTL, place the first period at the inline start without reversing the chronological data twice.
- Isolate mixed-language labels and time ranges using appropriate direction handling.
- Verify both themes, long labels, keyboard use, touch, and 200% zoom.
- Basic landscape print styling is optional follow-up work. If added, preserve fixed/OR meaning in monochrome, hide editor chrome, and keep day rows together. PDF generation is not part of this first delivery.

## 5. Editor workflow

1. Click a day/period cell and open the existing lesson dialog.
2. Select the main subject/teacher assignment once. Keep lesson-level room and notes.
3. Show an optional “Nested subjects” section with an **Add subject** action.
4. A fixed group contains one label input, such as “Lecture.”
5. An **Add alternative** action on that group converts it to two label inputs with a visible OR between them.
6. Another **Add subject** creates another independent fixed group beside the first. This makes both A + B + C and A + (B OR C) easy to enter.
7. Support move-up/move-down controls to reorder the visual groups. Dragging is optional and must have a keyboard equivalent.
8. Removing one option from a pair converts the remaining label into a fixed group. Removing the whole group deletes that content from the preview.
9. Allow returning to a plain main-subject cell by explicitly removing all groups. Do not discard populated groups just because a display toggle or assignment changes.
10. Show a live preview using the same cell renderer as the timetable.
11. Save the lesson and its entire content list together. Keep input intact on validation, conflict, or network failure.

There are **no nested time pickers, duration inputs, percentage sliders, minute totals, or “must sum to one hour” checks**. A short helper can explain that the teacher organizes these activities within the period and can rotate alternatives between weeks.

Use the existing `NForm` and dialog pattern. The new nested labels should be editable text with clear French/Arabic-friendly examples. Keep rooms inherited when no override is set; do not turn the displayed section default into an explicit override accidentally.

## 6. Data model: one booking with structured content

### 6.1 Preserve the current entry

Keep these existing `routine_entries` fields and their meaning:

- `scheduleId`, `dayOfWeek`, and `periodId` identify the booked cell.
- `teacherAssignmentId` owns the main subject and teacher for the whole period.
- `roomNumber` remains the optional lesson-level override.
- `notes` remains lesson-level text.
- The unique schedule/day/period constraint and assignment foreign key remain.
- Existing timestamps and IDs remain.

Add `contentGroups` as a typed `jsonb('content_groups')` column with a non-null empty-array default. The groups are small, ordered lesson content that is edited atomically, so JSON fits this requirement without separate child resource tables.

Add a positive integer `version` with default 1 for the explicit concurrency contract below. This protects simultaneous edits of the complete content list.

### 6.2 Shared shape

Create a browser-safe `@sms/contracts/routines` export for the content types, limits, and pure content utilities:

```ts
export type RoutineContentGroup =
  | { kind: 'fixed'; label: string }
  | { kind: 'alternative'; options: [string, string] };

export interface RoutineContent {
  contentGroups: RoutineContentGroup[];
}
```

Array order is display order. Fixed groups remain listed every week; an alternative group carries the teacher-managed OR meaning. There is no persisted week counter or recurrence mode because this version has one agreed rotation policy.

The shape contains no per-label assignment, room, timestamp, offset, duration, or percentage. Do not reintroduce the previous `routine_entry_segments` / `routine_entry_activities` tables or move the parent assignment out of the entry.

### 6.3 Exact mixed-example payload

The period ID refers to Friday H1's existing outer time range:

```json
{
  "dayOfWeek": "friday",
  "periodId": "existing-h1-period-id",
  "teacherAssignmentId": "existing-arabic-teacher-assignment-id",
  "roomNumber": null,
  "notes": null,
  "expectedVersion": 3,
  "contentGroups": [
    {
      "kind": "fixed",
      "label": "التعبير الكتابي"
    },
    {
      "kind": "alternative",
      "options": ["مشروع الوحدة", "الاجتماعيات"]
    }
  ]
}
```

A three-label cell uses three `fixed` groups. An alternative-only cell uses one `alternative` group. Existing plain lessons use `contentGroups: []`.

IDs in this example are placeholders for existing real records. The server derives subject/teacher/class/section names from the assignment, as it does today.

### 6.4 Validation and layer ownership

- Validate zero to six groups and the discriminated group shape.
- Trim labels, require nonempty text, and cap each label at 100 characters.
- An alternative must contain exactly two distinct trimmed labels. Do not over-normalize Arabic spellings or turn natural text into catalog IDs.
- Reject unsupported nested scheduling fields rather than silently accepting a request for timings or separate teachers.
- Render labels as text; never interpret them as HTML.
- A database check should enforce an array JSON value; detailed shape validation belongs in the DTO/service contract.
- Keep Zod schemas in `ClassRoutineDto.ts` and the feature form schema. Contracts can own plain TypeScript types and pure helpers without adding a forbidden backend dependency.
- Use the existing controller -> service -> repository -> validator responsibilities.
- School owns this domain feature. Reuse installed Najm UI components and the single provider; no Najm package release or local dependency link is required.

## 7. API behavior and existing clients

- Extend current entry POST/PUT routes with `contentGroups`; return the groups in schedule, section, and teacher reads through the existing service.
- On create, omitted content becomes an empty array.
- On update, omitted `contentGroups` means **preserve existing content**. Explicit `[]` means clear it. Do not let a create-schema default reset content through a partial-update schema.
- Update explicit repository SELECT projections so content is returned. Keep current parent assignment joins and teacher filtering.
- Save the parent fields and complete JSON content in one atomic entry update.
- Keep array replacement simple; separate routes for each nested label are unnecessary.
- New editors send `expectedVersion` on updates. Use a database compare-and-update against the current version and increment it on success; return a translated 409 on stale edits.
- Require an expected version when an existing entry's content is replaced/cleared. Legacy parent-only updates can preserve content and increment the version. They must never reset groups through omission.
- New delete requests carry the expected entry version in a validated query parameter. Reject an unversioned delete of an entry containing nested content, so an old view cannot unknowingly remove it.
- Existing parent-level payloads continue to work within those compatibility rules. An additional read-format version and nested-resource API are unnecessary.
- Deploy backend support before exposing the new editor. If a read lacks the expected content/version fields, the new frontend should avoid offering a save that an older backend could silently strip.
- Keep React Query invalidation under `['class-routines']` so Routine and teacher views update together.
- Existing MCP reads reuse the same enriched service response. Entry mutations remain REST-only. Update exposed tool descriptions if necessary to explain fixed/alternative labels.

## 8. Scheduling, layout, and teacher views

### 8.1 Whole-period resource rules

The teacher and effective room are booked for the **entire outer period**, regardless of whether the cell contains one label, three labels, or alternatives.

- Continue existing teacher, room, section, and duty conflict validation against the period start/end.
- Nested groups never free a portion of the hour for another class.
- Rotating between alternative labels does not change teacher availability between weeks.
- Adding/removing/reordering content does not create extra bookings or change time boundaries.
- Assignment validity and authorization remain server enforced.
- Test that enriched content cannot bypass any current whole-period conflict rule.

The old plan's subinterval reservation queries, alternative-teacher reservations, minute-coverage checks, and timetable-wide locking redesign are superseded by this simpler requirement. Do not claim that nested content fixes unrelated pre-existing concurrent scheduling behavior; report a verified existing scheduling defect separately if encountered.

### 8.2 Days and periods

- Keep exact time editing at the existing outer Days/Periods level.
- Changing a period's duration requires no nested-content recalculation; the teacher simply has the new outer period to organize.
- Preserve `contentGroups` when existing layout code remaps an entry to a replacement period ID.
- Test that changing period timing, reordering timeline rows, and remapping entries never drop or reset the JSON content.
- Existing `updateLayout` maps lessons and breaks by ordinal. This source behavior deserves a separate stable-period-identity improvement, but nested labels do not require rebuilding that subsystem.
- Continue reporting any existing layout/conflict limitations honestly. Do not treat a cosmetic content feature as proof that moving whole lessons is conflict-safe.

### 8.3 Teacher timetable

- The current parent assignment determines which teacher sees the lesson.
- Return and render all nested groups for that lesson using the same `RoutineCell` renderer.
- One occupied period remains one lesson in weekly counts. Three labels or a diagonal pair must not multiply lessons or teaching hours.
- If duration totals exist or are added later, count the outer period once.
- Keep the current protected own-teacher route behavior and admin/principal access.
- Show the OR structure consistently each week. Do not show an automatically selected “this week's activity” without a dated scheduling feature.

## 9. Migration and rollback

### 9.1 Additive migration

1. Recheck the current schema and migration journal; allocate the next available migration.
2. Add `content_groups jsonb NOT NULL DEFAULT '[]'::jsonb` with an array-type check, plus the entry version column.
3. Preserve all existing entry IDs, period links, assignments, room values/nulls, notes, timestamps, and duties. Existing entries receive an empty content list.
4. Do not create activity rows or change assignment nullability. No data extraction or timed-segment backfill is needed.
5. Review generated SQL and Drizzle metadata. Ensure the migration contains no unrelated schema drift.
6. Rehearse against a disposable PostgreSQL database with representative existing lessons before applying it to an authorized live target.
7. Verify entry/duty counts and original values before/after; demonstrate existing and enriched lesson round-trips.

### 9.2 Deployment and compatibility

- Apply the additive schema migration before deploying code that selects the new column.
- Deploy backend support and then the UI using the existing application delivery process. Avoid enabling the editor while an old server still strips new fields.
- Retain parent assignment ownership, existing row identity, and default-room semantics.
- Source validation, database migration, exact deployed revision, API acceptance, and browser acceptance each need their own evidence.

### 9.3 Rollback

- Before nested content is saved, the extra columns are inert defaults and the old UI can still display ordinary lessons.
- After content is saved, an old application may display only the main subject while the JSON remains in the database. That is degraded presentation, not lossless feature support.
- Prefer a compatible build with nested editing disabled, or a forward fix. Retain the additive columns and saved groups during rollback.
- Avoid allowing an old UI to delete content-bearing entries without showing their details; pause Routine writes if necessary.
- Never drop the new column, flatten its labels into notes, or restore an older backup merely to reverse the UI. Any destructive recovery requires an explicit decision and preserved data.

## 10. Implementation phases and files

### Phase 1 — contracts, schema, and persistence

- [x] Add `packages/contracts/src/routines.ts` with group types, limits, and a pure content summary helper.
- [x] Export `@sms/contracts/routines` from `packages/contracts/package.json`.
- [x] Add the content/version fields in `ClassRoutineSchema.ts` and generate the additive migration and metadata.
- [x] Extend entry DTOs with create/update omission rules and strict group validation.
- [x] Extend repository projections and atomic update/version handling.
- [x] Preserve existing service validation and controller authorization.
- [x] Add deterministic DTO/service tests.
- [ ] Rehearse the additive migration on a disposable PostgreSQL database.

Exit: existing lessons read normally; fixed, alternative, and mixed content persist without nested timing data.

### Phase 2 — shared cell renderer and grid

- [x] Update `features/ClassRoutines/types/routine.ts`; `types/forms.ts` already consumes the entry type and needs no duplicate definition.
- [x] Extract `components/RoutineCell.tsx` to render the main subject or nested groups.
- [x] Transpose `RoutineGrid.tsx` to days as rows and periods as columns.
- [x] Add dotted separators, diagonal alternatives, subject colors, and horizontal scrolling at narrow widths.
- [x] Preserve break supervisors and details/edit actions.
- [x] Update `ClassRoutineSkeleton.tsx` for the new orientation.
- [ ] Confirm long-label legibility and the narrow-width fallback in browser acceptance.

Exit: the reference's plain, three-label, alternative-only, and mixed cell structures render clearly.

### Phase 3 — editor and consumers

- [x] Extend `RoutineEntryForm.tsx` with Add subject, Add alternative, removal, reorder, and live preview.
- [x] Keep content editing in the existing form; no separate editor component is needed.
- [x] Update `ClassRoutinePage.tsx` and `services/classRoutineApi.ts`; existing `hooks/useClassRoutines.ts` invalidates both routine and teacher queries after writes.
- [x] Reuse the renderer in the teacher schedule through the existing shared grid; keep lesson counts unchanged.
- [x] Add all UI/error keys in `packages/contracts/src/locales/{en,fr,ar,es}.json`.
- [x] Test parent-only updates and explicit content clearing; layout remapping updates only the period ID in source.
- [ ] Verify admin/principal editing, teacher details, and layout remapping against a connected database/browser.

Exit: a user can enter the exact Friday Arabic example without setting a nested time or week cycle.

### Phase 4 — verification and delivery

- [x] Integrate safe Routine server unit tests into root `test`; include new server tests in `packages/server/tsconfig.test.json`.
- [x] Complete focused tests and the relevant static root quality gates below.
- [ ] Run opt-in disposable PostgreSQL checks for migration, persistence, and version concurrency.
- [ ] Complete internal API and browser acceptance where authorized/available.
- [x] Record current evidence under `docs/tests/routine-timetable.md`.
- [ ] If requested, commit/push/deploy and prove each delivery boundary independently.

## 11. Verification

### 11.1 Behavioral tests

| Area | Required cases |
| --- | --- |
| Plain lessons | Empty/omitted content on create displays the original main subject. |
| Nested shapes | Three fixed labels; one alternative group; fixed plus alternatives; several mixed groups; order preserved on reload. |
| Teacher flexibility | Every shape saves with no nested timing fields; outer periods of different lengths accept the same content. |
| Rotation | OR remains in the same weekly slot; no mandatory week/date input or automatic choice appears. |
| Validation | Reject blank/too-long labels, invalid kinds, malformed pairs, identical alternatives, excess groups, and unsupported nested scheduling fields. |
| Updates | Omission preserves content; explicit empty array clears it; parent-only edits and layout remaps retain it. |
| Versions | Two concurrent content edits cannot silently overwrite one another; a stale editor retains input and receives a conflict. |
| Whole-hour booking | Adding labels cannot permit another class to use the teacher/room during any part of the booked hour. |
| Ownership/auth | Wrong assignment/section/period/entry and unauthorized writes still reject. |
| Teacher view | All groups visible under the one parent teacher; one lesson counted once; own-teacher access rules preserved. |
| Migration | Existing IDs, assignments, rooms/nulls, notes, duties, timestamps, and counts preserved; defaults and JSON round-trip correct. |
| Compatibility | Old payload omission never wipes groups; a backend without support cannot produce a false successful nested-content save in the new UI. |

Suggested locations:

- `packages/contracts/tests/routines.test.ts` for content helpers.
- `packages/server/tests/classRoutines/ClassRoutineDto.test.ts` and `ClassRoutineService.test.ts` for validation and update semantics.
- `packages/server/tests/classRoutines/ClassRoutinePostgres.test.ts` for real persistence, migration, and compare-and-update concurrency.
- Focused feature tests in `apps/dashboard/src/features/ClassRoutines/` where existing test tooling can exercise meaningful editor/presentation behavior.

Keep the PostgreSQL suite opt-in, using a dedicated disposable target and explicit guard. Do not place it in safe default tests or infer database proof from mocks. If infrastructure is absent, report skipped/unrun.

### 11.2 Commands

Use Bun. Add a `test:routines` script for deterministic Routine server unit tests and include it in root `test`. Contracts/frontend tests already fall under `test:config`.

```powershell
bun test packages/contracts/tests/routines.test.ts
bun run test:routines
bun run lint
bun run typecheck
bun run i18n:check
bun run test
bun run build
bun run db:check
git diff --check
```

The focused test files and `test:routines` script now exist. Root `test` includes boundary checks.

Use `bun run db:generate` to prepare reviewed migration SQL. Execute `bun run db:migrate` only against the authorized intended target. Do not use destructive database shortcuts. Build/test environment values follow the existing single-env-file contract and must stay out of evidence.

### 11.3 API and visual acceptance

Use internal REST for entry writes and existing MCP tools for exposed operations. Prepare acceptance data through those transports. Browser work verifies the timetable feature itself, following the available browser skill; it does not replace API/MCP for unrelated live-data setup.

- [ ] Confirm days as rows, periods as columns, reference colors, dotted separators, and break styling.
- [ ] Save/reload one plain subject, three fixed labels, an alternative-only cell, and a mixed cell.
- [ ] Reproduce Friday H1 as **التعبير الكتابي + (مشروع الوحدة OR الاجتماعيات)**.
- [ ] Verify the editor has no nested time/duration fields or required rotation calendar.
- [ ] Verify the diagonal appears only in the alternative group, while the fixed label stays separate.
- [ ] Change an outer period's duration and confirm content needs no redistribution.
- [ ] Inspect teacher view: same groups, same whole-period time, one lesson count.
- [ ] Verify labels and choices survive parent-only edits, layout remaps, reloads, and failed saves.
- [ ] Inspect French and Arabic RTL, long labels, both themes, narrow screens, touch, keyboard focus, and 200% zoom.
- [ ] Verify the existing supervisor editor, Days/Periods controls, and role restrictions.
- [ ] Record actual revision and sanitized screenshots/results; label excluded or unavailable checks unrun.

## 12. Completion and current evidence

Implementation is complete when the user can reproduce the references with untimed nested subjects and teacher-managed alternatives, existing bookings and duties are preserved, and the applicable checks pass.

| Boundary | Current status |
| --- | --- |
| User's timing/rotation clarification | Incorporated: no nested times; teacher manages time and weekly alternatives |
| Plan revision | Complete |
| Source implementation | Implemented locally; additive migration prepared |
| Static checks/unit tests for implementation | Passed locally: lint, typecheck, i18n, root tests, build, db:check |
| Disposable PostgreSQL migration/persistence/version proof | Not run |
| Internal API acceptance | Not run |
| Browser/RTL/mobile acceptance | Not run |
| Loopback development database migration | Applied 0047; no Routine entries existed to exercise preservation |
| Other environment migration | Not performed |
| Commit/push/CI/deployment | Not requested or performed |

Report future completion against these boundaries. The revised plan replaces the earlier timed-segment design in full.

### Local evidence, 2026-09-24

- `bun run test`: passed with Routine DTO/service tests, shared content-summary tests, and workspace boundaries (898 files and 264 client entries checked).
- `bun run typecheck`, `bun run lint`, `bun run i18n:check`, `bun run db:check`, and the final `bun run build`: passed.
- Migration `0047_pink_rafael_vega.sql` adds two Routine columns and two checks only. Snapshot comparison with `0046_snapshot.json` confirms `public.routine_entries` is the only changed table. An unrelated generated roles index was excluded.
- `bun run db:migrate` applied migration 0047 to the loopback development database. The migration journal now has 48 records, with 0047 latest; both new columns are non-null with their expected defaults. This database had zero Routine entries, so existing-entry preservation remains unproven.
- Internal API, browser, and disposable PostgreSQL acceptance remain open. No other database migration, commit, push, or deployment was performed. See `docs/tests/routine-timetable.md`.
