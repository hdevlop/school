# Routine timetable implementation evidence

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
