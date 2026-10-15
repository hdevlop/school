# Kafil-style enum and form-validation migration for School

Status: **implemented** (2026-09-21).

The plan below is kept as written. What follows records how it was carried out,
where the work departed from it, and what a reviewer should look at first.

## Implementation record

### Order

Phases 0–3 ran as written. Phase 4 and Phase 5 were swapped in part: the full
student schema composes the fee schemas, so `Financial/{FeeTypes,Fees,Payment,
Expenses}` were migrated before `Students`, which is the last feature to move.
Parents and Teachers still preceded Students as the plan requires.

### Departures from the plan

Four, each deliberate, each tested:

1. **Three broken option lists were fixed rather than carried over.** The plan
   says not to clean up behaviour during a move; these were not behaviour, they
   were forms that could not submit. The driver status select offered the value
   `on_leave` while every layer below spells it `onLeave`; the vehicle type
   select offered `van`, `truck` and `suv`, which the API rejects, and omitted
   `sedan` and `shuttle`, which it accepts; the vehicle status select omitted
   `inactive`. All three now derive from the contract tuples, and
   `driverOptions.test.ts` / `vehicleOptions.test.ts` name the old values so
   the change is visible in review.

2. **Two translation keys were added.** `vehicles.types.sedan` and
   `vehicles.types.shuttle` in all four locales, plus `vehicles.status.inactive`
   in fr/ar/es, because building those selects from the contract needs labels
   that did not exist. Eleven added lines in total; `bun run i18n:check` passes.

3. **Fourteen dead exports were deleted, not rehomed.** `userSchema`,
   `roleSchema`, `alertSchema`, `feeInstallmentSchema`, `paymentAllocationSchema`,
   `eventParticipantSchema`, `expenseApprovalSchema`, `expensePaymentSchema`,
   `refuelSchema`, `bulkAssessmentSchema`, `bulkFeeItemSchema` (kept as a private
   const inside the Fees config), `idParamSchema`, `paginationSchema`,
   `dateRangeSchema`. Confirmed unused across `apps/` and `packages/`; the
   identically named server schemas are separate local definitions.

4. **`@sms/contracts/lookup` was added as a second entry point.** The by-key
   `enumValues` object names all sixty-nine tuples, so it is kept off the
   client's import path rather than re-exported from `index.ts`. Only the
   server's Zod adapter imports it.

### Known issue found during the migration, fixed in a follow-up

`EventForm.tsx` carried three hardcoded English label maps, passed to the old
global hook as `customLabels`. They won over `t()`, so the event type, status
and visibility selects rendered English whatever language the user had chosen,
although `events.type.*`, `events.status.*` and `events.visibility.*` are
complete in all four locales.

The migration moved them verbatim into `Events/config/eventOptions.ts` and
pinned the behaviour, on the rule that a file move does not change what a
screen does. They were then removed in a separate follow-up change, which is
the only thing in this work that alters rendered output.

Nothing was lost by removing them: every overridden string was its English
catalog entry verbatim, so an English reader sees exactly what they saw before
and the other three languages now render translated. `eventOptions.test.ts` was
rewritten from behaviour-pinning to locale-aware assertions — it resolves keys
against the real `en`/`fr`/`ar`/`es` catalogs, checks every offered value has a
non-key label in each, and asserts the Arabic labels differ from the English
ones so a reintroduced override fails loudly rather than silently.

### Verification

Payload parity was checked batch by batch against a snapshot of the deleted
`lib/validations.ts`, feeding each old and new schema the same valid, edge and
invalid inputs and comparing parsed output and sorted issue lists. All
identical. Contract values were proved byte-identical to the pre-migration
server enums, and `drizzle-kit check` reports no schema change.

Final state: `bun run lint`, `bun run typecheck`, `bun run i18n:check`,
`bun run test:config` (181 tests), `bun run test:access-reset` (60 tests),
`bun run build:all` and `bun run db:check` all pass. No server runtime
(`drizzle-orm`, `pgEnum`, `reflect-metadata`, `diject`, `postgres`, `ioredis`)
appears in any client chunk. The pre-existing access-reset and DTO work in the
worktree is untouched.

