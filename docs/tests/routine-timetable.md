# Routine timetable implementation evidence

## School-wide teaching days, 2026-10-12

Teaching days are edited in Settings → Academic using seven visible checkboxes. The per-section Days action and dialog are removed. Settings owns `teachingDays`; routine create/update DTOs cannot override it. A new routine snapshots the school selection, and the demo timetable planner uses the configured days.

A settings save updates draft/published routines in the active academic year, independently of the caller's historical selection. Historical and archived routines retain their day snapshots. Removing a day with lessons or supervision returns 409 before writes; assignments must be moved or removed through their normal editor first. Settings and routine updates share the service transaction.

Migration `0065_lush_the_stranger.sql` adds `settings.teaching_days`. On adoption it takes the ordered union of active-year routine days and assigned lesson/supervision days, then synchronizes live active-year routines. Existing assignments cannot disappear during adoption. The migration was applied to local `school` and the guarded `school_history_test` fixture, both reaching 66 journal entries. Before/after comparisons preserved all lesson/duty rows and historical/archived day snapshots. No production migration or deployment is claimed.

Validation passed: workspace lint/typechecks, dashboard Settings schema tests (13), focused Settings/Routine/partial-update tests (35), seed timetable tests (8), workspace boundary checks (28), i18n scan, migration check, and production build with isolated output `.next-teaching-days-check`. The guarded PostgreSQL suites `SettingsHistoryDatabase.test.ts` and `TeachingDaysDatabase.test.ts` pass alongside the four class/routine year-input tests. The new database case exercises lesson and duty removal refusals, an allowed save from historical context, active-year propagation, and history/archive/assignment preservation inside a rolled-back transaction.

Browser and connected REST/MCP acceptance for this settings control remain unrun; no browser connection was available. The mobile layout changes preceding this move passed lint, dashboard typechecks and a separate production build, with visual acceptance likewise unconfirmed.

Date: 2026-09-24

## Implemented

- Days render as table rows and outer periods as columns, with subject colors, dotted separators between fixed labels, and a diagonal within each `OR` pair.
- A lesson keeps one assignment, teacher, room, and outer time. Its `contentGroups` contain zero to six untimed fixed labels or alternative pairs. The editor supports adding, converting, moving, removing, and previewing them without a nested time or rotation-calendar field.
- The same grid serves the class and teacher views. Break duty cells and existing entry permissions remain on the original paths.
- `routine_entries` gains JSONB `content_groups` default `[]` and positive integer `version` default `1`. Content replacement and deletion use an expected version. Omitted content on update is preserved.

## Source checks

| Check | Result |
| --- | --- |
| `bun run test:routines` | Passed |
| `bun run test` | Passed, including Routine DTO/service, contracts, and workspace boundary tests |
| `bun run typecheck` | Passed, including server Routine tests |
| `bun run lint` | Passed |
| `bun run i18n:check` | Passed |
| `bun run build` | Passed |
| `bun run db:check` | Passed |
| `git diff --check` | Passed |

Migration `0047_pink_rafael_vega.sql` and its snapshot change only `public.routine_entries` relative to migration 0046. An unrelated generated roles index was removed from 0047 before application.

## Local database check

The configured database host was confirmed to be loopback. Before migration, its Drizzle journal held 47 records with 0046 latest. `bun run db:migrate` succeeded; afterward the journal held 48 records with 0047 latest. `routine_entries.content_groups` and `routine_entries.version` are non-null with defaults `[]` and `1` respectively. A catalog query confirmed both new check constraints. The table had zero rows, so this run could not prove preservation of existing lesson data or a persisted mixed-content round trip.

## Remaining connected acceptance

- Internal API save/reload of plain, three-label, alternative-only, and mixed cells; content version conflict; parent-only edits; layout remapping; teacher-view lesson count and whole-period conflicts.
- Browser review of the reference layouts, Arabic and French, long labels, narrow screens, keyboard and touch, 200% zoom, both themes, and break duty editing.
- Disposable PostgreSQL migration and concurrency checks against representative data.

The local app was not listening on `127.0.0.1:3000` during this check. No connected API or browser result is claimed from the local check.

## Production schema incident, 2026-09-24

The user reported a failed `routine_entries` query on `https://myscolai.com/class-routines`. Production served revision `2e9b59bf465f0feb8a68b3af8e5f923e8e97c396`, and its GitHub deployment workflow had succeeded. Read-only inspection of the production Postgres container showed 47 applied migrations through 0046, no `content_groups` or `version` columns, and zero Routine entries. The deployed app image contained migration 0047. The deployment workflow had no migration step; its health endpoint checked connectivity but not schema currency.

`docker exec school-school-lghkg3-app-1 bun x drizzle-kit migrate` applied 0047 against the production app's configured database. A direct production catalog query then showed 48 migrations with 0047 latest, both non-null columns with their expected defaults, both new check constraints, and still zero Routine entries. `https://myscolai.com/api/health/status` returned HTTP 200 with database and cache ready. An anonymous request to `/class-routines` redirected to login, so authenticated timetable behavior remains unverified.

`compose.production.yml` now makes the app and notifications worker depend on successful completion of its existing `migrate` service. Docker Compose 2.40.3 accepted the revised configuration and resolved both dependencies to `service_completed_successfully`. This prevention change is local and has not been committed, pushed, or deployed.