---


Reference: the sibling Kafil workspace uses feature-owned `config/*Schemas.ts` and focused option builders instead of a global frontend enum registry and a monolithic validation file. School should adopt that ownership flow while retaining its own multilingual option behavior, multi-step student form, and Najm backend contracts. This is an architectural migration, not a request to copy Kafil files or business rules.

## Outcome

After this migration:

- `apps/dashboard/src/lib` contains only genuinely cross-cutting, domain-neutral utilities.
- Every form schema is owned by the feature that uses it, normally under `features/<Feature>/config/`.
- Enum values shared by the API, database, and dashboard are declared once in a dependency-free workspace contract.
- Each feature owns the labels, filtering, legacy-value handling, and option-building behavior for its selects.
- Components import schemas and option builders from their feature instead of `@/lib/validations`, `@/lib/ZodEnum`, or `@/hooks/useEnum`.
- The server remains the enforcement boundary. Frontend schemas improve form UX but do not replace DTO validation or authorization.
- `ENUMS.ts`, `ZodEnum.ts`, the global `useEnum.tsx`, and the monolithic `lib/validations.ts` are deleted only after all consumers have moved and parity checks pass.

Target dependency flow:

```text
packages/contracts (readonly values and TypeScript types only)
        |                         |
        v                         v
server DTO/Drizzle enums      dashboard feature config
                                  |-- <feature>Schemas.ts
                                  |-- <feature>Options.ts
                                  `-- focused config tests
                                           |
                                           v
                                  feature forms/components
```

The contracts package must not depend on React, Next.js, Najm, Zod, Drizzle, translations, database code, or server runtime modules. That rule makes it safe for both browser and server bundles and avoids making `@sms/server` a client dependency.

## Current baseline and reason for change

School currently has three related layers:

1. `apps/dashboard/src/lib/ENUMS.ts` contains 58 frontend value lists plus translation-key metadata.
2. `apps/dashboard/src/lib/ZodEnum.ts` turns most of those lists into Zod enums.
3. `packages/server/src/shared/enums.ts` independently contains 69 server value lists and their Zod enums.

The dashboard also has one 700-line `apps/dashboard/src/lib/validations.ts` containing more than 40 schemas for unrelated domains. At planning time, 31 feature/component files import this module, 13 files call `useEnum`, and `PaymentEditForm.tsx` directly imports `ZodEnum.ts`.

The copies have already drifted:

- The dashboard is missing 11 server keys: `language`, `attendanceType`, the three behavior-reward enums, `payslipStatus`, four staff enums, and `llmProvider`.
- Dashboard `paymentStatus` has `completed`, `pending`, `failed`, and `refunded`; the server additionally has `deposited`, `bounced`, and `voided`.
- The old frontend files use untyped string lookup and still contain comments referring to their original JavaScript paths.

Not every server enum needs a dashboard selector, so absence alone is not a defect. The defect is that the same accepted values can be independently edited without a contract or parity test.

At planning time the worktree already contains unrelated changes in access-reset code and in `ParentDto.ts`, `StudentDto.ts`, and `TeacherDto.ts`. Preserve those edits. Do not reset, overwrite, or silently include them in this migration. Recheck `git status` and overlapping diffs before every phase that touches server DTOs.

## Architectural rules

### Shared values

- Add a small private workspace package, proposed as `packages/contracts` with package name `@sms/contracts`.
- Export readonly tuples with explicit names such as `GENDER_VALUES`, `PAYMENT_STATUS_VALUES`, and `CALENDAR_SYSTEM_VALUES`.
- Export inferred union types such as `Gender` and `PaymentStatus` from those tuples.
- If the server still benefits from generic lookup, compose an `enumValues` object from the named tuples; never repeat the literal arrays.
- Keep the current serialized values exactly as they are. This migration does not rename database enum values or API payload values.
- Separate domain values from presentation. Translation keys and labels never belong in `packages/contracts`.
- Values used only by one frontend interaction and not accepted by the server may stay inside that feature. Document why they are UI-only.

Example shape, for direction only:

```ts
export const GENDER_VALUES = ['M', 'F'] as const;
export type Gender = (typeof GENDER_VALUES)[number];

export const enumValues = {
  gender: GENDER_VALUES,
  // Other named tuples, with no duplicated literals.
} as const;
```

### Feature-owned validation

- Put form schemas in `apps/dashboard/src/features/<Feature>/config/<feature>Schemas.ts`.
- Infer form-value types from the feature schema and export those types beside it.
- Preserve current defaults, optional/nullable behavior, transforms, messages, and cross-field refinements during the move. Do not "clean up" behavior in the same commit unless a characterization test proves and documents the intended change.
- Keep API DTO schemas in `packages/server/src/modules/**/**Dto.ts`. A dashboard form schema must not be imported into the server, and a transport DTO must not be used as a React form schema.
- Multi-feature workflows may compose public schemas from the owning feature. For example, the full student form may compose the student, parent, transport, and fee form schemas. Keep the composition in `Students/config/fullStudentSchemas.ts`; do not recreate another global validation module.
- Avoid circular feature dependencies. Keep small form primitives local to each owning feature rather than recreating a global validation module.

### Feature-owned options

- Replace the stringly typed `useEnum('key')` API with typed, feature-owned option builders.
- Follow Kafil's useful pattern: pure functions receive a translator or typed label map and return readonly `{ value, label }` items.
- A component may call `useTranslation()` and pass `t` to its feature's builder. Do not hide all domains behind another global `useEnum` hook.
- Keep feature-specific filtering in the owner. For example, expense filtering and event custom labels belong in their corresponding feature config.
- Preserve edit behavior for stored legacy or unknown values. Where old records can contain a value no longer in the supported tuple, append a read-only/current option rather than silently replacing the data.
- Translation keys remain in the shared catalog under `packages/server/src/locales/`. Run the existing parity check after every option migration.

### Naming and import boundaries

- Use normal TypeScript filenames: `studentSchemas.ts`, `studentOptions.ts`, and `enumValues.ts`. Do not retain uppercase `ENUMS.ts` or ambiguous `ZodEnum.ts` names.
- Components may import their own feature config directly or through a narrow feature barrel.
- Cross-feature imports must name the owning feature explicitly. Avoid a new catch-all `config/index.ts` that recreates the current global dependency.
- `apps/dashboard/src/lib` must not contain domain lists, form schemas, or feature-specific translation metadata when the migration is complete.

## Target file ownership

This table is the initial routing map. Phase 0 must confirm every export and consumer before files move.

| Current schema group | Target owner |
| --- | --- |
| `userSchema` | `features/Users/config/userSchemas.ts` |
| `roleSchema` | `features/Roles/config/roleSchemas.ts` |
| `studentSchema`, `fullStudentSchema` | `features/Students/config/studentSchemas.ts` and `fullStudentSchemas.ts` |
| `parentSchema`, `parentsSchema` | `features/Parents/config/parentSchemas.ts` |
| `teacherPersonalSchema`, `teacherProfessionalSchema`, assignments, `teacherFullSchema` | `features/Teachers/config/teacherSchemas.ts` |
| `driverSchema` | `features/Drivers/config/driverSchemas.ts` |
| fee type schemas | `features/Financial/FeeTypes/config/feeTypeSchemas.ts` |
| fee, bulk-fee, class-fee, installment schemas | `features/Financial/Fees/config/feeSchemas.ts` |
| payment and allocation schemas | `features/Financial/Payment/config/paymentSchemas.ts` |
| expense, approval, and expense-payment schemas | `features/Financial/Expenses/config/expenseSchemas.ts` |
| transport/location schemas | `features/Transport/config/transportSchemas.ts` |
| vehicle and refuel schemas | `features/Vehicles/config/vehicleSchemas.ts` |
| subject, section, class, attendance schemas | each corresponding feature's `config/*Schemas.ts` |
| assessment and bulk-assessment schemas | `features/Assessments/config/assessmentSchemas.ts` |
| grade and exam schemas | corresponding `Grades` and `Exams` config folders |
| announcement, discipline, alert, behavior-reward, and event schemas | each corresponding feature config folder |
| settings schema | `features/Settings/config/settingsSchemas.ts` |
| generic ID, pagination, or date-range schemas | keep only if used and define them beside the feature schema that binds them |

Do not create empty config barrels or move unused exports mechanically. An unused schema should be deleted after repository-wide confirmation rather than given a new home.

## Phase 0 - inventory and freeze existing behavior

1. Re-read `AGENTS.md`, the Najm dashboard skill, the current dirty diff, installed package versions, and the actual root scripts before implementation.
2. Build a migration inventory with every export from `ENUMS.ts`, `ZodEnum.ts`, and `validations.ts`; list its consumers, translation prefix, server counterpart, defaults, transforms, refinements, and whether it is unused.
3. Classify every enum as API-persisted, API-query-only, frontend-only, or legacy-display-only. Confirm values against DTOs and Drizzle schemas, not just the frontend registry.
4. Resolve known drift explicitly. For `paymentStatus`, confirm which server states should be editable, which should only be displayed, and which are internal. Do not automatically expose all server states in a form.
5. Add focused characterization tests before moving complicated schemas. Minimum coverage includes:
   - the full-student transport cross-field refinement;
   - grade assessment/exam exclusivity;
   - fee defaults and bulk variants;
   - optional and nullable parent/teacher fields;
   - numeric coercion and validation helpers;
   - settings defaults;
   - option labels and filtering for each current `useEnum` consumer.
6. Establish a working dashboard typecheck command. The current direct TypeScript run is blocked by unresolved `bun:test` types in `accessResetModes.test.ts`; fix test type discovery or use separate app/test tsconfigs, then add a stable `typecheck` script. Do not hide production errors by excluding all tests without a dedicated test typecheck.
7. Record baseline results for lint, i18n, focused tests, typecheck, and build. Existing failures must be separated from migration regressions.

Gate: no architectural move starts until persisted values, intentionally restricted UI values, unused exports, and the known dirty-file overlaps are understood.

## Phase 1 - introduce the dependency-free contracts package

1. Scaffold `packages/contracts` with a minimal `package.json`, `tsconfig.json`, source entry point, enum tuples, and type exports. Add it to the existing workspace naturally; do not add a second package manager or broaden version ranges.
2. Decide whether the package is source-consumed or built before dependents, then make that choice explicit in package exports and root scripts. If built, `build:all` must build contracts before server and dashboard. If source-consumed, verify both Bun server builds and Next production builds resolve it without special aliases.
3. Move literals from `packages/server/src/shared/enums.ts` into the contract package. Keep the server module as the Zod adapter during migration:
   - import shared tuples/object;
   - retain `getEnumValues` if Drizzle schemas need it;
   - construct server Zod enums from the shared tuples;
   - preserve existing public imports so backend modules do not all change at once.
4. Add contract tests proving every tuple is non-empty, contains unique strings, and has stable expected values for persisted database enums.
5. Add a temporary parity test comparing the legacy frontend values with shared contract values for every migrated key. Encode deliberate UI subsets separately so the test distinguishes a restriction from accidental drift.
6. Run server typecheck/build and database schema checks. Moving constants must generate no migration and no database change. If Drizzle detects an enum migration, stop and find the changed value/order before proceeding.

Gate: server DTO behavior, Drizzle enum values, and serialized API values are unchanged, and both server and dashboard can consume the package without pulling server runtime code into the browser.

## Phase 2 - prove the pattern with one vertical slice

Use Assessments as the pilot because it has a schema, two translated enum selectors, and a bulk form without the cross-feature coupling of Students or Fees.

1. Create `features/Assessments/config/assessmentSchemas.ts` using contract tuples directly with `z.enum(...)`.
2. Create `features/Assessments/config/assessmentOptions.ts` with typed pure builders for assessment type and status labels.
3. Move the bulk schema and inferred form types into the same feature config.
4. Update `AssessmentForm.tsx` to import local schemas/options and remove `useEnum` for that feature.
5. Add focused schema and option tests covering every value, default, invalid value, and translation-key mapping.
6. Compare submitted request payloads before and after the refactor. UI structure, default values, reset behavior, and API calls must remain unchanged.
7. Run focused tests, dashboard typecheck, lint, i18n check, and a production build.

Gate: the pilot demonstrates the final import direction and test style. Correct the pattern here before multiplying it across the dashboard.

## Phase 3 - migrate leaf features in small reviewable batches

Each batch must move schemas, options, tests, and consumers together. Do not leave a feature half on the global registry and half on local config.

Suggested batches:

1. **Academic basics:** Subjects, Sections, Classes, Attendance, Grades, and Exams.
2. **Student-life records:** Announcements, Alerts, Discipline, BehaviorRewards, and Events.
3. **Transport:** Drivers, Vehicles, refueling, and transport assignment/location forms.
4. **Settings and access:** Settings, Users, Roles, and Permissions while preserving the current access-reset work.

For each feature:

- create its `config/*Schemas.ts` and, when needed, `config/*Options.ts`;
- import named tuples from `@sms/contracts`;
- infer form types locally instead of repeating manual unions;
- move feature-specific label overrides and filters out of components when that improves reuse;
- add focused tests for defaults/refinements and option output;
- update all imports in one patch;
- remove only that feature's old exports from `validations.ts` and `ZodEnum.ts` after `rg` proves no consumers remain;
- verify no cross-feature circular import was introduced.

## Phase 4 - migrate coupled people workflows

1. Migrate Parents first, including relationship, gender, and marital-status options. Preserve empty/optional semantics and support displaying stored legacy values.
2. Migrate Teachers next, keeping personal, professional, assignment, and full-form composition in one feature-owned configuration boundary. Coordinate with the existing dirty `TeacherDto.ts`; frontend movement must not overwrite server work.
3. Migrate Students last in this group. Split simple student fields from full-form orchestration. The full schema may compose public Parent, Fee, and Transport form schemas, but the Students feature owns the combined workflow and its cross-field refinements.
4. Confirm `FullStudentForm.tsx` still sends nested parents and fees using the existing one-request flow and file-aware helpers. This migration must not change multipart serialization or convert it into sequential API calls.
5. Characterize create and edit defaults separately. Test optional images, Moroccan phone strings, nested arrays, and transport conditional fields.

Gate: simple and full student forms produce the same normalized payloads as before, with no change to nested parent/fee behavior.

## Phase 5 - migrate financial workflows

1. Migrate FeeTypes, then Fees, then Payment, then Expenses so lower-level schemas are available before composed workflows.
2. Keep create, edit, bulk, class-bulk, installment, allocation, approval, and payment schemas explicit. Do not merge workflows merely because they share an enum.
3. Replace the direct `paymentMethodEnum` import in `PaymentEditForm.tsx` with its local payment schema.
4. Resolve the `paymentStatus` UI/server difference using the Phase 0 decision. Separate editable status options from display-only status labels if required.
5. Preserve monetary coercion, installment generation inputs, schedule defaults, and status recalculation expectations. The frontend must not assume it owns server-calculated fee status.
6. Add payload tests around decimal/number inputs and focused tests for every bulk variant.

Gate: all financial forms preserve request shapes and server-calculated behavior, and no unsupported internal status becomes user-editable.

## Phase 6 - remove the legacy global layer

1. Use repository-wide searches to prove there are no remaining imports of:
   - `@/lib/validations`;
   - `@/lib/ZodEnum` or `./ZodEnum`;
   - `@/lib/ENUMS` or `./ENUMS`;
   - `@/hooks/useEnum`.
2. Delete `apps/dashboard/src/lib/validations.ts`, `ZodEnum.ts`, and `ENUMS.ts`, then delete `hooks/useEnum.tsx` if it has no unrelated behavior.
3. Remove compatibility re-exports rather than leaving permanent aliases. A short-lived re-export is acceptable only inside an incomplete migration branch and must not reach the completion commit.
4. Remove temporary legacy-parity tests after every consumer uses `@sms/contracts`; retain stable contract and feature tests.
5. Check `apps/dashboard/src/lib` manually. Move any remaining feature-owned file to its owner, but keep legitimate cross-cutting utilities such as `academicYear.ts`, `appName.ts`, and local date helpers.
6. Add an ESLint restriction preventing future imports of the deleted global paths and preventing client imports from `packages/server/src` or `@server/*` for shared contracts.

Gate: the four legacy modules are absent, their imports return no matches, and no replacement global enum/validation dumping ground exists.

## Phase 7 - tooling and final verification

1. Add Kafil-like root quality scripts only where they match School's actual packages:
   - package-level `typecheck` scripts;
   - root `typecheck` in dependency order;
   - focused dashboard config tests;
   - optionally a root `check` that runs lint, typecheck, tests, i18n, and build without database mutation.
2. Run the smallest checks after each batch, then the final suite:

```text
bun run lint
bun run typecheck
bun run i18n:check
bun test <focused feature config tests>
bun run build:all
bun run db:check
```

3. Inspect the production client bundle or Next build trace to confirm `@sms/contracts` does not pull Zod server adapters, Drizzle, database modules, or backend-only code into client chunks.
4. Exercise representative create/edit flows for Students, Parents, Teachers, Fees, Payments, Events, and Settings in both desktop and narrow layouts. Check English, French, Arabic RTL, and Spanish labels.
5. Verify invalid client values are rejected by form schemas and independently rejected by server DTOs. Frontend validation passing must never be treated as server authorization or data-integrity proof.
6. Review `git diff --check`, the complete diff, and the original dirty worktree separately before committing. Keep the contract introduction and each feature batch independently reviewable where practical.

## Risks and controls

| Risk | Control |
| --- | --- |
| Persisted enum value or order changes accidentally | Stable contract tests, Drizzle diff review, and no migration accepted for a constants-only move |
| UI exposes internal server states | Maintain typed editable subsets and separate display-label builders |
| Translation regressions | Feature option tests plus `bun run i18n:check` across all four locales |
| Schema behavior changes during file moves | Characterization tests for defaults, transforms, nullable fields, and refinements before migration |
| Client bundle imports backend runtime code | Dependency-free contracts package, import restriction, and production bundle verification |
| Feature cycles appear during schema composition | One-way ownership, explicit public schemas, and local feature primitives |
| Full student flow is split into multiple requests | Preserve current nested multipart/request composition and test normalized payloads |
| Existing access-reset/DTO work is overwritten | Recheck dirty diff before overlapping phases and keep migration commits narrow |
| A new global registry replaces the old one | Allow shared values only; keep schemas, labels, filters, and builders feature-owned |

## Rollback strategy

- Migrate and merge by vertical feature batches so a failing batch can be reverted without restoring the entire global architecture.
- Keep legacy modules unchanged until their consumers have migrated; delete each old export only after a repository-wide reference check.
- The contracts phase must be behavior-neutral and database-neutral. If it changes generated SQL, API serialization, or bundle boundaries, revert that phase before continuing.
- Do not run destructive database commands for this migration. No data backfill should be necessary because stored enum strings remain unchanged.
- If an option migration cannot represent legacy stored values safely, keep that feature on the old path temporarily and document the blocker; do not coerce existing data.

## Completion criteria

The migration is complete only when all of the following are true:

- All persisted/shared enum literals have one dependency-free declaration consumed by server and dashboard.
- All dashboard form schemas and select-option builders are feature-owned.
- `ENUMS.ts`, `ZodEnum.ts`, `lib/validations.ts`, and `useEnum.tsx` are deleted with no remaining imports.
- The known `paymentStatus` discrepancy and every other deliberate UI subset are documented and tested.
- Full-student nested parent/fee/file behavior and financial payload behavior are unchanged.
- Translation keys and labels pass checks in en/fr/ar/es, including Arabic RTL smoke coverage.
- Lint, typecheck, focused tests, i18n checks, server/dashboard builds, and database schema checks pass or have separately documented pre-existing failures.
- No server-only dependency appears in client bundles, no database migration is produced, and the pre-existing dirty worktree is preserved.
